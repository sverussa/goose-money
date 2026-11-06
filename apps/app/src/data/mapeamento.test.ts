import { type Entidade, type Fatos, dataCivil, gerarSeed } from '@goose-money/core';
import { describe, expect, it } from 'vitest';

import { DadosInvalidos, deBanco, lerFatos, type Linha, paraBanco, tabelaDe } from './mapeamento';

const USUARIO = '00000000-0000-4000-8000-000000000001';
const seed = gerarSeed(dataCivil('2026-11-04'), USUARIO);

const listas = (f: Fatos): [Entidade, Linha[]][] =>
  Object.entries(f).map(([e, v]) => [
    e as Entidade,
    (Array.isArray(v) ? v : v ? [v] : []) as Linha[],
  ]);

/** O que o banco devolve: as colunas de controle e a taxa (`numeric`) como número. */
const comoOBancoDevolve = (r: Linha): Linha => {
  const linha: Linha = {
    ...paraBanco(r),
    id: r.id,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
    created_by: r.createdBy,
  };
  if (typeof linha.taxa_mensal === 'string') linha.taxa_mensal = Number(linha.taxa_mensal);
  return linha;
};

describe('mapeamento banco ↔ domínio', () => {
  it('o seed tem registros de todas as entidades', () => {
    expect(listas(seed).filter(([, l]) => l.length === 0)).toEqual([]);
  });

  it.each(listas(seed))('ida e volta de %s preserva todos os campos', (e, registros) => {
    for (const r of registros) expect(deBanco(tabelaDe(e), comoOBancoDevolve(r))).toEqual(r);
  });

  it('paraBanco não manda as colunas que o banco preenche, mas manda is_deleted', () => {
    const c = seed.contas[0];
    expect(c).toBeDefined();
    const linha = paraBanco(c ?? {});
    expect(Object.keys(linha)).not.toEqual(
      expect.arrayContaining(['id', 'created_at', 'updated_at', 'created_by']),
    );
    expect(linha).toMatchObject({ is_deleted: false, saldo_inicial: c?.saldoInicial });
    expect(paraBanco({ isDeleted: true })).toEqual({ is_deleted: true });
  });

  it('taxa sem notação científica nem ruído do binário', () => {
    expect(deBanco('dividas', { taxa_mensal: 0.0149 }).taxaMensal).toBe('0.0149');
    expect(deBanco('dividas', { taxa_mensal: 1e-7 }).taxaMensal).toBe('0.0000001');
    expect(deBanco('dividas', { taxa_mensal: 0 }).taxaMensal).toBe('0');
  });

  it('bigint fora do inteiro seguro é erro claro', () => {
    expect(() => deBanco('lancamentos', { valor: 2 ** 53 })).toThrow(
      'lancamentos.valor: 9007199254740992 não é um inteiro seguro',
    );
    expect(() => deBanco('lancamentos', { valor: 1.5 })).toThrow(RangeError);
  });

  it('lerFatos monta os fatos e pega a única preferência', () => {
    const json = Object.fromEntries(
      listas(seed).map(([e, l]) => [tabelaDe(e), l.map(comoOBancoDevolve)]),
    );
    expect(lerFatos(json)).toEqual(seed);
    expect(lerFatos({ ...json, preferencias: [] }).preferencias).toBeNull();
  });

  it('dado inválido não chega ao Motor', () => {
    const json = Object.fromEntries(
      listas(seed).map(([e, l]) => [tabelaDe(e), l.map(comoOBancoDevolve)]),
    );
    const [l] = json.lancamentos ?? [];
    const quebrado = { ...json, lancamentos: [{ ...l, valor: -5 }] };
    expect(() => lerFatos(quebrado)).toThrow(DadosInvalidos);
    expect(() => lerFatos({ ...json, tabela_nova: [] })).toThrow(DadosInvalidos);
    expect(() => lerFatos(null)).toThrow(DadosInvalidos);
  });
});
