import type { z } from 'zod';
import type { Entidade } from '../backup';
import type { DataCivil } from '../datas';
import {
  lancamentoSchema,
  type Cartao,
  type Categoria,
  type CategoriaSistema,
  type Conta,
  type Fatos,
  type Id,
  type Lancamento,
  type Ocorrencia,
  type TipoCategoria,
} from '../modelo';

/**
 * T01-22 (PROMPT 2.1, 7.1, 9.4; D14, D36). Cada ação do usuário vira mudanças no formato de
 * `gravar(ops)` (T02-02), com os nomes do domínio, e as inversas, que o Desfazer grava.
 */
export interface Mudanca {
  entidade: Entidade;
  /** Não existe apagar: excluir é `alterar` com `isDeleted: true` (9.4). */
  acao: 'inserir' | 'alterar';
  id: Id;
  /** `inserir`: o registro inteiro; `alterar`: só os campos que mudam. */
  dados: Readonly<Record<string, unknown>>;
}

export interface Comando {
  mudancas: Mudanca[];
  /** Na ordem de gravação: desfazem `mudancas` da última para a primeira. */
  inversas: Mudanca[];
  /** Texto do snackbar ("Lançado", "Compra excluída"…). */
  descricao: string;
}

/** O que os construtores recebem de fora: o core não lê relógio (D12) nem gera ids sozinho (D72). */
export interface Contexto {
  hoje: DataCivil;
  /** Instante ISO das colunas de controle; o banco regrava `createdAt` e `updatedAt`. */
  agora: string;
  usuario: Id;
  novoId: () => Id;
}

/** A regra não permite a ação; a mensagem vai direto para a tela. */
export class ErroDeDominio extends Error {
  override name = 'ErroDeDominio';
}

/** Campos de uma entidade sem as colunas de controle, que o construtor completa. */
export type CamposDe<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'isDeleted'>;

type Linha = Record<string, unknown> & { id: Id; isDeleted?: boolean };

const linhas = (f: Fatos, e: Entidade): Linha[] =>
  e === 'preferencias' ? (f.preferencias ? [f.preferencias] : []) : f[e];

function aplicarUma(f: Fatos, m: Mudanca): Fatos {
  const atuais = linhas(f, m.entidade);
  const atual = atuais.find((x) => x.id === m.id);
  // Só a inversa de uma exclusão traz de volta um registro que não está nos fatos.
  if (m.acao === 'inserir' ? atual : !atual && m.dados.isDeleted !== false)
    throw new RangeError(`${m.acao} ${m.entidade} ${m.id}: ${atual ? 'já existe' : 'inexistente'}`);
  const novo = { ...atual, ...m.dados } as Linha;
  const lista = novo.isDeleted
    ? atuais.filter((x) => x !== atual)
    : atual
      ? atuais.map((x) => (x === atual ? novo : x))
      : [...atuais, novo];
  return { ...f, [m.entidade]: m.entidade === 'preferencias' ? (lista[0] ?? null) : lista };
}

/** Os fatos depois das mudanças, como o cache depois da gravação. Fatos não guardam excluídos. */
export const aplicar = (fatos: Fatos, mudancas: readonly Mudanca[]): Fatos =>
  mudancas.reduce(aplicarUma, fatos);

/** Excluir volta com o registro inteiro, que os fatos já não têm; alterar volta os valores anteriores. */
function inversa(f: Fatos, m: Mudanca): Mudanca {
  if (m.acao === 'inserir') return { ...m, acao: 'alterar', dados: { isDeleted: true } };
  const atual = linhas(f, m.entidade).find((x) => x.id === m.id) as Linha;
  const dados =
    m.dados.isDeleted === true
      ? atual
      : Object.fromEntries(Object.keys(m.dados).map((k) => [k, atual[k]]));
  return { ...m, dados };
}

/** Monta o comando; cada inversa é calculada sobre os fatos do momento em que a mudança grava. */
export function comando(fatos: Fatos, descricao: string, mudancas: Mudanca[]): Comando {
  const inversas: Mudanca[] = [];
  let f = fatos;
  for (const m of mudancas) {
    const antes = f;
    f = aplicarUma(f, m); // valida a mudança antes de inverter
    inversas.unshift(inversa(antes, m));
  }
  return { mudancas, inversas, descricao };
}

export const novo = <T>(ctx: Contexto, campos: CamposDe<T>): T =>
  ({
    id: ctx.novoId(),
    createdAt: ctx.agora,
    updatedAt: ctx.agora,
    createdBy: ctx.usuario,
    isDeleted: false,
    ...campos,
  }) as T;

export const inserir = (entidade: Entidade, registro: { id: Id }): Mudanca => ({
  entidade,
  acao: 'inserir',
  id: registro.id,
  dados: registro,
});

