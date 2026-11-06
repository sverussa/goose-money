import { z } from 'zod';
import {
  centavosPositivosSchema,
  centavosSchema,
  conformeTipo,
  controle,
  dataCivilSchema,
  exigir,
  idSchema,
  quantidadeSchema,
  taxaSchema,
  textoSchema,
} from './comum';

/** MODELO-DADOS.md 3.9 e 3.10. */

export const tipoDividaSchema = z.enum(['emprestimo', 'financiamento']);
export type TipoDivida = z.infer<typeof tipoDividaSchema>;
export const destinoDoValorSchema = z.enum(['creditado_em_conta', 'pago_a_terceiro']);
export type DestinoDoValor = z.infer<typeof destinoDoValorSchema>;
export const sistemaAmortizacaoSchema = z.enum(['price', 'sac', 'parcela_informada']);
export type SistemaAmortizacao = z.infer<typeof sistemaAmortizacaoSchema>;

export const dividaSchema = z
  .strictObject({
    ...controle,
    tipo: tipoDividaSchema,
    credor: textoSchema,
    valorContratado: centavosPositivosSchema,
    dataContratacao: dataCivilSchema,
    destinoDoValor: destinoDoValorSchema,
    sistemaAmortizacao: sistemaAmortizacaoSchema,
    taxaMensal: taxaSchema.nullable(),
    valorParcelaInformada: centavosPositivosSchema.nullable(),
    numeroParcelas: quantidadeSchema,
    dataPrimeiraParcela: dataCivilSchema,
    contaDebitoId: idSchema,
    categoriaId: idSchema.nullable(),
  })
  .superRefine((d, ctx) => {
    conformeTipo(
      d,
      ctx,
      ['taxaMensal', 'valorParcelaInformada', 'categoriaId'],
      [
        d.sistemaAmortizacao === 'parcela_informada' ? 'valorParcelaInformada' : 'taxaMensal',
        ...(d.destinoDoValor === 'pago_a_terceiro' ? (['categoriaId'] as const) : []),
      ],
    );
    if (d.valorParcelaInformada !== null)
      exigir(
        ctx,
        d.valorParcelaInformada * d.numeroParcelas >= d.valorContratado,
        'valorParcelaInformada',
        'Parcela × número de parcelas não cobre o valor contratado',
      );
  });
export type Divida = z.infer<typeof dividaSchema>;

export const parcelaDividaSchema = z
  .strictObject({
    ...controle,
    dividaId: idSchema,
    numero: quantidadeSchema,
    vencimento: dataCivilSchema,
    valor: centavosSchema,
    juros: centavosSchema,
    amortizacao: centavosSchema,
    pagaAntesDoCadastro: z.boolean(),
  })
  .superRefine((p, ctx) => {
    exigir(ctx, p.valor === p.juros + p.amortizacao, 'valor', 'Valor = juros + amortização');
  });
export type ParcelaDivida = z.infer<typeof parcelaDividaSchema>;
