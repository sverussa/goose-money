import {
  anteciparParcelas,
  cancelarCompra,
  destinoPadraoDoPagamento,
  faturaAberta,
  faturaDaCompra,
  gerarParcelas,
  montarFaturas,
  operacoesPermitidas,
  type Permissao,
} from '../cartoes';
import type { Competencia, DataCivil } from '../datas';
import { type Centavos, negar } from '../dinheiro';
import {
  compraSchema,
  itemFaturaSchema,
  type Cartao,
  type Compra,
  type Fatos,
  type Id,
  type ItemFatura,
  type Parcela,
} from '../modelo';
import {
  achar,
  alterarCampos,
  type CamposDe,
  cartaoAtivo,
  categoriaPara,
  type Comando,
  comando,
  contaAtiva,
  type Contexto,
  ErroDeDominio,
  excluir,
  excluirTodos,
  exigir,
  inserir,
  type Mudanca,
  novo,
  novoLancamento,
  regra,
  semVinculos,
  sincronizarRetrato,
  validar,
} from './mudancas';

/** Compras no cartão (PROMPT 3.6) e itens e pagamentos de fatura (3.5, 6.5). */

export type NovaCompra = Omit<CamposDe<Compra>, 'cancelada'>;

function permitir(p: Permissao): void {
  if (!p.permitida) throw new ErroDeDominio(p.motivo);
}

const parcelasDe = (fatos: Fatos, compraId: Id) =>
  fatos.parcelas.filter((p) => p.compraId === compraId);

const novasParcelas = (ctx: Contexto, compra: Compra, cartao: Cartao, fatos: Fatos) =>
  gerarParcelas(compra, cartao, fatos.cartaoCiclos).map((p) =>
    inserir('parcelas', novo<Parcela>(ctx, { compraId: compra.id, ...p })),
  );

/** Compra validada e as suas `numeroParcelas` parcelas, num comando só. */
export function novaCompraMudancas(
  fatos: Fatos,
  ctx: Contexto,
  campos: NovaCompra,
): { compra: Compra; mudancas: Mudanca[] } {
  const compra = validar(compraSchema, novo<Compra>(ctx, { ...campos, cancelada: false }));
  const cartao = cartaoAtivo(fatos, compra.cartaoId);
  categoriaPara(fatos, compra.categoriaId, 'despesa');
  return {
    compra,
    mudancas: [inserir('compras', compra), ...novasParcelas(ctx, compra, cartao, fatos)],
  };
}

export const novaCompra = (fatos: Fatos, ctx: Contexto, campos: NovaCompra): Comando =>
  comando(fatos, 'Compra lançada', novaCompraMudancas(fatos, ctx, campos).mudancas);

/** A compra, o cartão, as parcelas e o que o menu permite hoje (3.6). */
function daCompra(fatos: Fatos, hoje: DataCivil, compraId: Id) {
  const compra = achar(fatos.compras, compraId, 'Compra não encontrada');
  const cartao = cartaoAtivo(fatos, compra.cartaoId);
  const parcelas = parcelasDe(fatos, compraId);
  const aberta = faturaAberta(cartao, fatos.cartaoCiclos, hoje);
  return { compra, cartao, parcelas, aberta, pode: operacoesPermitidas(compra, parcelas, aberta) };
}

const regeneram = ['cartaoId', 'data', 'valorTotal', 'numeroParcelas'] as const;

export function editarCompraMudancas(
  fatos: Fatos,
  ctx: Contexto,
  compraId: Id,
  alteracoes: Partial<NovaCompra>,
): Mudanca[] {
  const { compra, parcelas, pode } = daCompra(fatos, ctx.hoje, compraId);
  const nova = validar(compraSchema, { ...compra, ...alteracoes });
  categoriaPara(fatos, nova.categoriaId, 'despesa');
  const regenerar = regeneram.some((k) => nova[k] !== compra[k]);
  permitir(regenerar ? pode.editarValor : pode.editarDescricao);
  return [
    ...alterarCampos('compras', compra, nova),
    ...(regenerar
      ? [
          ...excluirTodos('parcelas', parcelas),
          ...novasParcelas(ctx, nova, cartaoAtivo(fatos, nova.cartaoId), fatos),
        ]
      : []),
    ...sincronizarRetrato(fatos.ocorrencias, (o) => o.compraId === compraId, {
      valor: nova.valorTotal,
      data: nova.data,
      cartaoId: nova.cartaoId,
      categoriaId: nova.categoriaId,
    }),
  ];
}

/** Descrição, categoria e observação sempre; valor, parcelas, data e cartão regeneram as parcelas. */
export const editarCompra = (
  fatos: Fatos,
  ctx: Contexto,
  compraId: Id,
  alteracoes: Partial<NovaCompra>,
): Comando =>
  comando(fatos, 'Compra alterada', editarCompraMudancas(fatos, ctx, compraId, alteracoes));

function itemNaAberta(
  ctx: Contexto,
  cartaoId: Id,
  aberta: Competencia,
  campos: Pick<ItemFatura, 'tipo' | 'valor' | 'descricao' | 'compraId'>,
): Mudanca {
  const item = novo<ItemFatura>(ctx, {
    cartaoId,
    competencia: aberta,
    data: ctx.hoje,
    categoriaId: null,
    ...campos,
  });
  return inserir('itensFatura', validar(itemFaturaSchema, item));
}

/** Encargo (+) ou estorno (−) na fatura aberta, vinculado à compra. */
export function lancarAjusteDeCompra(
  fatos: Fatos,
  ctx: Contexto,
  compraId: Id,
  valor: Centavos,
  descricao: string | null = null,
): Comando {
  const { cartao, aberta, pode } = daCompra(fatos, ctx.hoje, compraId);
  permitir(pode.lancarAjuste);
  return comando(fatos, 'Ajuste lançado', [
    itemNaAberta(ctx, cartao.id, aberta, { tipo: 'ajuste_compra', valor, descricao, compraId }),
  ]);
}

