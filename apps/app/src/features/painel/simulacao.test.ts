import { centavos, competencia, dataCivil } from '@goose-money/core';
import { describe, expect, it } from 'vitest';

import { formatarMes, formatarMoeda } from '@/app/formatacao';

import { mensagensPainel } from './mensagens';
import { frasesDaSimulacao, hipoteticoDe, valoresIniciaisDaSimulacao } from './simulacao';

const hoje = dataCivil('2026-11-04');
const m = mensagensPainel.projecoes.simulador;

describe('hipoteticoDe', () => {
  it('sem valor, sem simulação; começa na compra quando há cartão', () => {
    const v = valoresIniciaisDaSimulacao(hoje, 'c1');
    expect(v.tipo).toBe('compra');
    expect(hipoteticoDe(v)).toBeNull();
    expect(valoresIniciaisDaSimulacao(hoje, undefined).tipo).toBe('gastoFixo');
  });

  it('compra parcelada: só com parcelas de 1 a 99 e data válida', () => {
    const v = { ...valoresIniciaisDaSimulacao(hoje, 'c1'), valor: centavos(300000) };
    expect(hipoteticoDe(v)).toMatchObject({
      tipo: 'compra',
      cartaoId: 'c1',
      data: hoje,
      valorTotal: 300000,
      numeroParcelas: 10,
    });
    expect(hipoteticoDe({ ...v, parcelas: 0 })).toBeNull();
    expect(hipoteticoDe({ ...v, parcelas: 100 })).toBeNull();
    expect(hipoteticoDe({ ...v, data: '2026-02-30' })).toBeNull();
  });

  it('gasto fixo em conta ou no cartão, a partir de um mês', () => {
    const v = {
      ...valoresIniciaisDaSimulacao(hoje, 'c1'),
      tipo: 'gastoFixo' as const,
      valor: centavos(5000),
    };
    expect(hipoteticoDe(v)).toMatchObject({
      tipo: 'gastoFixo',
      valor: 5000,
      dia: 4,
      desde: competencia('2026-11'),
      cartaoId: null,
    });
    expect(hipoteticoDe({ ...v, pagamento: 'c1' })).toMatchObject({ cartaoId: 'c1' });
    expect(hipoteticoDe({ ...v, dia: 32 })).toBeNull();
    expect(hipoteticoDe({ ...v, desde: '' })).toBeNull();
  });
});

describe('frasesDaSimulacao', () => {
  const ultimo = competencia('2027-04');
  it('abaixo do limite, negativo (já sem a simulação) e sem alerta', () => {
    const base = { competencia: competencia('2027-03'), ultimo, diferenca: centavos(-150000) };
    expect(
      frasesDaSimulacao(
        { tipo: 'abaixoDoLimite', saldoFinal: centavos(40000), jaSemSimulacao: false, ...base },
        'compra',
        centavos(50000),
      ),
    ).toBe(
      `${m.abaixo(m.com.compra, formatarMes(base.competencia), formatarMoeda(centavos(40000)))} ${m.diferenca(formatarMes(ultimo), formatarMoeda(base.diferenca))}`,
    );
    expect(
      frasesDaSimulacao(
        { tipo: 'negativo', saldoFinal: centavos(-100), jaSemSimulacao: true, ...base },
        'gastoFixo',
        centavos(50000),
      ),
    ).toContain(`${m.com.gastoFixo}, o saldo fica negativo`);
    expect(
      frasesDaSimulacao(
        { tipo: 'negativo', saldoFinal: centavos(-100), jaSemSimulacao: true, ...base },
        'gastoFixo',
        centavos(50000),
      ),
    ).toContain(m.jaSem);
    expect(
      frasesDaSimulacao(
        { tipo: 'semAlerta', ultimo, diferenca: centavos(0) },
        'compra',
        centavos(0),
      ),
    ).toBe(
      `${m.semAlerta(m.com.compra, formatarMoeda(centavos(0)))} ${m.semDiferenca(formatarMes(ultimo))}`,
    );
  });
});
