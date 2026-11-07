import {
  type Centavos,
  type DataCivil,
  despesasReconhecidas,
  type Derivado,
  type FiltrosDeReconhecimento,
  type Id,
  type ItemReconhecido,
  menos,
  type OrigemDoItem,
  type Periodo,
  receitasReconhecidas,
  somarItens,
} from '@goose-money/core';

// Visão "Receitas e despesas" (6.3): o estado da URL, os itens do core e as linhas da lista.

export type Visao = 'competencia' | 'movimentacoes';

const ORIGENS: readonly OrigemDoItem[] = ['manual', 'recorrencia', 'cartao', 'divida'];
const lista = (v: string | null) => (v ? v.split(',').filter(Boolean) : undefined);

/** `?visao=` (padrão: competência). */
export const visaoDaUrl = (busca: URLSearchParams): Visao =>
  busca.get('visao') === 'movimentacoes' ? 'movimentacoes' : 'competencia';

/**
 * Filtros de 6.3 na URL, os mesmos que os gráficos montam (8): `tipo`, `conta`, `cartao`,
 * `categoria` e `origem` (listas separadas por vírgula) e `q` (busca). Valores inválidos somem.
 */
export function filtrosDaUrl(busca: URLSearchParams): FiltrosDeReconhecimento {
  const tipo = busca.get('tipo');
  const origens = lista(busca.get('origem'))?.filter((o): o is OrigemDoItem =>
    ORIGENS.includes(o as OrigemDoItem),
  );
  return {
    ...(tipo === 'receita' || tipo === 'despesa' ? { tipo } : {}),
    ...(busca.get('conta') ? { contaId: busca.get('conta') as Id } : {}),
    ...(busca.get('cartao') ? { cartaoId: busca.get('cartao') as Id } : {}),
    ...(lista(busca.get('categoria')) ? { categorias: lista(busca.get('categoria')) } : {}),
    ...(origens?.length ? { origens } : {}),
    ...(busca.get('q')?.trim() ? { busca: busca.get('q')?.trim() } : {}),
  };
}

/** Receitas e despesas reconhecidas do recorte, da mais recente para a mais antiga. */
export function itensDoRecorte(
  d: Derivado,
  periodo: Periodo,
  filtros: FiltrosDeReconhecimento,
): ItemReconhecido[] {
  return [
    ...receitasReconhecidas(d, periodo, filtros),
    ...despesasReconhecidas(d, periodo, filtros),
  ].sort((a, b) => b.data.localeCompare(a.data) || a.registro.id.localeCompare(b.registro.id));
}

export type Linha =
  | { tipo: 'dia'; data: DataCivil; total: Centavos }
  | { tipo: 'item'; item: ItemReconhecido; ultimo: boolean };

/** Uma linha por dia (com receitas − despesas do dia) seguida dos itens dele. */
export function linhasPorDia(itens: readonly ItemReconhecido[]): Linha[] {
  const linhas: Linha[] = [];
  let i = 0;
  while (i < itens.length) {
    const data = (itens[i] as ItemReconhecido).data;
    let j = i;
    while (j < itens.length && (itens[j] as ItemReconhecido).data === data) j++;
    const doDia = itens.slice(i, j);
    const total = menos(
      somarItens(doDia.filter((x) => x.tipo === 'receita')),
      somarItens(doDia.filter((x) => x.tipo === 'despesa')),
    );
    linhas.push({ tipo: 'dia', data, total });
    doDia.forEach((item, k) => linhas.push({ tipo: 'item', item, ultimo: k === doDia.length - 1 }));
    i = j;
  }
  return linhas;
}

const diaDaSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' });

/** `2026-10-31` → "Sex, 31/10" (Lancamentos.dc.html). */
export function rotuloDoDia(d: DataCivil): string {
  const semana = diaDaSemana.format(new Date(`${d}T12:00:00Z`)).replace('.', '');
  return `${semana.charAt(0).toUpperCase()}${semana.slice(1)}, ${d.slice(8)}/${d.slice(5, 7)}`;
}
