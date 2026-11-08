import {
  aplicar,
  type Comando,
  type DataCivil,
  type Derivado,
  derivar,
  type Id,
  type ParcelaDaTabela,
  type TabelaDaDivida,
} from '@goose-money/core';

// Registrar pagamento e Amortizar (3.7, 6.6): escolhas padrão e a prévia, com os números do core.

const emAberto = (p: ParcelaDaTabela) => p.status === 'vencida' || p.status === 'a_vencer';

/** Parcelas que ainda podem ser pagas, em ordem de número. */
export const parcelasEmAberto = (t: TabelaDaDivida): ParcelaDaTabela[] =>
  t.parcelas.filter(emAberto);

/**
 * A parcela escolhida (a da pendência do Painel, `?parcela=`) se ainda está em aberto; senão a
 * vencida mais antiga ou a próxima, que é a primeira em aberto (`resumo.proximaParcela`).
 */
export function parcelaPadrao(t: TabelaDaDivida, escolhida: Id | null): ParcelaDaTabela | null {
  const abertas = parcelasEmAberto(t);
  return abertas.find((p) => p.id === escolhida) ?? abertas[0] ?? null;
}

/** O que a prévia compara antes e depois: parcelas em aberto, a próxima depois da data, quitação. */
export interface SituacaoDaDivida {
  restantes: number;
  /** Valor da primeira parcela em aberto que vence depois da data da amortização. */
  parcela: ParcelaDaTabela | null;
  saldoDevedor: TabelaDaDivida['resumo']['saldoDevedor'];
  quitacao: DataCivil | null;
}

const situacao = (t: TabelaDaDivida, data: DataCivil): SituacaoDaDivida => ({
  restantes: t.resumo.total - t.resumo.pagas,
  parcela: parcelasEmAberto(t).find((p) => p.vencimento > data) ?? null,
  saldoDevedor: t.resumo.saldoDevedor,
  quitacao: t.resumo.quitacaoPrevista,
});

/** Prévia de "Amortizar": a dívida derivada pelo core com o comando aplicado, antes de gravar. */
export function previaDaAmortizacao(
  d: Derivado,
  t: TabelaDaDivida,
  comando: Comando,
  data: DataCivil,
): { antes: SituacaoDaDivida; depois: SituacaoDaDivida } {
  const depois = derivar(aplicar(d.fatos, comando.mudancas), d.hoje).dividas.get(t.divida.id);
  if (!depois) throw new Error('O comando tirou a dívida');
  return { antes: situacao(t, data), depois: situacao(depois, data) };
}
