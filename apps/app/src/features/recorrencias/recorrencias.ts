import {
  aplicar,
  type Centavos,
  type Comando,
  type Competencia,
  competencia,
  type Contexto,
  criarRecorrencia,
  type DataCivil,
  diaNoMes,
  editarRecorrencia,
  faturaDoGastoNoCartao,
  type Fatos,
  type Id,
  minData,
  type NaturezaRecorrencia,
  novaVersaoDaRecorrencia,
  type OcorrenciaDoMes,
  ocorrenciasDoMes,
  primeiraCompetenciaNaoConfirmada,
  type Recorrencia,
  somarMeses,
  versaoVigente,
} from '@goose-money/core';
import { z } from 'zod';

import { formatarMes } from '@/app/formatacao';
import { aClassificar, cartaoInicial, contaInicial } from '@/features/lancar/padroes';

import { mensagensRecorrencias } from './mensagens';

// Rendas e gastos fixos (3.8, 6.7, 6.8): o que as duas telas leem do core e o formulário (9.1).

/** "Novembro 2026" → "novembro/2026" (Rendas.dc.html). */
export const mesPorExtenso = (c: Competencia) =>
  formatarMes(c).toLocaleLowerCase('pt-BR').replace(' ', '/');

/** As recorrências da natureza na competência, confirmadas, ignoradas ou previstas, por data. */
export const doMes = (
  fatos: Fatos,
  mes: Competencia,
  hoje: DataCivil,
  natureza: NaturezaRecorrencia,
): OcorrenciaDoMes[] =>
  ocorrenciasDoMes(fatos, mes, hoje).filter((o) => o.recorrencia.natureza === natureza);

/** Data padrão da confirmação: a prevista, ou hoje se ela ainda não chegou (D79). */
export const dataDaConfirmacao = (o: Pick<OcorrenciaDoMes, 'data'>, hoje: DataCivil): DataCivil =>
  minData(o.data, hoje);

/** Até 12 meses de "Aplicar a partir de", da primeira não confirmada (3.8) ao fim, se houver. */
export function opcoesAPartirDe(fatos: Fatos, r: Recorrencia): Competencia[] {
  const primeira = primeiraCompetenciaNaoConfirmada(fatos, r);
  const lista = [primeira];
  for (let i = 1; i < 12; i++) {
    const c = somarMeses(primeira, i);
    if (r.competenciaFim !== null && c > r.competenciaFim) break;
    lista.push(c);
  }
  return lista;
}

export interface VersaoDoHistorico {
  id: Id;
  de: Competencia;
  /** `null`: vale até o fim da recorrência, sem fim. */
  ate: Competencia | null;
  valor: Centavos;
  dia: number;
}

/** As versões da recorrência, da mais nova para a mais antiga, com o intervalo de cada uma. */
export function historicoDeVersoes(fatos: Fatos, r: Recorrencia): VersaoDoHistorico[] {
  const versoes = fatos.recorrenciaVersoes
    .filter((v) => v.recorrenciaId === r.id)
    .sort((a, b) => (a.vigenteDesde < b.vigenteDesde ? 1 : -1));
  return versoes.map((v, i) => {
    const seguinte = versoes[i - 1];
    return {
      id: v.id,
      de: v.vigenteDesde,
      ate: seguinte ? somarMeses(seguinte.vigenteDesde, -1) : r.competenciaFim,
      valor: v.valor,
      dia: v.dia,
    };
  });
}

// Formulário (nova ou editar)

const e = mensagensRecorrencias.formulario.erros;
const mes = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, e.mes);

