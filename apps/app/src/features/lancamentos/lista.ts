import {
  type Centavos,
  centavos,
  type DataCivil,
  type Derivado,
  despesasReconhecidas,
  entradasESaidasDeCaixa,
  type EstadoDaMovimentacao,
  type FiltrosDeReconhecimento,
  type Id,
  type ItemDeMovimentacao,
  type ItemReconhecido,
  mais,
  menos,
  movimentacoes,
  negar,
  type OrigemDoItem,
  type Periodo,
  receitasReconhecidas,
  somarItens,
  type TipoDaMovimentacao,
} from '@goose-money/core';

import type { EstadoDoChip } from '@/components/estados';

// Lançamentos (6.3): o estado da URL, os itens do core nas duas visões e as linhas da lista.

export type Visao = 'competencia' | 'movimentacoes';

/** Estados de 3.1 do filtro. Sem `estado` na URL, só os realizados. */
export const ESTADOS = ['liquidado', 'a_pagar', 'vencido', 'previsto', 'atrasado'] as const;
export type EstadoDoFiltro = (typeof ESTADOS)[number];
export const REALIZADOS: readonly EstadoDoFiltro[] = ['liquidado', 'a_pagar', 'vencido'];
export const ORIGENS: readonly OrigemDoItem[] = ['manual', 'recorrencia', 'cartao', 'divida'];
export const TIPOS_DA_VISAO: Record<Visao, readonly TipoDaMovimentacao[]> = {
  competencia: ['receita', 'despesa'],
  movimentacoes: [
    'receita',
    'despesa',
    'transferencia',
    'compra',
    'pagamento_fatura',
    'ajuste',
    'captacao',
    'pagamento_divida',
    'amortizacao',
  ],
};

/** O que a URL guarda: visão, filtros de 6.3 e busca. Valores inválidos somem. */
export interface EstadoDaTela {
  visao: Visao;
  tipos: TipoDaMovimentacao[];
  contaId: Id | null;
  cartaoId: Id | null;
  categorias: Id[];
  estados: EstadoDoFiltro[];
  origens: OrigemDoItem[];
  busca: string;
}

const lista = (v: string | null) => (v ? v.split(',').filter(Boolean) : []);
const dentre = <T extends string>(validos: readonly T[], v: string | null): T[] =>
  lista(v).filter((x): x is T => validos.includes(x as T));

/**
 * Os parâmetros são os que os gráficos montam no clique (8): `visao`, `tipo`, `conta`, `cartao`,
 * `categoria`, `estado` e `origem` (listas separadas por vírgula) e `q`, além do período.
 */
export function estadoDaUrl(busca: URLSearchParams): EstadoDaTela {
  const visao = busca.get('visao') === 'movimentacoes' ? 'movimentacoes' : 'competencia';
  const estados = dentre(ESTADOS, busca.get('estado'));
  return {
    visao,
    tipos: dentre(TIPOS_DA_VISAO[visao], busca.get('tipo')),
    contaId: busca.get('conta') || null,
    cartaoId: busca.get('cartao') || null,
    categorias: lista(busca.get('categoria')),
    estados: estados.length ? estados : [...REALIZADOS],
    origens: dentre(ORIGENS, busca.get('origem')),
    busca: busca.get('q')?.trim() ?? '',
  };
}

/** Quantos filtros estão ativos (para "Limpar filtros"). */
export const filtrosAtivos = (e: EstadoDaTela): number =>
  [
    e.tipos.length > 0,
    e.contaId !== null,
    e.cartaoId !== null,
    e.categorias.length > 0,
    e.estados.join() !== REALIZADOS.join(),
    e.origens.length > 0,
  ].filter(Boolean).length;

/** Filtros do reconhecimento (3.3) para a visão Receitas e despesas. */
export function filtrosDeReconhecimento(e: EstadoDaTela): FiltrosDeReconhecimento {
  const tipo = e.tipos.length === 1 ? e.tipos[0] : undefined;
  return {
    ...(tipo === 'receita' || tipo === 'despesa' ? { tipo } : {}),
    ...(e.contaId ? { contaId: e.contaId } : {}),
    ...(e.cartaoId ? { cartaoId: e.cartaoId } : {}),
    ...(e.categorias.length ? { categorias: e.categorias } : {}),
    ...(e.origens.length ? { origens: e.origens } : {}),
    ...(e.busca ? { busca: e.busca } : {}),
  };
}

