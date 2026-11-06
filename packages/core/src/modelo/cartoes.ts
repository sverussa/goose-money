import { z } from 'zod';
import {
  centavosComSinalSchema,
  centavosPositivosSchema,
  competenciaSchema,
  conformeTipo,
  controle,
  dataCivilSchema,
  exigir,
  idSchema,
  quantidadeSchema,
} from './comum';

/**
 * MODELO-DADOS.md 3.6 a 3.8. A alocação de pagamento não tem entidade: são os
 * campos `cartaoId` e `faturaCompetencia` do lançamento `pagamento_fatura` (D59).
 */

export const compraSchema = z.strictObject({
  ...controle,
  cartaoId: idSchema,
  data: dataCivilSchema,
  descricao: z.string().nullable(),
  categoriaId: idSchema,
  observacao: z.string().nullable(),
  valorTotal: centavosPositivosSchema,
  numeroParcelas: quantidadeSchema,
  cancelada: z.boolean(),
});
export type Compra = z.infer<typeof compraSchema>;

export const parcelaSchema = z.strictObject({
  ...controle,
  compraId: idSchema,
  numero: quantidadeSchema,
  valor: centavosPositivosSchema,
  competencia: competenciaSchema,
});
export type Parcela = z.infer<typeof parcelaSchema>;

export const tipoItemFaturaSchema = z.enum([
  'encargo',
  'estorno',
  'ajuste_compra',
  'saldo_anterior_cadastro',
]);
export type TipoItemFatura = z.infer<typeof tipoItemFaturaSchema>;

export const itemFaturaSchema = z
  .strictObject({
    ...controle,
    cartaoId: idSchema,
    competencia: competenciaSchema,
    tipo: tipoItemFaturaSchema,
    data: dataCivilSchema,
    valor: centavosComSinalSchema,
    descricao: z.string().nullable(),
    compraId: idSchema.nullable(),
    categoriaId: idSchema.nullable(),
  })
  .superRefine((i, ctx) => {
    switch (i.tipo) {
      case 'encargo':
        conformeTipo(i, ctx, ['compraId', 'categoriaId'], ['categoriaId']);
        exigir(ctx, i.valor > 0, 'valor', 'Precisa ser > 0');
        break;
      case 'saldo_anterior_cadastro':
        conformeTipo(i, ctx, ['compraId', 'categoriaId'], []);
        exigir(ctx, i.valor > 0, 'valor', 'Precisa ser > 0');
        break;
      case 'estorno': // compra opcional; sem ela, a categoria é obrigatória
        conformeTipo(i, ctx, ['categoriaId'], i.compraId === null ? ['categoriaId'] : []);
        exigir(ctx, i.valor < 0, 'valor', 'Estorno precisa ser < 0');
        break;
      case 'ajuste_compra': // a categoria é a da compra, como no estorno com compra
        conformeTipo(i, ctx, ['compraId', 'categoriaId'], ['compraId']);
        exigir(ctx, i.valor !== 0, 'valor', 'Ajuste não pode ser zero');
        break;
    }
  });
export type ItemFatura = z.infer<typeof itemFaturaSchema>;