export const alterar = (entidade: Entidade, id: Id, dados: Record<string, unknown>): Mudanca => ({
  entidade,
  acao: 'alterar',
  id,
  dados,
});

export const excluir = (entidade: Entidade, id: Id): Mudanca =>
  alterar(entidade, id, { isDeleted: true });

export const excluirTodos = (entidade: Entidade, lista: readonly { id: Id }[]): Mudanca[] =>
  lista.map((x) => excluir(entidade, x.id));

/** Só os campos que mudam; sem diferença, nenhuma mudança. */
export function alterarCampos<T extends { id: Id }>(
  entidade: Entidade,
  atual: T,
  novo: T,
): Mudanca[] {
  const antes = atual as unknown as Record<string, unknown>;
  const dados = Object.fromEntries(Object.entries(novo).filter(([k, v]) => v !== antes[k]));
  return Object.keys(dados).length > 0 ? [alterar(entidade, atual.id, dados)] : [];
}

export function validar<T>(schema: z.ZodType<T>, valor: T): T {
  const r = schema.safeParse(valor);
  if (!r.success) throw new ErroDeDominio(r.error.issues[0]?.message);
  return valor;
}

/** Erros de faixa das regras dos outros contextos viram erro de domínio. */
export function regra<T>(f: () => T): T {
  try {
    return f();
  } catch (e) {
    if (e instanceof RangeError) throw new ErroDeDominio(e.message);
    throw e;
  }
}

export function achar<T extends { id: Id }>(lista: readonly T[], id: Id, mensagem: string): T {
  const x = lista.find((e) => e.id === id);
  if (!x) throw new ErroDeDominio(mensagem);
  return x;
}

export function exigir(ok: boolean, mensagem: string): asserts ok {
  if (!ok) throw new ErroDeDominio(mensagem);
}

export function contaAtiva(fatos: Fatos, id: Id): Conta {
  const conta = achar(fatos.contas, id, 'Conta não encontrada');
  exigir(!conta.arquivada, `A conta "${conta.nome}" está arquivada`);
  return conta;
}

export function cartaoAtivo(fatos: Fatos, id: Id): Cartao {
  const cartao = achar(fatos.cartoes, id, 'Cartão não encontrado');
  exigir(!cartao.arquivado, `O cartão "${cartao.nome}" está arquivado`);
  return cartao;
}

/** A categoria precisa existir e servir ao tipo (`ambos` serve aos dois). */
export function categoriaPara(fatos: Fatos, id: Id, tipo: 'receita' | 'despesa'): Categoria {
  const c = achar(fatos.categorias, id, 'Categoria não encontrada');
  const tipos: TipoCategoria[] = [tipo, 'ambos'];
  exigir(tipos.includes(c.tipo), `A categoria "${c.nome}" não é de ${tipo}`);
  return c;
}

/** O core acha as categorias de sistema pela chave, nunca pelo nome (D62). */
export function categoriaDoSistema(fatos: Fatos, sistema: CategoriaSistema): Categoria {
  const c = fatos.categorias.find((x) => x.sistema === sistema);
  if (!c) throw new ErroDeDominio('Categorias de sistema não inicializadas');
  return c;
}

/** Lançamento válido, em contas ativas; efetivado nunca tem data depois de hoje (D79). */
export function validarLancamento(fatos: Fatos, hoje: DataCivil, l: Lancamento): Lancamento {
  validar(lancamentoSchema, l);
  exigir(
    l.status === 'previsto' || l.data <= hoje,
    'Lançamento efetivado não pode ter data futura. Marque como "Previsto".',
  );
  contaAtiva(fatos, l.contaId);
  if (l.contaDestinoId !== null) contaAtiva(fatos, l.contaDestinoId);
  if (l.tipo === 'receita' || l.tipo === 'despesa')
    categoriaPara(fatos, l.categoriaId as Id, l.tipo);
  return l;
}

/** Campos de vínculo do lançamento, todos nulos; cada tipo preenche os seus (MODELO-DADOS 3.5). */
export const semVinculos = {
  descricao: null,
  observacao: null,
  contaDestinoId: null,
  categoriaId: null,
  cartaoId: null,
  faturaCompetencia: null,
  dividaId: null,
  parcelaDividaId: null,
} as const;

export const novoLancamento = (
  fatos: Fatos,
  ctx: Contexto,
  campos: CamposDe<Lancamento>,
): Lancamento => validarLancamento(fatos, ctx.hoje, novo<Lancamento>(ctx, campos));

/** O retrato da ocorrência acompanha a correção do lançamento ou da compra (3.8). */
export const sincronizarRetrato = (
  ocorrencias: readonly Ocorrencia[],
  de: (o: Ocorrencia) => boolean,
  campos: Partial<Ocorrencia>,
): Mudanca[] =>
  ocorrencias.filter(de).flatMap((o) => alterarCampos('ocorrencias', o, { ...o, ...campos }));