/** Estados da visão por evento: qualquer realizado do filtro vale "realizado". */
function estadosDaMovimentacao(e: EstadoDaTela): EstadoDaMovimentacao[] {
  return [
    ...(e.estados.some((x) => REALIZADOS.includes(x)) ? (['realizado'] as const) : []),
    ...(e.estados.includes('previsto') ? (['previsto'] as const) : []),
    ...(e.estados.includes('atrasado') ? (['atrasado'] as const) : []),
  ];
}

const filtrosDeMovimentacao = (e: EstadoDaTela, estados: EstadoDaMovimentacao[]) => ({
  ...(e.tipos.length ? { tipos: e.tipos } : {}),
  ...(e.contaId ? { contaId: e.contaId } : {}),
  ...(e.cartaoId ? { cartaoId: e.cartaoId } : {}),
  ...(e.categorias.length ? { categorias: e.categorias } : {}),
  ...(e.origens.length ? { origens: e.origens } : {}),
  ...(e.busca ? { busca: e.busca } : {}),
  estados,
});

/** Um item como a lista mostra, venha ele do reconhecimento ou das movimentações. */
export interface ItemDaTela {
  chave: string;
  data: DataCivil;
  /** Com sinal para a lista: entrada positiva, saída negativa. */
  valor: Centavos;
  /** Cor e ícone: receita/entrada, despesa/saída ou neutro (transferência, pagamentos, ajuste). */
  natureza: 'entrada' | 'saida' | 'neutro';
  texto: string;
  categoriaId: Id | null;
  contaId: Id | null;
  contaDestinoId: Id | null;
  cartaoId: Id | null;
  origem: OrigemDoItem;
  chips: EstadoDoChip[];
  /** O registro que as ações gravam: o lançamento ou a compra (a parcela leva à compra). */
  lancamentoId: Id | null;
  compraId: Id | null;
  /** Previstos não somam no cabeçalho nem no total do dia (6.3). */
  soma: boolean;
  tipo: TipoDaMovimentacao | 'parcela' | 'item_fatura' | 'parcela_divida';
}

const chipDoEstado: Partial<Record<string, EstadoDoChip>> = {
  a_pagar: 'aPagar',
  vencido: 'vencido',
  previsto: 'previsto',
  atrasado: 'atrasado',
};

function doReconhecido(i: ItemReconhecido, d: Derivado): ItemDaTela {
  const { entidade, id } = i.registro;
  const compraId =
    entidade === 'parcela' ? (d.fatos.parcelas.find((p) => p.id === id)?.compraId ?? null) : null;
  const receita = i.tipo === 'receita';
  const chip = chipDoEstado[i.estado];
  return {
    chave: `${entidade}:${id}`,
    data: i.data,
    // Estorno e ajuste para menos são despesa negativa: aparecem como entrada.
    valor: receita ? i.valor : negar(i.valor),
    natureza: receita || i.valor < 0 ? 'entrada' : 'saida',
    texto: i.texto,
    categoriaId: i.categoriaId,
    contaId: i.contaId,
    contaDestinoId: null,
    cartaoId: i.cartaoId,
    origem: i.origem,
    chips: chip ? [chip] : [],
    lancamentoId: entidade === 'lancamento' ? id : null,
    compraId,
    soma: true,
    tipo:
      entidade === 'lancamento'
        ? i.tipo
        : entidade === 'parcela'
          ? 'parcela'
          : entidade === 'itemFatura'
            ? 'item_fatura'
            : 'parcela_divida',
  };
}

const NEUTROS: ReadonlySet<TipoDaMovimentacao> = new Set([
  'transferencia',
  'pagamento_fatura',
  'pagamento_divida',
  'amortizacao',
  'ajuste',
  'captacao',
]);

function daMovimentacao(i: ItemDeMovimentacao): ItemDaTela {
  const chip = chipDoEstado[i.estado];
  return {
    chave: `${i.registro.entidade}:${i.registro.id}`,
    data: i.data,
    valor: i.valor,
    natureza: NEUTROS.has(i.tipo) ? 'neutro' : i.valor > 0 ? 'entrada' : 'saida',
    texto: i.texto,
    categoriaId: i.categoriaId,
    contaId: i.contaId,
    contaDestinoId: i.contaDestinoId,
    cartaoId: i.cartaoId,
    origem: i.origem,
    chips: chip ? [chip] : [],
    lancamentoId: i.registro.entidade === 'lancamento' ? i.registro.id : null,
    compraId: i.registro.entidade === 'compra' ? i.registro.id : null,
    soma: i.estado === 'realizado',
    tipo: i.tipo,
  };
}

