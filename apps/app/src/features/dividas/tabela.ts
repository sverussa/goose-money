import {
  type Centavos,
  ErroDeDominio,
  type Permissao,
  type ParcelaDaTabela,
  saldoDevedor,
  type StatusParcela,
  type TabelaDaDivida,
} from '@goose-money/core';

import type { EstadoDoChip } from '@/components/estados';
import type { Linha } from '@/components/graficos/dados';

import { mensagensDividas } from './mensagens';

const m = mensagensDividas.tabela;

/** Uma linha da tabela de amortização (6.6): a parcela gravada e o saldo devedor após ela. */
export interface LinhaDaAmortizacao {
  parcela: ParcelaDaTabela;
  saldo: Centavos;
}

/**
 * Saldo após cada parcela = o `saldoDevedor` do core (3.7) como se as parcelas até ela estivessem
 * pagas; a linha da última parcela paga dá o saldo devedor do resumo.
 */
// ponytail: O(n²) nas parcelas (360 parcelas ≈ 130 mil passos); uma coluna do core se pesar.
export const linhasDaTabela = (t: TabelaDaDivida): LinhaDaAmortizacao[] =>
  t.parcelas.map((parcela) => ({
    parcela,
    saldo: saldoDevedor(
      t.parcelas.map((p) => ({
        ...p,
        paga: p.numero <= parcela.numero,
        pagaAntesDoCadastro: false,
      })),
    ),
  }));

/**
 * Pontos do gráfico Saldo devedor: linha cheia até a última parcela paga e tracejada dali em
 * diante (o ponto da última paga está nas duas, para a linha não quebrar).
 */
export function pontosDoSaldo(t: TabelaDaDivida, linhas: readonly LinhaDaAmortizacao[]): Linha[] {
  const proxima = t.resumo.proximaParcela?.numero ?? Infinity;
  return linhas.map(({ parcela: { numero }, saldo }) => ({
    numero: String(numero),
    ...(numero < proxima && { pago: saldo }),
    ...(numero >= proxima - 1 && { previsto: saldo }),
  }));
}

/** Pontos do gráfico Juros × amortização: uma barra empilhada por parcela. */
export const pontosDosJuros = (t: TabelaDaDivida): Linha[] =>
  t.parcelas.map((p) => ({
    numero: String(p.numero),
    amortizacao: p.amortizacao,
    juros: p.juros,
  }));

/** Status do core → chip; a próxima a vencer em destaque, como no design. */
export function chipDaParcela(
  status: StatusParcela,
  proxima: boolean,
): { estado: EstadoDoChip; rotulo?: string } {
  switch (status) {
    case 'paga_antes_do_cadastro':
      return { estado: 'pagaAntesDoCadastro' };
    case 'paga':
      return { estado: 'faturaPaga' };
    case 'vencida':
      return { estado: 'vencido', rotulo: m.vencida };
    case 'a_vencer':
      return proxima
        ? { estado: 'venceEmBreve', rotulo: m.proxima }
        : { estado: 'aPagar', rotulo: m.aVencer };
  }
}

/** A recusa do comando do core vira o motivo do item desabilitado no menu. */
export function permissaoDe(montar: () => unknown): Permissao {
  try {
    montar();
    return { permitida: true };
  } catch (e) {
    if (!(e instanceof ErroDeDominio)) throw e;
    return { permitida: false, motivo: e.message };
  }
}
