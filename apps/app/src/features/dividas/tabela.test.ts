import {
  type Contexto,
  D,
  dataCivil,
  derivar,
  excluirDivida,
  gerarSeed,
  tabelaParcelaInformada,
  tabelaPrice,
  type TabelaDaDivida,
} from '@goose-money/core';
import { describe, expect, it } from 'vitest';

import { chipDaParcela, linhasDaTabela, permissaoDe, pontosDoSaldo } from './tabela';

const HOJE = dataCivil('2026-11-04');
const d = derivar(gerarSeed(HOJE, '00000000-0000-4000-8000-000000000001'), HOJE);
const dividas = [...d.dividas.values()];
const doSistema = (s: string) =>
  dividas.find((t) => t.divida.sistemaAmortizacao === s) as TabelaDaDivida;

describe('linhasDaTabela', () => {
  it('o saldo após cada parcela é o da tabela Price gerada pelo core; zera no fim', () => {
    const t = doSistema('price');
    const { valorContratado, taxaMensal, numeroParcelas, dataPrimeiraParcela } = t.divida;
    const gerada = tabelaPrice(
      valorContratado,
      new D(taxaMensal ?? '0'),
      numeroParcelas,
      dataPrimeiraParcela,
    );
    expect(linhasDaTabela(t).map((l) => l.saldo)).toEqual(gerada.map((l) => l.saldoDevedor));
  });

  it('na parcela informada também; a última paga dá o saldo devedor do resumo', () => {
    const t = doSistema('parcela_informada');
    const { valorContratado, valorParcelaInformada, numeroParcelas, dataPrimeiraParcela } =
      t.divida;
    const gerada = tabelaParcelaInformada(
      valorContratado,
      valorParcelaInformada ?? valorContratado,
      numeroParcelas,
      dataPrimeiraParcela,
    ).linhas;
    const linhas = linhasDaTabela(t);
    expect(linhas.map((l) => l.saldo)).toEqual(gerada.map((l) => l.saldoDevedor));
    const ultimaPaga = linhas.findLast((l) => l.parcela.status !== 'a_vencer');
    expect(ultimaPaga?.saldo).toBe(t.resumo.saldoDevedor);
  });
});

describe('pontosDoSaldo', () => {
  it('cheia até a última paga, tracejada dali em diante, com o ponto de encontro nas duas', () => {
    const t = doSistema('price');
    const pontos = pontosDoSaldo(t, linhasDaTabela(t));
    const proxima = t.resumo.proximaParcela?.numero ?? 0;
    expect(pontos[proxima - 2]).toHaveProperty('pago');
    expect(pontos[proxima - 2]).toHaveProperty('previsto');
    expect(pontos[proxima - 1]).not.toHaveProperty('pago');
    expect(pontos[0]).not.toHaveProperty('previsto');
  });
});

describe('chipDaParcela', () => {
  it('um chip por status do core; a próxima em destaque', () => {
    expect(chipDaParcela('paga_antes_do_cadastro', false).estado).toBe('pagaAntesDoCadastro');
    expect(chipDaParcela('paga', false).estado).toBe('faturaPaga');
    expect(chipDaParcela('vencida', false)).toEqual({ estado: 'vencido', rotulo: 'Vencida' });
    expect(chipDaParcela('a_vencer', true).rotulo).toBe('A vencer · próxima');
    expect(chipDaParcela('a_vencer', false).rotulo).toBe('A vencer');
  });
});

describe('permissaoDe', () => {
  const ctx: Contexto = { hoje: HOJE, agora: '', usuario: '', novoId: () => '' };
  it('a recusa do core vira o motivo; outros erros sobem', () => {
    const t = doSistema('price');
    expect(permissaoDe(() => excluirDivida(d.fatos, ctx, t.divida.id))).toEqual({
      permitida: false,
      motivo: 'A dívida tem pagamentos registrados. Exclua os pagamentos antes.',
    });
    expect(permissaoDe(() => 1)).toEqual({ permitida: true });
    expect(() =>
      permissaoDe(() => {
        throw new TypeError('x');
      }),
    ).toThrow(TypeError);
  });
});
