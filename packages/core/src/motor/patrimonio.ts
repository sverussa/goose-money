import { type Centavos, mais } from '../dinheiro';
import type { Derivado } from './derivar';
import {
  obrigacoesDeCartao,
  patrimonioLiquido,
  saldoDevedorDeDividas,
  saldoEmTodasAsContas,
} from './indicadores';

/** Qual parcela do Patrimônio líquido mais pesa contra ele (D47). */
export type ParcelaQueMaisPesa = 'obrigacoesDeCartao' | 'saldoDevedorDeDividas';

export interface CausaDoPatrimonioNegativo {
  patrimonio: Centavos;
  saldoEmTodasAsContas: Centavos;
  obrigacoesDeCartao: Centavos;
  saldoDevedorDeDividas: Centavos;
  /** Obrigações de cartão + saldo devedor de dívidas: o que soma mais que as contas. */
  compromissos: Centavos;
  maior: ParcelaQueMaisPesa;
  /** O valor da parcela `maior`. */
  valorDoMaior: Centavos;
}

/**
 * Aba Saldos (6.2, D47): com o Patrimônio líquido negativo, os números da frase que explica a
 * causa: dívidas e compras no cartão somam mais que o saldo das contas, e qual delas pesa mais
 * (no empate, as dívidas). `null` quando o patrimônio é zero ou positivo. Só dados; a frase é da
 * tela.
 */
export function causaDoPatrimonioNegativo(d: Derivado): CausaDoPatrimonioNegativo | null {
  const patrimonio = patrimonioLiquido(d);
  if (patrimonio >= 0) return null;
  const cartoes = obrigacoesDeCartao(d);
  const dividas = saldoDevedorDeDividas(d);
  const maior: ParcelaQueMaisPesa =
    cartoes > dividas ? 'obrigacoesDeCartao' : 'saldoDevedorDeDividas';
  return {
    patrimonio,
    saldoEmTodasAsContas: saldoEmTodasAsContas(d),
    obrigacoesDeCartao: cartoes,
    saldoDevedorDeDividas: dividas,
    compromissos: mais(cartoes, dividas),
    maior,
    valorDoMaior: maior === 'obrigacoesDeCartao' ? cartoes : dividas,
  };
}
