import {
  type Centavos,
  centavos,
  dataCivil,
  type DataCivil,
  type Fatos,
  type Id,
  mais,
  type Compra,
  type NovaCompra,
  somar,
  totalPelaParcela,
} from '@goose-money/core';

import { mensagensCartoes } from './mensagens';

// Nova compra (6.5): camada de formulário (9.1), separada do modelo do core.

/** Atalhos do número de parcelas (NovaCompra.dc.html); outros vão no campo "Outro". */
export const PARCELAS_RAPIDAS = [2, 3, 6, 10, 12] as const;
/** Teto do campo "Outro" (decisão em DECISOES-PENDENTES-ETAPA5, T05-13). */
export const MAX_PARCELAS = 99;

export interface ValoresDaCompra {
  cartaoId: Id;
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
export function camposDaCompra(v: ValoresDaCompra): NovaCompra | null {
  const data = dataValida(v.data);
  if (!data || Object.keys(errosDaCompra(v)).length > 0) return null;
  return {
    cartaoId: v.cartaoId,
    data,
    descricao: v.descricao.trim() || null,
    categoriaId: v.categoriaId,
    observacao: null,
    valorTotal: totalDaCompra(v),
    numeroParcelas: numeroDeParcelas(v),
  };
}

export const valoresIniciaisDaCompra = (
  cartaoId: Id,
  hoje: DataCivil,
  categoriaId: Id,
): ValoresDaCompra => ({
  cartaoId,
  modo: 'total',
  valor: centavos(0),
  descricao: '',
  categoriaId,
  data: hoje,
  parcelado: false,
  parcelas: 2,
});

/** "Editar valor, parcelas, data ou cartão" (T05-14): a Nova compra reaberta com a compra gravada. */
export const valoresDaCompraGravada = (c: Compra): ValoresDaCompra => ({
  cartaoId: c.cartaoId,
  modo: 'total',
  valor: c.valorTotal,
  descricao: c.descricao ?? '',
  categoriaId: c.categoriaId,
  data: c.data,
  parcelado: c.numeroParcelas > 1,
  parcelas: c.numeroParcelas > 1 ? c.numeroParcelas : 2,
});

/** "Lançar ajuste" (3.6): valor efetivo = valorTotal + ajustes, estornos e encargos vinculados. */
export const valorEfetivo = (fatos: Fatos, compra: Compra): Centavos =>
  mais(
    compra.valorTotal,
    somar(fatos.itensFatura.filter((i) => i.compraId === compra.id).map((i) => i.valor)),
  );