/** Move as `k` últimas para a fatura aberta; remove e reinsere todas as parcelas (D78). */
export function anteciparParcelasDaCompra(
  fatos: Fatos,
  ctx: Contexto,
  compraId: Id,
  k: number,
  desconto?: Centavos,
): Comando {
  const { compra, cartao, parcelas, aberta, pode } = daCompra(fatos, ctx.hoje, compraId);
  permitir(pode.anteciparParcelas);
  const r = regra(() => anteciparParcelas(compra, parcelas, k, aberta, desconto));
  return comando(fatos, 'Parcelas antecipadas', [
    ...excluirTodos('parcelas', parcelas),
    ...r.parcelas.map((p) => inserir('parcelas', novo<Parcela>(ctx, { compraId, ...p }))),
    ...(r.estorno === null
      ? []
      : [
          itemNaAberta(ctx, cartao.id, aberta, {
            tipo: 'estorno',
            valor: r.estorno,
            descricao: null,
            compraId,
          }),
        ]),
  ]);
}

/** Exclui as parcelas de faturas não fechadas; se o banco estornou, estorna as já faturadas. */
export function cancelarCompraDoCartao(
  fatos: Fatos,
  ctx: Contexto,
  compraId: Id,
  bancoEstornou: boolean,
): Comando {
  const { compra, cartao, parcelas, aberta, pode } = daCompra(fatos, ctx.hoje, compraId);
  permitir(pode.cancelar);
  const r = cancelarCompra(compra, parcelas, cartao, aberta, bancoEstornou);
  return comando(fatos, 'Compra cancelada', [
    ...alterarCampos('compras', compra, { ...compra, cancelada: true }),
    ...excluirTodos(
      'parcelas',
      parcelas.filter((p) => r.remover.includes(p.numero)),
    ),
    ...(r.estorno === null
      ? []
      : [
          itemNaAberta(ctx, cartao.id, aberta, {
            tipo: 'estorno',
            valor: r.estorno,
            descricao: null,
            compraId,
          }),
        ]),
  ]);
}

/** Compra, parcelas, itens vinculados e a ocorrência que a criou (3.6, D68, 11.8). */
export function excluirCompra(fatos: Fatos, ctx: Contexto, compraId: Id): Comando {
  const { parcelas, pode } = daCompra(fatos, ctx.hoje, compraId);
  permitir(pode.excluir);
  return comando(fatos, 'Compra excluída', [
    excluir('compras', compraId),
    ...excluirTodos('parcelas', parcelas),
    ...excluirTodos(
      'itensFatura',
      fatos.itensFatura.filter((i) => i.compraId === compraId),
    ),
    ...excluirTodos(
      'ocorrencias',
      fatos.ocorrencias.filter((o) => o.compraId === compraId),
    ),
  ]);
}

export interface Pagamento {
  cartaoId: Id;
  valor: Centavos;
  data: DataCivil;
  /** Padrão: a conta de pagamento do cartão. */
  contaId?: Id;
  /** Padrão: o destino de 3.5. */
  faturaCompetencia?: Competencia;
}

/** Pagamento alocado à fatura, nunca a itens (3.5). */
export function pagarFatura(fatos: Fatos, ctx: Contexto, pagamento: Pagamento): Comando {
  const cartao = cartaoAtivo(fatos, pagamento.cartaoId);
  const l = novoLancamento(fatos, ctx, {
    ...semVinculos,
    tipo: 'pagamento_fatura',
    status: 'efetivado',
    data: pagamento.data,
    valor: pagamento.valor,
    contaId: pagamento.contaId ?? contaAtiva(fatos, cartao.contaPagamentoId).id,
    cartaoId: cartao.id,
    faturaCompetencia:
      pagamento.faturaCompetencia ??
      destinoPadraoDoPagamento(montarFaturas(fatos, cartao.id, ctx.hoje)),
  });
  return comando(fatos, 'Fatura paga', [inserir('lancamentos', l)]);
}

export interface EncargoOuEstorno {
  tipo: 'encargo' | 'estorno';
  cartaoId: Id;
  /** Sempre positivo; o estorno é gravado negativo. */
  valor: Centavos;
  data: DataCivil;
  descricao: string | null;
  /** Estorno de uma compra: a categoria é a dela. */
  compraId: Id | null;
  /** Encargo: "Juros e encargos" ou "Tarifas"; estorno sem compra: a categoria estornada. */
  categoriaId: Id | null;
}

/** "Lançar encargo ou estorno" (6.5): item na fatura da data (3.2). */
export function lancarEncargoOuEstorno(fatos: Fatos, ctx: Contexto, e: EncargoOuEstorno): Comando {
  const cartao = cartaoAtivo(fatos, e.cartaoId);
  exigir(e.valor > 0, 'O valor precisa ser maior que zero');
  if (e.compraId !== null)
    exigir(
      achar(fatos.compras, e.compraId, 'Compra não encontrada').cartaoId === cartao.id,
      'A compra é de outro cartão',
    );
  if (e.categoriaId !== null) categoriaPara(fatos, e.categoriaId, 'despesa');
  const item = novo<ItemFatura>(ctx, {
    ...e,
    competencia: faturaDaCompra(cartao, fatos.cartaoCiclos, e.data),
    valor: e.tipo === 'estorno' ? negar(e.valor) : e.valor,
  });
  return comando(fatos, e.tipo === 'encargo' ? 'Encargo lançado' : 'Estorno lançado', [
    inserir('itensFatura', validar(itemFaturaSchema, item)),
  ]);
}