export interface Recorte {
  itens: ItemDaTela[];
  /** Os indicadores do cabeçalho, já com os rótulos da visão. */
  cabecalho: {
    chave: 'receitas' | 'despesas' | 'resultado' | 'entradas' | 'saidas';
    valor: Centavos;
  }[];
}

const maisRecentes = (a: ItemDaTela, b: ItemDaTela) =>
  b.data.localeCompare(a.data) || a.chave.localeCompare(b.chave);

/** Os itens e o cabeçalho do recorte, nas regras de cada visão (6.3). */
export function recorte(d: Derivado, periodo: Periodo, e: EstadoDaTela): Recorte {
  const estados = estadosDaMovimentacao(e);
  if (e.visao === 'movimentacoes') {
    const itens = movimentacoes(d.fatos, d.hoje, periodo, filtrosDeMovimentacao(e, estados));
    const { entradas, saidas } = entradasESaidasDeCaixa(itens);
    return {
      itens: itens.map(daMovimentacao).sort(maisRecentes),
      cabecalho: [
        { chave: 'entradas', valor: entradas },
        { chave: 'saidas', valor: saidas },
      ],
    };
  }
  const filtros = filtrosDeReconhecimento(e);
  const receitas = receitasReconhecidas(d, periodo, filtros).filter((i) =>
    e.estados.includes(i.estado),
  );
  const despesas = despesasReconhecidas(d, periodo, filtros).filter((i) =>
    e.estados.includes(i.estado),
  );
  // Previstos avulsos só com o filtro de estado, com chip e fora dos totais (6.3).
  const previstos = estados.some((x) => x !== 'realizado')
    ? movimentacoes(d.fatos, d.hoje, periodo, {
        ...filtrosDeMovimentacao(
          e,
          estados.filter((x) => x !== 'realizado'),
        ),
        tipos: e.tipos.length ? e.tipos : ['receita', 'despesa'],
      }).map((i) => ({ ...daMovimentacao(i), soma: false }))
    : [];
  const r = somarItens(receitas);
  const dsp = somarItens(despesas);
  return {
    itens: [...[...receitas, ...despesas].map((i) => doReconhecido(i, d)), ...previstos].sort(
      maisRecentes,
    ),
    cabecalho: [
      { chave: 'receitas', valor: r },
      { chave: 'despesas', valor: dsp },
      { chave: 'resultado', valor: menos(r, dsp) },
    ],
  };
}

export type Linha =
  | {
      tipo: 'dia';
      data: DataCivil;
      total: Centavos;
      /** Dia sem movimento de caixa (6.3): só compras no cartão, ou também transferências. */
      semCaixa: 'cartao' | 'total' | null;
    }
  | { tipo: 'item'; item: ItemDaTela; ultimo: boolean };

/** Uma linha por dia, com o total do dia (entradas − saídas que somam), e os itens dele. */
export function linhasPorDia(itens: readonly ItemDaTela[]): Linha[] {
  const linhas: Linha[] = [];
  let i = 0;
  while (i < itens.length) {
    const data = (itens[i] as ItemDaTela).data;
    let j = i;
    while (j < itens.length && (itens[j] as ItemDaTela).data === data) j++;
    const doDia = itens.slice(i, j);
    const contam = doDia.filter((x) => x.soma && x.tipo !== 'transferencia' && x.tipo !== 'compra');
    const total = contam.reduce((s, x) => mais(s, x.valor), centavos(0));
    const semCaixa =
      contam.length > 0 || !doDia.some((x) => x.soma)
        ? null
        : doDia.every((x) => x.tipo === 'compra')
          ? 'cartao'
          : 'total';
    linhas.push({ tipo: 'dia', data, total, semCaixa });
    doDia.forEach((item, k) => linhas.push({ tipo: 'item', item, ultimo: k === doDia.length - 1 }));
    i = j;
  }
  return linhas;
}

const diaDaSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' });

/** `2026-10-31` → "Sáb, 31/10" (Lancamentos.dc.html). */
export function rotuloDoDia(d: DataCivil): string {
  const semana = diaDaSemana.format(new Date(`${d}T12:00:00Z`)).replace('.', '');
  return `${semana.charAt(0).toUpperCase()}${semana.slice(1)}, ${d.slice(8)}/${d.slice(5, 7)}`;
}
