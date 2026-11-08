import {
  aplicar,
  type Centavos,
  type Comando,
  type Competencia,
  competencia,
  type Contexto,
  criarRecorrencia,
  type DataCivil,
  editarRecorrencia,
  type Fatos,
  type Id,
  minData,
  novaVersaoDaRecorrencia,
  type OcorrenciaDoMes,
  ocorrenciasDoMes,
  percentual,
  primeiraCompetenciaNaoConfirmada,
  type Recorrencia,
  somar,
  somarMeses,
  type StatusOcorrencia,
  versaoVigente,
} from '@goose-money/core';
import { z } from 'zod';

import { formatarMes } from '@/app/formatacao';
import type { EstadoDoChip } from '@/components/estados';
import { aClassificar, contaInicial } from '@/features/lancar/padroes';

import { mensagensRendas } from './mensagens';

// Rendas fixas (3.8, 6.7): o que a tela mostra, lido do core, e a camada de formulário (9.1).

/** "Novembro 2026" → "novembro/2026" (Rendas.dc.html). */
export const mesPorExtenso = (c: Competencia) =>
  formatarMes(c).toLocaleLowerCase('pt-BR').replace(' ', '/');

/** As rendas da competência, recebidas, ignoradas ou previstas, em ordem de data (core). */
export const rendasDoMes = (fatos: Fatos, mes: Competencia, hoje: DataCivil): OcorrenciaDoMes[] =>
  ocorrenciasDoMes(fatos, mes, hoje).filter((o) => o.recorrencia.natureza === 'renda');

/** Status do mês (3.8) → chip; renda não fica "vencida", mas o tipo do core inclui o gasto. */
export const CHIP_DA_RENDA: Record<StatusOcorrencia, EstadoDoChip> = {
  confirmada: 'faturaPaga',
  ignorada: 'faturaTransportada',
  prevista: 'previsto',
  atrasada: 'atrasado',
  vencida: 'vencido',
};

/** Data padrão de "Confirmar recebimento": a prevista, ou hoje se ela ainda não chegou (D79). */
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

export interface FatiaDaRenda {
  recorrenciaId: Id;
  fonte: string;
  valor: Centavos;
  cor: string;
}

export type ConclusaoDaComposicao =
  | { tipo: 'vazia' }
  | { tipo: 'unica'; fonte: string }
  | { tipo: 'maior'; fonte: string; fatia: NonNullable<ReturnType<typeof percentual>> };

/**
 * Composição da renda (8.1): uma fatia por fonte do mês, pelo valor previsto ou recebido, sem as
 * ignoradas; o total é o "Previsto no mês" de `resumoRendas`. A conclusão é a fonte maior.
 */
export function composicaoDaRenda(fatos: Fatos, mes: Competencia, hoje: DataCivil) {
  const fatias: FatiaDaRenda[] = rendasDoMes(fatos, mes, hoje)
    .filter((o) => o.status !== 'ignorada')
    .sort((a, b) => b.valor - a.valor)
    .map((o, i) => ({
      recorrenciaId: o.recorrenciaId,
      fonte: o.recorrencia.descricao,
      valor: o.valor,
      cor: `categorica-${String((i % 8) + 1)}`,
    }));
  const total = somar(fatias.map((f) => f.valor));
  const [maior] = fatias;
  const fatia = maior ? percentual(maior.valor, total) : null;
  const conclusao: ConclusaoDaComposicao =
    !maior || !fatia
      ? { tipo: 'vazia' }
      : fatias.length === 1
        ? { tipo: 'unica', fonte: maior.fonte }
        : { tipo: 'maior', fonte: maior.fonte, fatia };
  return { fatias, total, conclusao };
}

// Formulário (nova ou editar)

const e = mensagensRendas.formulario.erros;
const mes = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, e.mes);

export const esquemaDaRenda = z
  .object({
    descricao: z.string().trim().min(1, e.descricao),
    valor: z.number().int().positive(e.valor),
    dia: z.number({ error: e.dia }).int(e.dia).min(1, e.dia).max(31, e.dia),
    contaId: z.string().min(1, e.conta),
    categoriaId: z.string().min(1, e.categoria),
    inicio: mes,
    fim: z.union([z.literal(''), mes]),
    autoConfirmar: z.boolean(),
    /** Só na edição: a competência da nova versão. */
    aPartirDe: z.string(),
  })
  .refine((v) => v.fim === '' || v.fim >= v.inicio, { path: ['fim'], message: e.fimAntes });
export type ValoresDaRenda = z.infer<typeof esquemaDaRenda>;

/** Nova: conta pela última usada, "A classificar", começa no mês de hoje. Editar: a versão vigente. */
export function valoresIniciaisDaRenda(
  fatos: Fatos,
  hoje: DataCivil,
  ultimaConta: string | null,
  r?: Recorrencia,
): ValoresDaRenda {
  if (!r)
    return {
      descricao: '',
      valor: 0,
      dia: Number.NaN,
      contaId: contaInicial(fatos, null, ultimaConta) ?? '',
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
    contaId: v?.contaId ?? '',
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
 * confirmação automática por `editarRecorrencia`; valor, dia, conta e categoria por uma nova versão
 * "a partir de", só no que mudou. Sem mudança, o comando vem vazio. O core lança `ErroDeDominio`.
 */
export function comandoDaRenda(
  fatos: Fatos,
  ctx: Contexto,
  v: ValoresDaRenda,
  r?: Recorrencia,
): Comando {
  const versao = {
    valor: v.valor as Centavos,
    dia: v.dia,
    formaPagamento: 'conta' as const,
    contaId: v.contaId,
    cartaoId: null,
    categoriaId: v.categoriaId,
  };
  const descricao = v.descricao.trim();
  const fim = v.fim === '' ? null : competencia(v.fim);
  if (!r)
    return criarRecorrencia(
      fatos,
      ctx,
      {
        natureza: 'renda',
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
    vigente.contaId !== versao.contaId ||
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
      : (rendasDoMes(fatos, anterior, hoje).find((o) => o.recorrenciaId === r.id) ?? null);
  return {
    historico: historicoDeVersoes(depois, recorrencia),
    nova,
    anterior: doAnterior && { competencia: anterior, valor: doAnterior.valor },
  };
}
