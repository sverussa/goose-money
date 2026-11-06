import type Decimal from 'decimal.js';
import { aPagarNoCartao, limiteDisponivel, obrigacoesDoCartao } from '../cartoes';
import {
  competenciaDe,
  minData,
  primeiroDia,
  somarMeses,
  ultimaData,
  ultimoDiaDoMes,
  type Competencia,
  type DataCivil,
} from '../datas';
import { type Centavos, centavos, mais, menos, percentual, somar } from '../dinheiro';
import type { Cartao, Id } from '../modelo';
import { periodo as criarPeriodo, type Periodo } from '../periodos';
import { ocorrenciasDoMes } from '../recorrencias';
import type { Derivado } from './derivar';
import {
  despesasReconhecidas,
  type FiltrosDeReconhecimento,
  type ItemReconhecido,
  receitasReconhecidas,
  somarItens,
} from './reconhecimento';

/** PROMPT 3.10: uma função por indicador, todas lendo do `Derivado` (D13). */

/** Razão com denominador possivelmente zero: nunca `NaN` nem `Infinity` (3.10, 8.3). */
export type Razao = { tipo: 'valor'; valor: Decimal } | { tipo: 'indisponivel' } | { tipo: 'novo' };

const razao = (parte: Centavos, todo: Centavos): Razao => {
  const valor = percentual(parte, todo);
  return valor === null ? { tipo: 'indisponivel' } : { tipo: 'valor', valor };
};

const ativas = (d: Derivado) => d.fatos.contas.filter((c) => !c.arquivada);
const cartoesAtivos = (d: Derivado): Cartao[] => d.fatos.cartoes.filter((c) => !c.arquivado);
const saldoHoje = (d: Derivado, id: Id) => d.saldos.get(id)?.atual ?? centavos(0);
const faturasDo = (d: Derivado, id: Id) => d.faturas.get(id) ?? [];

/** Soma de saldo(conta, hoje) das contas não arquivadas com `incluirNoTotal`. */
export const saldoEmContas = (d: Derivado): Centavos =>
  somar(
    ativas(d)
      .filter((c) => c.incluirNoTotal)
      .map((c) => saldoHoje(d, c.id)),
  );

/** Soma de saldo(conta, hoje) de todas as contas não arquivadas. */
export const saldoEmTodasAsContas = (d: Derivado): Centavos =>
  somar(ativas(d).map((c) => saldoHoje(d, c.id)));

/** Soma de "A pagar no cartão" (3.5) dos cartões ativos. */
export const aPagarNosCartoes = (d: Derivado): Centavos =>
  somar(cartoesAtivos(d).map((c) => aPagarNoCartao(faturasDo(d, c.id))));

/** Soma de "Obrigações do cartão" (3.5) dos cartões ativos, com parcelas futuras. */
export const obrigacoesDeCartao = (d: Derivado): Centavos =>
  somar(cartoesAtivos(d).map((c) => obrigacoesDoCartao(faturasDo(d, c.id))));

/** Limite disponível de um cartão (3.5). */
export function limiteDisponivelDoCartao(d: Derivado, cartaoId: Id): Centavos {
  const cartao = d.porId.cartoes.get(cartaoId);
  if (!cartao) throw new RangeError(`Cartão inexistente: ${cartaoId}`);
  return limiteDisponivel(cartao, obrigacoesDoCartao(faturasDo(d, cartaoId)));
}

/** Soma dos saldos devedores (3.7). */
export const saldoDevedorDeDividas = (d: Derivado): Centavos =>
  somar([...d.dividas.values()].map((t) => t.resumo.saldoDevedor));

/** Saldo em todas as contas − Obrigações de cartão − Saldo devedor de dívidas. */
export const patrimonioLiquido = (d: Derivado): Centavos =>
  menos(menos(saldoEmTodasAsContas(d), obrigacoesDeCartao(d)), saldoDevedorDeDividas(d));

export const receitas = (d: Derivado, p: Periodo, filtros: FiltrosDeReconhecimento = {}) =>
  somarItens(receitasReconhecidas(d, p, filtros));

