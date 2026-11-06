import { z } from 'zod';
import {
  centavosComSinalSchema,
  centavosPositivosSchema,
  centavosSchema,
  competenciaSchema,
  controle,
  corSchema,
  dataCivilSchema,
  diaSchema,
  exigir,
  iconeSchema,
  idSchema,
  textoSchema,
} from './comum';

/** MODELO-DADOS.md 3.1 a 3.4 e 3.14. */

export const tipoCategoriaSchema = z.enum(['receita', 'despesa', 'ambos']);
export type TipoCategoria = z.infer<typeof tipoCategoriaSchema>;
export const categoriaSistemaSchema = z.enum([
  'a_classificar',
  'juros_encargos',
  'tarifas',
  'ajuste_saldo',
]);
export type CategoriaSistema = z.infer<typeof categoriaSistemaSchema>;

const tipoDoSistema: Record<CategoriaSistema, TipoCategoria> = {
  a_classificar: 'ambos',
  juros_encargos: 'despesa',
  tarifas: 'despesa',
  ajuste_saldo: 'ambos',
};

export const categoriaSchema = z
  .strictObject({
    ...controle,
    nome: textoSchema,
    tipo: tipoCategoriaSchema,
    icone: iconeSchema,
    cor: corSchema.nullable(),
    categoriaPaiId: idSchema.nullable(),
    sistema: categoriaSistemaSchema.nullable(),
  })
  .superRefine((c, ctx) => {
    if (c.sistema === null) {
      exigir(ctx, c.tipo !== 'ambos', 'tipo', '"ambos" só em categoria de sistema');
    } else {
      exigir(ctx, c.tipo === tipoDoSistema[c.sistema], 'tipo', 'Tipo da categoria de sistema');
      exigir(ctx, c.cor === null, 'cor', 'Categoria de sistema usa a cor neutra');
    }
  });
export type Categoria = z.infer<typeof categoriaSchema>;

export const tipoContaSchema = z.enum([
  'corrente',
  'poupanca',
  'investimento',
  'dinheiro',
  'outra',
]);
export type TipoConta = z.infer<typeof tipoContaSchema>;

export const contaSchema = z.strictObject({
  ...controle,
  nome: textoSchema,
  instituicao: z.string().nullable(),
  tipo: tipoContaSchema,
  saldoInicial: centavosComSinalSchema,
  dataSaldoInicial: dataCivilSchema,
  cor: corSchema,
  incluirNoTotal: z.boolean(),
  arquivada: z.boolean(),
});
export type Conta = z.infer<typeof contaSchema>;

export const cartaoSchema = z.strictObject({
  ...controle,
  nome: textoSchema,
  instituicao: z.string().nullable(),
  cor: corSchema,
  limite: centavosPositivosSchema,
  contaPagamentoId: idSchema,
  competenciaInicial: competenciaSchema,
  arquivado: z.boolean(),
});
export type Cartao = z.infer<typeof cartaoSchema>;

export const cartaoCicloSchema = z.strictObject({
  ...controle,
  cartaoId: idSchema,
  vigenteDesde: competenciaSchema,
  diaFechamento: diaSchema,
  diaVencimento: diaSchema,
});
export type CartaoCiclo = z.infer<typeof cartaoCicloSchema>;

export const preferenciasSchema = z.strictObject({
  ...controle,
  limiteAlerta: centavosSchema,
  horizontePadrao: z.literal([3, 6, 12, 24]),
  ocultarValoresAoAbrir: z.boolean(),
});
export type Preferencias = z.infer<typeof preferenciasSchema>;
