import { z } from 'zod';
import {
  cartaoCicloSchema,
  cartaoSchema,
  categoriaSchema,
  contaSchema,
  preferenciasSchema,
} from './cadastros';
import { compraSchema, itemFaturaSchema, parcelaSchema } from './cartoes';
import { dividaSchema, parcelaDividaSchema } from './dividas';
import { lancamentoSchema } from './lancamentos';
import { ocorrenciaSchema, recorrenciaSchema, recorrenciaVersaoSchema } from './recorrencias';

export {
  centavosComSinalSchema,
  centavosPositivosSchema,
  centavosSchema,
  competenciaSchema,
  corSchema,
  dataCivilSchema,
  diaSchema,
  iconeSchema,
  idSchema,
  instanteSchema,
  quantidadeSchema,
  taxaSchema,
  textoSchema,
  type Id,
} from './comum';
export * from './cadastros';
export * from './lancamentos';
export * from './cartoes';
export * from './dividas';
export * from './recorrencias';

const naoExcluidas = (lista: readonly { isDeleted: boolean }[]) => lista.every((e) => !e.isDeleted);
const ativas = <T extends z.ZodType<{ isDeleted: boolean }>>(s: T) =>
  z.array(s).refine(naoExcluidas, 'O Motor nunca recebe entidade excluída');

/** Entrada do Motor: todas as entidades não excluídas de um usuário (PROMPT 9.4). */
export const fatosSchema = z.strictObject({
  categorias: ativas(categoriaSchema),
  contas: ativas(contaSchema),
  cartoes: ativas(cartaoSchema),
  cartaoCiclos: ativas(cartaoCicloSchema),
  lancamentos: ativas(lancamentoSchema),
  compras: ativas(compraSchema),
  parcelas: ativas(parcelaSchema),
  itensFatura: ativas(itemFaturaSchema),
  dividas: ativas(dividaSchema),
  parcelasDivida: ativas(parcelaDividaSchema),
  recorrencias: ativas(recorrenciaSchema),
  recorrenciaVersoes: ativas(recorrenciaVersaoSchema),
  ocorrencias: ativas(ocorrenciaSchema),
  /** Uma por usuário, criada na inicialização (D39); nula antes dela. */
  preferencias: preferenciasSchema
    .nullable()
    .refine((p) => p === null || !p.isDeleted, 'O Motor nunca recebe entidade excluída'),
});
export type Fatos = z.infer<typeof fatosSchema>;

export const fatosVazios = (): Fatos => ({
  categorias: [],
  contas: [],
  cartoes: [],
  cartaoCiclos: [],
  lancamentos: [],
  compras: [],
  parcelas: [],
  itensFatura: [],
  dividas: [],
  parcelasDivida: [],
  recorrencias: [],
  recorrenciaVersoes: [],
  ocorrencias: [],
  preferencias: null,
});
