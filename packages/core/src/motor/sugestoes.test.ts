import { describe, expect, it } from 'vitest';

import {
  A_CLASSIFICAR,
  AJUSTE,
  CONTA_A,
  cenario,
  d,
  id,
  MERCADO,
  r$,
  SALARIO,
} from '../comandos/cenario';
import type { Categoria, Fatos, Lancamento } from '../modelo';
import { sugestoesDeLancamento } from './sugestoes';

const controle = {
  createdAt: '2026-11-01T12:00:00-03:00',
  updatedAt: '2026-11-01T12:00:00-03:00',
  createdBy: id(99),
  isDeleted: false,
};
let n = 500;
const lancamento = (campos: Partial<Lancamento>): Lancamento => ({
  ...controle,
  id: id(++n),
  tipo: 'despesa',
  status: 'efetivado',
  data: d('2026-11-01'),
  valor: r$(10),
  descricao: null,
  observacao: null,
  contaId: CONTA_A,
  contaDestinoId: null,
  categoriaId: MERCADO,
  cartaoId: null,
  faturaCompetencia: null,
  dividaId: null,
  parcelaDividaId: null,
  ...campos,
});
const categoria = (k: number, nome: string): Categoria => ({
  ...controle,
  id: id(k),
  nome,
  tipo: 'despesa',
  icone: 'tag',
  cor: 'categorica-3',
  categoriaPaiId: null,
  sistema: null,
});

function comLancamentos(...ls: Lancamento[]): Fatos {
  const f = cenario();
  f.categorias.push(...Array.from({ length: 9 }, (_, i) => categoria(30 + i, `Cat ${String(i)}`)));
  f.lancamentos.push(...ls);
  return f;
}

describe('sugestoesDeLancamento (T05-04)', () => {
  it('a descrição sugere a categoria usada da última vez com ela, sem diferenciar maiúsculas', () => {
    const f = comLancamentos(
      lancamento({ descricao: 'Mercado', categoriaId: id(30), data: d('2026-10-01') }),
      lancamento({ descricao: 'mercado ', categoriaId: MERCADO, data: d('2026-11-02') }),
      lancamento({ descricao: 'Padaria', categoriaId: id(31), data: d('2026-11-03') }),
    );
    expect(sugestoesDeLancamento(f, 'despesa').descricoes).toEqual([
      { descricao: 'mercado', categoriaId: MERCADO },
      { descricao: 'Padaria', categoriaId: id(31) },
    ]);
  });

  it('as 8 mais usadas do tipo, sem a de ajuste de saldo nem as de outro tipo', () => {
    const usos = (k: number, vezes: number) =>
      Array.from({ length: vezes }, () => lancamento({ categoriaId: id(k) }));
    const f = comLancamentos(
      ...Array.from({ length: 9 }, (_, i) => usos(30 + i, i + 1)).flat(),
      ...Array.from({ length: 20 }, () => lancamento({ tipo: 'ajuste', categoriaId: AJUSTE })),
      ...Array.from({ length: 20 }, () => lancamento({ tipo: 'receita', categoriaId: SALARIO })),
      lancamento({ categoriaId: A_CLASSIFICAR }),
    );
    expect(sugestoesDeLancamento(f, 'despesa').maisUsadas).toEqual(
      [38, 37, 36, 35, 34, 33, 32, 31].map(id),
    );
    expect(sugestoesDeLancamento(f, 'receita').maisUsadas).toEqual([SALARIO]);
  });

  it('na despesa, as compras no cartão também contam', () => {
    const f = comLancamentos();
    f.compras.push({
      ...controle,
      id: id(600),
      cartaoId: id(3),
      data: d('2026-11-02'),
      descricao: 'Fone',
      categoriaId: id(32),
      observacao: null,
      valorTotal: r$(100),
      numeroParcelas: 1,
      cancelada: false,
    });
    const s = sugestoesDeLancamento(f, 'despesa');
    expect(s.descricoes).toEqual([{ descricao: 'Fone', categoriaId: id(32) }]);
    expect(s.maisUsadas).toEqual([id(32)]);
  });
});
