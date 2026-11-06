import {
  confirmarOcorrencia,
  type Contexto,
  ErroDeDominio,
  type Fatos,
  type Mudanca,
  pendentesParaConfirmar,
} from '@goose-money/core';

import { ErroDeGravacao, type Gravadas } from '@/data/gravacao';

export interface ResultadoDaConfirmacao {
  /** Linhas de cada ocorrência confirmada, para o cache. */
  gravadas: Gravadas[];
  /** Já confirmadas por outro aparelho (chave única), puladas sem erro. */
  conflitos: number;
  /** Puladas por outra regra (ex.: conta arquivada); voltam a ser tentadas na próxima rodada. */
  recusadas: number;
}

/** Sem rede ou sem sessão, parar: as próximas também falhariam. */
const interrompe = (e: unknown) =>
  !(e instanceof ErroDeDominio) &&
  !(e instanceof ErroDeGravacao && e.status !== 0 && e.status !== 401);

/**
 * Confirmação automática (3.8): as pendentes até hoje, em ordem cronológica, **uma ocorrência
 * por chamada**, na data prevista original. Um conflito de chave única (outro aparelho já
 * confirmou) só pula aquela ocorrência.
 */
export async function confirmarPendentes(
  fatos: Fatos,
  ctx: Contexto,
  executar: (mudancas: readonly Mudanca[]) => Promise<Gravadas>,
): Promise<ResultadoDaConfirmacao> {
  const r: ResultadoDaConfirmacao = { gravadas: [], conflitos: 0, recusadas: 0 };
  for (const p of pendentesParaConfirmar(fatos, ctx.hoje)) {
    try {
      const cmd = confirmarOcorrencia(fatos, ctx, p.recorrenciaId, p.competencia);
      r.gravadas.push(await executar(cmd.mudancas));
    } catch (e) {
      if (e instanceof ErroDeGravacao && e.codigo === '23505') r.conflitos++;
      else if (interrompe(e)) throw e;
      else r.recusadas++;
    }
  }
  return r;
}
