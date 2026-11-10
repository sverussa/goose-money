import {
  type Competencia,
  type Fatos,
  type Id,
  type Recorrencia,
  versaoVigente,
} from '@goose-money/core';

/** Horizontes da projeção que as preferências aceitam (`preferenciasSchema`). */
export const HORIZONTES = [3, 6, 12, 24] as const;

export interface LinhaDaConfirmacao {
  id: Id;
  descricao: string;
  natureza: Recorrencia['natureza'];
  /** Dia da versão vigente no mês `mes` (ou da primeira, se a recorrência começa depois). */
  dia: number;
  autoConfirmar: boolean;
}

/** Recorrências ativas para o atalho da confirmação automática: rendas primeiro, por dia. */
export function linhasDaConfirmacao(fatos: Fatos, mes: Competencia): LinhaDaConfirmacao[] {
  return fatos.recorrencias
    .filter((r) => r.ativa)
    .map((r) => {
      const versoes = fatos.recorrenciaVersoes.filter((v) => v.recorrenciaId === r.id);
      const v = versaoVigente(versoes, mes < r.competenciaInicio ? r.competenciaInicio : mes);
      return {
        id: r.id,
        descricao: r.descricao,
        natureza: r.natureza,
        dia: v?.dia ?? 0,
        autoConfirmar: r.autoConfirmar,
      };
    })
    .sort(
      (a, b) =>
        Number(a.natureza === 'gasto') - Number(b.natureza === 'gasto') ||
        a.dia - b.dia ||
        a.descricao.localeCompare(b.descricao, 'pt-BR'),
    );
}
