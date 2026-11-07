import {
  dataCivil,
  derivar,
  gerarSeed,
  periodoPreset,
  receitas,
  despesas,
} from '@goose-money/core';
import { describe, expect, it } from 'vitest';

import { filtrosDaUrl, itensDoRecorte, linhasPorDia, rotuloDoDia, visaoDaUrl } from './lista';

const HOJE = dataCivil('2026-11-04');
const d = derivar(gerarSeed(HOJE, '00000000-0000-4000-8000-000000000001'), HOJE);

describe('Lançamentos › Receitas e despesas (6.3)', () => {
  it('lê visão e filtros da URL e descarta os inválidos', () => {
    const busca = new URLSearchParams(
      'visao=movimentacoes&tipo=despesa&categoria=a,b&origem=cartao,x&q=%20Nb%20&conta=c1',
    );
    expect(visaoDaUrl(busca)).toBe('movimentacoes');
    expect(visaoDaUrl(new URLSearchParams())).toBe('competencia');
    expect(filtrosDaUrl(busca)).toEqual({
      tipo: 'despesa',
      contaId: 'c1',
      categorias: ['a', 'b'],
      origens: ['cartao'],
      busca: 'Nb',
    });
    expect(filtrosDaUrl(new URLSearchParams('tipo=ajuste&origem=x'))).toEqual({});
  });

  it('os itens são as receitas e despesas reconhecidas; a soma bate com o cabeçalho', () => {
    const p = periodoPreset('mes-passado', HOJE);
    const itens = itensDoRecorte(d, p, {});
    const soma = (t: 'receita' | 'despesa') =>
      itens.filter((i) => i.tipo === t).reduce((s, i) => s + i.valor, 0);
    expect(soma('receita')).toBe(receitas(d, p));
    expect(soma('despesa')).toBe(despesas(d, p));
    expect(itens.map((i) => i.data)).toEqual([...itens.map((i) => i.data)].sort().reverse());
  });

  it('agrupa por dia com receitas − despesas do dia', () => {
    const p = periodoPreset('mes-passado', HOJE);
    const linhas = linhasPorDia(itensDoRecorte(d, p, {}));
    const dias = linhas.filter((l) => l.tipo === 'dia');
    expect(new Set(dias.map((l) => l.data)).size).toBe(dias.length);
    const totalDosDias = dias.reduce((s, l) => s + l.total, 0);
    expect(totalDosDias).toBe(receitas(d, p) - despesas(d, p));
    expect(linhas.at(-1)).toMatchObject({ tipo: 'item', ultimo: true });
  });

  it('rótulo do dia', () => {
    expect(rotuloDoDia(dataCivil('2026-10-31'))).toBe('Sáb, 31/10');
    expect(rotuloDoDia(HOJE)).toBe('Qua, 04/11');
  });
});
