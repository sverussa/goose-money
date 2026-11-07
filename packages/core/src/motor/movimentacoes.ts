import type { DataCivil } from '../datas';
import { type Centavos, negar, somar } from '../dinheiro';
import type { Fatos, Id, TipoLancamento } from '../modelo';
import type { Periodo } from '../periodos';
import { juntar, type OrigemDoItem } from './reconhecimento';

/**
 * Visão "Movimentações" de Lançamentos (PROMPT 6.3; T05-07): pela data do evento, todos os
 * lançamentos em conta (inclusive transferências, pagamentos de fatura e de dívida, captações e
 * ajustes) e as compras no cartão pela data da compra. Não é receita nem despesa (3.3).
 */

export type TipoDaMovimentacao = TipoLancamento | 'compra';

/** Estado de 3.1 na visão por evento: compras e efetivados aconteceram; previstos, não. */
export type EstadoDaMovimentacao = 'realizado' | 'previsto' | 'atrasado';

export interface ItemDeMovimentacao {
  tipo: TipoDaMovimentacao;
  /** Data do evento (3.2). */
  data: DataCivil;
  /** Efeito na conta do item, com sinal: entrada positiva, saída negativa. Compra: o total, negativo. */
  valor: Centavos;
  texto: string;
  categoriaId: Id | null;
  contaId: Id | null;
  contaDestinoId: Id | null;
  cartaoId: Id | null;
  origem: OrigemDoItem;
  estado: EstadoDaMovimentacao;
  registro: { entidade: 'lancamento' | 'compra'; id: Id };
}

export interface FiltrosDeMovimentacao {
  tipos?: readonly TipoDaMovimentacao[];
  /** Na transferência, vale a origem ou o destino. */
  contaId?: Id;
  cartaoId?: Id;
  /** Inclui as subcategorias de cada uma. */
  categorias?: readonly Id[];
  /** Padrão: só os realizados. */
  estados?: readonly EstadoDaMovimentacao[];
  origens?: readonly OrigemDoItem[];
  /** Na descrição exibida, sem diferenciar maiúsculas e acentos. */
  busca?: string;
}

/** Sinal na conta do lançamento (`contaId`); o ajuste já tem o sinal no valor. */
const SAI: ReadonlySet<TipoLancamento> = new Set([
  'despesa',
  'transferencia',
  'pagamento_fatura',
  'pagamento_divida',
  'amortizacao',
]);

