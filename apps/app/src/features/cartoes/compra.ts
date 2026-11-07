import {
  type Centavos,
  centavos,
  dataCivil,
  type DataCivil,
  type Id,
  type NovaCompra,
  totalPelaParcela,
} from '@goose-money/core';

import { mensagensCartoes } from './mensagens';

// Nova compra (6.5): camada de formulário (9.1), separada do modelo do core.

/** Atalhos do número de parcelas (NovaCompra.dc.html); outros vão no campo "Outro". */
export const PARCELAS_RAPIDAS = [2, 3, 6, 10, 12] as const;
/** Teto do campo "Outro" (decisão em DECISOES-PENDENTES-ETAPA5, T05-13). */
export const MAX_PARCELAS = 99;

export interface ValoresDaCompra {
  /** Com "Parcelado", o valor digitado pode ser o da parcela (parcela × n = total). */
  modo: 'total' | 'parcela';
  valor: Centavos;
  descricao: string;
  categoriaId: Id;
  data: string;
  parcelado: boolean;
  parcelas: number;
}

export type ErrosDaCompra = Partial<Record<'valor' | 'data' | 'parcelas', string>>;

const e = mensagensCartoes.compra.erros;

export function dataValida(s: string): DataCivil | null {
  try {
    return dataCivil(s);
  } catch {
    return null;
  }
}

export const numeroDeParcelas = (v: ValoresDaCompra) => (v.parcelado ? v.parcelas : 1);

export function errosDaCompra(v: ValoresDaCompra): ErrosDaCompra {
  const erros: ErrosDaCompra = {};
  if (v.valor <= 0) erros.valor = e.valor;
  if (!dataValida(v.data)) erros.data = e.data;
  if (
    v.parcelado &&
    !(Number.isInteger(v.parcelas) && v.parcelas >= 2 && v.parcelas <= MAX_PARCELAS)
  )
    erros.parcelas = e.parcelas(MAX_PARCELAS);
  return erros;
}

/** O valor total gravado: o digitado ou, no modo "Valor da parcela", parcela × n (core). */
export function totalDaCompra(v: ValoresDaCompra): Centavos {
  const n = numeroDeParcelas(v);
  return v.parcelado && v.modo === 'parcela' && n >= 1 ? totalPelaParcela(v.valor, n) : v.valor;
}

/** Os campos do comando `novaCompra`, ou `null` enquanto o formulário tem erro. */
export function camposDaCompra(cartaoId: Id, v: ValoresDaCompra): NovaCompra | null {
  const data = dataValida(v.data);
  if (!data || Object.keys(errosDaCompra(v)).length > 0) return null;
  return {
    cartaoId,
    data,
    descricao: v.descricao.trim() || null,
    categoriaId: v.categoriaId,
    observacao: null,
    valorTotal: totalDaCompra(v),
    numeroParcelas: numeroDeParcelas(v),
  };
}

export const valoresIniciaisDaCompra = (hoje: DataCivil, categoriaId: Id): ValoresDaCompra => ({
  modo: 'total',
  valor: centavos(0),
  descricao: '',
  categoriaId,
  data: hoje,
  parcelado: false,
  parcelas: 2,
});
