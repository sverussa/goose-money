import {
  type Permissao,
  podeArquivarCartao,
  podeExcluirCartao,
  previaDoCadastro,
  primeiraFaturaNaoFechada,
} from '../cartoes';
import type { Entidade } from '../backup';
import { saldo } from '../contas';
import { type DataCivil, somarMeses } from '../datas';
import type { Centavos } from '../dinheiro';
import {
  cartaoCicloSchema,
  cartaoSchema,
  categoriaSchema,
  contaSchema,
  itemFaturaSchema,
  preferenciasSchema,
  type Cartao,
  type CartaoCiclo,
  type Categoria,
  type Conta,
  type Fatos,
  type Id,
  type ItemFatura,
  type Preferencias,
} from '../modelo';
import { parcelasDaDivida } from './dividas';
import {
  achar,
  alterar,
  alterarCampos,
  type CamposDe,
  cartaoAtivo,
  categoriaDoSistema,
  type Comando,
  comando,
  contaAtiva,
  type Contexto,
  excluir,
  excluirTodos,
  exigir,
  inserir,
  novo,
  validar,
} from './mudancas';

/** Contas, cartões, categorias e preferências (PROMPT 6.4, 6.5, 6.9; D21, D49, D67). */

const permissao = (motivo: string | null): Permissao =>
  motivo === null ? { permitida: true } : { permitida: false, motivo };

function permitir(p: Permissao): void {
  exigir(p.permitida, p.motivo ?? '');
}

/** Nome único entre contas e cartões não arquivados, sem diferenciar maiúsculas e espaços (D67). */
function nomeLivre(fatos: Fatos, nome: string, id: Id): void {
  const chave = (n: string) => n.trim().toLowerCase();
  const ativos = [
    ...fatos.contas.filter((c) => !c.arquivada),
    ...fatos.cartoes.filter((c) => !c.arquivado),
  ];
  exigir(
    !ativos.some((x) => x.id !== id && chave(x.nome) === chave(nome)),
    `Já existe uma conta ou um cartão ativo chamado "${nome.trim()}"`,
  );
}

const pagaCartaoAtivo = (fatos: Fatos, contaId: Id) =>
  fatos.cartoes.some((c) => !c.arquivado && c.contaPagamentoId === contaId);

/** Recorrências ativas com alguma versão que satisfaz `usa`. */
const usadaPorRecorrenciaAtiva = (
  fatos: Fatos,
  usa: (v: Fatos['recorrenciaVersoes'][number]) => boolean,
) => {
  const ativas = new Set(fatos.recorrencias.filter((r) => r.ativa).map((r) => r.id));
  return fatos.recorrenciaVersoes.some((v) => usa(v) && ativas.has(v.recorrenciaId));
};

// Contas

export type NovaConta = Omit<CamposDe<Conta>, 'arquivada'>;

export function criarConta(fatos: Fatos, ctx: Contexto, campos: NovaConta): Comando {
  const conta = validar(contaSchema, novo<Conta>(ctx, { ...campos, arquivada: false }));
  nomeLivre(fatos, conta.nome, conta.id);
  return comando(fatos, 'Conta criada', [inserir('contas', conta)]);
}

/** Desmarcar "Incluir no total" da conta de pagamento de um cartão ativo é bloqueado (6.4). */
export function editarConta(
  fatos: Fatos,
  _ctx: Contexto,
  id: Id,
  alteracoes: Partial<NovaConta>,
): Comando {
  const atual = contaAtiva(fatos, id);
  const conta = validar(contaSchema, { ...atual, ...alteracoes });
  nomeLivre(fatos, conta.nome, id);
  exigir(
    conta.incluirNoTotal || !pagaCartaoAtivo(fatos, id),
    'A conta de pagamento de um cartão ativo precisa ficar no total',
  );
  return comando(fatos, 'Conta alterada', alterarCampos('contas', atual, conta));
}