export const esquemaDaRecorrencia = z
  .object({
    descricao: z.string().trim().min(1, e.descricao),
    valor: z.number().int().positive(e.valor),
    dia: z.number({ error: e.dia }).int(e.dia).min(1, e.dia).max(31, e.dia),
    /** Renda é sempre em conta (3.8); gasto, em conta ou no cartão. */
    formaPagamento: z.enum(['conta', 'cartao']),
    contaId: z.string(),
    cartaoId: z.string(),
    categoriaId: z.string().min(1, e.categoria),
    inicio: mes,
    fim: z.union([z.literal(''), mes]),
    autoConfirmar: z.boolean(),
    /** Só na edição: a competência da nova versão. */
    aPartirDe: z.string(),
  })
  .refine((v) => v.formaPagamento === 'cartao' || v.contaId !== '', {
    path: ['contaId'],
    message: e.conta,
  })
  .refine((v) => v.formaPagamento === 'conta' || v.cartaoId !== '', {
    path: ['cartaoId'],
    message: e.cartao,
  })
  .refine((v) => v.fim === '' || v.fim >= v.inicio, { path: ['fim'], message: e.fimAntes });
export type ValoresDaRecorrencia = z.infer<typeof esquemaDaRecorrencia>;

/** O último usado neste aparelho, para a conta e o cartão da nova. */
export interface Ultimos {
  conta: string | null;
  cartao: string | null;
}

/**
 * Nova: em conta, conta e cartão pelos últimos usados, "A classificar", começa no mês de hoje.
 * Editar: a versão vigente na primeira competência não confirmada.
 */
export function valoresIniciais(
  fatos: Fatos,
  hoje: DataCivil,
  ultimos: Ultimos,
  r?: Recorrencia,
): ValoresDaRecorrencia {
  const cartao = cartaoInicial(fatos, null, ultimos.cartao) ?? '';
  if (!r)
    return {
      descricao: '',
      valor: 0,
      dia: Number.NaN,
      formaPagamento: 'conta',
      contaId: contaInicial(fatos, null, ultimos.conta) ?? '',
      cartaoId: cartao,
      categoriaId: aClassificar(fatos) ?? '',
      inicio: hoje.slice(0, 7),
      fim: '',
      autoConfirmar: false,
      aPartirDe: '',
    };
  const aPartirDe = primeiraCompetenciaNaoConfirmada(fatos, r);
  const versoes = fatos.recorrenciaVersoes.filter((v) => v.recorrenciaId === r.id);
  const v = versaoVigente(versoes, aPartirDe) ?? versaoVigente(versoes, competencia('9999-12'));
  return {
    descricao: r.descricao,
    valor: v?.valor ?? 0,
    dia: v?.dia ?? Number.NaN,
    formaPagamento: v?.formaPagamento ?? 'conta',
    contaId: v?.contaId ?? '',
    cartaoId: v?.cartaoId ?? cartao,
    categoriaId: v?.categoriaId ?? '',
    inicio: r.competenciaInicio,
    fim: r.competenciaFim ?? '',
    autoConfirmar: r.autoConfirmar,
    aPartirDe,
  };
}

/** Dois comandos gravados juntos, numa transação; o Desfazer desfaz os dois. */
function emSequencia(fatos: Fatos, primeiro: Comando, segundo: (f: Fatos) => Comando): Comando {
  const depois = segundo(aplicar(fatos, primeiro.mudancas));
  return {
    mudancas: [...primeiro.mudancas, ...depois.mudancas],
    inversas: [...depois.inversas, ...primeiro.inversas],
    descricao: depois.descricao,
  };
}

const nada = (descricao: string): Comando => ({ mudancas: [], inversas: [], descricao });

/**
 * O comando do core para o formulário. Nova: `criarRecorrencia`. Editar (3.8): descrição, fim e
 * confirmação automática por `editarRecorrencia`; valor, dia, forma, conta ou cartão e categoria
 * por uma nova versão "a partir de", só no que mudou. Sem mudança, o comando vem vazio. O core
 * lança `ErroDeDominio`.
 */
