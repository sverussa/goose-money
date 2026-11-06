import { compararDatas, type Competencia, type DataCivil, somarDias } from '../datas';
import type { Centavos } from '../dinheiro';
import type { Cartao, Id } from '../modelo';
import type { Derivado } from './derivar';
import { ocorrenciasAte } from './ocorrencias';

/** Card Pendências (PROMPT 6.2) e badges do menu (5.1), lidos do `Derivado` (D13). */

export type AcaoPendencia =
  'Confirmar' | 'Pagar' | 'Confirmar no cartão' | 'Pagar fatura' | 'Registrar pagamento';

interface Comum {
  /** Descrição da recorrência, nome do cartão ou credor da dívida. */
  texto: string;
  valor: Centavos;
  /** Data prevista, vencimento da fatura ou da parcela. */
  data: DataCivil;
  acao: AcaoPendencia;
}

export type Pendencia = Comum &
  (
    | { tipo: 'renda' | 'gasto'; recorrenciaId: Id; competencia: Competencia }
    | { tipo: 'fatura'; cartaoId: Id; competencia: Competencia }
    | { tipo: 'parcela_divida'; dividaId: Id; parcelaDividaId: Id; numero: number }
  );

/** Gastos fixos: vencidos ou vencendo em até 3 dias (5.1, 6.2). */
const DIAS_A_VENCER = 3;

/**
 * Rendas atrasadas e gastos fixos vencidos de qualquer mês desde o início, gastos vencendo em
 * até 3 dias (inclusive no mês seguinte), faturas
 * fechadas ou vencidas e parcelas de dívida vencidas, por data. Fatura aberta não entra.
 */
export function pendencias(derivado: Derivado): Pendencia[] {
  const limite = somarDias(derivado.hoje, DIAS_A_VENCER);
  const recorrencias = ocorrenciasAte(derivado, limite).flatMap((o): Pendencia[] => {
    const comum = {
      texto: o.recorrencia.descricao,
      valor: o.valor,
      data: o.data,
      recorrenciaId: o.recorrenciaId,
      competencia: o.competencia,
    };
    if (o.recorrencia.natureza === 'renda')
      return o.status === 'atrasada' ? [{ ...comum, tipo: 'renda', acao: 'Confirmar' }] : [];
    const aVencer = o.status === 'vencida' || (o.status === 'prevista' && o.data <= limite);
    const acao = o.formaPagamento === 'conta' ? 'Pagar' : 'Confirmar no cartão';
    return aVencer ? [{ ...comum, tipo: 'gasto', acao }] : [];
  });
  const faturas = [...derivado.faturas].flatMap(([cartaoId, lista]) =>
    lista
      .filter((f) => f.status === 'fechada' || f.status === 'vencida')
      .map((f): Pendencia => ({
        tipo: 'fatura',
        texto: (derivado.porId.cartoes.get(cartaoId) as Cartao).nome,
        valor: f.saldo,
        data: f.vencimento,
        acao: 'Pagar fatura',
        cartaoId,
        competencia: f.competencia,
      })),
  );
  const parcelas = [...derivado.dividas.values()].flatMap(({ divida, parcelas }) =>
    parcelas
      .filter((p) => p.status === 'vencida')
      .map((p): Pendencia => ({
        tipo: 'parcela_divida',
        texto: divida.credor,
        valor: p.valor,
        data: p.vencimento,
        acao: 'Registrar pagamento',
        dividaId: divida.id,
        parcelaDividaId: p.id,
        numero: p.numero,
      })),
  );
  return [...recorrencias, ...faturas, ...parcelas].sort((a, b) => compararDatas(a.data, b.data));
}

/**
 * As pendências que "Confirmar todos" confirma: só recorrências, e só as de data até hoje,
 * porque efetivado nunca tem data futura (D79). Lista vazia: o botão não aparece.
 */
export const podeConfirmarTodos = (lista: readonly Pendencia[], hoje: DataCivil): Pendencia[] =>
  lista.filter((p) => (p.tipo === 'renda' || p.tipo === 'gasto') && p.data <= hoje);

export interface Badges {
  gastosFixos: number;
  rendasFixas: number;
  cartoes: number;
  lancamentos: number;
}

/** Números dos badges do menu (5.1). */
export function badges(derivado: Derivado): Badges {
  const lista = pendencias(derivado);
  const contar = (tipo: Pendencia['tipo']) => lista.filter((p) => p.tipo === tipo).length;
  const { fatos } = derivado;
  const aClassificar = new Set(
    fatos.categorias.filter((c) => c.sistema === 'a_classificar').map((c) => c.id),
  );
  const emAClassificar = (x: { categoriaId: Id | null }) =>
    x.categoriaId !== null && aClassificar.has(x.categoriaId);
  return {
    gastosFixos: contar('gasto'),
    rendasFixas: contar('renda'),
    cartoes: [...derivado.faturas.values()].flat().filter((f) => f.status === 'vencida').length,
    lancamentos:
      fatos.lancamentos.filter(emAClassificar).length + fatos.compras.filter(emAClassificar).length,
  };
}
