import { datasDaFatura, faturaDaCompra, gerarParcelas } from '../cartoes';
import {
  competenciaDe,
  diaNoMes,
  minData,
  primeiroDia,
  somarMeses,
  ultimaData,
  type Competencia,
  type DataCivil,
} from '../datas';
import { type Centavos, centavos, mais, somar } from '../dinheiro';
import type { Cartao, Id } from '../modelo';
import { faturaDoGastoNoCartao, ocorrenciasDoMes } from '../recorrencias';
import type { Derivado } from './derivar';
import { ddmm, juntar } from './reconhecimento';

/** PROMPT 3.9: a única função de previsão. A Barra e a aba Projeções leem daqui. */

export type GrupoProjecao =
  | 'rendas'
  | 'receitasAvulsas'
  | 'gastosFixosConta'
  | 'faturas'
  | 'parcelasDividas'
  | 'despesasAvulsas';

const SINAL: Record<GrupoProjecao, 1 | -1> = {
  rendas: 1,
  receitasAvulsas: 1,
  gastosFixosConta: -1,
  faturas: -1,
  parcelasDividas: -1,
  despesasAvulsas: -1,
};
const GRUPOS = Object.keys(SINAL) as GrupoProjecao[];

export interface ItemProjetado {
  grupo: GrupoProjecao;
  /** Data prevista ou vencimento (da fatura, da parcela). Antes de hoje: vencido, no mês corrente. */
  data: DataCivil;
  /** Sempre > 0; o grupo dá o sentido. */
  valor: Centavos;
  texto: string;
  ref:
    | { entidade: 'ocorrencia'; recorrenciaId: Id; competencia: Competencia }
    | { entidade: 'lancamento' | 'parcelaDivida'; id: Id }
    | { entidade: 'fatura' }
    | { entidade: 'hipotetico' };
  /** No grupo Faturas: a fatura do saldo ou em que o gasto fixo cai pelo ciclo. */
  fatura: { cartaoId: Id; competencia: Competencia } | null;
}

export interface MesProjetado {
  competencia: Competencia;
  /** Mês corrente: de hoje ao último dia; os seguintes, do dia 1 ao último (ou a `ate`). */
  de: DataCivil;
  ate: DataCivil;
  saldoInicial: Centavos;
  grupos: Record<GrupoProjecao, Centavos>;
  /** Detalhamento ao clicar no mês, em ordem de data. */
  itens: ItemProjetado[];
  saldoFinal: Centavos;
}

export type AlertaProjecao =
  | { tipo: 'negativo' | 'abaixoDoLimite'; competencia: Competencia; saldoFinal: Centavos }
  /** Renda atrasada ou receita avulsa prevista com data passada: fora da projeção. */
  | { tipo: 'naoIncluido'; item: ItemProjetado };

/** Simulador "E se?" (6.2): nada é gravado. */
export type Hipotetico =
  | {
      tipo: 'compra';
      descricao: string;
      cartaoId: Id;
      data: DataCivil;
      valorTotal: Centavos;
      numeroParcelas: number;
    }
  | {
      tipo: 'gastoFixo';
      descricao: string;
      valor: Centavos;
      dia: number;
      desde: Competencia;
      /** `null`: em conta. */
      cartaoId: Id | null;
    };

export interface Projecao {
  meses: MesProjetado[];
  alertas: AlertaProjecao[];
  /** Curva com os hipotéticos; `null` sem eles. A principal não muda. */
  simulacao: MesProjetado[] | null;
}

function cartaoDe(derivado: Derivado, id: Id): Cartao {
  const cartao = derivado.porId.cartoes.get(id);
  if (!cartao) throw new RangeError(`Cartão inexistente: ${id}`);
  return cartao;
}

/** Item no grupo Faturas, no vencimento da fatura `competencia`. */
function naFatura(
  derivado: Derivado,
  cartao: Cartao,
  competencia: Competencia,
  item: Pick<ItemProjetado, 'valor' | 'texto' | 'ref'>,
): ItemProjetado {
  const { vencimento } = datasDaFatura(cartao, derivado.fatos.cartaoCiclos, competencia);
  return {
    ...item,
    grupo: 'faturas',
    data: vencimento,
    fatura: { cartaoId: cartao.id, competencia },
  };
}

