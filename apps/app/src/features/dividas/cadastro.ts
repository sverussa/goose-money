import {
  aplicar,
  type CamposDe,
  type Centavos,
  centavos,
  type Comando,
  competenciaDe,
  type Contratacao,
  D,
  type DataCivil,
  type Derivado,
  derivar,
  type DestinoDoValor,
  diaNoMes,
  type Divida,
  type Id,
  type SistemaAmortizacao,
  somar,
  somarMeses,
  tabelaParcelaInformada,
  type TabelaDaDivida,
  type TipoDivida,
  totalPelaParcela,
} from '@goose-money/core';
import { z } from 'zod';

import { dataValida } from '@/features/cartoes/compra';

import { mensagensDividas } from './mensagens';
import { linhasDaTabela } from './tabela';

// Cadastro de dívida em 5 etapas (6.6, 3.7): camada de formulário (9.1), separada do modelo.

export const ETAPAS = ['contrato', 'destino', 'condicoes', 'antes', 'previa'] as const;
export type Etapa = (typeof ETAPAS)[number];
/** Teto do número de parcelas: 40 anos (DECISOES-PENDENTES-ETAPA5, T05-23). */
export const MAX_PARCELAS_DIVIDA = 480;

export interface ValoresDaDivida {
  tipo: TipoDivida;
  credor: string;
  valorContratado: number;
  dataContratacao: string;
  destino: DestinoDoValor;
  /** `null` enquanto a pessoa não mexe: vale o padrão de `registraEntrada`. */
  registrarEntrada: boolean | null;
  contaCreditoId: Id;
  categoriaId: Id;
  sistema: SistemaAmortizacao;
  /** Percentual ao mês como digitado ("1,49"). */
  taxa: string;
  valorParcela: number;
  numeroParcelas: number;
  dataPrimeiraParcela: string;
  contaDebitoId: Id;
  parcelasPagas: number;
}

export type ErrosDaDivida = Partial<Record<keyof ValoresDaDivida, string>>;

const e = mensagensDividas.cadastro.erros;

export function valoresIniciaisDaDivida(
  hoje: DataCivil,
  contaId: Id,
  categoriaId: Id,
): ValoresDaDivida {
  return {
    tipo: 'emprestimo',
    credor: '',
    valorContratado: 0,
    dataContratacao: hoje,
    destino: 'creditado_em_conta',
    registrarEntrada: null,
    contaCreditoId: contaId,
    categoriaId,
    sistema: 'price',
    taxa: '',
    valorParcela: 0,
    numeroParcelas: 12,
    dataPrimeiraParcela: diaNoMes(somarMeses(competenciaDe(hoje), 1), Number(hoje.slice(8))),
    contaDebitoId: contaId,
    parcelasPagas: 0,
  };
}

/**
 * "Registrar a entrada do valor na conta" (3.7): ligado para dívida nova (contratada neste mês)
 * e desligado para dívida antiga, até a pessoa escolher; só existe no `creditado_em_conta`.
 */
export function registraEntrada(v: ValoresDaDivida, hoje: DataCivil): boolean {
  if (v.destino !== 'creditado_em_conta') return false;
  if (v.registrarEntrada !== null) return v.registrarEntrada;
  const data = dataValida(v.dataContratacao);
  return data !== null && competenciaDe(data) >= competenciaDe(hoje);
}

/** "1,49" → "0.0149" (fração ao mês do modelo); `null` se não for um percentual com até 4 casas. */
export function taxaDoTexto(texto: string): string | null {
  const t = texto.trim();
  if (!/^\d{1,3}(,\d{1,4})?$/.test(t)) return null;
  return new D(t.replace(',', '.')).div(100).toFixed();
}

const inteiro = (de: number, ate: number, msg: string) =>
  z.number().refine((n) => Number.isInteger(n) && n >= de && n <= ate, msg);
const data = z.string().refine((s) => dataValida(s) !== null, e.data);
const conta = z.string().min(1, e.conta);

