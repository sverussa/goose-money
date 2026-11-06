import { somarMeses, type Competencia } from '../datas';
import { type Centavos, centavos, mais, negar, ratear, somar } from '../dinheiro';
import type { Cartao, CartaoCiclo, Compra, Parcela } from '../modelo';
import { faturaDaCompra } from './ciclo';
import { limiteDisponivel } from './indicadores';

/** PROMPT 3.6. As funções recebem só as parcelas não excluídas. */

export type ParcelaCompra = Pick<Parcela, 'numero' | 'valor' | 'competencia'>;
type CompraRateio = Pick<Compra, 'data' | 'valorTotal' | 'numeroParcelas'>;

const soma = (ps: readonly ParcelaCompra[]) => somar(ps.map((p) => p.valor));
const porNumero = (ps: readonly ParcelaCompra[]) => [...ps].sort((a, b) => a.numero - b.numero);
/** Fatura fechada: anterior à aberta (3.5). */
const fechadas = (ps: readonly ParcelaCompra[], aberta: Competencia) =>
  ps.filter((p) => p.competencia < aberta);
const futuras = (ps: readonly ParcelaCompra[], aberta: Competencia) =>
  porNumero(ps).filter((p) => p.competencia > aberta);

/** Alternância "valor da parcela" da Nova compra (6.5): parcela × n = total. */
export const totalPelaParcela = (valorParcela: Centavos, n: number): Centavos =>
  centavos(valorParcela * n);

/** Rateio com resto na 1ª; a parcela k cai na fatura da compra + (k − 1) meses. */
export function gerarParcelas(
  compra: CompraRateio,
  cartao: Cartao,
  ciclos: readonly CartaoCiclo[],
): ParcelaCompra[] {
  const primeira = faturaDaCompra(cartao, ciclos, compra.data);
  return ratear(compra.valorTotal, compra.numeroParcelas, 'primeira').map((valor, k) => ({
    numero: k + 1,
    valor,
    competencia: somarMeses(primeira, k),
  }));
}

export type Violacao = 'soma' | 'quantidade' | 'ordem' | 'descricaoCategoria';

/** As 4 invariantes de 3.6. Compra cancelada fica fora das duas primeiras (MODELO-DADOS 3.6). */
export function validarInvariantes(
  compra: Pick<Compra, 'valorTotal' | 'numeroParcelas' | 'cancelada'>,
  parcelas: readonly ParcelaCompra[],
): Violacao[] {
  const ps = porNumero(parcelas);
  const violacoes: Violacao[] = [];
  if (!compra.cancelada) {
    if (soma(ps) !== compra.valorTotal) violacoes.push('soma');
    if (ps.length !== compra.numeroParcelas || ps.some((p, i) => p.numero !== i + 1))
      violacoes.push('quantidade');
  }
  if (ps.some((p, i) => i > 0 && p.competencia < (ps[i - 1] as ParcelaCompra).competencia))
    violacoes.push('ordem');
  if (ps.some((p) => Object.hasOwn(p, 'descricao') || Object.hasOwn(p, 'categoriaId')))
    violacoes.push('descricaoCategoria');
  return violacoes;
}

export type OperacaoCompra =
  'editarDescricao' | 'editarValor' | 'lancarAjuste' | 'anteciparParcelas' | 'cancelar' | 'excluir';
export interface Permissao {
  permitida: boolean;
  motivo?: string;
}

const sim: Permissao = { permitida: true };
const nao = (motivo: string): Permissao => ({ permitida: false, motivo });
const se = (ok: boolean, motivo: string) => (ok ? sim : nao(motivo));

/** Menu da compra (3.6, 6.5). `aberta`: a fatura aberta do cartão hoje (`faturaAberta`). */
export function operacoesPermitidas(
  compra: Pick<Compra, 'cancelada'>,
  parcelas: readonly ParcelaCompra[],
  aberta: Competencia,
): Record<OperacaoCompra, Permissao> {
  const temFechada = fechadas(parcelas, aberta).length > 0;
  const excluir = se(!temFechada, 'Há parcela em fatura fechada. Use "Cancelar compra".');
  if (compra.cancelada) {
    const cancelada = nao('Compra cancelada.');
    return {
      editarDescricao: sim,
      editarValor: cancelada,
      lancarAjuste: cancelada,
      anteciparParcelas: cancelada,
      cancelar: cancelada,
      excluir,
    };
  }
  return {
    editarDescricao: sim,
    editarValor: se(!temFechada, 'Há parcela em fatura fechada. Use "Lançar ajuste".'),
    lancarAjuste: se(temFechada, 'Nenhuma parcela em fatura fechada. Edite o valor da compra.'),
    anteciparParcelas: se(
      futuras(parcelas, aberta).length > 0,
      'Nenhuma parcela em fatura futura.',
    ),
    cancelar: sim,
    excluir,
  };
}

