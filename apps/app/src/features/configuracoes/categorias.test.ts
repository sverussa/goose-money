import {
  aplicar,
  type Contexto,
  criarCategoria,
  dataCivil,
  excluirCategoria,
  gerarSeed,
} from '@goose-money/core';
import { describe, expect, it } from 'vitest';

import {
  itensMovidos,
  linhasDasCategorias,
  listaDosItens,
  paisPossiveis,
  valoresIniciais,
} from './categorias';

const HOJE = dataCivil('2026-11-04');
const USUARIO = '00000000-0000-4000-8000-000000000001';
const ctx: Contexto = {
  hoje: HOJE,
  agora: `${HOJE}T12:00:00Z`,
  usuario: USUARIO,
  novoId: () => crypto.randomUUID(),
};

describe('categorias', () => {
  const seed = gerarSeed(HOJE, USUARIO);
  const id = (nome: string) => seed.categorias.find((c) => c.nome === nome)?.id ?? '';

  it('lista despesas, receitas e as de sistema no fim, com a subcategoria logo depois da pai', () => {
    const f = aplicar(
      seed,
      criarCategoria(seed, ctx, {
        nome: 'Aluguel',
        tipo: 'despesa',
        icone: 'house',
        cor: 'categorica-1',
        categoriaPaiId: id('Moradia'),
      }).mudancas,
    );
    const linhas = linhasDasCategorias(f.categorias);
    const nomes = linhas.map((l) => l.categoria.nome);
    expect(nomes.slice(-4)).toEqual([
      'A classificar',
      'Juros e encargos',
      'Tarifas',
      'Ajuste de saldo',
    ]);
    expect(nomes[nomes.indexOf('Moradia') + 1]).toBe('Aluguel');
    expect(nomes.indexOf('Renda')).toBeGreaterThan(nomes.indexOf('Transporte'));
    expect(linhas.find((l) => l.categoria.nome === 'Moradia')?.filhas.map((c) => c.nome)).toEqual([
      'Aluguel',
    ]);
    // Pais: só comuns de primeiro nível, sem a própria.
    const pais = paisPossiveis(f.categorias, id('Moradia')).map((c) => c.nome);
    expect(pais).not.toContain('Moradia');
    expect(pais).not.toContain('Aluguel');
    expect(pais).not.toContain('A classificar');
  });

  it('a nova categoria nasce com a primeira cor livre da paleta', () => {
    // O seed usa as 8 cores; sem livre, a primeira.
    expect(valoresIniciais(seed.categorias).cor).toBe('categorica-1');
    const sem = seed.categorias.filter((c) => c.cor !== 'categorica-3');
    expect(valoresIniciais(sem).cor).toBe('categorica-3');
  });

  it('conta o que a exclusão move para "A classificar", da categoria e das subcategorias', () => {
    const alimentacao = id('Alimentação');
    const sub = criarCategoria(seed, ctx, {
      nome: 'Mercado',
      tipo: 'despesa',
      icone: 'shopping-cart',
      cor: 'categorica-3',
      categoriaPaiId: alimentacao,
    });
    const f = aplicar(seed, sub.mudancas);
    const comando = excluirCategoria(f, ctx, alimentacao);
    const n = itensMovidos(f, comando);
    const ids = new Set([alimentacao]);
    expect(n.lancamentos).toBe(
      f.lancamentos.filter((l) => l.categoriaId && ids.has(l.categoriaId)).length,
    );
    expect(n.compras).toBe(f.compras.filter((c) => c.categoriaId === alimentacao).length);
    expect(n.lancamentos + n.compras).toBeGreaterThan(0);
    expect(n.total).toBe(n.lancamentos + n.compras + n.itensFatura + n.dividas + n.recorrencias);
    // Nada fica apontando para a excluída.
    const depois = aplicar(f, comando.mudancas);
    const vivas = new Set(depois.categorias.filter((c) => !c.isDeleted).map((c) => c.id));
    expect(
      depois.lancamentos.every((l) => l.categoriaId === null || vivas.has(l.categoriaId)),
    ).toBe(true);
  });

  it('recorrência conta uma vez, pelas versões e ocorrências', () => {
    const moradia = id('Moradia');
    const comando = excluirCategoria(seed, ctx, moradia);
    const recorrencias = new Set(
      seed.recorrenciaVersoes.filter((v) => v.categoriaId === moradia).map((v) => v.recorrenciaId),
    );
    expect(itensMovidos(seed, comando).recorrencias).toBe(recorrencias.size);
    expect(recorrencias.size).toBeGreaterThan(0);
  });

  it('junta as partes do texto da exclusão com vírgula e "e"', () => {
    const n = { lancamentos: 3, compras: 1, itensFatura: 0, dividas: 0, recorrencias: 2, total: 6 };
    expect(listaDosItens(n)).toBe('3 lançamentos, 1 compra e 2 recorrências');
    expect(listaDosItens({ ...n, compras: 0, recorrencias: 0 })).toBe('3 lançamentos');
  });
});