export const despesas = (d: Derivado, p: Periodo, filtros: FiltrosDeReconhecimento = {}) =>
  somarItens(despesasReconhecidas(d, p, filtros));

export const resultado = (d: Derivado, p: Periodo, filtros: FiltrosDeReconhecimento = {}) =>
  menos(receitas(d, p, filtros), despesas(d, p, filtros));

/** Resultado ÷ Receitas; sem receitas, "—". */
export const taxaDePoupanca = (d: Derivado, p: Periodo): Razao =>
  razao(resultado(d, p), receitas(d, p));

/** (atual − anterior) ÷ |anterior|; ambos zero "—", anterior zero "Novo". */
export function variacao(atual: Centavos, anterior: Centavos): Razao {
  if (anterior === 0) return atual === 0 ? { tipo: 'indisponivel' } : { tipo: 'novo' };
  return razao(menos(atual, anterior), centavos(Math.abs(anterior)));
}

export interface Comprometimento {
  /** Gastos fixos do mês, confirmados ou previstos (inclusive vencidos), em conta ou no cartão. */
  fixos: Centavos;
  /** Parcelas no mês de compras com n > 1 que não vieram de recorrência. */
  parcelasCartao: Centavos;
  /** Parcelas de dívida que vencem no mês, valor integral. */
  dividas: Centavos;
  /** Rendas − os três acima; negativo quando a renda não cobre. */
  livre: Centavos;
  /** Rendas fixas do mês, confirmadas ou previstas (inclusive atrasadas). */
  rendas: Centavos;
  razao: Razao;
}

/** Comprometimento da renda no mês de referência, com a decomposição do gráfico (8.1). */
export function comprometimentoDaRenda(d: Derivado, mes: Competencia): Comprometimento {
  const { fatos, hoje } = d;
  const ocorrencias = (
    mes === competenciaDe(hoje) ? d.ocorrenciasDoMes : ocorrenciasDoMes(fatos, mes, hoje)
  ).filter((o) => o.status !== 'ignorada');
  const daNatureza = (n: 'renda' | 'gasto') =>
    somar(ocorrencias.filter((o) => o.recorrencia.natureza === n).map((o) => o.valor));
  const daRecorrencia = new Set(fatos.ocorrencias.map((o) => o.compraId));
  const parcelasCartao = somar(
    [...d.faturas.values()].flatMap((faturas) =>
      faturas
        .filter((f) => f.competencia === mes)
        .flatMap((f) => f.itens)
        .flatMap((i) =>
          i.tipo === 'parcela' && i.compra.numeroParcelas > 1 && !daRecorrencia.has(i.compra.id)
            ? [i.valor]
            : [],
        ),
    ),
  );
  const dividas = somar(
    [...d.dividas.values()].flatMap((t) =>
      t.parcelas
        .filter((p) => !p.pagaAntesDoCadastro && competenciaDe(p.vencimento) === mes)
        .map((p) => p.valor),
    ),
  );
  const fixos = daNatureza('gasto');
  const rendas = daNatureza('renda');
  const comprometido = somar([fixos, parcelasCartao, dividas]);
  return {
    fixos,
    parcelasCartao,
    dividas,
    livre: menos(rendas, comprometido),
    rendas,
    razao: razao(comprometido, rendas),
  };
}

// Séries dos gráficos de 8.1. Cada ponto é a soma dos itens que a lista de Lançamentos mostra
// quando aberta pelo ponto (invariante de 6.3).

const meses = (p: Periodo): Competencia[] => {
  const lista: Competencia[] = [];
  for (let m = competenciaDe(p.de); m <= competenciaDe(p.ate); m = somarMeses(m, 1)) lista.push(m);
  return lista;
};

function somaPor<K>(itens: readonly ItemReconhecido[], chave: (i: ItemReconhecido) => K) {
  const soma = new Map<K, Centavos>();
  for (const i of itens) soma.set(chave(i), mais(soma.get(chave(i)) ?? centavos(0), i.valor));
  return soma;
}