export function comandoDaRecorrencia(
  fatos: Fatos,
  ctx: Contexto,
  natureza: NaturezaRecorrencia,
  v: ValoresDaRecorrencia,
  r?: Recorrencia,
): Comando {
  const noCartao = natureza === 'gasto' && v.formaPagamento === 'cartao';
  const versao = {
    valor: v.valor as Centavos,
    dia: v.dia,
    formaPagamento: noCartao ? ('cartao' as const) : ('conta' as const),
    contaId: noCartao ? null : v.contaId,
    cartaoId: noCartao ? v.cartaoId : null,
    categoriaId: v.categoriaId,
  };
  const descricao = v.descricao.trim();
  const fim = v.fim === '' ? null : competencia(v.fim);
  if (!r)
    return criarRecorrencia(
      fatos,
      ctx,
      {
        natureza,
        descricao,
        competenciaInicio: competencia(v.inicio),
        competenciaFim: fim,
        autoConfirmar: v.autoConfirmar,
      },
      versao,
    );
  const aPartirDe = competencia(v.aPartirDe);
  const vigente = versaoVigente(
    fatos.recorrenciaVersoes.filter((x) => x.recorrenciaId === r.id),
    aPartirDe,
  );
  const mudouVersao =
    !vigente ||
    vigente.valor !== versao.valor ||
    vigente.dia !== versao.dia ||
    vigente.formaPagamento !== versao.formaPagamento ||
    vigente.contaId !== versao.contaId ||
    vigente.cartaoId !== versao.cartaoId ||
    vigente.categoriaId !== versao.categoriaId;
  const mudouRecorrencia =
    r.descricao !== descricao || r.competenciaFim !== fim || r.autoConfirmar !== v.autoConfirmar;
  const daRecorrencia = (f: Fatos) =>
    mudouRecorrencia
      ? editarRecorrencia(f, ctx, r.id, {
          descricao,
          competenciaFim: fim,
          autoConfirmar: v.autoConfirmar,
        })
      : nada('Recorrência alterada');
  if (!mudouVersao) return daRecorrencia(fatos);
  return emSequencia(fatos, daRecorrencia(fatos), (f) =>
    novaVersaoDaRecorrencia(f, ctx, r.id, aPartirDe, versao),
  );
}

/**
 * Prévia da edição: o histórico com a versão que vai ser gravada e o valor do mês anterior a
 * "a partir de", que não muda (retrato gravado ou a versão que já valia).
 */
export function previaDaEdicao(
  fatos: Fatos,
  hoje: DataCivil,
  r: Recorrencia,
  comando: Comando | null,
  aPartirDe: Competencia,
) {
  const depois = comando ? aplicar(fatos, comando.mudancas) : fatos;
  const recorrencia = depois.recorrencias.find((x) => x.id === r.id) ?? r;
  const nova = comando?.mudancas.find((m) => m.entidade === 'recorrenciaVersoes')?.id ?? null;
  const anterior = somarMeses(aPartirDe, -1);
  const doAnterior =
    anterior < r.competenciaInicio
      ? null
      : (doMes(fatos, anterior, hoje, r.natureza).find((o) => o.recorrenciaId === r.id) ?? null);
  return {
    historico: historicoDeVersoes(depois, recorrencia),
    nova,
    anterior: doAnterior && { competencia: anterior, valor: doAnterior.valor },
  };
}

/**
 * Gasto no cartão: o mês do formulário (a partir de, na edição; o início, na nova) e a fatura em
 * que ele cai pelo ciclo (3.5). `null` em conta ou com o formulário incompleto.
 */
export function faturaDoFormulario(
  fatos: Fatos,
  v: Pick<ValoresDaRecorrencia, 'formaPagamento' | 'cartaoId' | 'dia' | 'inicio' | 'aPartirDe'>,
): { mes: Competencia; fatura: Competencia } | null {
  const daTela = v.aPartirDe || v.inicio;
  if (v.formaPagamento !== 'cartao' || !v.cartaoId || !Number.isInteger(v.dia)) return null;
  if (v.dia < 1 || v.dia > 31 || !/^\d{4}-(0[1-9]|1[0-2])$/.test(daTela)) return null;
  const c = competencia(daTela);
  return {
    mes: c,
    fatura: faturaDoGastoNoCartao(fatos, {
      cartaoId: v.cartaoId,
      data: diaNoMes(c, v.dia),
    }) as Competencia,
  };
}
