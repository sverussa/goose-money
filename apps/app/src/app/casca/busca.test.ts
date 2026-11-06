import { centavos, dataCivil, type Fatos } from '@goose-money/core';
import { describe, expect, it } from 'vitest';

import { buscarLancamentos, combina } from './busca';

const l = (id: string, descricao: string | null, data: string, tipo = 'despesa') =>
  ({
    id,
    descricao,
    data: dataCivil(data),
    valor: centavos(1000),
    tipo,
  }) as unknown as Fatos['lancamentos'][number];
const c = (id: string, descricao: string, data: string) =>
  ({
    id,
    descricao,
    data: dataCivil(data),
    valorTotal: centavos(5000),
  }) as unknown as Fatos['compras'][number];

describe('busca global (D45)', () => {
  it('ignora acentos e caixa', () => {
    expect(combina('Alimentação', 'alimentacao')).toBe(true);
    expect(combina('Padaria São João', 'SAO jo')).toBe(true);
    expect(combina('Padaria', 'mercado')).toBe(false);
  });

  const fatos = {
    lancamentos: [
      l('1', 'Padaria', '2026-10-02'),
      l('2', 'Salário', '2026-11-01', 'receita'),
      l('3', null, '2026-11-02'),
      l('4', 'Padaria do bairro', '2026-11-03'),
      l('5', 'Transferência para poupança', '2026-11-04', 'transferencia'),
    ],
    compras: [c('9', 'Padaria gourmet', '2026-10-20')],
  };

  it('acha lançamentos e compras pela descrição, mais recentes primeiro', () => {
    expect(buscarLancamentos(fatos, 'padaria').map((x) => x.id)).toEqual(['4', '9', '1']);
  });

  it('tipo do valor: receita, despesa (compras também) e neutro para os outros', () => {
    expect(buscarLancamentos(fatos, 'salario')[0]?.tipo).toBe('receita');
    expect(buscarLancamentos(fatos, 'gourmet')[0]?.tipo).toBe('despesa');
    expect(buscarLancamentos(fatos, 'poupanca')[0]?.tipo).toBe('neutro');
  });

  it('menos de 2 letras não procura nos lançamentos; respeita o limite', () => {
    expect(buscarLancamentos(fatos, 'p')).toEqual([]);
    expect(buscarLancamentos(fatos, 'pa', 2)).toHaveLength(2);
  });
});