/**
 * Move as `k` últimas parcelas para a fatura aberta e renumera todas pela competência, para
 * manter a invariante 3 (decisão pendente em DECISOES.md, opção A). O desconto vira estorno
 * (valor negativo) na fatura aberta.
 */
export function anteciparParcelas(
  compra: Pick<Compra, 'cancelada'>,
  parcelas: readonly ParcelaCompra[],
  k: number,
  aberta: Competencia,
  desconto: Centavos = centavos(0),
): { parcelas: ParcelaCompra[]; estorno: Centavos | null } {
  const candidatas = compra.cancelada ? [] : futuras(parcelas, aberta);
  if (!Number.isSafeInteger(k) || k < 1 || k > candidatas.length)
    throw new RangeError(`Antecipar de 1 a ${String(candidatas.length)} parcelas: ${String(k)}`);
  const movidas = new Set(candidatas.slice(-k));
  const maximo = soma([...movidas]);
  if (desconto < 0 || desconto > maximo)
    throw new RangeError(`Desconto de 0 a ${String(maximo)}: ${String(desconto)}`);
  const novas = porNumero(parcelas)
    .map((p) => (movidas.has(p) ? { ...p, competencia: aberta } : p))
    .sort((a, b) => (a.competencia === b.competencia ? 0 : a.competencia < b.competencia ? -1 : 1))
    .map((p, i) => ({ ...p, numero: i + 1 }));
  return { parcelas: novas, estorno: desconto > 0 ? negar(desconto) : null };
}

/**
 * Cancelar compra (3.6): números das parcelas a excluir (faturas não fechadas) e, se o banco
 * estornou, o estorno (negativo) da soma das já faturadas, na fatura aberta. Parcelas
 * "Paga antes do cadastro" ficam fora do estorno: nunca foram despesa nem saldo de fatura.
 */
export function cancelarCompra(
  compra: Pick<Compra, 'cancelada'>,
  parcelas: readonly ParcelaCompra[],
  cartao: Pick<Cartao, 'competenciaInicial'>,
  aberta: Competencia,
  bancoEstornou: boolean,
): { remover: number[]; estorno: Centavos | null } {
  if (compra.cancelada) throw new RangeError('Compra já cancelada');
  const remover = porNumero(parcelas)
    .filter((p) => p.competencia >= aberta)
    .map((p) => p.numero);
  const faturado = soma(
    fechadas(parcelas, aberta).filter((p) => p.competencia >= cartao.competenciaInicial),
  );
  return { remover, estorno: bancoEstornou && faturado > 0 ? negar(faturado) : null };
}

export interface LinhaPrevia extends ParcelaCompra {
  /** Total de parcelas, para "1/10". */
  de: number;
}

/**
 * Prévia da Nova compra (6.5): "1/10 · R$ 420,00 · fatura de dez/2026" e o novo Limite
 * disponível. `obrigacoes`: Obrigações do cartão antes da compra. Parcelas "Paga antes do
 * cadastro" não entram nas obrigações (3.5).
 */
export function previaDaCompra(
  compra: CompraRateio,
  cartao: Cartao,
  ciclos: readonly CartaoCiclo[],
  obrigacoes: Centavos,
): { parcelas: LinhaPrevia[]; limiteDisponivel: Centavos } {
  const ps = gerarParcelas(compra, cartao, ciclos);
  const novas = soma(ps.filter((p) => p.competencia >= cartao.competenciaInicial));
  return {
    parcelas: ps.map((p) => ({ ...p, de: ps.length })),
    limiteDisponivel: limiteDisponivel(cartao, mais(obrigacoes, novas)),
  };
}
