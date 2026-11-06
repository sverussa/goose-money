import {
  aplicar,
  type Centavos,
  type Comando,
  type Competencia,
  type Conta,
  type Contexto,
  dataCivil,
  type DataCivil,
  editarConta,
  type Fatos,
  lancar,
  novaCompra,
  pagarFatura,
  somarDias,
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
    observacao: z.string(),
    /** "Mais opções" (7.3): despesa ou receita avulsa que ainda vai acontecer. */
    previsto: z.boolean(),
    /** Data anterior ao saldo inicial da conta (3.4): manter fora do saldo (padrão) ou mudar a data. */
    saldoInicial: z.enum(['manter', 'mudar']),
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

/** Só despesa e receita podem ser previstas (3.1). */
export const podeSerPrevisto = (tipo: TipoDoFormulario) => tipo === 'despesa' || tipo === 'receita';

/**
 * A conta cujo saldo inicial é posterior à data de um movimento efetivado (3.4): o movimento fica
 * "Anterior ao saldo inicial" e fora do saldo. Compras no cartão e previstos não mexem no saldo.
 */
export function contaComDataPosterior(fatos: Fatos, v: ValoresDoFormulario): Conta | null {
  if (v.tipo === 'compra' || (v.previsto && podeSerPrevisto(v.tipo))) return null;
  const conta = fatos.contas.find((c) => c.id === v.contaId);
  return conta && v.data && v.data <= conta.dataSaldoInicial ? conta : null;
}

/** "Mudar a data do saldo inicial": para a véspera do movimento, que passa a contar no saldo. */
export const novaDataDoSaldoInicial = (data: string): DataCivil => somarDias(dataCivil(data), -1);

/** Dois comandos gravados juntos, numa transação; o Desfazer desfaz os dois. */
function emSequencia(fatos: Fatos, primeiro: Comando, segundo: (f: Fatos) => Comando): Comando {
  const depois = segundo(aplicar(fatos, primeiro.mudancas));
  return {
    mudancas: [...primeiro.mudancas, ...depois.mudancas],
    inversas: [...depois.inversas, ...primeiro.inversas],
    descricao: depois.descricao,
  };
}

/** O comando do core para o que foi digitado; o core valida as regras e lança `ErroDeDominio`. */
export function comandoDoFormulario(fatos: Fatos, ctx: Contexto, v: ValoresDoFormulario): Comando {
  const conta = contaComDataPosterior(fatos, v);
  if (conta && v.saldoInicial === 'mudar')
    return emSequencia(
      fatos,
      editarConta(fatos, ctx, conta.id, { dataSaldoInicial: novaDataDoSaldoInicial(v.data) }),
      (f) => comandoSimples(f, ctx, v),
    );
  return comandoSimples(fatos, ctx, v);
}

function comandoSimples(fatos: Fatos, ctx: Contexto, v: ValoresDoFormulario): Comando {
  const data = dataCivil(v.data);
  const valor = v.valor as Centavos;
  const descricao = v.descricao.trim() || null;
  const observacao = v.observacao.trim() || null;
  switch (v.tipo) {
    case 'compra':
      return novaCompra(fatos, ctx, {
        cartaoId: v.cartaoId,
        data,
        descricao,
        categoriaId: v.categoriaId,
        observacao,
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
        status: v.previsto && podeSerPrevisto(v.tipo) ? 'previsto' : 'efetivado',
        data,
        valor,
        descricao,
        observacao,
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