/** Um schema por etapa; recebe os valores inteiros porque etapas se cruzam (n, PV, datas). */
const esquemas = (hoje: DataCivil): Record<Etapa, z.ZodType<ValoresDaDivida>> => {
  const base = z.custom<ValoresDaDivida>();
  return {
    contrato: base.superRefine((v, ctx) => {
      const r = z
        .object({
          credor: z.string().trim().min(1, e.credor),
          valorContratado: z.number().int().positive(e.valor),
          dataContratacao: data.refine((s) => s <= hoje, e.dataFutura),
        })
        .safeParse(v);
      r.error?.issues.forEach((i) => {
        ctx.addIssue({ code: 'custom', path: i.path, message: i.message });
      });
    }),
    destino: base.superRefine((v, ctx) => {
      if (registraEntrada(v, hoje) && !v.contaCreditoId)
        ctx.addIssue({ code: 'custom', path: ['contaCreditoId'], message: e.conta });
      if (v.destino === 'pago_a_terceiro' && !v.categoriaId)
        ctx.addIssue({ code: 'custom', path: ['categoriaId'], message: e.categoria });
    }),
    condicoes: base.superRefine((v, ctx) => {
      const r = z
        .object({
          numeroParcelas: inteiro(1, MAX_PARCELAS_DIVIDA, e.numeroParcelas(MAX_PARCELAS_DIVIDA)),
          dataPrimeiraParcela: data.refine((s) => s >= v.dataContratacao, e.primeiraAntes),
          contaDebitoId: conta,
          ...(v.sistema === 'parcela_informada'
            ? { valorParcela: z.number().int().positive(e.valorParcela) }
            : { taxa: z.string().refine((s) => taxaDoTexto(s) !== null, e.taxa) }),
        })
        .safeParse(v);
      r.error?.issues.forEach((i) => {
        ctx.addIssue({ code: 'custom', path: i.path, message: i.message });
      });
      if (
        v.sistema === 'parcela_informada' &&
        v.valorParcela > 0 &&
        Number.isInteger(v.numeroParcelas) &&
        v.numeroParcelas >= 1 &&
        totalPelaParcela(centavos(v.valorParcela), v.numeroParcelas) < v.valorContratado
      )
        ctx.addIssue({ code: 'custom', path: ['valorParcela'], message: e.somaMenor });
    }),
    antes: base.superRefine((v, ctx) => {
      const r = inteiro(0, v.numeroParcelas, e.parcelasPagas(v.numeroParcelas)).safeParse(
        v.parcelasPagas,
      );
      if (!r.success)
        ctx.addIssue({
          code: 'custom',
          path: ['parcelasPagas'],
          message: e.parcelasPagas(v.numeroParcelas),
        });
    }),
    previa: base,
  };
};

/** Os erros da etapa, um por campo (o primeiro). */
export function errosDaEtapa(etapa: Etapa, v: ValoresDaDivida, hoje: DataCivil): ErrosDaDivida {
  const r = esquemas(hoje)[etapa].safeParse(v);
  const erros: ErrosDaDivida = {};
  for (const i of r.error?.issues ?? []) erros[i.path[0] as keyof ValoresDaDivida] ??= i.message;
  return erros;
}

/** Os campos de `contratarDivida`, depois de as etapas 1 a 4 passarem. */
export function camposDaDivida(
  v: ValoresDaDivida,
  hoje: DataCivil,
): { campos: CamposDe<Divida>; contratacao: Contratacao } {
  const informada = v.sistema === 'parcela_informada';
  const terceiro = v.destino === 'pago_a_terceiro';
  return {
    campos: {
      tipo: v.tipo,
      credor: v.credor.trim(),
      valorContratado: centavos(v.valorContratado),
      dataContratacao: v.dataContratacao as DataCivil,
      destinoDoValor: v.destino,
      sistemaAmortizacao: v.sistema,
      taxaMensal: informada ? null : taxaDoTexto(v.taxa),
      valorParcelaInformada: informada ? centavos(v.valorParcela) : null,
      numeroParcelas: v.numeroParcelas,
      dataPrimeiraParcela: v.dataPrimeiraParcela as DataCivil,
      contaDebitoId: v.contaDebitoId,
      categoriaId: terceiro ? v.categoriaId : null,
    },
    contratacao: {
      parcelasPagas: v.parcelasPagas,
      contaCaptacaoId: registraEntrada(v, hoje) ? v.contaCreditoId : null,
    },
  };
}

export interface PreviaDaDivida {
  t: TabelaDaDivida;
  linhas: ReturnType<typeof linhasDaTabela>;
  totalJuros: Centavos;
  /** Só na parcela informada: última parcela − parcela informada (3.7). */
  diferencaUltima: Centavos | null;
}

/** Prévia da etapa 5: a dívida como o core vai derivá-la depois de gravar o comando. */
export function previaDaDivida(d: Derivado, comando: Comando): PreviaDaDivida {
  const depois = derivar(aplicar(d.fatos, comando.mudancas), d.hoje);
  const t = [...depois.dividas.values()].find((x) => !d.dividas.has(x.divida.id));
  if (!t) throw new Error('O comando não cadastrou dívida');
  const { valorContratado, valorParcelaInformada, numeroParcelas, dataPrimeiraParcela } = t.divida;
  return {
    t,
    linhas: linhasDaTabela(t),
    totalJuros: somar(t.parcelas.map((p) => p.juros)),
    diferencaUltima:
      valorParcelaInformada === null
        ? null
        : tabelaParcelaInformada(
            valorContratado,
            valorParcelaInformada,
            numeroParcelas,
            dataPrimeiraParcela,
          ).diferencaUltima,
  };
}
