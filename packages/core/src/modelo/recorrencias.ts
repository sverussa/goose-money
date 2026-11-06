import { z } from 'zod';
import {
  centavosPositivosSchema,
  centavosSchema,
  competenciaSchema,
  conformeTipo,
  controle,
  dataCivilSchema,
  diaSchema,
  exigir,
  idSchema,
  textoSchema,
} from './comum';

/** MODELO-DADOS.md 3.11 a 3.13. */

export const naturezaRecorrenciaSchema = z.enum(['renda', 'gasto']);
export type NaturezaRecorrencia = z.infer<typeof naturezaRecorrenciaSchema>;
export const formaPagamentoSchema = z.enum(['conta', 'cartao']);
export type FormaPagamento = z.infer<typeof formaPagamentoSchema>;
export const situacaoOcorrenciaSchema = z.enum(['confirmada', 'ignorada']);
export type SituacaoOcorrencia = z.infer<typeof situacaoOcorrenciaSchema>;

export const recorrenciaSchema = z
  .strictObject({
    ...controle,
    natureza: naturezaRecorrenciaSchema,
    descricao: textoSchema,
    competenciaInicio: competenciaSchema,
    competenciaFim: competenciaSchema.nullable(),
    autoConfirmar: z.boolean(),
    ativa: z.boolean(),
  })
  .superRefine((r, ctx) => {
    exigir(
      ctx,
      r.competenciaFim === null || r.competenciaFim >= r.competenciaInicio,
      'competenciaFim',
      'Fim antes do início',
    );
  });
export type Recorrencia = z.infer<typeof recorrenciaSchema>;

export const recorrenciaVersaoSchema = z
  .strictObject({
    ...controle,
    recorrenciaId: idSchema,
    vigenteDesde: competenciaSchema,
    valor: centavosPositivosSchema,
    dia: diaSchema,
    formaPagamento: formaPagamentoSchema,
    contaId: idSchema.nullable(),
    cartaoId: idSchema.nullable(),
    categoriaId: idSchema,
  })
  .superRefine((v, ctx) => {
    conformeTipo(
      v,
      ctx,
      ['contaId', 'cartaoId'],
      [v.formaPagamento === 'conta' ? 'contaId' : 'cartaoId'],
    );
  });
export type RecorrenciaVersao = z.infer<typeof recorrenciaVersaoSchema>;

const retrato = [
  'valor',
  'data',
  'categoriaId',
  'contaId',
  'lancamentoId',
  'cartaoId',
  'compraId',
] as const;

export const ocorrenciaSchema = z
  .strictObject({
    ...controle,
    recorrenciaId: idSchema,
    competencia: competenciaSchema,
    situacao: situacaoOcorrenciaSchema,
    valor: centavosSchema.nullable(),
    data: dataCivilSchema.nullable(),
    contaId: idSchema.nullable(),
    cartaoId: idSchema.nullable(),
    categoriaId: idSchema.nullable(),
    lancamentoId: idSchema.nullable(),
    compraId: idSchema.nullable(),
  })
  .superRefine((o, ctx) => {
    // Confirmada: valor, data, categoria e exatamente um par (conta + lançamento) ou (cartão + compra).
    const emConta = o.contaId !== null || o.lancamentoId !== null;
    conformeTipo(
      o,
      ctx,
      retrato,
      o.situacao === 'ignorada'
        ? []
        : [
            'valor',
            'data',
            'categoriaId',
            ...(emConta
              ? (['contaId', 'lancamentoId'] as const)
              : (['cartaoId', 'compraId'] as const)),
          ],
    );
  });
export type Ocorrencia = z.infer<typeof ocorrenciaSchema>;
