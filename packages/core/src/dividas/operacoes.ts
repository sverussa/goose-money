import type Decimal from 'decimal.js';
import type { DataCivil } from '../datas';
import { type Centavos, centavos, D, menos, somar } from '../dinheiro';
import type { Divida, ParcelaDivida } from '../modelo';
import { gerar, type LinhaTabela, tabelaPrice, tabelaSac, taxaImplicita } from './tabelas';

/** Campos de `Divida` usados no cálculo. */
export type DividaCalculo = Pick<
  Divida,
  | 'valorContratado'
  | 'destinoDoValor'
  | 'sistemaAmortizacao'
  | 'taxaMensal'
  | 'valorParcelaInformada'
  | 'numeroParcelas'
>;

/** Campos de `ParcelaDivida` usados no cálculo e se ela tem `pagamento_divida` não excluído. */
export type ParcelaCalculo = Pick<
  ParcelaDivida,
  'numero' | 'vencimento' | 'valor' | 'juros' | 'amortizacao' | 'pagaAntesDoCadastro'
> & { paga: boolean };

export type StatusParcela = 'a_vencer' | 'vencida' | 'paga' | 'paga_antes_do_cadastro';

const quitada = (p: ParcelaCalculo) => p.paga || p.pagaAntesDoCadastro;
const soma = (ps: readonly ParcelaCalculo[], campo: 'valor' | 'juros' | 'amortizacao') =>
  somar(ps.map((p) => p[campo]));

export function statusParcela(parcela: ParcelaCalculo, hoje: DataCivil): StatusParcela {
  if (parcela.pagaAntesDoCadastro) return 'paga_antes_do_cadastro';
  if (parcela.paga) return 'paga';
  return parcela.vencimento < hoje ? 'vencida' : 'a_vencer';
}

/** SD após a última parcela paga: pelas invariantes de D3, a soma das amortizações não pagas. */
export const saldoDevedor = (parcelas: readonly ParcelaCalculo[]): Centavos =>
  soma(
    parcelas.filter((p) => !quitada(p)),
    'amortizacao',
  );

/** Taxa informada (Price e SAC) ou implícita do contrato (parcela informada). */
function taxaDa(divida: DividaCalculo): Decimal {
  const { valorContratado, valorParcelaInformada, taxaMensal, numeroParcelas } = divida;
  if (divida.sistemaAmortizacao === 'parcela_informada' && valorParcelaInformada !== null)
    return taxaImplicita(valorContratado, valorParcelaInformada, numeroParcelas);
  if (divida.sistemaAmortizacao !== 'parcela_informada' && taxaMensal !== null)
    return new D(taxaMensal);
  throw new RangeError('Dívida sem taxa ou sem valor de parcela');
}

/**
 * Devolve as parcelas não pagas depois de amortizar `valor` em `data` (3.7, D3). Pagas não
 * mudam; não pagas que vencem até `data` ficam como estão; as seguintes são regeneradas
 * sobre o saldo delas menos `valor`, nos mesmos números e vencimentos. "Reduzir prazo" mantém
 * a parcela (Price e parcela informada) ou a amortização (SAC) da próxima; "reduzir valor"
 * mantém o número de parcelas.
 */
export function amortizarExtraordinario(
  divida: DividaCalculo,
  parcelas: readonly ParcelaCalculo[],
  valor: Centavos,
  data: DataCivil,
  modo: 'reduzirPrazo' | 'reduzirValor',
): ParcelaCalculo[] {
  const abertas = parcelas.filter((p) => !quitada(p)).sort((a, b) => a.numero - b.numero);
  const mantidas = abertas.filter((p) => p.vencimento <= data);
  const futuras = abertas.filter((p) => p.vencimento > data);
  const base = saldoDevedor(futuras);
  if (valor <= 0 || valor > base)
    throw new RangeError(
      `Amortização precisa ser positiva e até ${String(base)}: ${String(valor)}`,
    );
  const sd = menos(base, valor);
  if (sd === 0) return mantidas;
  const proxima = futuras[0] as ParcelaCalculo; // existe: base > 0

  const i = taxaDa(divida);
  const sac = divida.sistemaAmortizacao === 'sac';
  let linhas: LinhaTabela[];
  if (modo === 'reduzirValor') {
    // Parcela informada recalcula como Price sobre a taxa implícita.
    linhas = (sac ? tabelaSac : tabelaPrice)(sd, i, futuras.length, proxima.vencimento);
  } else {
    const amortizar = sac
      ? () => proxima.amortizacao
      : (juros: Centavos) => menos(proxima.valor, juros);
    // Prazo novo: primeira linha que zera o saldo com a parcela (ou amortização) mantida.
    const prova = gerar(sd, i, futuras.length, proxima.vencimento, amortizar);
    const n = prova.findIndex((l) => l.saldoDevedor <= 0) + 1; // a última de `gerar` zera
    linhas = gerar(sd, i, n, proxima.vencimento, amortizar);
  }
  return [
    ...mantidas,
    ...linhas.map((l, k) => {
      const { numero, vencimento } = futuras[k] as ParcelaCalculo;
      const { valor, juros, amortizacao } = l;
      return {
        numero,
        vencimento,
        valor,
        juros,
        amortizacao,
        pagaAntesDoCadastro: false,
        paga: false,
      };
    }),
  ];
}

/** Despesa reconhecida da parcela (3.3): só juros se creditado em conta; a parcela se pago a terceiro. */
export function despesaDaParcela(
  divida: Pick<DividaCalculo, 'destinoDoValor'>,
  parcela: ParcelaCalculo,
): Centavos {
  if (parcela.pagaAntesDoCadastro) return centavos(0);
  return divida.destinoDoValor === 'creditado_em_conta' ? parcela.juros : parcela.valor;
}

/** Resumo do detalhe e do card da dívida (6.6). `amortizacoes`: lançamentos `amortizacao`. */
export function resumoDaDivida(
  divida: DividaCalculo,
  parcelas: readonly ParcelaCalculo[],
  amortizacoes: readonly Centavos[] = [],
) {
  const pagas = parcelas.filter(quitada);
  const abertas = parcelas.filter((p) => !quitada(p)).sort((a, b) => a.numero - b.numero);
  return {
    valorContratado: divida.valorContratado,
    taxa: taxaDa(divida),
    taxaImplicita: divida.sistemaAmortizacao === 'parcela_informada',
    sistema: divida.sistemaAmortizacao,
    destino: divida.destinoDoValor,
    totalPago: somar([soma(pagas, 'valor'), ...amortizacoes]),
    jurosPagos: soma(pagas, 'juros'),
    jurosAPagar: soma(abertas, 'juros'),
    pagas: pagas.length,
    total: parcelas.length,
    saldoDevedor: saldoDevedor(parcelas),
    proximaParcela: abertas[0] ?? null,
    quitacaoPrevista: abertas.at(-1)?.vencimento ?? null,
  };
}
