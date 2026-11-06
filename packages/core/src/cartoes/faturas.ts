import { somarMeses, type Competencia, type DataCivil } from '../datas';
import { type Centavos, centavos, menos, negar, somar } from '../dinheiro';
import type { Cartao, Compra, Fatos, Id, ItemFatura, Lancamento, Parcela } from '../modelo';
import { type OcorrenciaDoMes, ocorrenciasDoMes } from '../recorrencias';
import { datasDaFatura, type DatasDaFatura, faturaAberta, faturaDaCompra } from './ciclo';

/** PROMPT 3.5 (Saldo, Status, Pagamentos) e 6.5. Nada aqui é receita nem despesa (T01-14). */

export type StatusFatura = 'futura' | 'aberta' | 'fechada' | 'vencida' | 'paga' | 'transportada';

/** Itens da fatura: parcelas, os `ItemFatura` gravados e o transporte de M−1, derivado (D38). */
export type ItemDaFatura =
  | { tipo: 'parcela'; valor: Centavos; parcela: Parcela; compra: Compra }
  | { tipo: ItemFatura['tipo']; valor: Centavos; item: ItemFatura }
  | { tipo: 'saldo_anterior_nao_pago' | 'credito_pagamento'; valor: Centavos; de: Competencia };

export interface Fatura extends DatasDaFatura {
  competencia: Competencia;
  itens: ItemDaFatura[];
  pagamentos: Lancamento[];
  totalPago: Centavos;
  saldo: Centavos;
  status: StatusFatura;
  /** Chip "Paga parcialmente": há pagamento e saldo > 0. */
  pagaParcialmente: boolean;
}

const doCartao = (fatos: Pick<Fatos, 'cartoes'>, cartaoId: Id): Cartao => {
  const cartao = fatos.cartoes.find((x) => x.id === cartaoId);
  if (!cartao) throw new RangeError('Cartão inexistente');
  return cartao;
};

/**
 * Faturas de `competenciaInicial` (ou da mais antiga com item ou pagamento, como a do
 * "Saldo anterior ao cadastro") até a última com movimento, nunca antes da aberta.
 * Parcelas anteriores a `competenciaInicial` são "Paga antes do cadastro" e ficam fora.
 *
 * Transporte (D38): saldo > 0 de uma fatura fechada passa à seguinte quando esta fecha
 * ("Saldo anterior não pago"); saldo < 0 passa à seguinte quando a própria fecha
 * ("Crédito de pagamento"). Fechada = anterior à aberta, como em `compras.ts`.
 */