/** Receitas × Despesas por mês, com a linha de Resultado. */
export function receitasEDespesasPorMes(d: Derivado, p: Periodo) {
  const r = somaPor(receitasReconhecidas(d, p, {}), (i) => competenciaDe(i.data));
  const x = somaPor(despesasReconhecidas(d, p, {}), (i) => competenciaDe(i.data));
  return meses(p).map((competencia) => {
    const receitas = r.get(competencia) ?? centavos(0);
    const despesas = x.get(competencia) ?? centavos(0);
    return { competencia, receitas, despesas, resultado: menos(receitas, despesas) };
  });
}

export interface FatiaCategoria {
  /** Categoria pai (D35). */
  categoriaId: Id;
  valor: Centavos;
}

/** Despesas por categoria: até 6 fatias e "Outras" (as demais, com a lista para o clique) e o ranking. */
export function despesasPorCategoria(d: Derivado, p: Periodo) {
  const ranking: FatiaCategoria[] = [
    ...somaPor(despesasReconhecidas(d, p, {}), (i) => i.categoriaPaiId),
  ]
    .map(([categoriaId, valor]) => ({ categoriaId, valor }))
    .sort((a, b) => b.valor - a.valor || a.categoriaId.localeCompare(b.categoriaId));
  const resto = ranking.slice(6);
  return {
    fatias: ranking.slice(0, 6),
    outras:
      resto.length === 0
        ? null
        : { valor: somar(resto.map((f) => f.valor)), categorias: resto.map((f) => f.categoriaId) },
    ranking,
  };
}

/**
 * Gasto acumulado do último mês do período (até `p.ate`) e do mês anterior, por dia do mês.
 * `null` nos dias que o mês não tem ou que ainda não chegaram.
 */
export function gastoAcumulado(d: Derivado, p: Periodo) {
  const mes = competenciaDe(p.ate);
  const anterior = somarMeses(mes, -1);
  const acumulados = (m: Competencia, ate: DataCivil): Centavos[] => {
    const porDia = somaPor(despesasReconhecidas(d, criarPeriodo(primeiroDia(m), ate), {}), (i) =>
      Number(i.data.slice(8)),
    );
    const lista: Centavos[] = [];
    let soma = centavos(0);
    for (let dia = 1; dia <= Number(ate.slice(8)); dia++) {
      soma = mais(soma, porDia.get(dia) ?? centavos(0));
      lista.push(soma);
    }
    return lista;
  };
  const atual = acumulados(mes, p.ate);
  const doAnterior = acumulados(anterior, ultimaData(anterior));
  const dias = Math.max(ultimoDiaDoMes(mes), ultimoDiaDoMes(anterior));
  return {
    mes,
    anterior,
    dias: Array.from({ length: dias }, (_, k) => ({
      dia: k + 1,
      atual: atual[k] ?? null,
      anterior: doAnterior[k] ?? null,
    })),
  };
}

/** Fixos (origem recorrência) × variáveis (as demais origens), por mês. */
export function fixosEVariaveis(d: Derivado, p: Periodo) {
  const soma = somaPor(
    despesasReconhecidas(d, p, {}),
    (i) => `${competenciaDe(i.data)}${i.origem === 'recorrencia' ? 'f' : 'v'}`,
  );
  return meses(p).map((competencia) => ({
    competencia,
    fixos: soma.get(`${competencia}f`) ?? centavos(0),
    variaveis: soma.get(`${competencia}v`) ?? centavos(0),
  }));
}

/** Composição do saldo por conta, hoje: contas não arquivadas; `null` antes do saldo inicial. */
export const composicaoDoSaldo = (d: Derivado) =>
  ativas(d).map((c) => ({
    contaId: c.id,
    incluirNoTotal: c.incluirNoTotal,
    saldo: d.saldos.get(c.id)?.atual ?? null,
  }));

