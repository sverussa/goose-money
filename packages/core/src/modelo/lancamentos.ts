import { z } from 'zod';
import {
  centavosComSinalSchema,
  competenciaSchema,
  conformeTipo,
  controle,
  dataCivilSchema,
  exigir,
  idSchema,
} from './comum';

/** MODELO-DADOS.md 3.5. */

export const tipoLancamentoSchema = z.enum([
  'receita',
  'despesa',
  'transferencia',
  'ajuste',
  'pagamento_fatura',
  'captacao',
  'pagamento_divida',
  'amortizacao',
]);
export type TipoLancamento = z.infer<typeof tipoLancamentoSchema>;
export const statusLancamentoSchema = z.enum(['previsto', 'efetivado']);
export type StatusLancamento = z.infer<typeof statusLancamentoSchema>;

const camposConformeTipo = [
  'contaDestinoId',
  'categoriaId',
  'cartaoId',
  'faturaCompetencia',
  'dividaId',
  'parcelaDividaId',
] as const;

/** Tabela "Campos por tipo" de 3.5: os obrigatórios de cada tipo; os demais são nulos. */
const exigidosPorTipo: Record<TipoLancamento, readonly (typeof camposConformeTipo)[number][]> = {
  receita: ['categoriaId'],
  despesa: ['categoriaId'],
  transferencia: ['contaDestinoId'],
  ajuste: ['categoriaId'],
  pagamento_fatura: ['cartaoId', 'faturaCompetencia'],
  captacao: ['dividaId'],
  pagamento_divida: ['dividaId', 'parcelaDividaId'],
  amortizacao: ['dividaId'],
};

export const lancamentoSchema = z
  .strictObject({
    ...controle,
    tipo: tipoLancamentoSchema,
    status: statusLancamentoSchema,
    data: dataCivilSchema,
    valor: centavosComSinalSchema,
    descricao: z.string().nullable(),
    observacao: z.string().nullable(),
    contaId: idSchema,
    contaDestinoId: idSchema.nullable(),
    categoriaId: idSchema.nullable(),
    cartaoId: idSchema.nullable(),
    faturaCompetencia: competenciaSchema.nullable(),
    dividaId: idSchema.nullable(),
    parcelaDividaId: idSchema.nullable(),
  })
  .superRefine((l, ctx) => {
    conformeTipo(l, ctx, camposConformeTipo, exigidosPorTipo[l.tipo]);
    exigir(
      ctx,
      l.status === 'efetivado' || l.tipo === 'receita' || l.tipo === 'despesa',
      'status',
      'Só receita e despesa podem ser previstas',
    );
    exigir(
      ctx,
      l.tipo === 'ajuste' ? l.valor !== 0 : l.valor > 0,
      'valor',
      l.tipo === 'ajuste' ? 'Ajuste não pode ser zero' : 'Precisa ser > 0',
    );
    exigir(ctx, l.contaDestinoId !== l.contaId, 'contaDestinoId', 'Destino igual à origem');
  });
export type Lancamento = z.infer<typeof lancamentoSchema>;
