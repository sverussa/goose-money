import { type Competencia, ultimoDiaDoMes } from '../datas';
import { type Centavos, centavos, percentual, somar } from '../dinheiro';
import type { Id } from '../modelo';
import {
  type Comprometimento,
  type despesasPorCategoria,
  type fixosEVariaveis,
  type gastoAcumulado,
  type Razao,
  type receitasEDespesasPorMes,
  variacao,
} from './indicadores';

/**
 * Títulos-conclusão dos gráficos da Visão geral (8.3, T05-17): cada função lê a série que o
 * gráfico mostra e devolve o tipo da conclusão e os números. A frase é da tela.
 */

const razao = (parte: Centavos, todo: Centavos): Razao => {
  const valor = percentual(parte, todo);
  return valor === null ? { tipo: 'indisponivel' } : { tipo: 'valor', valor };
};

export type ConclusaoReceitasDespesas =
  | { tipo: 'semMovimento' }
  /** Resultado ≥ 0 em todos os `meses` com movimento ("Sobrou dinheiro nos três meses"). */
  | { tipo: 'sobrouEmTodos'; meses: number }
  | { tipo: 'faltouEmTodos'; meses: number }
  | { tipo: 'sobrouEmAlguns'; sobrou: number; meses: number };

/** Receitas × Despesas por mês: em quantos meses com movimento o Resultado não ficou negativo. */
export function conclusaoReceitasDespesas(
  serie: ReturnType<typeof receitasEDespesasPorMes>,
): ConclusaoReceitasDespesas {
  const comMovimento = serie.filter((m) => m.receitas !== 0 || m.despesas !== 0);
  if (comMovimento.length === 0) return { tipo: 'semMovimento' };
  const sobrou = comMovimento.filter((m) => m.resultado >= 0).length;
  const meses = comMovimento.length;
  if (sobrou === meses) return { tipo: 'sobrouEmTodos', meses };
  if (sobrou === 0) return { tipo: 'faltouEmTodos', meses };
  return { tipo: 'sobrouEmAlguns', sobrou, meses };
}

export type ConclusaoDespesasPorCategoria =
  | { tipo: 'semDespesas' }
  /** A maior categoria e a fatia dela no total ("Moradia é 30% das despesas"). */
  | { tipo: 'maior'; categoriaId: Id; valor: Centavos; fatia: Razao };

export function conclusaoDespesasPorCategoria(
  serie: ReturnType<typeof despesasPorCategoria>,
): ConclusaoDespesasPorCategoria {
  const [maior] = serie.ranking;
  const total = somar(serie.ranking.map((f) => f.valor));
  if (!maior || total <= 0) return { tipo: 'semDespesas' };
  return {
    tipo: 'maior',
    categoriaId: maior.categoriaId,
    valor: maior.valor,
    fatia: razao(maior.valor, total),
  };
}

export type ConclusaoGastoAcumulado =
  | { tipo: 'semGastos'; mes: Competencia; anterior: Competencia }
  | {
      /** `mais`, `menos` ou `igual` ao mês anterior até o mesmo dia. */
      tipo: 'mais' | 'menos' | 'igual';
      mes: Competencia;
      anterior: Competencia;
      /** Último dia com dado no mês; `mesCompleto` quando é o último dia dele. */
      dia: number;
      mesCompleto: boolean;
      atual: Centavos;
      /** Acumulado do mês anterior no mesmo dia (ou no último dia dele, se for mais curto). */
      noAnterior: Centavos;
      variacao: Razao;
    };

/** Gasto acumulado: o mês contra o anterior até o mesmo dia ("Outubro gastou 10,9% mais que setembro"). */
export function conclusaoGastoAcumulado(
  serie: ReturnType<typeof gastoAcumulado>,
): ConclusaoGastoAcumulado {
  const { mes, anterior, dias } = serie;
  const comDado = dias.filter((x) => x.atual !== null);
  const ultimo = comDado.at(-1);
  const doAnterior = dias.filter((x) => x.anterior !== null);
  if (!ultimo || ultimo.atual === null) return { tipo: 'semGastos', mes, anterior };
  const noAnterior = dias[ultimo.dia - 1]?.anterior ?? doAnterior.at(-1)?.anterior ?? centavos(0);
  const atual = ultimo.atual;
  if (atual === 0 && noAnterior === 0) return { tipo: 'semGastos', mes, anterior };
  return {
    tipo: atual > noAnterior ? 'mais' : atual < noAnterior ? 'menos' : 'igual',
    mes,
    anterior,
    dia: ultimo.dia,
    mesCompleto: ultimo.dia === ultimoDiaDoMes(mes),
    atual,
    noAnterior,
    variacao: variacao(atual, noAnterior),
  };
}

export type ConclusaoFixosEVariaveis =
  | { tipo: 'semDespesas' }
  /** Qual parte pesa mais no período e a fatia dos fixos no total ("Fixos são 62% das despesas"). */
  | { tipo: 'fixos' | 'variaveis'; fixos: Centavos; variaveis: Centavos; fatiaDosFixos: Razao };

export function conclusaoFixosEVariaveis(
  serie: ReturnType<typeof fixosEVariaveis>,
): ConclusaoFixosEVariaveis {
  const fixos = somar(serie.map((m) => m.fixos));
  const variaveis = somar(serie.map((m) => m.variaveis));
  const total = somar([fixos, variaveis]);
  if (total <= 0) return { tipo: 'semDespesas' };
  return {
    tipo: fixos >= variaveis ? 'fixos' : 'variaveis',
    fixos,
    variaveis,
    fatiaDosFixos: razao(fixos, total),
  };
}

export type ConclusaoComprometimento =
  | { tipo: 'semRenda' }
  /** Fatia da renda fixa já comprometida ("56,2% da renda já sai comprometida"). */
  | { tipo: 'comprometida' | 'acimaDaRenda'; razao: Razao; rendas: Centavos };

export function conclusaoComprometimento(c: Comprometimento): ConclusaoComprometimento {
  if (c.rendas <= 0 || c.razao.tipo !== 'valor') return { tipo: 'semRenda' };
  return {
    tipo: c.livre < 0 ? 'acimaDaRenda' : 'comprometida',
    razao: c.razao,
    rendas: c.rendas,
  };
}
