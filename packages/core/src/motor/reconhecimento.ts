import { montarFaturas, type StatusFatura } from '../cartoes';
import type { DataCivil } from '../datas';
import { type Centavos, somar } from '../dinheiro';
import { despesaDaParcela, statusParcela } from '../dividas';
import type { Categoria, Compra, Divida, Fatos, Id } from '../modelo';
import type { Periodo } from '../periodos';

/**
 * PROMPT 3.3: as únicas funções que dizem o que é receita e despesa. Resultado, KPIs, todo
 * gráfico de receitas e despesas e a visão "Receitas e despesas" de 6.3 saem daqui.
 */

/** MODELO-DADOS seção 5 (D69): recorrência > dívida > cartão > manual. */
export type OrigemDoItem = 'manual' | 'recorrencia' | 'cartao' | 'divida';
/** Estado de 3.1 de um item reconhecido (previstos nunca são reconhecidos). */
export type EstadoDoItem = 'liquidado' | 'a_pagar' | 'vencido';

export interface ItemReconhecido {
  tipo: 'receita' | 'despesa';
  /** Data de competência (3.2). */
  data: DataCivil;
  /** Com sinal: estorno e ajuste de compra para menos são despesa negativa. */
  valor: Centavos;
  categoriaId: Id;
  /** A categoria pai, ou a própria quando não é subcategoria: os gráficos agrupam por ela (D35). */
  categoriaPaiId: Id;
  origem: OrigemDoItem;
  contaId: Id | null;
  cartaoId: Id | null;
  registro: { entidade: 'lancamento' | 'parcela' | 'itemFatura' | 'parcelaDivida'; id: Id };
  /** Texto da lista (6.3), ex.: "Notebook · 3/10 · Cartão A · comprado em 12/10". */
  texto: string;
  estado: EstadoDoItem;
}

/** Filtros de 6.3. Listas valem como "qualquer um" ("Outras" da rosca, "não recorrência"). */
export interface FiltrosDeReconhecimento {
  tipo?: 'receita' | 'despesa';
  contaId?: Id;
  cartaoId?: Id;
  /** Inclui as subcategorias de cada uma. */
  categorias?: readonly Id[];
  origens?: readonly OrigemDoItem[];
  /** Na descrição exibida, sem diferenciar maiúsculas e acentos. */
  busca?: string;
}

const ddmm = (d: DataCivil) => `${d.slice(8)}/${d.slice(5, 7)}`;
const juntar = (...partes: (string | null | undefined)[]) =>
  partes.filter((p) => p?.trim()).join(' · ');
const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

function obter<T>(mapa: ReadonlyMap<Id, T>, id: Id, nome: string): T {
  const x = mapa.get(id);
  if (!x) throw new RangeError(`${nome} inexistente: ${id}`);
  return x;
}

const estadoDaFatura = (s: StatusFatura): EstadoDoItem =>
  s === 'paga' ? 'liquidado' : s === 'vencida' || s === 'transportada' ? 'vencido' : 'a_pagar';

const rotuloDoItemFatura = { estorno: 'Estorno', ajuste_compra: 'Ajuste de compra' } as const;

