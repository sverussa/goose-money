import {
  aplicar,
  competenciaDe,
  type Contexto,
  dataCivil,
  derivar,
  gerarSeed,
  ignorarOcorrencia,
  confirmarOcorrencia,
  type Recorrencia,
  somarMeses,
} from '@goose-money/core';
import { describe, expect, it } from 'vitest';

import {
  comandoDaRecorrencia,
  esquemaDaRecorrencia,
  faturaDoFormulario,
  valoresIniciais,
} from '@/features/recorrencias/recorrencias';

import { aVencerLogo, chipDoGasto, detalheDoGasto, gastosDoMes } from './gastos';
import { mensagensGastos as m } from './mensagens';

const HOJE = dataCivil('2026-11-04');
const MES = competenciaDe(HOJE);
const USUARIO = '00000000-0000-4000-8000-000000000001';
const fatos = gerarSeed(HOJE, USUARIO);
const ctx: Contexto = {
  hoje: HOJE,
  agora: `${HOJE}T12:00:00Z`,
  usuario: USUARIO,
  novoId: () => crypto.randomUUID(),
};
const gasto = (nome: string) =>
  fatos.recorrencias.find((r) => r.descricao === nome && r.natureza === 'gasto') as Recorrencia;
const doMes = (f: typeof fatos, nome: string, hoje = HOJE) => {
  const o = gastosDoMes(f, MES, hoje).find((x) => x.recorrencia.descricao === nome);
  if (!o) throw new Error(`${nome} não está em ${MES}`);
  return o;
};

describe('chipDoGasto', () => {
  const d = derivar(fatos, HOJE);
  const logo = aVencerLogo(d);
  it('prevista que vence logo (Pendências): "Vence amanhã"; as outras, "Prevista"', () => {
    expect(chipDoGasto(doMes(fatos, 'Academia'), HOJE, logo)).toEqual({
      estado: 'venceEmBreve',
      rotulo: m.chip.venceAmanha,
    });
    expect(chipDoGasto(doMes(fatos, 'Aluguel'), HOJE, logo).estado).toBe('previsto');
  });

  it('paga, ignorada e vencida', () => {
    const id = gasto('Aluguel').id;
    const paga = aplicar(fatos, confirmarOcorrencia(fatos, ctx, id, MES, { data: HOJE }).mudancas);
    expect(chipDoGasto(doMes(paga, 'Aluguel'), HOJE, logo).estado).toBe('faturaPaga');
    const ignorada = aplicar(fatos, ignorarOcorrencia(fatos, ctx, id, MES).mudancas);
    expect(chipDoGasto(doMes(ignorada, 'Aluguel'), HOJE, logo).rotulo).toBe(m.chip.ignorada);
    const depois = dataCivil('2026-11-12');
    expect(chipDoGasto(doMes(fatos, 'Aluguel', depois), depois, new Set()).estado).toBe('vencido');
  });
});

describe('detalheDoGasto', () => {
  it('no cartão diz a fatura; o dia 31 vira 30 em novembro', () => {
    const d = derivar(fatos, HOJE);
    expect(detalheDoGasto(d, doMes(fatos, 'Streaming'))).toContain('cai na fatura de');
    expect(detalheDoGasto(d, doMes(fatos, 'Energia'))).toContain(
      m.detalhe.diaAjustado(31, 30, 'novembro'),
    );
  });
});

describe('formulário de gasto', () => {
  it('no cartão exige o cartão e grava a versão sem conta', () => {
    const v = {
      ...valoresIniciais(fatos, HOJE, { conta: null, cartao: null }),
      descricao: 'Música',
      valor: 2190,
      dia: 20,
      formaPagamento: 'cartao' as const,
    };
    expect(esquemaDaRecorrencia.safeParse({ ...v, cartaoId: '' }).success).toBe(false);
    expect(esquemaDaRecorrencia.safeParse(v).success).toBe(true);
    expect(faturaDoFormulario(fatos, v)?.mes).toBe(MES);
    const depois = aplicar(fatos, comandoDaRecorrencia(fatos, ctx, 'gasto', v).mudancas);
    const r = depois.recorrencias.find((x) => x.descricao === 'Música') as Recorrencia;
    expect(depois.recorrenciaVersoes.find((x) => x.recorrenciaId === r.id)).toMatchObject({
      formaPagamento: 'cartao',
      contaId: null,
      cartaoId: v.cartaoId,
    });
  });

  it('trocar o cartão pela conta é uma nova versão "a partir de"', () => {
    const streaming = gasto('Streaming');
    const v = valoresIniciais(fatos, HOJE, { conta: null, cartao: null }, streaming);
    expect(v.formaPagamento).toBe('cartao');
    const contaId = fatos.contas[0]?.id ?? '';
    const c = comandoDaRecorrencia(
      fatos,
      ctx,
      'gasto',
      { ...v, formaPagamento: 'conta', contaId },
      streaming,
    );
    expect(c.mudancas.map((x) => x.entidade)).toEqual(['recorrenciaVersoes']);
    const depois = aplicar(fatos, c.mudancas);
    const o = gastosDoMes(depois, somarMeses(MES, 1), HOJE).find(
      (x) => x.recorrenciaId === streaming.id,
    );
    expect(o).toMatchObject({ formaPagamento: 'conta', contaId, cartaoId: null });
  });
});
