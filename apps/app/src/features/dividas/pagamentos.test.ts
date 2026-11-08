import {
  amortizarDivida,
  amortizarExtraordinario,
  type Contexto,
  dataCivil,
  deMascara,
  derivar,
  gerarSeed,
  parcelasDaDivida,
  type TabelaDaDivida,
} from '@goose-money/core';
import { describe, expect, it } from 'vitest';

import { parcelaPadrao, parcelasEmAberto, previaDaAmortizacao } from './pagamentos';

const HOJE = dataCivil('2026-11-04');
const USUARIO = '00000000-0000-4000-8000-000000000001';
const d = derivar(gerarSeed(HOJE, USUARIO), HOJE);
const ctx: Contexto = {
  hoje: HOJE,
  agora: `${HOJE}T12:00:00Z`,
  usuario: USUARIO,
  novoId: () => crypto.randomUUID(),
};
const price = [...d.dividas.values()].find(
  (t) => t.divida.sistemaAmortizacao === 'price',
) as TabelaDaDivida;

describe('parcelaPadrao', () => {
  it('sem escolha: a primeira em aberto, que é a próxima do resumo', () => {
    expect(parcelaPadrao(price, null)?.numero).toBe(price.resumo.proximaParcela?.numero);
  });

  it('a parcela escolhida pela pendência, se em aberto; uma paga volta ao padrão', () => {
    const terceira = parcelasEmAberto(price)[2];
    expect(parcelaPadrao(price, terceira?.id ?? null)).toBe(terceira);
    const paga = price.parcelas.find((p) => p.status === 'paga');
    expect(parcelaPadrao(price, paga?.id ?? null)?.numero).toBe(
      price.resumo.proximaParcela?.numero,
    );
  });
});

describe('previaDaAmortizacao', () => {
  const valor = deMascara('500000');
  const montar = (modo: 'reduzirPrazo' | 'reduzirValor') =>
    previaDaAmortizacao(
      d,
      price,
      amortizarDivida(d.fatos, ctx, price.divida.id, { valor, data: HOJE, modo }),
      HOJE,
    );
  const doCore = (modo: 'reduzirPrazo' | 'reduzirValor') =>
    amortizarExtraordinario(
      price.divida,
      parcelasDaDivida(d.fatos, price.divida.id),
      valor,
      HOJE,
      modo,
    );

  it('reduzir prazo: menos parcelas, a mesma parcela Price e o saldo menor no valor', () => {
    const { antes, depois } = montar('reduzirPrazo');
    expect(antes.restantes).toBe(price.resumo.total - price.resumo.pagas);
    expect(depois.restantes).toBe(doCore('reduzirPrazo').length);
    expect(depois.restantes).toBeLessThan(antes.restantes);
    expect(depois.parcela?.valor).toBe(antes.parcela?.valor);
    expect(depois.saldoDevedor).toBe(antes.saldoDevedor - valor);
    expect((depois.quitacao ?? '') < (antes.quitacao ?? '')).toBe(true);
  });

  it('reduzir valor: as mesmas parcelas, de valor menor', () => {
    const { antes, depois } = montar('reduzirValor');
    expect(depois.restantes).toBe(antes.restantes);
    expect(depois.parcela?.valor).toBe(doCore('reduzirValor')[0]?.valor);
    expect(depois.parcela?.valor ?? 0).toBeLessThan(antes.parcela?.valor ?? 0);
    expect(depois.quitacao).toBe(antes.quitacao);
  });
});