/** Todos os itens reconhecidos, de qualquer data, conforme a tabela de 3.3. */
function reconhecidos(fatos: Fatos, hoje: DataCivil): ItemReconhecido[] {
  const categorias = new Map(fatos.categorias.map((c) => [c.id, c]));
  const compras = new Map(fatos.compras.map((c) => [c.id, c]));
  const dividas = new Map(fatos.dividas.map((d) => [d.id, d]));
  const categoria = (id: Id): Categoria => obter(categorias, id, 'Categoria');
  const daRecorrencia = new Set(fatos.ocorrencias.flatMap((o) => [o.lancamentoId, o.compraId]));
  const itens: ItemReconhecido[] = [];
  const incluir = (
    categoriaId: Id,
    item: Omit<ItemReconhecido, 'categoriaId' | 'categoriaPaiId'>,
  ) => {
    itens.push({
      ...item,
      categoriaId,
      categoriaPaiId: categoria(categoriaId).categoriaPaiId ?? categoriaId,
    });
  };

  // Lançamentos em conta: receita e despesa na data; amortização só quando paga a terceiro.
  // Previstos, transferência, ajuste, pagamento de fatura, captação e pagamento de dívida: nunca.
  for (const l of fatos.lancamentos) {
    if (l.status !== 'efetivado') continue;
    const comum = {
      data: l.data,
      valor: l.valor,
      contaId: l.contaId,
      cartaoId: null,
      registro: { entidade: 'lancamento', id: l.id },
      estado: 'liquidado',
    } as const;
    if (l.tipo === 'receita' || l.tipo === 'despesa') {
      const categoriaId = l.categoriaId as Id;
      incluir(categoriaId, {
        ...comum,
        tipo: l.tipo,
        origem: daRecorrencia.has(l.id) ? 'recorrencia' : 'manual',
        texto: juntar(l.descricao) || categoria(categoriaId).nome,
      });
    } else if (l.tipo === 'amortizacao') {
      const divida = obter(dividas, l.dividaId as Id, 'Dívida');
      if (divida.destinoDoValor === 'pago_a_terceiro')
        incluir(divida.categoriaId as Id, {
          ...comum,
          tipo: 'despesa',
          origem: 'divida',
          texto: juntar(l.descricao || 'Amortização extraordinária', divida.credor),
        });
    }
  }

  // Cartão: parcelas, encargos, estornos e ajustes de compra na competência (vencimento da
  // fatura). `montarFaturas` já deixa fora as parcelas "Paga antes do cadastro"; o saldo
  // anterior ao cadastro, o transportado e o crédito de pagamento nunca são despesa.
  for (const cartao of fatos.cartoes)
    for (const f of montarFaturas(fatos, cartao.id, hoje))
      for (const i of f.itens) {
        const comum = {
          tipo: 'despesa',
          data: f.vencimento,
          valor: i.valor,
          contaId: null,
          cartaoId: cartao.id,
          estado: estadoDaFatura(f.status),
        } as const;
        if (i.tipo === 'parcela') {
          const { compra, parcela } = i;
          incluir(compra.categoriaId, {
            ...comum,
            origem: daRecorrencia.has(compra.id) ? 'recorrencia' : 'cartao',
            registro: { entidade: 'parcela', id: parcela.id },
            texto: juntar(
              compra.descricao || categoria(compra.categoriaId).nome,
              compra.numeroParcelas > 1
                ? `${String(parcela.numero)}/${String(compra.numeroParcelas)}`
                : null,
              cartao.nome,
              `comprado em ${ddmm(compra.data)}`,
            ),
          });
        } else if (i.tipo === 'encargo' || i.tipo === 'estorno' || i.tipo === 'ajuste_compra') {
          const compra: Compra | null =
            i.item.compraId === null ? null : obter(compras, i.item.compraId, 'Compra');
          const categoriaId = compra?.categoriaId ?? (i.item.categoriaId as Id);
          incluir(categoriaId, {
            ...comum,
            origem: 'cartao',
            registro: { entidade: 'itemFatura', id: i.item.id },
            texto: juntar(
              i.item.descricao ||
                (i.tipo === 'encargo' ? categoria(categoriaId).nome : rotuloDoItemFatura[i.tipo]),
              compra?.descricao,
              cartao.nome,
            ),
          });
        }
      }

  // Dívidas: só os juros se creditado em conta, a parcela se pago a terceiro (`despesaDaParcela`).
  const pagas = new Set(fatos.lancamentos.map((l) => l.parcelaDividaId));
  const quantas = new Map<Id, number>();
  for (const p of fatos.parcelasDivida) quantas.set(p.dividaId, (quantas.get(p.dividaId) ?? 0) + 1);
  let juros: Categoria | undefined;
  const categoriaDaDivida = (d: Divida): Id => {
    if (d.categoriaId !== null) return d.categoriaId;
    juros ??= fatos.categorias.find((c) => c.sistema === 'juros_encargos');
    if (!juros) throw new RangeError('Categoria "Juros e encargos" inexistente');
    return juros.id;
  };
  for (const p of fatos.parcelasDivida) {
    const divida = obter(dividas, p.dividaId, 'Dívida');
    const calculo = { ...p, paga: pagas.has(p.id) };
    const valor = despesaDaParcela(divida, calculo);
    if (valor === 0) continue; // "Paga antes do cadastro" ou parcela sem juros
    const status = statusParcela(calculo, hoje);
    incluir(categoriaDaDivida(divida), {
      tipo: 'despesa',
      data: p.vencimento,
      valor,
      origem: 'divida',
      contaId: divida.contaDebitoId,
      cartaoId: null,
      registro: { entidade: 'parcelaDivida', id: p.id },
      texto: juntar(
        divida.credor,
        `${String(p.numero)}/${String(quantas.get(p.dividaId))}`,
        divida.destinoDoValor === 'creditado_em_conta' ? 'juros' : null,
      ),
      estado: status === 'paga' ? 'liquidado' : status === 'vencida' ? 'vencido' : 'a_pagar',
    });
  }
  return itens;
}

function filtrar(
  tipo: ItemReconhecido['tipo'],
  fatos: Fatos,
  periodo: Periodo,
  filtros: FiltrosDeReconhecimento,
  hoje: DataCivil,
): ItemReconhecido[] {
  if (filtros.tipo !== undefined && filtros.tipo !== tipo) return [];
  const { contaId, cartaoId, categorias, origens } = filtros;
  const busca = normalizar(filtros.busca?.trim() ?? '');
  return reconhecidos(fatos, hoje)
    .filter(
      (i) =>
        i.tipo === tipo &&
        i.data >= periodo.de &&
        i.data <= periodo.ate &&
        (contaId === undefined || i.contaId === contaId) &&
        (cartaoId === undefined || i.cartaoId === cartaoId) &&
        (categorias === undefined ||
          categorias.includes(i.categoriaId) ||
          categorias.includes(i.categoriaPaiId)) &&
        (origens === undefined || origens.includes(i.origem)) &&
        normalizar(i.texto).includes(busca),
    )
    .sort((a, b) => a.data.localeCompare(b.data) || a.registro.id.localeCompare(b.registro.id));
}

/** Receitas com data de competência no período, filtradas (3.3, 6.3), em ordem de data. */
export const receitasReconhecidas = (
  fatos: Fatos,
  periodo: Periodo,
  filtros: FiltrosDeReconhecimento,
  hoje: DataCivil,
): ItemReconhecido[] => filtrar('receita', fatos, periodo, filtros, hoje);

/** Despesas com data de competência no período, filtradas (3.3, 6.3), em ordem de data. */
export const despesasReconhecidas = (
  fatos: Fatos,
  periodo: Periodo,
  filtros: FiltrosDeReconhecimento,
  hoje: DataCivil,
): ItemReconhecido[] => filtrar('despesa', fatos, periodo, filtros, hoje);

/** Total dos itens: a soma que todo cabeçalho, KPI e ponto de gráfico mostra. */
export const somarItens = (itens: readonly ItemReconhecido[]): Centavos =>
  somar(itens.map((i) => i.valor));
