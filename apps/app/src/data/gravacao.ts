import {
  type Entidade,
  ErroDeDominio,
  type Fatos,
  fatosSchema,
  type Mudanca,
  type Registros,
} from '@goose-money/core';

import { mensagens } from '@/app/mensagens';

import { DadosInvalidos, deBanco, entidadeDe, type Linha, paraBanco, tabelaDe } from './mapeamento';

/** Parte pura de `gravar(ops)` (T02-02, T03-04): ops, resposta e cache. */

export interface Op {
  tabela: string;
  acao: Mudanca['acao'];
  id: string;
  dados: Linha;
}

export const paraOps = (mudancas: readonly Mudanca[]): Op[] =>
  mudancas.map((m) => ({
    tabela: tabelaDe(m.entidade),
    acao: m.acao,
    id: m.id,
    dados: paraBanco(m.dados),
  }));

/** Última versão de cada registro gravado, por entidade; os excluídos vêm com `isDeleted`. */
export type Gravadas = { [E in Entidade]?: Registros[E] };

/** Resposta do `gravar`, validada como os fatos (D42); dos excluídos basta o id. */
export function lerGravadas(json: unknown): Gravadas {
  if (typeof json !== 'object' || json === null) throw new DadosInvalidos('Resposta vazia');
  return Object.fromEntries(
    Object.entries(json as Record<string, Linha[]>).map(([tabela, linhas]) => {
      const e = entidadeDe(tabela);
      const registros = linhas.map((l) => deBanco(tabela, l));
      const ativos = registros.filter((r) => r.isDeleted !== true);
      const r =
        e === 'preferencias'
          ? fatosSchema.shape.preferencias.safeParse(ativos[0] ?? null)
          : fatosSchema.shape[e].safeParse(ativos);
      if (!r.success) throw new DadosInvalidos(`${tabela}: ${r.error.issues[0]?.message ?? ''}`);
      return [e, registros];
    }),
  );
}

/** Os fatos com as linhas devolvidas pelo banco: grava primeiro, depois o cache (D14). */
export function aplicarGravadas(fatos: Fatos, gravadas: Gravadas): Fatos {
  const novo = { ...fatos };
  for (const [e, registros] of Object.entries(gravadas) as [Entidade, Linha[]][]) {
    if (e === 'preferencias') {
      const p = registros.at(-1);
      novo.preferencias = p && !p.isDeleted ? (p as Fatos['preferencias']) : null;
      continue;
    }
    const porId = new Map(registros.map((r) => [r.id, r]));
    const lista = (fatos[e] as Linha[]).flatMap((x) => {
      const r = porId.get(x.id);
      porId.delete(x.id);
      return r ? (r.isDeleted ? [] : [r]) : [x];
    });
    // O que sobrou é novo nos fatos: inserido ou restaurado pelo Desfazer.
    for (const r of porId.values()) if (!r.isDeleted) lista.push(r);
    (novo as Record<Entidade, unknown>)[e] = lista;
  }
  return novo;
}

/** Falha do `gravar`, com o que o app precisa para escolher a mensagem. */
export class ErroDeGravacao extends Error {
  override name = 'ErroDeGravacao';
  constructor(
    message: string,
    /** SQLSTATE do Postgres ou código do PostgREST (`PGRST…`); vazio sem resposta. */
    readonly codigo: string,
    /** Status HTTP; 0 quando a requisição nem chegou ao servidor. */
    readonly status: number,
  ) {
    super(message);
  }
}

interface Resposta {
  data: unknown;
  error: { message: string; code: string } | null;
  status: number;
}

/** Chama `gravar` com o cliente dado e devolve as linhas gravadas como entidades. */
export async function gravarCom(
  chamar: (ops: Op[]) => PromiseLike<Resposta>,
  mudancas: readonly Mudanca[],
): Promise<Gravadas> {
  const r = await chamar(paraOps(mudancas));
  if (r.error) throw new ErroDeGravacao(r.error.message, r.error.code, r.status);
  return lerGravadas(r.data);
}

/** A gravação nem foi tentada: o app está sem conexão (T03-05). */
export class SemConexao extends Error {
  override name = 'SemConexao';
}

/** Erro de qualquer gravação → texto do snackbar (D14). */
export function mensagemDoErroAoGravar(erro: unknown, online = true): string {
  const m = mensagens.gravacao;
  if (erro instanceof ErroDeDominio) return erro.message;
  if (!online || erro instanceof SemConexao) return m.semConexao;
  if (!(erro instanceof ErroDeGravacao)) return m.erro;
  if (erro.status === 0) return m.semConexao;
  if (erro.status === 401 || erro.codigo.startsWith('PGRST30')) return m.sessaoExpirada;
  switch (erro.codigo) {
    case '23505':
      return m.duplicado;
    case '23503':
      return m.referencia;
    case 'P0002':
      return m.naoEncontrado;
    case '23514':
    case '23502':
    case 'P0001':
      return m.regra;
    default:
      return m.erro;
  }
}
