import type { DataCivil } from '../datas';
import type { Fatos, Id } from '../modelo';

/** Padrões inteligentes do formulário de lançamento (PROMPT 4.1, 7.3; T05-04). */

export interface SugestaoDeDescricao {
  descricao: string;
  /** A categoria usada da última vez com esta descrição. */
  categoriaId: Id;
}

export interface SugestoesDeLancamento {
  /** Descrições já usadas no tipo, das mais usadas para as menos (empate: a mais recente). */
  descricoes: SugestaoDeDescricao[];
  /** As 8 categorias mais usadas no tipo (empate: a mais recente, depois o nome). */
  maisUsadas: Id[];
}

const MAIS_USADAS = 8;

interface Uso {
  descricao: string | null;
  categoriaId: Id;
  data: DataCivil;
  createdAt: string;
}

const maisRecente = (a: Uso, b: Uso) =>
  b.data.localeCompare(a.data) || b.createdAt.localeCompare(a.createdAt);

/**
 * Sobre os lançamentos de receita ou despesa e, na despesa, também as compras no cartão. A
 * categoria de ajuste de saldo e as categorias que não existem mais ficam fora.
 */
export function sugestoesDeLancamento(
  fatos: Fatos,
  tipo: 'receita' | 'despesa',
): SugestoesDeLancamento {
  const categorias = new Map(fatos.categorias.map((c) => [c.id, c]));
  const usos: Uso[] = [
    ...fatos.lancamentos.filter((l) => l.tipo === tipo),
    ...(tipo === 'despesa' ? fatos.compras : []),
  ]
    .flatMap((x) => (x.categoriaId === null ? [] : [{ ...x, categoriaId: x.categoriaId }]))
    .filter((u) => {
      const c = categorias.get(u.categoriaId);
      return c !== undefined && c.sistema !== 'ajuste_saldo';
    })
    .sort(maisRecente);

  // `usos` está do mais recente para o mais antigo: o primeiro de cada chave é o último usado.
  const porDescricao = new Map<string, { s: SugestaoDeDescricao; n: number; ordem: number }>();
  const porCategoria = new Map<Id, { n: number; ordem: number }>();
  usos.forEach((u, ordem) => {
    const descricao = u.descricao?.trim();
    if (descricao) {
      const chave = descricao.toLocaleLowerCase('pt-BR');
      const atual = porDescricao.get(chave);
      if (atual) atual.n++;
      else porDescricao.set(chave, { s: { descricao, categoriaId: u.categoriaId }, n: 1, ordem });
    }
    const c = porCategoria.get(u.categoriaId);
    if (c) c.n++;
    else porCategoria.set(u.categoriaId, { n: 1, ordem });
  });

  const nome = (id: Id) => categorias.get(id)?.nome ?? '';
  return {
    descricoes: [...porDescricao.values()]
      .sort((a, b) => b.n - a.n || a.ordem - b.ordem)
      .map((x) => x.s),
    maisUsadas: [...porCategoria.entries()]
      .sort(
        ([ia, a], [ib, b]) =>
          b.n - a.n || a.ordem - b.ordem || nome(ia).localeCompare(nome(ib), 'pt-BR'),
      )
      .slice(0, MAIS_USADAS)
      .map(([id]) => id),
  };
}
