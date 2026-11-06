import { z } from 'zod';
import { somar } from '../dinheiro';
import { fatosSchema, fatosVazios, instanteSchema, type Fatos, type Id } from '../modelo';

/** PROMPT 9.1 e 9.2: o arquivo de backup e as etapas 1 a 4 da importação. A gravação é T02-10. */

type Migracao = (arquivo: Record<string, unknown>) => Record<string, unknown>;
/** `migracoes[v - 1]` leva um arquivo da versão `v` para `v + 1`. */
const migracoes: readonly Migracao[] = [];
export const VERSAO_BACKUP = migracoes.length + 1;

export const backupSchema = z.strictObject({
  schemaVersion: z.literal(VERSAO_BACKUP, 'Versão de backup não suportada'),
  exportadoEm: instanteSchema,
  app: z.literal('goose-money', 'Não é um backup do Goose Money'),
  dados: fatosSchema,
});
export type Backup = z.infer<typeof backupSchema>;

export type Entidade = keyof Fatos;
/** As entidades de `Fatos` como listas (`preferencias` vira lista de 0 ou 1). */
export type Registros = {
  [E in Entidade]: NonNullable<Fatos[E]> extends readonly (infer T)[]
    ? T[]
    : NonNullable<Fatos[E]>[];
};
interface Registro {
  id: Id;
  updatedAt: string;
  isDeleted: boolean;
}

const ENTIDADES = Object.keys(fatosVazios()) as Entidade[];
const porEntidade = <T>(f: (e: Entidade) => T) =>
  Object.fromEntries(ENTIDADES.map((e) => [e, f(e)])) as Record<Entidade, T>;
const listas = (f: Fatos): Registros => ({
  ...f,
  preferencias: f.preferencias ? [f.preferencias] : [],
});
const paraFatos = (r: Registros): Fatos => ({ ...r, preferencias: r.preferencias[0] ?? null });
const de = (r: Registros, e: Entidade) => r[e] as Registro[];

/** Só registros não excluídos, com as colunas de controle (9.2). `agora` é o instante da exportação. */
export function exportar(fatos: Fatos, agora: string): Backup {
  const r = listas(fatos);
  const dados = porEntidade((e) => de(r, e).filter((x) => !x.isDeleted)) as unknown as Registros;
  return {
    schemaVersion: VERSAO_BACKUP,
    exportadoEm: agora,
    app: 'goose-money',
    dados: paraFatos(dados),
  };
}

/** Aplica as migrações a partir do `schemaVersion` do arquivo; versão desconhecida fica para o schema. */
export function migrarBackup(arquivo: unknown, lista: readonly Migracao[] = migracoes): unknown {
  let a = arquivo;
  for (;;) {
    if (typeof a !== 'object' || a === null) return a;
    const objeto = a as Record<string, unknown>;
    const v = objeto.schemaVersion;
    const migrar =
      typeof v === 'number' && Number.isInteger(v) && v >= 1 ? lista[v - 1] : undefined;
    if (!migrar) return a;
    a = { ...migrar(objeto), schemaVersion: (v as number) + 1 };
  }
}

export type Etapa = 'estrutura' | 'referencia' | 'invariante';
export interface ErroImportacao {
  etapa: Etapa;
  /** `null` quando o erro é do envelope do arquivo. */
  entidade: Entidade | null;
  id: Id | null;
  mensagem: string;
}
const erro = (etapa: Etapa, entidade: Entidade, id: Id, mensagem: string): ErroImportacao => ({
  etapa,
  entidade,
  id,
  mensagem,
});