/** Menu da conta (6.4, D21), com o motivo para o tooltip. */
export function permissoesDaConta(
  fatos: Fatos,
  contaId: Id,
  hoje: DataCivil,
): { arquivar: Permissao; excluir: Permissao } {
  achar(fatos.contas, contaId, 'Conta não encontrada');
  const dividas = fatos.dividas.filter((d) => d.contaDebitoId === contaId);
  const aVencer = dividas.some((d) =>
    parcelasDaDivida(fatos, d.id).some((p) => !p.paga && !p.pagaAntesDoCadastro),
  );
  const movimentos = fatos.lancamentos.some(
    (l) => l.contaId === contaId || l.contaDestinoId === contaId,
  );
  const vinculo =
    fatos.cartoes.some((c) => c.contaPagamentoId === contaId) ||
    fatos.recorrenciaVersoes.some((v) => v.contaId === contaId) ||
    dividas.length > 0;
  return {
    arquivar: permissao(
      saldo(fatos, contaId, hoje) !== 0
        ? 'Arquivar exige saldo zero. Transfira ou ajuste o saldo antes.'
        : pagaCartaoAtivo(fatos, contaId)
          ? 'A conta paga um cartão ativo.'
          : usadaPorRecorrenciaAtiva(fatos, (v) => v.contaId === contaId)
            ? 'A conta é usada por uma renda ou um gasto fixo ativo.'
            : aVencer
              ? 'A conta é a de débito de uma dívida com parcelas a vencer.'
              : null,
    ),
    excluir: permissao(
      movimentos
        ? 'A conta tem movimentos. Arquive-a.'
        : vinculo
          ? 'A conta está ligada a cartão, recorrência ou dívida. Arquive-a.'
          : null,
    ),
  };
}

export function arquivarConta(fatos: Fatos, ctx: Contexto, id: Id): Comando {
  const conta = contaAtiva(fatos, id);
  permitir(permissoesDaConta(fatos, id, ctx.hoje).arquivar);
  return comando(
    fatos,
    'Conta arquivada',
    alterarCampos('contas', conta, { ...conta, arquivada: true }),
  );
}

export function desarquivarConta(fatos: Fatos, _ctx: Contexto, id: Id): Comando {
  const conta = achar(fatos.contas, id, 'Conta não encontrada');
  exigir(conta.arquivada, 'A conta não está arquivada');
  nomeLivre(fatos, conta.nome, id);
  return comando(fatos, 'Conta desarquivada', [alterar('contas', id, { arquivada: false })]);
}

export function excluirConta(fatos: Fatos, ctx: Contexto, id: Id): Comando {
  permitir(permissoesDaConta(fatos, id, ctx.hoje).excluir);
  return comando(fatos, 'Conta excluída', [excluir('contas', id)]);
}

// Cartões

function contaDePagamento(fatos: Fatos, id: Id): void {
  exigir(
    contaAtiva(fatos, id).incluirNoTotal,
    'A conta de pagamento precisa estar incluída no total',
  );
}

export type NovoCartao = Omit<CamposDe<Cartao>, 'competenciaInicial' | 'arquivado'> & {
  diaFechamento: number;
  diaVencimento: number;
  /** "Saldo da fatura fechada a pagar" do cartão já em uso (3.5, D21); zero se não houver. */
  saldoFaturaFechada: Centavos;
};