export function montarFaturas(fatos: Fatos, cartaoId: Id, hoje: DataCivil): Fatura[] {
  const cartao = doCartao(fatos, cartaoId);
  const aberta = faturaAberta(cartao, fatos.cartaoCiclos, hoje);
  const compras = new Map(
    fatos.compras.filter((x) => x.cartaoId === cartaoId).map((x) => [x.id, x]),
  );
  const parcelas = fatos.parcelas.filter(
    (p) => compras.has(p.compraId) && p.competencia >= cartao.competenciaInicial,
  );
  const itens = fatos.itensFatura.filter((i) => i.cartaoId === cartaoId);
  const pagamentos = fatos.lancamentos.filter(
    (l) => l.tipo === 'pagamento_fatura' && l.cartaoId === cartaoId,
  );

  const outras = [
    ...itens.map((i) => i.competencia),
    ...pagamentos.map((l) => l.faturaCompetencia as Competencia),
  ];
  const todas = [...parcelas.map((p) => p.competencia), ...outras];
  const inicio = [cartao.competenciaInicial, ...outras].reduce((a, m) => (m < a ? m : a));
  const fim = [aberta, ...todas].reduce((a, m) => (m > a ? m : a));

  const faturas: Fatura[] = [];
  let entrada = centavos(0);
  for (let m = inicio; m <= fim; m = somarMeses(m, 1)) {
    const de = somarMeses(m, -1);
    const daFatura: ItemDaFatura[] = [
      ...parcelas
        .filter((p) => p.competencia === m)
        .map((p) => {
          const compra = compras.get(p.compraId) as Compra;
          return {
            data: compra.data,
            item: { tipo: 'parcela' as const, valor: p.valor, parcela: p, compra },
          };
        }),
      ...itens
        .filter((i) => i.competencia === m)
        .map((i) => ({ data: i.data, item: { tipo: i.tipo, valor: i.valor, item: i } })),
    ]
      .sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0))
      .map((x) => x.item);
    if (entrada !== 0)
      daFatura.unshift({
        tipo: entrada > 0 ? 'saldo_anterior_nao_pago' : 'credito_pagamento',
        valor: entrada,
        de,
      });
    const pagos = pagamentos.filter((l) => l.faturaCompetencia === m);
    const totalPago = somar(pagos.map((l) => l.valor));
    const bruto = menos(somar(daFatura.map((i) => i.valor)), totalPago);
    const fechada = m < aberta;
    const transportada = bruto > 0 && somarMeses(m, 1) < aberta;
    entrada = transportada || (bruto < 0 && fechada) ? bruto : centavos(0);
    const saldo = menos(bruto, entrada);
    const datas = datasDaFatura(cartao, fatos.cartaoCiclos, m);
    const status: StatusFatura =
      m > aberta
        ? 'futura'
        : m === aberta
          ? 'aberta'
          : transportada
            ? 'transportada'
            : saldo <= 0
              ? 'paga'
              : datas.vencimento >= hoje
                ? 'fechada'
                : 'vencida';
    faturas.push({
      competencia: m,
      ...datas,
      itens: daFatura,
      pagamentos: pagos,
      totalPago,
      saldo,
      status,
      pagaParcialmente: totalPago > 0 && saldo > 0,
    });
  }
  return faturas;
}

/** Destino padrão (3.5): a vencida ou fechada mais antiga com saldo; senão, a aberta. */
export function destinoPadraoDoPagamento(faturas: readonly Fatura[]): Competencia {
  const destino =
    faturas.find((f) => f.status === 'vencida' || f.status === 'fechada') ??
    faturas.find((f) => f.status === 'aberta');
  if (!destino) throw new RangeError('Sem fatura aberta');
  return destino.competencia;
}

/**
 * "Pagar fatura" (6.5): o saldo que resta no destino ou o crédito para a próxima fatura.
 * Num destino ainda aberto, o crédito só passa à seguinte quando ele fechar.
 */
export function previaDoPagamento(
  faturas: readonly Fatura[],
  destino: Competencia,
  valor: Centavos,
): { saldoRestante: Centavos; credito: Centavos } {
  const fatura = faturas.find((f) => f.competencia === destino);
  if (!fatura) throw new RangeError(`Fatura inexistente: ${destino}`);
  const resto = menos(fatura.saldo, valor);
  return {
    saldoRestante: resto > 0 ? resto : centavos(0),
    credito: resto < 0 ? negar(resto) : centavos(0),
  };
}

/**
 * Gastos fixos no cartão ainda não gravados que caem na fatura `competencia` (D46): ficam
 * fora do saldo. Uma data do mês C cai na fatura C, C+1 ou C+2 (`ciclo.ts`).
 */
export function itensPrevistosNaFatura(
  fatos: Fatos,
  cartaoId: Id,
  competencia: Competencia,
  hoje: DataCivil,
): OcorrenciaDoMes[] {
  const cartao = doCartao(fatos, cartaoId);
  return [-2, -1, 0]
    .flatMap((k) => ocorrenciasDoMes(fatos, somarMeses(competencia, k), hoje))
    .filter(
      (o) =>
        o.ocorrencia === null &&
        o.recorrencia.natureza === 'gasto' &&
        o.cartaoId === cartaoId &&
        faturaDaCompra(cartao, fatos.cartaoCiclos, o.data) === competencia,
    );
}