type Campos<E extends Entidade> = Partial<Record<keyof Registros[E][number], Entidade>>;
/** MODELO-DADOS.md seção 2: campo de referência → entidade apontada. */
const referencias: { [E in Entidade]?: Campos<E> } = {
  categorias: { categoriaPaiId: 'categorias' },
  cartoes: { contaPagamentoId: 'contas' },
  cartaoCiclos: { cartaoId: 'cartoes' },
  lancamentos: {
    contaId: 'contas',
    contaDestinoId: 'contas',
    categoriaId: 'categorias',
    cartaoId: 'cartoes',
    dividaId: 'dividas',
    parcelaDividaId: 'parcelasDivida',
  },
  compras: { cartaoId: 'cartoes', categoriaId: 'categorias' },
  parcelas: { compraId: 'compras' },
  itensFatura: { cartaoId: 'cartoes', compraId: 'compras', categoriaId: 'categorias' },
  dividas: { contaDebitoId: 'contas', categoriaId: 'categorias' },
  parcelasDivida: { dividaId: 'dividas' },
  recorrenciaVersoes: {
    recorrenciaId: 'recorrencias',
    contaId: 'contas',
    cartaoId: 'cartoes',
    categoriaId: 'categorias',
  },
  ocorrencias: {
    recorrenciaId: 'recorrencias',
    contaId: 'contas',
    cartaoId: 'cartoes',
    categoriaId: 'categorias',
    lancamentoId: 'lancamentos',
    compraId: 'compras',
  },
};

/** Etapa 2: toda referência aponta para uma entidade de `fatos` (o estado final do modo). */
export function validarReferencias(fatos: Fatos): ErroImportacao[] {
  const r = listas(fatos);
  const ids = porEntidade((e) => new Set(de(r, e).map((x) => x.id)));
  return ENTIDADES.flatMap((e) =>
    Object.entries(referencias[e] ?? {}).flatMap(([campo, alvo]) =>
      (de(r, e) as unknown as Record<string, Id | null>[])
        .filter((x) => x[campo] !== null && !ids[alvo].has(x[campo] as Id))
        .map((x) =>
          erro(
            'referencia',
            e,
            x.id as Id,
            `${campo} aponta para ${alvo} inexistente: ${String(x[campo])}`,
          ),
        ),
    ),
  );
}

const nome = (n: string) => n.trim().toLowerCase();
/** Chaves únicas de MODELO-DADOS.md (índices parciais `where not is_deleted`); `null` = fora do índice. */
const chavesUnicas: { [E in Entidade]?: (x: Registros[E][number]) => string | null } = {
  categorias: (c) => c.sistema,
  contas: (c) => (c.arquivada ? null : nome(c.nome)),
  cartoes: (c) => (c.arquivado ? null : nome(c.nome)),
  cartaoCiclos: (c) => `${c.cartaoId} ${c.vigenteDesde}`,
  parcelas: (p) => `${p.compraId} ${String(p.numero)}`,
  itensFatura: (i) => (i.tipo === 'saldo_anterior_cadastro' ? i.cartaoId : null),
  parcelasDivida: (p) => `${p.dividaId} ${String(p.numero)}`,
  recorrenciaVersoes: (v) => `${v.recorrenciaId} ${v.vigenteDesde}`,
  ocorrencias: (o) => `${o.recorrenciaId} ${o.competencia}`,
  preferencias: () => 'unica',
};
/** Contas e cartões não arquivados dividem o mesmo índice de nomes (D67). */
const grupo = (e: Entidade) => (e === 'contas' || e === 'cartoes' ? 'nome' : e);
/** Chave única com o seu índice na frente, para comparar entre entidades. */
const chave = (e: Entidade, x: Registro): string | null => {
  const k = (chavesUnicas[e] as ((x: Registro) => string | null) | undefined)?.(x) ?? null;
  return k === null ? null : `${grupo(e)} ${k}`;
};