/** A primeira fatura controlada é a aberta hoje; o saldo a pagar entra na fechada (D21, D61). */
export function criarCartao(fatos: Fatos, ctx: Contexto, novoCartao: NovoCartao): Comando {
  const { diaFechamento, diaVencimento, saldoFaturaFechada, ...campos } = novoCartao;
  contaDePagamento(fatos, campos.contaPagamentoId);
  exigir(saldoFaturaFechada >= 0, 'O saldo da fatura fechada não pode ser negativo');
  const { competencia } = previaDoCadastro(diaFechamento, diaVencimento, ctx.hoje);
  const cartao = validar(
    cartaoSchema,
    novo<Cartao>(ctx, { ...campos, competenciaInicial: competencia, arquivado: false }),
  );
  nomeLivre(fatos, cartao.nome, cartao.id);
  const ciclo = novo<CartaoCiclo>(ctx, {
    cartaoId: cartao.id,
    vigenteDesde: competencia,
    diaFechamento,
    diaVencimento,
  });
  const saldoAnterior =
    saldoFaturaFechada === 0
      ? []
      : [
          novo<ItemFatura>(ctx, {
            cartaoId: cartao.id,
            competencia: somarMeses(competencia, -1),
            tipo: 'saldo_anterior_cadastro',
            data: ctx.hoje,
            valor: saldoFaturaFechada,
            descricao: null,
            compraId: null,
            categoriaId: null,
          }),
        ];
  return comando(fatos, 'Cartão criado', [
    inserir('cartoes', cartao),
    inserir('cartaoCiclos', validar(cartaoCicloSchema, ciclo)),
    ...saldoAnterior.map((i) => inserir('itensFatura', validar(itemFaturaSchema, i))),
  ]);
}

/** Os dias do ciclo só mudam por `configurarCiclo` (D21). */
export function editarCartao(
  fatos: Fatos,
  _ctx: Contexto,
  id: Id,
  alteracoes: Partial<Pick<Cartao, 'nome' | 'instituicao' | 'cor' | 'limite' | 'contaPagamentoId'>>,
): Comando {
  const atual = cartaoAtivo(fatos, id);
  const cartao = validar(cartaoSchema, { ...atual, ...alteracoes });
  nomeLivre(fatos, cartao.nome, id);
  contaDePagamento(fatos, cartao.contaPagamentoId);
  return comando(fatos, 'Cartão alterado', alterarCampos('cartoes', atual, cartao));
}

/** Novos dias valem a partir da primeira fatura não fechada (3.5). */
export function configurarCiclo(
  fatos: Fatos,
  ctx: Contexto,
  cartaoId: Id,
  diaFechamento: number,
  diaVencimento: number,
): Comando {
  const cartao = cartaoAtivo(fatos, cartaoId);
  const vigenteDesde = primeiraFaturaNaoFechada(cartao, fatos.cartaoCiclos, ctx.hoje);
  const atual = fatos.cartaoCiclos.find(
    (c) => c.cartaoId === cartaoId && c.vigenteDesde === vigenteDesde,
  );
  const ciclo = validar(cartaoCicloSchema, {
    ...(atual ?? novo<CartaoCiclo>(ctx, { cartaoId, vigenteDesde, diaFechamento, diaVencimento })),
    diaFechamento,
    diaVencimento,
  });
  return comando(
    fatos,
    'Ciclo configurado',
    atual ? alterarCampos('cartaoCiclos', atual, ciclo) : [inserir('cartaoCiclos', ciclo)],
  );
}

export function arquivarCartao(fatos: Fatos, ctx: Contexto, id: Id): Comando {
  const cartao = cartaoAtivo(fatos, id);
  permitir(podeArquivarCartao(fatos, id, ctx.hoje));
  return comando(
    fatos,
    'Cartão arquivado',
    alterarCampos('cartoes', cartao, { ...cartao, arquivado: true }),
  );
}

export function desarquivarCartao(fatos: Fatos, _ctx: Contexto, id: Id): Comando {
  const cartao = achar(fatos.cartoes, id, 'Cartão não encontrado');
  exigir(cartao.arquivado, 'O cartão não está arquivado');
  nomeLivre(fatos, cartao.nome, id);
  return comando(fatos, 'Cartão desarquivado', [alterar('cartoes', id, { arquivado: false })]);
}

/** Leva os ciclos junto (D68). */
export function excluirCartao(fatos: Fatos, ctx: Contexto, id: Id): Comando {
  achar(fatos.cartoes, id, 'Cartão não encontrado');
  permitir(podeExcluirCartao(fatos, id));
  return comando(fatos, 'Cartão excluído', [
    excluir('cartoes', id),
    ...excluirTodos(
      'cartaoCiclos',
      fatos.cartaoCiclos.filter((c) => c.cartaoId === id),
    ),
  ]);
}

