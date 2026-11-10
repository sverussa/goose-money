import {
  type Comando,
  type DataCivil,
  type Entidade,
  type Fatos,
  gerarSeed,
  type Id,
  type Mudanca,
  type Plano,
  type Registros,
  type Relatorio,
} from '@goose-money/core';

/** Configurações › Dados (6.9, 9.2, 10): o que a tela grava, montado sobre os comandos do core. */

type Linha = Readonly<Record<string, unknown>> & { id: Id };

const listas = (f: Fatos) =>
  Object.entries({ ...f, preferencias: f.preferencias ? [f.preferencias] : [] }) as [
    Entidade,
    Linha[],
  ][];

export const nomeDoBackup = (hoje: DataCivil) => `goose-money-backup-${hoje}.json`;

/** Base vazia (D50): nada além das categorias e das preferências, que todo usuário tem. */
export const baseVazia = (f: Fatos): boolean =>
  listas(f).every(([e, l]) => e === 'categorias' || e === 'preferencias' || l.length === 0);

/** Inversas como as do core: inserir volta excluindo; alterar volta o registro inteiro de antes. */
function comInversas(fatos: Fatos, mudancas: Mudanca[], descricao: string): Comando {
  const atuais = new Map(listas(fatos).map(([e, l]) => [e, new Map(l.map((x) => [x.id, x]))]));
  const inversas = mudancas
    .map((m): Mudanca => {
      const atual = atuais.get(m.entidade)?.get(m.id);
      return m.acao === 'inserir' || !atual
        ? { ...m, acao: 'alterar', dados: { isDeleted: true } }
        : { ...m, dados: atual };
    })
    .reverse();
  return { mudancas, inversas, descricao };
}

const inserir = (entidade: Entidade, r: Linha): Mudanca => ({
  entidade,
  acao: 'inserir',
  id: r.id,
  dados: r,
});

/** Registros do arquivo que a importação grava (novos e atualizados). */
export const registrosGravados = (r: Relatorio): number =>
  r.contagens.reduce((n, c) => n + c.novos + c.atualizados, 0);

/** Totais da linha de resumo do relatório. */
export function resumoDoRelatorio(r: Relatorio) {
  const soma = (k: 'novos' | 'atualizados' | 'mantidos' | 'excluidos' | 'conflitos' | 'erros') =>
    r.contagens.reduce((n, c) => n + c[k], 0);
  const t = {
    novos: soma('novos'),
    atualizados: soma('atualizados'),
    mantidos: soma('mantidos'),
    excluidos: soma('excluidos'),
    conflitos: soma('conflitos'),
  };
  return {
    ...t,
    /** Registros do arquivo: os que entram, os iguais ou mais antigos e os descartados. */
    noArquivo: t.novos + t.atualizados + t.mantidos + t.conflitos,
    referencias: r.erros.filter((e) => e.etapa === 'referencia').length,
    invariantes: r.erros.filter((e) => e.etapa === 'invariante').length,
    estrutura: r.erros.filter((e) => e.etapa === 'estrutura').length,
  };
}

/**
 * O plano da importação (T01-20) num comando só, na ordem de T02-10: exclusões primeiro (libera os
 * nomes únicos), depois as alterações e por fim as inserções.
 */
export function comandoDaImportacao(fatos: Fatos, plano: Plano, descricao: string): Comando {
  const acoes = Object.entries(plano.entidades) as [Entidade, Plano['entidades'][Entidade]][];
  const mudancas: Mudanca[] = [
    ...acoes.flatMap(([e, a]) =>
      a.excluir.map((id): Mudanca => ({
        entidade: e,
        acao: 'alterar',
        id,
        dados: { isDeleted: true },
      })),
    ),
    ...acoes.flatMap(([e, a]) =>
      (a.atualizados as Linha[]).map((r): Mudanca => ({ ...inserir(e, r), acao: 'alterar' })),
    ),
    ...acoes.flatMap(([e, a]) => (a.novos as Linha[]).map((r) => inserir(e, r))),
  ];
  return comInversas(fatos, mudancas, descricao);
}

/**
 * Dados de exemplo (10, D50) num comando só. As categorias do seed que o usuário já tem (as de
 * sistema pela chave, as padrão pelo nome e tipo) ficam as dele, e as preferências também.
 */
export function comandoDoExemplo(
  fatos: Fatos,
  hoje: DataCivil,
  usuario: Id,
  descricao: string,
): Comando {
  const seed = gerarSeed(hoje, usuario);
  const chave = (c: Fatos['categorias'][number]) =>
    c.sistema ?? `${c.tipo} ${c.nome.trim().toLowerCase()}`;
  const doUsuario = new Map(
    fatos.categorias.filter((c) => c.categoriaPaiId === null).map((c) => [chave(c), c.id]),
  );
  const troca = new Map(
    seed.categorias.flatMap((c) => {
      const id = doUsuario.get(chave(c));
      return id ? [[c.id, id] as const] : [];
    }),
  );
  const trocar = (r: Linha): Linha => {
    const x = { ...r } as Record<string, unknown>;
    for (const campo of ['categoriaId', 'categoriaPaiId'])
      if (typeof x[campo] === 'string') x[campo] = troca.get(x[campo]) ?? x[campo];
    return x as Linha;
  };
  const registros: Partial<Registros> = {
    ...seed,
    categorias: seed.categorias.filter((c) => !troca.has(c.id)),
    preferencias: fatos.preferencias || !seed.preferencias ? [] : [seed.preferencias],
  };
  const mudancas = (Object.entries(registros) as [Entidade, Linha[]][]).flatMap(([e, l]) =>
    l.map((r) => inserir(e, trocar(r))),
  );
  return comInversas(fatos, mudancas, descricao);
}