/** Etapa 3: chaves únicas e invariantes das compras parceladas (3.6). */
export function validarInvariantesDosFatos(fatos: Fatos): ErroImportacao[] {
  const r = listas(fatos);
  const erros: ErroImportacao[] = [];
  const vistos = new Map<string, Id>();
  for (const e of ENTIDADES) {
    for (const x of de(r, e)) {
      const k = chave(e, x);
      if (k === null) continue;
      const outro = vistos.get(k);
      if (outro) erros.push(erro('invariante', e, x.id, `Chave única repetida com ${outro}`));
      else vistos.set(k, x.id);
    }
  }
  const parcelas = new Map<Id, Fatos['parcelas']>();
  for (const p of fatos.parcelas)
    parcelas.set(p.compraId, [...(parcelas.get(p.compraId) ?? []), p]);
  for (const c of fatos.compras) {
    const ps = (parcelas.get(c.id) ?? []).sort((a, b) => a.numero - b.numero);
    const falha = (m: string) => erros.push(erro('invariante', 'compras', c.id, m));
    // Cancelar remove as parcelas de faturas não fechadas (3.6): a compra cancelada fica com parte delas.
    if (c.cancelada) {
      if (ps.some((p) => p.numero > c.numeroParcelas)) falha('Parcela além do número de parcelas');
    } else {
      if (ps.length !== c.numeroParcelas || ps.some((p, i) => p.numero !== i + 1))
        falha('Parcelas precisam ser numeradas de 1 a numeroParcelas');
      if (somar(ps.map((p) => p.valor)) !== c.valorTotal)
        falha('Soma das parcelas difere do valor total');
    }
    if (ps.some((p, i) => i > 0 && p.competencia < (ps[i - 1]?.competencia ?? p.competencia)))
      falha('Competências das parcelas fora de ordem');
  }
  return erros;
}

export type Modo = 'substituir' | 'mesclar';
export interface Conflito {
  entidade: Entidade;
  /** Registro do arquivo descartado. */
  id: Id;
  /** Registro da base mantido, dono da mesma chave única. */
  idExistente: Id;
}
export interface Acoes<R> {
  /** Ids que não estão na base: inserir. */
  novos: R[];
  /** Ids que já estão na base: regravar por id. */
  atualizados: R[];
  /** Mesclar: ids do arquivo em que a base é igual ou mais recente. */
  mantidos: Id[];
  /** Substituir: ids da base fora do arquivo, a marcar como excluídos. */
  excluir: Id[];
}
export interface Plano {
  modo: Modo;
  /** Sem erros; só então algo pode ser gravado. Conflitos não invalidam. */
  valido: boolean;
  entidades: { [E in Entidade]: Acoes<Registros[E][number]> };
  /** Estado final da base se o plano for gravado; `null` se o arquivo não passou na etapa 1. */
  resultado: Fatos | null;
  conflitos: Conflito[];
  erros: ErroImportacao[];
}

// ponytail: Date.parse vai até milissegundos; empate (inclusive por microssegundos) mantém o existente.
const instante = (s: string) => Date.parse(s.replace(/(\.\d{3})\d+/, '$1'));

function substituir(atuais: Registro[], arquivo: Registro[]): [Acoes<Registro>, Registro[]] {
  const naBase = new Set(atuais.map((x) => x.id));
  const noArquivo = new Set(arquivo.map((x) => x.id));
  const acoes = {
    novos: arquivo.filter((x) => !naBase.has(x.id)),
    atualizados: arquivo.filter((x) => naBase.has(x.id)),
    mantidos: [],
    excluir: atuais.filter((x) => !noArquivo.has(x.id)).map((x) => x.id),
  };
  return [acoes, arquivo];
}

