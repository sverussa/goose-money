import type Decimal from 'decimal.js';
import { competenciaDe, type DataCivil, diaNoMes, somarMeses } from '../datas';
import { type Centavos, D, mais, menos, paraCentavos, ratear } from '../dinheiro';

/** Uma linha da tabela de amortização (campos de `ParcelaDivida`, mais o saldo devedor após ela). */
export interface LinhaTabela {
  numero: number;
  vencimento: DataCivil;
  valor: Centavos;
  juros: Centavos;
  amortizacao: Centavos;
  saldoDevedor: Centavos;
}

function validar(pv: Centavos, i: Decimal, n: number) {
  if (!Number.isSafeInteger(n) || n < 1)
    throw new RangeError(`Número de parcelas inválido: ${String(n)}`);
  if (pv <= 0) throw new RangeError(`Valor contratado precisa ser positivo: ${String(pv)}`);
  if (i.isNegative()) throw new RangeError(`Taxa negativa: ${i.toString()}`);
}

/**
 * Monta as `n` linhas com J(k) = round(SD(k−1) × i). `amortizar` dá A(k) para k < n;
 * a última amortiza o saldo restante, então SD(n) = 0 exatamente (3.7).
 */
function gerar(
  pv: Centavos,
  i: Decimal,
  n: number,
  primeiraData: DataCivil,
  amortizar: (juros: Centavos, k: number) => Centavos,
): LinhaTabela[] {
  const taxa = new D(i);
  const mes = competenciaDe(primeiraData);
  const dia = Number(primeiraData.slice(8));
  const linhas: LinhaTabela[] = [];
  let sd = pv;
  for (let k = 1; k <= n; k++) {
    const juros = paraCentavos(taxa.times(sd));
    const amortizacao = k === n ? sd : amortizar(juros, k);
    sd = menos(sd, amortizacao);
    linhas.push({
      numero: k,
      vencimento: diaNoMes(somarMeses(mes, k - 1), dia),
      valor: mais(juros, amortizacao),
      juros,
      amortizacao,
      saldoDevedor: sd,
    });
  }
  return linhas;
}

/** SAC: A(k) = parte inteira de PV ÷ n (k < n), A(n) = SD(n−1). Com i = 0 é o rateio com resto na última. */
export function tabelaSac(
  pv: Centavos,
  i: Decimal,
  n: number,
  primeiraData: DataCivil,
): LinhaTabela[] {
  validar(pv, i, n);
  const a = ratear(pv, n, 'ultima'); // base = parte inteira de PV ÷ n
  return gerar(pv, i, n, primeiraData, (_, k) => a[k - 1] as Centavos);
}

/** Price: PMT = round(PV × i ÷ (1 − (1 + i)^−n)) uma vez; A(k) = PMT − J(k). */
export function tabelaPrice(
  pv: Centavos,
  i: Decimal,
  n: number,
  primeiraData: DataCivil,
): LinhaTabela[] {
  validar(pv, i, n);
  // Taxa zero (3.7): sem fórmula; rateio com resto na última e juros zero, que é o SAC com i = 0.
  if (i.isZero()) return tabelaSac(pv, i, n, primeiraData);
  const taxa = new D(i);
  const pmt = paraCentavos(new D(pv).times(taxa).div(new D(1).minus(taxa.plus(1).pow(-n))));
  return gerar(pv, i, n, primeiraData, (juros) => menos(pmt, juros));
}