/**
 * Evolução do saldo e do patrimônio no fim de cada mês do período até hoje (o mês corrente
 * vale hoje). Obrigações e saldo devedor numa data t: cobranças do cartão feitas até t menos os
 * pagamentos até t; valor contratado menos as amortizações pagas até t. Em t = hoje, igual aos
 * indicadores de hoje. Sem conta com saldo inicial até t, o ponto fica de fora.
 */
export function evolucaoDoPatrimonio(d: Derivado, p: Periodo) {
  const { fatos, hoje } = d;
  const cartoes = new Set(cartoesAtivos(d).map((c) => c.id));
  const comprasAte = (t: DataCivil) =>
    new Set(fatos.compras.filter((x) => cartoes.has(x.cartaoId) && x.data <= t).map((x) => x.id));
  const obrigacoesEm = (t: DataCivil): Centavos => {
    const compras = comprasAte(t);
    const parcelas = [...d.faturas.values()].flatMap((fs) =>
      fs.flatMap((f) =>
        f.itens.flatMap((i) => {
          if (i.tipo === 'parcela') return compras.has(i.compra.id) ? [i.valor] : [];
          if ('item' in i) return i.item.data <= t ? [i.valor] : [];
          return []; // transporte e crédito: só remanejam o que já está somado
        }),
      ),
    );
    const pagos = fatos.lancamentos
      .filter((l) => l.tipo === 'pagamento_fatura' && cartoes.has(l.cartaoId as Id) && l.data <= t)
      .map((l) => l.valor);
    return menos(somar(parcelas), somar(pagos));
  };
  const devedorEm = (t: DataCivil): Centavos =>
    somar(
      [...d.dividas.values()].map(({ divida, parcelas }) => {
        if (divida.dataContratacao > t) return centavos(0);
        const pagamentos = new Map(
          fatos.lancamentos
            .filter((l) => l.dividaId === divida.id && l.data <= t)
            .map((l) => [l.parcelaDividaId ?? l.id, l]),
        );
        const amortizado = [
          ...parcelas
            .filter((x) => x.pagaAntesDoCadastro || pagamentos.has(x.id))
            .map((x) => x.amortizacao),
          ...[...pagamentos.values()].filter((l) => l.tipo === 'amortizacao').map((l) => l.valor),
        ];
        return menos(divida.valorContratado, somar(amortizado));
      }),
    );
  return meses(p).flatMap((competencia) => {
    if (competencia > competenciaDe(hoje)) return [];
    const t = minData(ultimaData(competencia), hoje);
    const contas = ativas(d)
      .map((c) => ({ c, saldo: d.saldos.get(c.id)?.fimDoMes.get(competencia) ?? null }))
      .filter((x) => x.saldo !== null);
    if (contas.length === 0) return [];
    const saldoTotal = somar(contas.map((x) => x.saldo as Centavos));
    const obrigacoes = obrigacoesEm(t);
    const saldoDevedor = devedorEm(t);
    return [
      {
        competencia,
        data: t,
        saldoEmContas: somar(
          contas.filter((x) => x.c.incluirNoTotal).map((x) => x.saldo as Centavos),
        ),
        saldoEmTodasAsContas: saldoTotal,
        obrigacoesDeCartao: obrigacoes,
        saldoDevedor,
        patrimonio: menos(menos(saldoTotal, obrigacoes), saldoDevedor),
      },
    ];
  });
}

/** Gasto por cartão no período (competência), dos cartões com despesa. */
export const gastoPorCartao = (d: Derivado, p: Periodo) =>
  [
    ...somaPor(
      despesasReconhecidas(d, p, {}).filter((i) => i.cartaoId !== null),
      (i) => i.cartaoId as Id,
    ),
  ].map(([cartaoId, valor]) => ({ cartaoId, valor }));

/** Maiores despesas do período (top 5); o clique abre o item. */
export const maioresDespesas = (d: Derivado, p: Periodo): ItemReconhecido[] =>
  [...despesasReconhecidas(d, p, {})].sort((a, b) => b.valor - a.valor).slice(0, 5);