const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** Todos os itens da visão, de qualquer data, em ordem de data (a mais antiga primeiro). */
function todos(fatos: Fatos, hoje: DataCivil): ItemDeMovimentacao[] {
  const categorias = new Map(fatos.categorias.map((c) => [c.id, c]));
  const contas = new Map(fatos.contas.map((c) => [c.id, c]));
  const cartoes = new Map(fatos.cartoes.map((c) => [c.id, c]));
  const dividas = new Map(fatos.dividas.map((d) => [d.id, d]));
  const daRecorrencia = new Set(fatos.ocorrencias.flatMap((o) => [o.lancamentoId, o.compraId]));
  const nomeDaCategoria = (id: Id | null) => (id ? categorias.get(id)?.nome : undefined);

  const itens: ItemDeMovimentacao[] = fatos.lancamentos.map((l) => {
    const credor = l.dividaId ? dividas.get(l.dividaId)?.credor : undefined;
    const cartao = l.cartaoId ? cartoes.get(l.cartaoId)?.nome : undefined;
    const destino = l.contaDestinoId ? contas.get(l.contaDestinoId)?.nome : undefined;
    const padrao: Record<TipoLancamento, string> = {
      receita: nomeDaCategoria(l.categoriaId) ?? '',
      despesa: nomeDaCategoria(l.categoriaId) ?? '',
      transferencia: juntar('Transferência', destino && `para ${destino}`),
      ajuste: 'Ajuste de saldo',
      pagamento_fatura: juntar('Pagamento de fatura', cartao),
      captacao: juntar('Captação', credor),
      pagamento_divida: juntar('Pagamento de dívida', credor),
      amortizacao: juntar('Amortização', credor),
    };
    const previsto = l.status === 'previsto';
    return {
      tipo: l.tipo,
      data: l.data,
      valor: SAI.has(l.tipo) ? negar(l.valor) : l.valor,
      texto: l.descricao?.trim() || padrao[l.tipo],
      categoriaId: l.categoriaId,
      contaId: l.contaId,
      contaDestinoId: l.contaDestinoId,
      cartaoId: l.cartaoId,
      origem: daRecorrencia.has(l.id)
        ? 'recorrencia'
        : l.dividaId
          ? 'divida'
          : l.tipo === 'pagamento_fatura'
            ? 'cartao'
            : 'manual',
      estado: !previsto
        ? 'realizado'
        : l.tipo === 'receita' && l.data < hoje
          ? 'atrasado'
          : 'previsto',
      registro: { entidade: 'lancamento', id: l.id },
    };
  });

  for (const c of fatos.compras) {
    if (c.cancelada) continue;
    itens.push({
      tipo: 'compra',
      data: c.data,
      valor: negar(c.valorTotal),
      texto: juntar(
        c.descricao?.trim() || nomeDaCategoria(c.categoriaId),
        c.numeroParcelas > 1 ? `${String(c.numeroParcelas)}x` : null,
      ),
      categoriaId: c.categoriaId,
      contaId: null,
      contaDestinoId: null,
      cartaoId: c.cartaoId,
      origem: daRecorrencia.has(c.id) ? 'recorrencia' : 'cartao',
      estado: 'realizado',
      registro: { entidade: 'compra', id: c.id },
    });
  }
  return itens.sort(
    (a, b) => a.data.localeCompare(b.data) || a.registro.id.localeCompare(b.registro.id),
  );
}

/** Itens com data do evento no período, filtrados (6.3), em ordem de data. */
export function movimentacoes(
  fatos: Fatos,
  hoje: DataCivil,
  periodo: Periodo,
  filtros: FiltrosDeMovimentacao = {},
): ItemDeMovimentacao[] {
  const pai = new Map(fatos.categorias.map((c) => [c.id, c.categoriaPaiId ?? c.id]));
  const { tipos, contaId, cartaoId, categorias, origens } = filtros;
  const estados = filtros.estados ?? ['realizado'];
  const busca = normalizar(filtros.busca?.trim() ?? '');
  return todos(fatos, hoje).filter(
    (i) =>
      i.data >= periodo.de &&
      i.data <= periodo.ate &&
      (tipos === undefined || tipos.includes(i.tipo)) &&
      (contaId === undefined || i.contaId === contaId || i.contaDestinoId === contaId) &&
      (cartaoId === undefined || i.cartaoId === cartaoId) &&
      (categorias === undefined ||
        (i.categoriaId !== null &&
          (categorias.includes(i.categoriaId) ||
            categorias.includes(pai.get(i.categoriaId) ?? i.categoriaId)))) &&
      estados.includes(i.estado) &&
      (origens === undefined || origens.includes(i.origem)) &&
      normalizar(i.texto).includes(busca),
  );
}

/**
 * Cabeçalho da visão (6.3): entradas e saídas de caixa dos itens realizados. Transferências
 * (o dinheiro continua com a pessoa) e compras no cartão (o caixa sai no pagamento da fatura)
 * ficam fora. Saídas vêm negativas.
 */
export function entradasESaidasDeCaixa(itens: readonly ItemDeMovimentacao[]): {
  entradas: Centavos;
  saidas: Centavos;
} {
  const caixa = itens.filter(
    (i) => i.estado === 'realizado' && i.tipo !== 'transferencia' && i.tipo !== 'compra',
  );
  return {
    entradas: somar(caixa.filter((i) => i.valor > 0).map((i) => i.valor)),
    saidas: somar(caixa.filter((i) => i.valor < 0).map((i) => i.valor)),
  };
}
