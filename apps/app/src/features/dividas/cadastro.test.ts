import {
  type Contexto,
  contratarDivida,
  D,
  dataCivil,
  deMascara,
  derivar,
  gerarSeed,
  tabelaPrice,
  taxaImplicita,
} from '@goose-money/core';
import { describe, expect, it } from 'vitest';

import {
  camposDaDivida,
  errosDaEtapa,
  previaDaDivida,
  registraEntrada,
  taxaDoTexto,
  type ValoresDaDivida,
  valoresIniciaisDaDivida,
} from './cadastro';
import { mensagensDividas } from './mensagens';

const e = mensagensDividas.cadastro.erros;
const HOJE = dataCivil('2026-11-04');
const d = derivar(gerarSeed(HOJE, '00000000-0000-4000-8000-000000000001'), HOJE);
const conta = d.fatos.contas[0]?.id ?? '';
const ctx: Contexto = {
  hoje: HOJE,
  agora: `${HOJE}T12:00:00Z`,
  usuario: '00000000-0000-4000-8000-000000000001',
  novoId: () => crypto.randomUUID(),
};
const com = (x: Partial<ValoresDaDivida>): ValoresDaDivida => ({
  ...valoresIniciaisDaDivida(HOJE, conta, 'cat'),
  credor: 'Banco',
  valorContratado: deMascara('480000'),
  ...x,
});

describe('taxaDoTexto', () => {
  it('converte o percentual digitado na fração do modelo, sem ponto flutuante', () => {
    expect(taxaDoTexto('1,49')).toBe('0.0149');
    expect(taxaDoTexto('0')).toBe('0');
    expect(taxaDoTexto(' 12,3456 ')).toBe('0.123456');
    expect(taxaDoTexto('')).toBeNull();
    expect(taxaDoTexto('1,23456')).toBeNull();
    expect(taxaDoTexto('-1')).toBeNull();
  });
});

describe('errosDaEtapa', () => {
  it('contrato: credor, valor e data não futura', () => {
    expect(
      errosDaEtapa(
        'contrato',
        com({ credor: ' ', valorContratado: 0, dataContratacao: '2026-11-05' }),
        HOJE,
      ),
    ).toEqual({ credor: e.credor, valorContratado: e.valor, dataContratacao: e.dataFutura });
    expect(errosDaEtapa('contrato', com({}), HOJE)).toEqual({});
  });

  it('destino: conta da entrada e categoria do pago a terceiro', () => {
    expect(errosDaEtapa('destino', com({ contaCreditoId: '' }), HOJE)).toEqual({
      contaCreditoId: e.conta,
    });
    expect(
      errosDaEtapa('destino', com({ contaCreditoId: '', registrarEntrada: false }), HOJE),
    ).toEqual({});
    expect(
      errosDaEtapa('destino', com({ destino: 'pago_a_terceiro', categoriaId: '' }), HOJE),
    ).toEqual({ categoriaId: e.categoria });
  });

  it('condições: R$ 300,00 × 12 não cobre R$ 4.800,00; R$ 450,00 × 12 passa (11.5)', () => {
    const informada = { sistema: 'parcela_informada' as const, numeroParcelas: 12 };
    expect(
      errosDaEtapa('condicoes', com({ ...informada, valorParcela: deMascara('30000') }), HOJE),
    ).toEqual({ valorParcela: e.somaMenor });
    expect(
      errosDaEtapa('condicoes', com({ ...informada, valorParcela: deMascara('45000') }), HOJE),
    ).toEqual({});
    expect(
      errosDaEtapa(
        'condicoes',
        com({ taxa: '1.49', numeroParcelas: 0, dataPrimeiraParcela: '2026-11-03' }),
        HOJE,
      ),
    ).toEqual({
      taxa: e.taxa,
      numeroParcelas: e.numeroParcelas(480),
      dataPrimeiraParcela: e.primeiraAntes,
    });
  });

  it('parcelas pagas antes: de 0 a n', () => {
    expect(errosDaEtapa('antes', com({ parcelasPagas: 13 }), HOJE)).toEqual({
      parcelasPagas: e.parcelasPagas(12),
    });
    expect(errosDaEtapa('antes', com({ parcelasPagas: 12 }), HOJE)).toEqual({});
  });
});

describe('registraEntrada', () => {
  it('ligada para dívida deste mês, desligada para antiga, e a escolha da pessoa vale', () => {
    expect(registraEntrada(com({}), HOJE)).toBe(true);
    expect(registraEntrada(com({ dataContratacao: '2026-10-31' }), HOJE)).toBe(false);
    expect(
      registraEntrada(com({ dataContratacao: '2026-10-31', registrarEntrada: true }), HOJE),
    ).toBe(true);
    expect(registraEntrada(com({ destino: 'pago_a_terceiro', registrarEntrada: true }), HOJE)).toBe(
      false,
    );
  });
});

describe('camposDaDivida e previaDaDivida', () => {
  it('Price R$ 40.000,00 a 1,49% em 48x: a tabela do core, saldo final zero (11.5)', () => {
    const v = com({
      tipo: 'financiamento',
      destino: 'pago_a_terceiro',
      categoriaId: d.fatos.categorias.find((c) => c.tipo === 'despesa')?.id ?? '',
      valorContratado: deMascara('4000000'),
      taxa: '1,49',
      numeroParcelas: 48,
      parcelasPagas: 12,
    });
    const { campos, contratacao } = camposDaDivida(v, HOJE);
    expect(contratacao).toEqual({ parcelasPagas: 12, contaCaptacaoId: null });
    const p = previaDaDivida(d, contratarDivida(d.fatos, ctx, campos, contratacao));
    const gerada = tabelaPrice(
      campos.valorContratado,
      new D('0.0149'),
      48,
      campos.dataPrimeiraParcela,
    );
    expect(p.t.parcelas.map((x) => x.valor)).toEqual(gerada.map((x) => x.valor));
    expect(p.linhas.at(-1)?.saldo).toBe(0);
    expect(p.diferencaUltima).toBeNull();
    expect(p.totalJuros).toBe(gerada.reduce((s, x) => s + x.juros, 0));
  });

  it('parcela informada R$ 450,00 × 12: taxa implícita do core e a diferença da última', () => {
    const v = com({ sistema: 'parcela_informada', valorParcela: deMascara('45000') });
    const { campos, contratacao } = camposDaDivida(v, HOJE);
    expect(campos.taxaMensal).toBeNull();
    expect(contratacao.contaCaptacaoId).toBe(conta);
    const p = previaDaDivida(d, contratarDivida(d.fatos, ctx, campos, contratacao));
    expect(p.t.resumo.taxa.toString()).toBe(
      taxaImplicita(deMascara('480000'), deMascara('45000'), 12).toString(),
    );
    expect(p.diferencaUltima).toBe((p.t.parcelas.at(-1)?.valor ?? 0) - deMascara('45000'));
  });
});