function mesclar(
  e: Entidade,
  atuais: Registro[],
  arquivo: Registro[],
  conflitos: Conflito[],
  porChave: Map<string, Id>,
): [Acoes<Registro>, Registro[]] {
  const final = new Map(atuais.map((x) => [x.id, x]));
  const acoes: Acoes<Registro> = { novos: [], atualizados: [], mantidos: [], excluir: [] };
  for (const x of arquivo) {
    const existente = final.get(x.id);
    if (existente && instante(x.updatedAt) <= instante(existente.updatedAt)) {
      acoes.mantidos.push(x.id);
      continue;
    }
    const k = chave(e, x);
    const dono = k === null ? undefined : porChave.get(k);
    if (dono !== undefined && dono !== x.id) {
      conflitos.push({ entidade: e, id: x.id, idExistente: dono });
      continue;
    }
    if (existente) {
      const antiga = chave(e, existente);
      if (antiga !== null) porChave.delete(antiga);
      acoes.atualizados.push(x);
    } else acoes.novos.push(x);
    if (k !== null) porChave.set(k, x.id);
    final.set(x.id, x);
  }
  return [acoes, [...final.values()]];
}

function erroDeEstrutura(i: z.core.$ZodIssue): ErroImportacao {
  const [raiz, entidade, ...resto] = i.path.map(String);
  const daEntidade = raiz === 'dados' && ENTIDADES.includes(entidade as Entidade);
  const caminho = (daEntidade ? resto : i.path.map(String)).join('.');
  return {
    etapa: 'estrutura',
    entidade: daEntidade ? (entidade as Entidade) : null,
    id: null,
    mensagem: caminho ? `${caminho}: ${i.message}` : i.message,
  };
}

/** Etapas 1 a 3 da importação (9.2) sobre o arquivo lido (JSON já convertido em objeto). */
export function planejarImportacao(arquivo: unknown, fatosAtuais: Fatos, modo: Modo): Plano {
  const vazio = porEntidade((): Acoes<Registro> => ({
    novos: [],
    atualizados: [],
    mantidos: [],
    excluir: [],
  }));
  const lido = backupSchema.safeParse(migrarBackup(arquivo));
  if (!lido.success) {
    const erros = lido.error.issues.map(erroDeEstrutura);
    return {
      modo,
      valido: false,
      entidades: vazio as Plano['entidades'],
      resultado: null,
      conflitos: [],
      erros,
    };
  }
  const atuais = listas(fatosAtuais);
  const novos = listas(lido.data.dados);
  const conflitos: Conflito[] = [];
  const porChave = new Map<string, Id>();
  for (const e of ENTIDADES)
    for (const x of de(atuais, e)) {
      const k = chave(e, x);
      if (k !== null) porChave.set(k, x.id);
    }
  const passos = porEntidade((e) =>
    modo === 'substituir'
      ? substituir(de(atuais, e), de(novos, e))
      : mesclar(e, de(atuais, e), de(novos, e), conflitos, porChave),
  );
  const resultado = paraFatos(porEntidade((e) => passos[e][1]) as unknown as Registros);
  const erros = [...validarReferencias(resultado), ...validarInvariantesDosFatos(resultado)];
  const entidades = porEntidade((e) => passos[e][0]) as Plano['entidades'];
  return { modo, valido: erros.length === 0, entidades, resultado, conflitos, erros };
}

export interface ContagemEntidade {
  entidade: Entidade;
  novos: number;
  atualizados: number;
  mantidos: number;
  excluidos: number;
  conflitos: number;
  erros: number;
}
export interface Relatorio {
  modo: Modo;
  valido: boolean;
  contagens: ContagemEntidade[];
  conflitos: Conflito[];
  erros: ErroImportacao[];
}

/** Etapa 4: o relatório prévio, mostrado antes do botão "Importar". */
export function relatorio(plano: Plano): Relatorio {
  const contagens = ENTIDADES.map((e) => {
    const a = plano.entidades[e];
    return {
      entidade: e,
      novos: a.novos.length,
      atualizados: a.atualizados.length,
      mantidos: a.mantidos.length,
      excluidos: a.excluir.length,
      conflitos: plano.conflitos.filter((c) => c.entidade === e).length,
      erros: plano.erros.filter((x) => x.entidade === e).length,
    };
  });
  const { modo, valido, conflitos, erros } = plano;
  return { modo, valido, contagens, conflitos, erros };
}