// Categorias

export type NovaCategoria = Omit<CamposDe<Categoria>, 'sistema'>;

/** Um nível só (D35); a subcategoria tem o tipo da pai (MODELO-DADOS 3.1). */
function validarCategoria(fatos: Fatos, c: Categoria): Categoria {
  validar(categoriaSchema, c);
  const filhas = fatos.categorias.filter((x) => x.categoriaPaiId === c.id);
  if (c.categoriaPaiId !== null) {
    const pai = achar(fatos.categorias, c.categoriaPaiId, 'Categoria pai não encontrada');
    exigir(
      pai.id !== c.id && pai.categoriaPaiId === null && pai.sistema === null && filhas.length === 0,
      'Subcategoria só de uma categoria comum, num nível só',
    );
    exigir(pai.tipo === c.tipo, 'A subcategoria tem o tipo da categoria pai');
  }
  exigir(
    filhas.every((f) => f.tipo === c.tipo),
    'A subcategoria tem o tipo da categoria pai',
  );
  return c;
}

export function criarCategoria(fatos: Fatos, ctx: Contexto, campos: NovaCategoria): Comando {
  const c = validarCategoria(fatos, novo<Categoria>(ctx, { ...campos, sistema: null }));
  return comando(fatos, 'Categoria criada', [inserir('categorias', c)]);
}

const deSistema = (fatos: Fatos, id: Id, acao: string): Categoria => {
  const c = achar(fatos.categorias, id, 'Categoria não encontrada');
  exigir(c.sistema === null, `Categoria de sistema não pode ser ${acao}`);
  return c;
};

export function editarCategoria(
  fatos: Fatos,
  _ctx: Contexto,
  id: Id,
  alteracoes: Partial<NovaCategoria>,
): Comando {
  const atual = deSistema(fatos, id, 'editada');
  const c = validarCategoria(fatos, { ...atual, ...alteracoes });
  return comando(fatos, 'Categoria alterada', alterarCampos('categorias', atual, c));
}

/** Leva as subcategorias; os itens delas vão para "A classificar" (D49). */
export function excluirCategoria(fatos: Fatos, _ctx: Contexto, id: Id): Comando {
  deSistema(fatos, id, 'excluída');
  const excluidas = fatos.categorias.filter((c) => c.id === id || c.categoriaPaiId === id);
  const ids = new Set(excluidas.map((c) => c.id));
  const destino = categoriaDoSistema(fatos, 'a_classificar').id;
  const mover = (entidade: Entidade, lista: readonly { id: Id; categoriaId: Id | null }[]) =>
    lista
      .filter((x) => x.categoriaId !== null && ids.has(x.categoriaId))
      .map((x) => alterar(entidade, x.id, { categoriaId: destino }));
  return comando(fatos, 'Categoria excluída', [
    ...mover('lancamentos', fatos.lancamentos),
    ...mover('compras', fatos.compras),
    ...mover('itensFatura', fatos.itensFatura),
    ...mover('dividas', fatos.dividas),
    ...mover('recorrenciaVersoes', fatos.recorrenciaVersoes),
    ...mover('ocorrencias', fatos.ocorrencias),
    ...excluirTodos('categorias', excluidas),
  ]);
}

// Preferências

/** Altera a linha única do usuário; antes da inicialização (D39), cria com os campos dados. */
export function salvarPreferencias(
  fatos: Fatos,
  ctx: Contexto,
  alteracoes: Partial<CamposDe<Preferencias>>,
): Comando {
  const atual = fatos.preferencias;
  const p = validar(preferenciasSchema, {
    ...(atual ?? novo<Preferencias>(ctx, alteracoes as CamposDe<Preferencias>)),
    ...alteracoes,
  });
  return comando(
    fatos,
    'Preferências salvas',
    atual ? alterarCampos('preferencias', atual, p) : [inserir('preferencias', p)],
  );
}
