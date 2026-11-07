import {
  type Cartao,
  type Centavos,
  type Competencia,
  type DataCivil,
  datasDaFatura,
  type Derivado,
  type Fatura,
  type Id,
  type ItemDaFatura,
  somarMeses,
} from '@goose-money/core';

import { formatarData, formatarMesCurto, formatarMoeda } from '@/app/formatacao';

import { mensagensCartoes } from './mensagens';

const m = mensagensCartoes.fatura;

/** Uma linha da lista de itens da fatura (6.5), com os textos prontos. */
export interface LinhaDaFatura {
  chave: string;
  /** Data da compra ou do item; o transporte de M−1 não tem. */
  data: DataCivil | null;
  texto: string;
  detalhe: string;
  /** Chip informativo ("Estorno", "Comprada no dia do fechamento"…). */
  chip: string | null;
  valor: Centavos;
  /** A compra da linha, para o menu da compra (T05-14). */
  compraId: Id | null;
}

/** A fatura da URL (`?fatura=AAAA-MM`) ou, sem ela ou se não existir, a aberta (6.5). */
export function faturaEscolhida(faturas: readonly Fatura[], param: string | null): Fatura | null {
  return (
    faturas.find((f) => f.competencia === param) ??
    faturas.find((f) => f.status === 'aberta') ??
    faturas.at(-1) ??
    null
  );
}

/** Textos de cada item de `montarFaturas` (3.5), na ordem do core. */
export function linhasDaFatura(d: Derivado, cartao: Cartao, f: Fatura): LinhaDaFatura[] {
  const categoria = (id: Id | null) => (id ? d.porId.categorias.get(id)?.nome : undefined);
  const fechouAntes = datasDaFatura(
    cartao,
    d.fatos.cartaoCiclos,
    somarMeses(f.competencia, -1),
  ).fechamento;
  const de = (c: Competencia) => m.daFatura(formatarMesCurto(c));
  return f.itens.map((i: ItemDaFatura, k): LinhaDaFatura => {
    const base = { chave: String(k), chip: null, valor: i.valor, compraId: null };
    switch (i.tipo) {
      case 'parcela': {
        const { compra, parcela } = i;
        const n = compra.numeroParcelas;
        const nome = compra.descricao ?? categoria(compra.categoriaId) ?? m.compra;
        return {
          ...base,
          chave: parcela.id,
          data: compra.data,
          texto: n > 1 ? m.parcela(nome, parcela.numero, n) : nome,
          detalhe: [
            categoria(compra.categoriaId),
            n > 1 ? m.parcelado(formatarMoeda(compra.valorTotal), n) : m.aVista,
          ]
            .filter(Boolean)
            .join(' · '),
          // A compra do próprio dia do fechamento cai nesta fatura, não na anterior (3.5).
          chip: parcela.numero === 1 && compra.data === fechouAntes ? m.noFechamento : null,
          compraId: compra.id,
        };
      }
      case 'saldo_anterior_nao_pago':
      case 'credito_pagamento':
        return {
          ...base,
          chave: i.tipo,
          data: null,
          texto: m.tipos[i.tipo],
          detalhe: de(i.de),
        };
      default: {
        const { item } = i;
        const compra = item.compraId ? d.porId.compras.get(item.compraId) : undefined;
        return {
          ...base,
          chave: item.id,
          data: item.data,
          texto: item.descricao ?? m.tipos[i.tipo],
          detalhe:
            i.tipo === 'saldo_anterior_cadastro'
              ? m.naoEDespesa
              : compra
                ? m.daCompra(compra.descricao ?? m.compra, formatarData(compra.data).slice(0, 5))
                : (categoria(item.categoriaId) ?? ''),
          chip: i.tipo === 'saldo_anterior_cadastro' ? null : m.tipos[i.tipo],
          compraId: compra?.id ?? null,
        };
      }
    }
  });
}
