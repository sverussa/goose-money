import { describe, expect, it } from 'vitest';

import { itemAtivo, itensDaBarra, itensDoMais, itensDoMenu, numeroDoBadge } from './navegacao';

describe('menu principal (5.1)', () => {
  it('tem os 9 itens na ordem, com as rotas de 5.1', () => {
    expect(itensDoMenu.map((i) => i.rota)).toEqual([
      '/',
      '/lancamentos',
      '/contas',
      '/cartoes',
      '/dividas',
      '/rendas',
      '/gastos-fixos',
      '/projecoes',
      '/configuracoes',
    ]);
    expect(itensDaBarra).toHaveLength(4);
    expect(itensDoMais.map((i) => i.chave)).toEqual([
      'dividas',
      'rendas',
      'gastos',
      'projecoes',
      'configuracoes',
    ]);
  });

  it.each([
    ['/', '', 'painel'],
    ['/', '?aba=saldos', 'painel'],
    ['/', '?aba=projecoes', 'projecoes'],
    ['/contas', '', 'contas'],
    ['/contas/abc', '?mes=2026-11', 'contas'],
    ['/cartoes/x', '', 'cartoes'],
    ['/gastos-fixos', '', 'gastos'],
    ['/configuracoes', '', 'configuracoes'],
  ])('%s%s acende %s', (caminho, busca, chave) => {
    expect(itemAtivo(caminho, busca)?.chave).toBe(chave);
  });

  it('rota fora do menu não acende nada', () => {
    expect(itemAtivo('/contasx', '')).toBeUndefined();
  });

  it('badges vêm do core e "Mais" soma os itens que abre', () => {
    const b = { lancamentos: 2, cartoes: 1, rendasFixas: 3, gastosFixos: 4 };
    expect(numeroDoBadge(itensDoMenu.slice(1, 2), b)).toBe(2);
    expect(numeroDoBadge(itensDoMais, b)).toBe(7);
    expect(numeroDoBadge(itensDoMais, null)).toBe(0);
  });
});
