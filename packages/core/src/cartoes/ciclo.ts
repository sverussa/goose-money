import { competenciaDe, diaNoMes, somarMeses, type Competencia, type DataCivil } from '../datas';
import type { Cartao, CartaoCiclo } from '../modelo';

/** PROMPT 3.5 (Ciclo, Atribuição, Mudança de ciclo) e 3.11. */

type Versao = Pick<CartaoCiclo, 'vigenteDesde' | 'diaFechamento' | 'diaVencimento'>;

export interface DatasDaFatura {
  fechamento: DataCivil;
  vencimento: DataCivil;
}

/**
 * Versão com maior `vigenteDesde` ≤ `c`. Antes da primeira versão vale a mais
 * antiga: compras anteriores ao cadastro também precisam de fatura (3.5).
 */
export function cicloVigente<T extends Versao>(ciclos: readonly T[], c: Competencia): T {
  const ordenados = [...ciclos].sort((a, b) => (a.vigenteDesde < b.vigenteDesde ? -1 : 1));
  const versao = ordenados.findLast((v) => v.vigenteDesde <= c) ?? ordenados[0];
  if (!versao) throw new RangeError('Cartão sem ciclo');
  return versao;
}

const doCartao = (cartao: Cartao, ciclos: readonly CartaoCiclo[]) =>
  ciclos.filter((v) => v.cartaoId === cartao.id && !v.isDeleted);

function datas(versoes: readonly Versao[], m: Competencia): DatasDaFatura {
  const { diaFechamento: f, diaVencimento: v } = cicloVigente(versoes, m);
  return {
    fechamento: diaNoMes(f < v ? m : somarMeses(m, -1), f),
    vencimento: diaNoMes(m, v),
  };
}

/**
 * Menor M com data < fechamento(M). Como fechamento(M) cai em M ou M−1, a busca
 * começa no mês da data e anda no máximo dois meses; a minimalidade garante
 * fechamento(M−1) ≤ data mesmo quando uma mudança de ciclo antecipa o fechamento.
 */
function fatura(versoes: readonly Versao[], data: DataCivil): Competencia {
  let m = competenciaDe(data);
  while (data >= datas(versoes, m).fechamento) m = somarMeses(m, 1);
  return m;
}

/** Vencimento no dia V de M; fechamento no dia F de M se F < V, senão de M−1. */
export const datasDaFatura = (
  cartao: Cartao,
  ciclos: readonly CartaoCiclo[],
  m: Competencia,
): DatasDaFatura => datas(doCartao(cartao, ciclos), m);

/** Fatura M com fechamento(M−1) ≤ data < fechamento(M); no dia do fechamento, a seguinte. */
export const faturaDaCompra = (
  cartao: Cartao,
  ciclos: readonly CartaoCiclo[],
  data: DataCivil,
): Competencia => fatura(doCartao(cartao, ciclos), data);

/** A fatura que recebe as compras de hoje. */
export const faturaAberta = faturaDaCompra;

/**
 * A partir de qual fatura vale uma mudança de ciclo (3.5). As anteriores à
 * aberta já fecharam, então é a própria aberta.
 */
export const primeiraFaturaNaoFechada = faturaAberta;

/** Prévia do cadastro (6.5, D21): a fatura em que caem as compras de hoje. */
export function previaDoCadastro(
  diaFechamento: number,
  diaVencimento: number,
  hoje: DataCivil,
): DatasDaFatura & { competencia: Competencia } {
  const versoes = [{ vigenteDesde: competenciaDe(hoje), diaFechamento, diaVencimento }];
  const competencia = fatura(versoes, hoje);
  return { competencia, ...datas(versoes, competencia) };
}
