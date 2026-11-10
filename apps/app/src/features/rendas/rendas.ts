import {
  type Centavos,
  type Competencia,
  type Contexto,
  type DataCivil,
  type Fatos,
  type Id,
  type OcorrenciaDoMes,
  percentual,
  type Recorrencia,
  somar,
  type StatusOcorrencia,
} from '@goose-money/core';

import type { EstadoDoChip } from '@/components/estados';
import {
  comandoDaRecorrencia,
  doMes,
  esquemaDaRecorrencia,
  type ValoresDaRecorrencia,
  valoresIniciais,
} from '@/features/recorrencias/recorrencias';

// Rendas fixas (3.8, 6.7): o que a tela mostra, lido do core. O formulário é o de
// `features/recorrencias`, comum com Gastos fixos.

export {
  dataDaConfirmacao,
  historicoDeVersoes,
  mesPorExtenso,
  opcoesAPartirDe,
  previaDaEdicao,
} from '@/features/recorrencias/recorrencias';

/** As rendas da competência, recebidas, ignoradas ou previstas, em ordem de data (core). */
export const rendasDoMes = (fatos: Fatos, mes: Competencia, hoje: DataCivil): OcorrenciaDoMes[] =>
  doMes(fatos, mes, hoje, 'renda');

/** Status do mês (3.8) → chip; renda não fica "vencida", mas o tipo do core inclui o gasto. */
export const CHIP_DA_RENDA: Record<StatusOcorrencia, EstadoDoChip> = {
  confirmada: 'faturaPaga',
  ignorada: 'faturaTransportada',
  prevista: 'previsto',
  atrasada: 'atrasado',
  vencida: 'vencido',
};

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

// Formulário: o comum, sempre em conta (renda não vai no cartão, 3.8).

export const esquemaDaRenda = esquemaDaRecorrencia;
export type ValoresDaRenda = ValoresDaRecorrencia;

export const valoresIniciaisDaRenda = (
  fatos: Fatos,
  hoje: DataCivil,
  ultimaConta: string | null,
  r?: Recorrencia,
): ValoresDaRenda => valoresIniciais(fatos, hoje, { conta: ultimaConta, cartao: null }, r);

export const comandoDaRenda = (fatos: Fatos, ctx: Contexto, v: ValoresDaRenda, r?: Recorrencia) =>
  comandoDaRecorrencia(fatos, ctx, 'renda', v, r);