/** Itens pendentes de contas incluídas no total; os que não entram (e geram alerta) à parte. */
function pendentes(derivado: Derivado, ate: DataCivil) {
  const { fatos, hoje, porId } = derivado;
  const incluida = (contaId: Id | null) => {
    const conta = contaId === null ? undefined : porId.contas.get(contaId);
    return conta !== undefined && conta.incluirNoTotal && !conta.arquivada;
  };
  const itens: ItemProjetado[] = [];
  const fora: ItemProjetado[] = [];

  // Avulsos previstos: receita com data passada fica fora; despesa vencida entra.
  for (const l of fatos.lancamentos) {
    if (l.status !== 'previsto' || !incluida(l.contaId)) continue;
    const receita = l.tipo === 'receita';
    (receita && l.data < hoje ? fora : itens).push({
      grupo: receita ? 'receitasAvulsas' : 'despesasAvulsas',
      data: l.data,
      valor: l.valor,
      texto: juntar(l.descricao) || (porId.categorias.get(l.categoriaId as Id)?.nome ?? ''),
      ref: { entidade: 'lancamento', id: l.id },
      fatura: null,
    });
  }

  // Recorrências não confirmadas nem ignoradas, desde o início (vencidas e atrasadas também).
  const atual = competenciaDe(hoje);
  const inicio = fatos.recorrencias
    .filter((r) => r.ativa)
    .reduce((a, r) => (r.competenciaInicio < a ? r.competenciaInicio : a), atual);
  for (let m = inicio; m <= competenciaDe(ate); m = somarMeses(m, 1))
    for (const o of m === atual ? derivado.ocorrenciasDoMes : ocorrenciasDoMes(fatos, m, hoje)) {
      if (o.status === 'confirmada' || o.status === 'ignorada') continue;
      const { descricao } = o.recorrencia;
      const ref = {
        entidade: 'ocorrencia',
        recorrenciaId: o.recorrenciaId,
        competencia: o.competencia,
      } as const;
      const base = { data: o.data, valor: o.valor, texto: descricao, ref, fatura: null };
      if (o.recorrencia.natureza === 'gasto' && o.cartaoId !== null) {
        // Gasto fixo no cartão: só dentro da fatura em que cai, nunca em "Gastos fixos em conta".
        const cartao = cartaoDe(derivado, o.cartaoId);
        if (incluida(cartao.contaPagamentoId))
          itens.push(
            naFatura(derivado, cartao, faturaDoGastoNoCartao(fatos, o) as Competencia, {
              ...base,
              texto: juntar(descricao, cartao.nome),
            }),
          );
      } else if (incluida(o.contaId)) {
        if (o.recorrencia.natureza === 'gasto') itens.push({ ...base, grupo: 'gastosFixosConta' });
        else (o.status === 'atrasada' ? fora : itens).push({ ...base, grupo: 'rendas' });
      }
    }

  // Faturas com saldo (paga e transportada têm saldo zero); vencidas entram no mês corrente.
  for (const [cartaoId, faturas] of derivado.faturas) {
    const cartao = cartaoDe(derivado, cartaoId);
    if (!incluida(cartao.contaPagamentoId)) continue;
    for (const f of faturas)
      if (f.saldo > 0)
        itens.push(
          naFatura(derivado, cartao, f.competencia, {
            valor: f.saldo,
            texto: `Fatura ${cartao.nome} · vence ${ddmm(f.vencimento)}`,
            ref: { entidade: 'fatura' },
          }),
        );
  }

  // Parcelas de dívida não pagas, valor integral.
  for (const { divida, parcelas } of derivado.dividas.values()) {
    if (!incluida(divida.contaDebitoId)) continue;
    for (const p of parcelas)
      if (p.status === 'a_vencer' || p.status === 'vencida')
        itens.push({
          grupo: 'parcelasDividas',
          data: p.vencimento,
          valor: p.valor,
          texto: juntar(divida.credor, `${String(p.numero)}/${String(parcelas.length)}`),
          ref: { entidade: 'parcelaDivida', id: p.id },
          fatura: null,
        });
  }
  return { itens, fora };
}

function hipoteticos(derivado: Derivado, h: Hipotetico, ate: DataCivil): ItemProjetado[] {
  const { fatos, hoje } = derivado;
  const ref = { entidade: 'hipotetico' } as const;
  if (h.tipo === 'compra') {
    const cartao = cartaoDe(derivado, h.cartaoId);
    return gerarParcelas(h, cartao, fatos.cartaoCiclos).map((p) =>
      naFatura(derivado, cartao, p.competencia, {
        valor: p.valor,
        texto: juntar(
          h.descricao,
          h.numeroParcelas > 1 ? `${String(p.numero)}/${String(h.numeroParcelas)}` : null,
          cartao.nome,
        ),
        ref,
      }),
    );
  }
  const itens: ItemProjetado[] = [];
  const atual = competenciaDe(hoje);
  for (let m = h.desde > atual ? h.desde : atual; m <= competenciaDe(ate); m = somarMeses(m, 1)) {
    const data = diaNoMes(m, h.dia);
    if (data < hoje) continue;
    const item = { valor: h.valor, texto: h.descricao, ref };
    if (h.cartaoId === null) itens.push({ ...item, grupo: 'gastosFixosConta', data, fatura: null });
    else {
      const cartao = cartaoDe(derivado, h.cartaoId);
      itens.push(
        naFatura(derivado, cartao, faturaDaCompra(cartao, fatos.cartaoCiclos, data), {
          ...item,
          texto: juntar(h.descricao, cartao.nome),
        }),
      );
    }
  }
  return itens;
}

