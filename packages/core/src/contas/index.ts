import {
  maxData,
  primeiroDia,
  somarMeses,
  ultimaData,
  type Competencia,
  type DataCivil,
} from '../datas';
import { centavos, mais, menos, somar, type Centavos } from '../dinheiro';
import type { Conta, Fatos, Id, Lancamento, TipoLancamento } from '../modelo';

/** Efeito de um lançamento efetivado no caixa de uma conta, com sinal (PROMPT 3.3). */
export interface Movimento {
  lancamento: Lancamento;
  valor: Centavos;
}

/** Sinal na conta do lançamento (`contaId`); no destino da transferência, o oposto. */
const sinal: Record<TipoLancamento, 1 | -1> = {
  receita: 1,
  despesa: -1,
  transferencia: -1,
  ajuste: 1, // o valor do ajuste já tem sinal
  pagamento_fatura: -1,
  captacao: 1,
  pagamento_divida: -1,
  amortizacao: -1,
};

/** Movimentos de caixa da conta em ordem de data; previstos não entram (3.1). */
export function movimentosDeCaixa(fatos: Fatos, contaId: Id): Movimento[] {
  const movs: Movimento[] = [];
  for (const l of fatos.lancamentos) {
    if (l.status !== 'efetivado') continue;
    if (l.contaId === contaId)
      movs.push({ lancamento: l, valor: centavos(sinal[l.tipo] * l.valor) });
    else if (l.contaDestinoId === contaId) movs.push({ lancamento: l, valor: l.valor });
  }
  return movs.sort(
    (a, b) =>
      a.lancamento.data.localeCompare(b.lancamento.data) ||
      a.lancamento.createdAt.localeCompare(b.lancamento.createdAt) ||
      a.lancamento.id.localeCompare(b.lancamento.id),
  );
}

/** Marca "Anterior ao saldo inicial": data ≤ `dataSaldoInicial`, fora do saldo (3.4). */
export const anteriorAoSaldoInicial = (m: Movimento, conta: Conta): boolean =>
  m.lancamento.data <= conta.dataSaldoInicial;

function contaDe(fatos: Fatos, contaId: Id): Conta {
  const conta = fatos.contas.find((c) => c.id === contaId);
  if (!conta) throw new RangeError(`Conta inexistente: ${contaId}`);
  return conta;
}

/** Saldo inicial + movimentos com `dataSaldoInicial` < data ≤ `d`; só faz sentido com `d ≥ dataSaldoInicial`. */
function somaAte(conta: Conta, movs: readonly Movimento[], d: DataCivil): Centavos {
  const dentro = movs.filter((m) => !anteriorAoSaldoInicial(m, conta) && m.lancamento.data <= d);
  return mais(conta.saldoInicial, somar(dentro.map((m) => m.valor)));
}

const saldoEm = (conta: Conta, movs: readonly Movimento[], d: DataCivil): Centavos | null =>
  d < conta.dataSaldoInicial ? null : somaAte(conta, movs, d);

/** Saldo no fim do dia `d`; `null` (indisponível, "—") antes do saldo inicial (3.4). */
export const saldo = (fatos: Fatos, contaId: Id, d: DataCivil): Centavos | null =>
  saldoEm(contaDe(fatos, contaId), movimentosDeCaixa(fatos, contaId), d);

export interface LinhaExtrato {
  movimento: Movimento;
  anteriorAoSaldoInicial: boolean;
  /** Saldo corrente após a linha; `null` nas anteriores ao saldo inicial. */
  saldo: Centavos | null;
}

export interface Extrato {
  /** Saldo em max(último dia do mês anterior, `dataSaldoInicial`); `null` em mês anterior a ele. */
  abertura: Centavos | null;
  linhas: LinhaExtrato[];
  /** Somas das linhas que entram no saldo; saídas em valor positivo. */
  entradas: Centavos;
  saidas: Centavos;
  /** Abertura + entradas − saídas = saldo no último dia do mês. */
  fechamento: Centavos | null;
}

/** Extrato da conta no mês (3.4, 6.4). */
export function extratoMensal(fatos: Fatos, contaId: Id, mes: Competencia): Extrato {
  const conta = contaDe(fatos, contaId);
  const movs = movimentosDeCaixa(fatos, contaId);
  const doMes = movs.filter(
    (m) => m.lancamento.data >= primeiroDia(mes) && m.lancamento.data <= ultimaData(mes),
  );
  if (ultimaData(mes) < conta.dataSaldoInicial) {
    const linhas = doMes.map((movimento) => ({
      movimento,
      anteriorAoSaldoInicial: true,
      saldo: null,
    }));
    return { abertura: null, linhas, entradas: centavos(0), saidas: centavos(0), fechamento: null };
  }
  const abertura = somaAte(
    conta,
    movs,
    maxData(ultimaData(somarMeses(mes, -1)), conta.dataSaldoInicial),
  );
  let corrente = abertura;
  let entradas = centavos(0);
  let saidas = centavos(0);
  const linhas = doMes.map((movimento): LinhaExtrato => {
    if (anteriorAoSaldoInicial(movimento, conta))
      return { movimento, anteriorAoSaldoInicial: true, saldo: null };
    corrente = mais(corrente, movimento.valor);
    if (movimento.valor > 0) entradas = mais(entradas, movimento.valor);
    else saidas = menos(saidas, movimento.valor);
    return { movimento, anteriorAoSaldoInicial: false, saldo: corrente };
  });
  return { abertura, linhas, entradas, saidas, fechamento: corrente };
}

/** Valor do `ajuste` a gravar em `data` para o saldo ficar `saldoReal`; `null` se o ajuste não entraria no saldo. */
export function diferencaDeAjuste(
  fatos: Fatos,
  contaId: Id,
  saldoReal: Centavos,
  data: DataCivil,
): Centavos | null {
  const conta = contaDe(fatos, contaId);
  if (data <= conta.dataSaldoInicial) return null;
  return menos(saldoReal, somaAte(conta, movimentosDeCaixa(fatos, contaId), data));
}

export interface ImpactoSaldoInicial {
  saldoAtualAntes: Centavos | null;
  saldoAtualDepois: Centavos | null;
  /** Movimentos que passam a ficar / deixam de ficar "Anterior ao saldo inicial". */
  passamAAnterior: number;
  deixamDeAnterior: number;
}

/** Prévia de mudar saldo inicial ou data (6.4, D21). `hoje` é parâmetro (D12). */
export function impactoDoNovoSaldoInicial(
  fatos: Fatos,
  conta: Conta,
  novoValor: Centavos,
  novaData: DataCivil,
  hoje: DataCivil,
): ImpactoSaldoInicial {
  const movs = movimentosDeCaixa(fatos, conta.id);
  const nova: Conta = { ...conta, saldoInicial: novoValor, dataSaldoInicial: novaData };
  let passamAAnterior = 0;
  let deixamDeAnterior = 0;
  for (const m of movs) {
    const antes = anteriorAoSaldoInicial(m, conta);
    const depois = anteriorAoSaldoInicial(m, nova);
    if (!antes && depois) passamAAnterior++;
    if (antes && !depois) deixamDeAnterior++;
  }
  return {
    saldoAtualAntes: saldoEm(conta, movs, hoje),
    saldoAtualDepois: saldoEm(nova, movs, hoje),
    passamAAnterior,
    deixamDeAnterior,
  };
}
