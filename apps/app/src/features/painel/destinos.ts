import {
  type Competencia,
  dataCivil,
  type Derivado,
  type ItemReconhecido,
  maxData,
  minData,
  type Periodo,
  periodo,
  periodoParaUrl,
  primeiroDia,
  ultimaData,
} from '@goose-money/core';

// Destinos dos cliques dos gráficos da Visão geral (8.1): a URL leva visão, período e filtros.

export interface FiltrosDaLista {
  tipo?: 'receita' | 'despesa';
  categorias?: readonly string[];
  origens?: readonly string[];
  q?: string;
}

/** Lançamentos › Receitas e despesas no período, com os filtros do ponto clicado. */
export function lancamentosEm(p: Periodo, f: FiltrosDaLista = {}): string {
  const x = new URLSearchParams(periodoParaUrl(p));
  x.set('visao', 'competencia');
  if (f.tipo) x.set('tipo', f.tipo);
  if (f.categorias?.length) x.set('categoria', f.categorias.join(','));
  if (f.origens?.length) x.set('origem', f.origens.join(','));
  if (f.q) x.set('q', f.q);
  return `/lancamentos?${x.toString()}`;
}

/** O mês `m` dentro do período do seletor: o ponto do gráfico soma só esses dias. */
export const mesNoPeriodo = (m: Competencia, p: Periodo): Periodo =>
  periodo(maxData(primeiroDia(m), p.de), minData(ultimaData(m), p.ate));

/** Do dia 1 do mês até o dia `dia` (gasto acumulado), sem passar do fim do período. */
export const ateODia = (m: Competencia, dia: number, p: Periodo): Periodo => {
  const ate = dataCivil(`${m}-${String(dia).padStart(2, '0')}`);
  return periodo(primeiroDia(m), minData(ate, p.ate));
};

/**
 * "Maiores despesas" (8.1): o detalhe do item. Parcela e item de fatura abrem a fatura em que
 * caem; parcela de dívida, a dívida; lançamento, a lista daquele dia filtrada pela descrição.
 */
export function detalheDoItem(d: Derivado, i: ItemReconhecido): string {
  const { entidade, id } = i.registro;
  if (entidade === 'parcela') {
    const parcela = d.fatos.parcelas.find((p) => p.id === id);
    const compra = parcela && d.porId.compras.get(parcela.compraId);
    if (parcela && compra) return `/cartoes/${compra.cartaoId}?fatura=${parcela.competencia}`;
  }
  if (entidade === 'itemFatura') {
    const item = d.fatos.itensFatura.find((x) => x.id === id);
    if (item) return `/cartoes/${item.cartaoId}?fatura=${item.competencia}`;
  }
  if (entidade === 'parcelaDivida')
    for (const t of d.dividas.values())
      if (t.parcelas.some((p) => p.id === id)) return `/dividas/${t.divida.id}`;
  const lancamento = d.fatos.lancamentos.find((l) => l.id === id);
  return lancamentosEm(periodo(i.data, i.data), {
    tipo: 'despesa',
    q: lancamento?.descricao ?? undefined,
  });
}
