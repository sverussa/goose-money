import {
  compararDatas,
  competenciaDe,
  somarMeses,
  type Competencia,
  type DataCivil,
} from '../datas';
import { type Centavos, centavos, menos, somar } from '../dinheiro';
import type { Cartao, Compra, Fatos, Id, Parcela } from '../modelo';
import { versaoVigente } from '../recorrencias';
import { faturaAberta } from './ciclo';
import type { Permissao } from './compras';
import { type Fatura, montarFaturas, type StatusFatura } from './faturas';

/**
 * PROMPT 3.5 (Indicadores do cartão, Cartão cadastrado já em uso), 6.2, 6.5 e D21. As faturas
 * vêm de `montarFaturas`: sem parcelas "Paga antes do cadastro" e sem gastos fixos previstos.
 */

const somaDos = (faturas: readonly Fatura[], status: readonly StatusFatura[]) =>
  somar(faturas.filter((f) => status.includes(f.status)).map((f) => f.saldo));

/** Curto prazo: saldos das faturas vencidas, fechadas e da aberta. */
export const aPagarNoCartao = (faturas: readonly Fatura[]): Centavos =>
  somaDos(faturas, ['vencida', 'fechada', 'aberta']);

/** Saldos das faturas não pagas e não transportadas, inclusive futuras; créditos descontam. */
export const obrigacoesDoCartao = (faturas: readonly Fatura[]): Centavos =>
  somaDos(faturas, ['vencida', 'fechada', 'aberta', 'futura']);

/** PROMPT 3.5: limite − max(0, Obrigações do cartão). */
export const limiteDisponivel = (cartao: Pick<Cartao, 'limite'>, obrigacoes: Centavos): Centavos =>
  menos(cartao.limite, obrigacoes > 0 ? obrigacoes : centavos(0));

/** A fatura aberta na data do cadastro (MODELO-DADOS: `competenciaInicial`). */
export const primeiraFaturaControlada = (cartao: Pick<Cartao, 'competenciaInicial'>): Competencia =>
  cartao.competenciaInicial;

/** "Paga antes do cadastro": sem reconhecimento, fora do saldo da fatura e dos indicadores. */
export const pagaAntesDoCadastro = (
  cartao: Pick<Cartao, 'competenciaInicial'>,
  parcela: Pick<Parcela, 'competencia'>,
): boolean => parcela.competencia < primeiraFaturaControlada(cartao);

type ParcelaDaCompra = Pick<Parcela, 'compraId' | 'numero' | 'valor' | 'competencia'>;

/** Informativo: parcelas da compra com competência posterior à última fatura fechada. */
export const parcelasRestantes = <P extends ParcelaDaCompra>(
  compra: Pick<Compra, 'id'>,
  parcelas: readonly P[],
  ultimaFaturaFechada: Competencia,
): P[] =>
  parcelas
    .filter((p) => p.compraId === compra.id && p.competencia > ultimaFaturaFechada)
    .sort((a, b) => a.numero - b.numero);

const ultimaFechada = (fatos: Fatos, cartao: Cartao, hoje: DataCivil) =>
  somarMeses(faturaAberta(cartao, fatos.cartaoCiclos, hoje), -1);

export interface LinhaCompraParcelada {
  compra: Compra;
  cartao: Cartao;
  /** Parcela atual "3/10": a primeira restante, `atual`/`de`. */
  atual: number;
  de: number;
  valorParcela: Centavos;
  restantes: number;
  valorRestante: Centavos;
  /** Competência da última parcela. */
  ultima: Competencia;
}

/** Tabela da aba Cartões (6.2): compras parceladas com parcelas restantes, pela data da compra. */
export function comprasParceladasAtivas(
  fatos: Fatos,
  hoje: DataCivil,
): {
  linhas: LinhaCompraParcelada[];
  total: Pick<LinhaCompraParcelada, 'valorParcela' | 'restantes' | 'valorRestante'> & {
    ultima: Competencia | null;
  };
} {
  const linhas: LinhaCompraParcelada[] = [];
  for (const cartao of fatos.cartoes) {
    const fechada = ultimaFechada(fatos, cartao, hoje);
    for (const compra of fatos.compras) {
      if (compra.cartaoId !== cartao.id || compra.numeroParcelas < 2) continue;
      const rs = parcelasRestantes(compra, fatos.parcelas, fechada);
      const [atual, ultima] = [rs[0], rs.at(-1)];
      if (!atual || !ultima) continue;
      linhas.push({
        compra,
        cartao,
        atual: atual.numero,
        de: compra.numeroParcelas,
        valorParcela: atual.valor,
        restantes: rs.length,
        valorRestante: somar(rs.map((p) => p.valor)),
        ultima: ultima.competencia,
      });
    }
  }
  linhas.sort((a, b) => compararDatas(a.compra.data, b.compra.data));
  return {
    linhas,
    total: {
      valorParcela: somar(linhas.map((l) => l.valorParcela)),
      restantes: linhas.reduce((n, l) => n + l.restantes, 0),
      valorRestante: somar(linhas.map((l) => l.valorRestante)),
      ultima: linhas.reduce<Competencia | null>((a, l) => (a && a > l.ultima ? a : l.ultima), null),
    },
  };
}

