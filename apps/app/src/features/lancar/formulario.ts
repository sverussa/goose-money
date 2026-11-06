import {
  type Centavos,
  type Comando,
  type Competencia,
  type Contexto,
  dataCivil,
  type Fatos,
  lancar,
  novaCompra,
  pagarFatura,
} from '@goose-money/core';
import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form';
import { z } from 'zod';

import { mensagensLancar } from './mensagens';

// Camada de formulário (9.1): o que a pessoa digita, separado do modelo do core e do backup.

export const TIPOS = ['despesa', 'receita', 'compra', 'transferencia', 'pagamento'] as const;
export type TipoDoFormulario = (typeof TIPOS)[number];
/** Tipos que usam um cartão: sem cartão cadastrado, levam ao cadastro de cartão (D21). */
export const TIPOS_DE_CARTAO: readonly TipoDoFormulario[] = ['compra', 'pagamento'];

const e = mensagensLancar.erros;
const dataValida = (s: string) => {
  try {
    dataCivil(s);
    return true;
  } catch {
    return false;
  }
};

/** Os campos de todos os tipos; cada tipo exige os seus (`exigidos`). */
export const esquemaDoFormulario = z
  .object({
    tipo: z.enum(TIPOS),
    valor: z.number().int().positive(e.valor),
    descricao: z.string(),
    categoriaId: z.string(),
    data: z.string().refine(dataValida, e.data),
    contaId: z.string(),
    contaDestinoId: z.string(),
    cartaoId: z.string(),
    faturaCompetencia: z.string(),
  })
  .superRefine((v, ctx) => {
    const falta = (campo: keyof typeof v, message: string) => {
      if (!v[campo]) ctx.addIssue({ code: 'custom', path: [campo], message });
    };
    if (v.tipo === 'despesa' || v.tipo === 'receita' || v.tipo === 'compra')
      falta('categoriaId', e.categoria);
    if (v.tipo !== 'compra') falta('contaId', e.conta);
    if (v.tipo === 'compra' || v.tipo === 'pagamento') falta('cartaoId', e.cartao);
    if (v.tipo === 'pagamento') falta('faturaCompetencia', e.fatura);
    if (v.tipo === 'transferencia') {
      falta('contaDestinoId', e.contaDestino);
      if (v.contaDestinoId && v.contaDestinoId === v.contaId)
        ctx.addIssue({ code: 'custom', path: ['contaDestinoId'], message: e.mesmaConta });
    }
  });
export type ValoresDoFormulario = z.infer<typeof esquemaDoFormulario>;

/** Adaptador Zod → React Hook Form (D7), sem `@hookform/resolvers`: o primeiro erro de cada campo. */
export function resolverZod<T extends FieldValues>(schema: z.ZodType<T>): Resolver<T> {
  return (valores) => {
    const r = schema.safeParse(valores);
    if (r.success) return { values: r.data, errors: {} };
    const errors: Record<string, { type: string; message: string }> = {};
    for (const i of r.error.issues)
      errors[i.path.join('.')] ??= { type: i.code, message: i.message };
    return { values: {}, errors: errors as FieldErrors<T> };
  };
}

/** O comando do core para o que foi digitado; o core valida as regras e lança `ErroDeDominio`. */
export function comandoDoFormulario(fatos: Fatos, ctx: Contexto, v: ValoresDoFormulario): Comando {
  const data = dataCivil(v.data);
  const valor = v.valor as Centavos;
  const descricao = v.descricao.trim() || null;
  switch (v.tipo) {
    case 'compra':
      return novaCompra(fatos, ctx, {
        cartaoId: v.cartaoId,
        data,
        descricao,
        categoriaId: v.categoriaId,
        observacao: null,
        valorTotal: valor,
        numeroParcelas: 1,
      });
    case 'pagamento':
      return pagarFatura(fatos, ctx, {
        cartaoId: v.cartaoId,
        valor,
        data,
        contaId: v.contaId,
        faturaCompetencia: v.faturaCompetencia as Competencia,
      });
    default:
      return lancar(fatos, ctx, {
        tipo: v.tipo,
        status: 'efetivado',
        data,
        valor,
        descricao,
        observacao: null,
        contaId: v.contaId,
        contaDestinoId: v.tipo === 'transferencia' ? v.contaDestinoId : null,
        categoriaId: v.tipo === 'transferencia' ? null : v.categoriaId,
        cartaoId: null,
        faturaCompetencia: null,
        dividaId: null,
        parcelaDividaId: null,
      });
  }
}
