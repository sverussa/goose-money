import type { Centavos, DataCivil, Fatos, Id } from '@goose-money/core';

import type { TipoDeValor } from '@/components/MoneyText';

/** Sem acento nem caixa: "alimentação" acha "Alimentacao". */
export const normalizar = (s: string): string =>
  s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

export const combina = (texto: string, termo: string): boolean =>
  normalizar(texto).includes(normalizar(termo));

export interface LancamentoAchado {
  id: Id;
  descricao: string;
  data: DataCivil;
  valor: Centavos;
  tipo: TipoDeValor;
}

/** A partir de quantas letras a busca procura nos lançamentos (telas e ações: desde a primeira). */
export const MINIMO_PARA_LANCAMENTOS = 2;

/**
 * Lançamentos e compras no cartão cuja descrição contém o termo (D45), os mais recentes primeiro.
 * Só listagem: nenhum valor é calculado aqui.
 */
export function buscarLancamentos(
  fatos: Pick<Fatos, 'lancamentos' | 'compras'>,
  termo: string,
  limite = 8,
): LancamentoAchado[] {
  if (normalizar(termo).length < MINIMO_PARA_LANCAMENTOS) return [];
  const tipoDe = (t: string): TipoDeValor =>
    t === 'receita' ? 'receita' : t === 'despesa' ? 'despesa' : 'neutro';
  return [
    ...fatos.lancamentos.map((l) => ({
      id: l.id,
      descricao: l.descricao,
      data: l.data,
      valor: l.valor,
      tipo: tipoDe(l.tipo),
    })),
    ...fatos.compras.map((c) => ({
      id: c.id,
      descricao: c.descricao,
      data: c.data,
      valor: c.valorTotal,
      tipo: 'despesa' as const,
    })),
  ]
    .filter((x): x is LancamentoAchado => x.descricao !== null && combina(x.descricao, termo))
    .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0))
    .slice(0, limite);
}