/**
 * Gráfico "Parcelas comprometidas" (8.1): parcelas restantes por cartão e competência, por
 * `meses` a partir da fatura aberta mais antiga. Só entram cartões com parcela na janela.
 */
export function parcelasComprometidas(
  fatos: Fatos,
  hoje: DataCivil,
  meses = 12,
): { competencia: Competencia; cartoes: { cartaoId: Id; valor: Centavos }[] }[] {
  const porCartao = fatos.cartoes.map((cartao) => {
    const fechada = ultimaFechada(fatos, cartao, hoje);
    const compras = new Set(fatos.compras.filter((x) => x.cartaoId === cartao.id).map((x) => x.id));
    const parcelas = fatos.parcelas.filter(
      (p) => compras.has(p.compraId) && p.competencia > fechada,
    );
    return { cartaoId: cartao.id, inicio: somarMeses(fechada, 1), parcelas };
  });
  if (porCartao.length === 0) return [];
  const inicio = porCartao.map((x) => x.inicio).reduce((a, m) => (m < a ? m : a));
  const janela = Array.from({ length: meses }, (_, k) => somarMeses(inicio, k));
  const valor = (ps: readonly Parcela[], m: Competencia) =>
    somar(ps.filter((p) => p.competencia === m).map((p) => p.valor));
  const comParcela = porCartao.filter((x) => janela.some((m) => valor(x.parcelas, m) !== 0));
  return janela.map((competencia) => ({
    competencia,
    cartoes: comParcela.map((x) => ({
      cartaoId: x.cartaoId,
      valor: valor(x.parcelas, competencia),
    })),
  }));
}

const sim: Permissao = { permitida: true };
const nao = (motivo: string): Permissao => ({ permitida: false, motivo });

/** Algum gasto fixo ativo usa o cartão na competência `c` ou depois. */
function gastoFixoNoCartao(fatos: Fatos, cartaoId: Id, c: Competencia): boolean {
  return fatos.recorrencias.some((r) => {
    if (!r.ativa || (r.competenciaFim !== null && r.competenciaFim < c)) return false;
    const versoes = fatos.recorrenciaVersoes.filter((v) => v.recorrenciaId === r.id);
    const vigente = versaoVigente(versoes, c);
    return versoes.some((v) => v.cartaoId === cartaoId && (v === vigente || v.vigenteDesde > c));
  });
}

/**
 * Arquivar (6.5, D21): nenhuma fatura com saldo, inclusive futuras e créditos (mais estrito
 * que Obrigações = 0, que deixaria saldos se compensarem), e nenhum gasto fixo ativo no cartão.
 */
export function podeArquivarCartao(fatos: Fatos, cartaoId: Id, hoje: DataCivil): Permissao {
  if (montarFaturas(fatos, cartaoId, hoje).some((f) => f.saldo !== 0))
    return nao('Há saldo em faturas do cartão, inclusive futuras.');
  if (gastoFixoNoCartao(fatos, cartaoId, competenciaDe(hoje)))
    return nao('Há gasto fixo ativo pago neste cartão.');
  return sim;
}

/**
 * Excluir (6.5, D21): só sem compras, itens de fatura (inclusive "Saldo anterior ao cadastro")
 * e pagamentos; nem gasto fixo que use o cartão em qualquer versão.
 */
export function podeExcluirCartao(fatos: Fatos, cartaoId: Id): Permissao {
  const doCartao = (x: { cartaoId: Id | null }) => x.cartaoId === cartaoId;
  if (
    fatos.compras.some(doCartao) ||
    fatos.itensFatura.some(doCartao) ||
    fatos.lancamentos.some((l) => l.tipo === 'pagamento_fatura' && doCartao(l))
  )
    return nao('O cartão tem compras, encargos, estornos ou pagamentos. Use "Arquivar".');
  if (fatos.recorrenciaVersoes.some(doCartao))
    return nao('Há gasto fixo pago neste cartão. Mude a forma de pagamento ou use "Arquivar".');
  return sim;
}