/** Saldo_m = Saldo_{m−1} + Rendas + Receitas avulsas − Gastos fixos − Faturas − Parcelas − Despesas avulsas. */
function meses(
  itens: readonly ItemProjetado[],
  inicial: Centavos,
  hoje: DataCivil,
  ate: DataCivil,
): MesProjetado[] {
  const atual = competenciaDe(hoje);
  const porMes = new Map<Competencia, ItemProjetado[]>();
  for (const i of itens) {
    if (i.data > ate) continue;
    const m = i.data < hoje ? atual : competenciaDe(i.data);
    const doMes = porMes.get(m);
    if (doMes) doMes.push(i);
    else porMes.set(m, [i]);
  }
  const lista: MesProjetado[] = [];
  let saldo = inicial;
  for (let m = atual; m <= competenciaDe(ate); m = somarMeses(m, 1)) {
    const doMes = (porMes.get(m) ?? []).sort((a, b) => a.data.localeCompare(b.data));
    const grupos = Object.fromEntries(
      GRUPOS.map((g) => [g, somar(doMes.filter((i) => i.grupo === g).map((i) => i.valor))]),
    ) as Record<GrupoProjecao, Centavos>;
    const saldoFinal = GRUPOS.reduce((s, g) => mais(s, centavos(SINAL[g] * grupos[g])), saldo);
    lista.push({
      competencia: m,
      de: m === atual ? hoje : primeiroDia(m),
      ate: minData(ultimaData(m), ate),
      saldoInicial: saldo,
      grupos,
      itens: doMes,
      saldoFinal,
    });
    saldo = saldoFinal;
  }
  return lista;
}

/**
 * Projeção de hoje até `ate`, mês a mês, a partir do **Saldo em contas** de hoje (3.9). "Hoje"
 * é o do `derivado`. O **Previsto até o fim do mês** é `projetarFluxo(d, último dia do mês).meses[0].saldoFinal`.
 */
export function projetarFluxo(
  derivado: Derivado,
  ate: DataCivil,
  simulados: readonly Hipotetico[] = [],
): Projecao {
  const { fatos, hoje } = derivado;
  if (ate < hoje) throw new RangeError(`Projeção termina antes de hoje: ${ate}`);
  const inicial = somar(
    fatos.contas
      .filter((c) => c.incluirNoTotal && !c.arquivada)
      .map((c) => derivado.saldos.get(c.id)?.atual ?? centavos(0)),
  );
  const { itens, fora } = pendentes(derivado, ate);
  const principal = meses(itens, inicial, hoje, ate);
  const limite = fatos.preferencias?.limiteAlerta ?? 0;
  const alertas: AlertaProjecao[] = [
    ...principal.flatMap(({ competencia, saldoFinal }): AlertaProjecao[] =>
      saldoFinal < 0
        ? [{ tipo: 'negativo', competencia, saldoFinal }]
        : saldoFinal < limite
          ? [{ tipo: 'abaixoDoLimite', competencia, saldoFinal }]
          : [],
    ),
    ...fora.map((item) => ({ tipo: 'naoIncluido' as const, item })),
  ];
  const extras = simulados.flatMap((h) => hipoteticos(derivado, h, ate));
  return {
    meses: principal,
    alertas,
    simulacao: simulados.length === 0 ? null : meses([...itens, ...extras], inicial, hoje, ate),
  };
}

/** Data da última parcela de cada dívida em aberto e de cada compra parcelada com parcela a pagar (6.2). */
export function previsaoDeQuitacao(derivado: Derivado): {
  dividas: { dividaId: Id; data: DataCivil }[];
  compras: { compraId: Id; cartaoId: Id; data: DataCivil }[];
} {
  const dividas = [...derivado.dividas.values()].flatMap(({ divida, resumo }) =>
    resumo.quitacaoPrevista === null
      ? []
      : [{ dividaId: divida.id, data: resumo.quitacaoPrevista }],
  );
  const compras = new Map<Id, { compraId: Id; cartaoId: Id; data: DataCivil }>();
  for (const [cartaoId, faturas] of derivado.faturas)
    for (const f of faturas) {
      if (f.status === 'paga' || f.status === 'transportada') continue;
      for (const i of f.itens)
        if (i.tipo === 'parcela' && i.compra.numeroParcelas > 1)
          compras.set(i.compra.id, { compraId: i.compra.id, cartaoId, data: f.vencimento });
    }
  const porData = <T extends { data: DataCivil }>(a: T, b: T) => a.data.localeCompare(b.data);
  return { dividas: dividas.sort(porData), compras: [...compras.values()].sort(porData) };
}
