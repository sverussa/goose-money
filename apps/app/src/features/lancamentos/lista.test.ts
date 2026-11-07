import {
  dataCivil,
  derivar,
  despesas,
  entradasESaidasDeCaixa,
  gerarSeed,
  movimentacoes,
  periodoPreset,
  receitas,
  resultado,
} from '@goose-money/core';
import { describe, expect, it } from 'vitest';

import { estadoDaUrl, filtrosAtivos, linhasPorDia, recorte, rotuloDoDia } from './lista';

const HOJE = dataCivil('2026-11-04');
const d = derivar(gerarSeed(HOJE, '00000000-0000-4000-8000-000000000001'), HOJE);
const p = periodoPreset('mes-passado', HOJE);
const url = (s: string) => estadoDaUrl(new URLSearchParams(s));

describe('Lançamentos (6.3)', () => {
  it('lê visão e filtros da URL e descarta os inválidos', () => {
    const e = url(
      'visao=movimentacoes&tipo=despesa,compra,x&categoria=a,b&origem=cartao,x&q=%20Nb%20&conta=c1&estado=previsto',
    );
    expect(e).toEqual({
      visao: 'movimentacoes',
      tipos: ['despesa', 'compra'],
      contaId: 'c1',
      cartaoId: null,
      categorias: ['a', 'b'],
      estados: ['previsto'],
      origens: ['cartao'],
      busca: 'Nb',
    });
    expect(filtrosAtivos(e)).toBe(5);
    expect(url('')).toMatchObject({
      visao: 'competencia',
      estados: ['liquidado', 'a_pagar', 'vencido'],
    });
    expect(url('tipo=compra').tipos).toEqual([]);
    expect(filtrosAtivos(url(''))).toBe(0);
  });

  it('Receitas e despesas: os itens reconhecidos; a soma bate com o cabeçalho', () => {
    const r = recorte(d, p, url(''));
    const soma = (n: 'entrada' | 'saida') =>
      r.itens.filter((i) => i.natureza === n).reduce((s, i) => s + i.valor, 0);
    expect(soma('entrada') + soma('saida')).toBe(resultado(d, p));
    expect(r.cabecalho).toEqual([
      { chave: 'receitas', valor: receitas(d, p) },
      { chave: 'despesas', valor: despesas(d, p) },
      { chave: 'resultado', valor: resultado(d, p) },
    ]);
    expect(r.itens.map((i) => i.data)).toEqual([...r.itens.map((i) => i.data)].sort().reverse());
  });

  it('previstos só com o filtro de estado, sem somar no cabeçalho', () => {
    const futuro = periodoPreset('ultimos-12-meses', HOJE);
    const com = recorte(
      d,
      { ...futuro, ate: dataCivil('2027-12-31') },
      url('estado=liquidado,a_pagar,vencido,previsto'),
    );
    const sem = recorte(d, { ...futuro, ate: dataCivil('2027-12-31') }, url(''));
    expect(com.itens.some((i) => i.chips.includes('previsto'))).toBe(true);
    expect(sem.itens.some((i) => i.chips.includes('previsto'))).toBe(false);
    expect(com.cabecalho).toEqual(sem.cabecalho);
  });

  it('Movimentações: o cabeçalho são as entradas e saídas de caixa do core', () => {
    const r = recorte(d, p, url('visao=movimentacoes'));
    const { entradas, saidas } = entradasESaidasDeCaixa(movimentacoes(d.fatos, HOJE, p));
    expect(r.cabecalho).toEqual([
      { chave: 'entradas', valor: entradas },
      { chave: 'saidas', valor: saidas },
    ]);
    expect(r.itens.some((i) => i.tipo === 'transferencia')).toBe(true);
    const dias = linhasPorDia(r.itens).filter((l) => l.tipo === 'dia');
    expect(dias.reduce((s, l) => s + l.total, 0)).toBe(entradas + saidas);
  });

  it('rótulo do dia', () => {
    expect(rotuloDoDia(dataCivil('2026-10-31'))).toBe('Sáb, 31/10');
    expect(rotuloDoDia(HOJE)).toBe('Qua, 04/11');
  });
});
