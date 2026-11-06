import { describe, expect, it } from 'vitest';
import { montarFaturas } from '../cartoes';
import { saldo } from '../contas';
import { competencia, ultimaData } from '../datas';
import { centavos } from '../dinheiro';
import { fatosVazios, type Fatos, type Id } from '../modelo';
import { ocorrenciasDoMes, pendentesParaConfirmar } from '../recorrencias';
import { derivar } from './derivar';
import { gerarFatos, HOJE_SINTETICO as HOJE } from './sinteticos';

/** Relógio de alta resolução do Vitest; o core não tem os tipos de DOM nem de Node. */
declare const performance: { now(): number };

const c = competencia;
describe('derivar', () => {
  const fatos = gerarFatos(2_000);

  it('é pura: duas chamadas com os mesmos fatos dão resultados iguais', () => {
    expect(derivar(fatos, HOJE)).toEqual(derivar(fatos, HOJE));
  });

  it('reaproveita as funções de contexto', () => {
    const derivado = derivar(fatos, HOJE);
    for (const cartao of fatos.cartoes)
      expect(derivado.faturas.get(cartao.id)).toEqual(montarFaturas(fatos, cartao.id, HOJE));
    expect(derivado.ocorrenciasDoMes).toEqual(ocorrenciasDoMes(fatos, c('2026-11'), HOJE));
    expect(derivado.pendentes).toEqual(pendentesParaConfirmar(fatos, HOJE));
    expect(derivado.pendentes.length).toBeGreaterThan(0);
    expect(derivado.reconhecidos.length).toBeGreaterThan(1_000);
  });

  it('saldo atual e de fim de mês iguais a `saldo`, indisponível antes do saldo inicial', () => {
    const derivado = derivar(fatos, HOJE);
    for (const conta of fatos.contas) {
      const saldos = derivado.saldos.get(conta.id);
      expect(saldos?.atual).toBe(saldo(fatos, conta.id, HOJE));
      expect([...(saldos?.fimDoMes.keys() ?? [])]).toHaveLength(26); // 2024-10 a 2026-11
      for (const [m, valor] of saldos?.fimDoMes ?? [])
        expect(valor).toBe(saldo(fatos, conta.id, ultimaData(m)));
    }
    const carteira = derivado.saldos.get(fatos.contas[2]?.id as Id);
    expect(carteira?.fimDoMes.get(c('2025-05'))).toBeNull();
    expect(carteira?.fimDoMes.get(c('2025-06'))).not.toBeNull();
  });

  it('índices por id e por relação', () => {
    const derivado = derivar(fatos, HOJE);
    const compra = fatos.compras[0];
    expect(derivado.porId.compras.get(compra?.id as Id)).toBe(compra);
    expect(derivado.parcelasPorCompra.get(compra?.id as Id)).toHaveLength(
      compra?.numeroParcelas as number,
    );
    for (const r of fatos.recorrencias)
      expect(derivado.versoesPorRecorrencia.get(r.id)).toHaveLength(1);
    for (const cartao of fatos.cartoes)
      expect(derivado.ciclosPorCartao.get(cartao.id)).toHaveLength(1);
    expect(derivado.porId.categorias.size).toBe(fatos.categorias.length);
    expect(derivado.porId.contas.size).toBe(3);
    expect(derivado.porId.cartoes.size).toBe(3);
    expect(derivado.porId.dividas.size).toBe(2);
    expect(derivado.porId.recorrencias.size).toBe(8);
  });

  it('tabelas de dívida com status e resumo', () => {
    const derivado = derivar(fatos, HOJE);
    const [emprestimo, financiamento] = fatos.dividas.map((x) => derivado.dividas.get(x.id));
    expect(emprestimo?.parcelas.map((p) => p.numero)).toEqual(
      Array.from({ length: 48 }, (_, k) => k + 1),
    );
    expect(emprestimo?.parcelas[0]).toMatchObject({ paga: true, status: 'paga' });
    expect(emprestimo?.parcelas[1]?.status).toBe('vencida');
    expect(emprestimo?.parcelas.at(-1)?.status).toBe('a_vencer');
    expect(emprestimo?.resumo.pagas).toBe(1);
    expect(financiamento?.resumo.totalPago).toBe(centavos(100_000));
  });

  it('dívida sem parcelas e conta sem lançamentos', () => {
    const f = fatosVazios();
    f.contas.push({ ...(fatos.contas[0] as Fatos['contas'][number]), dataSaldoInicial: HOJE });
    f.dividas.push(fatos.dividas[0] as Fatos['dividas'][number]);
    const derivado = derivar(f, HOJE);
    expect(derivado.dividas.get(f.dividas[0]?.id as Id)?.parcelas).toEqual([]);
    expect([...(derivado.saldos.get(f.contas[0]?.id as Id)?.fimDoMes.values() ?? [])]).toEqual([
      f.contas[0]?.saldoInicial,
    ]);
  });

  it('9.3: 10 mil lançamentos, 3 cartões, 2 dívidas e 8 recorrências em menos de 50 ms', () => {
    const grande = gerarFatos(10_000);
    expect(grande.lancamentos).toHaveLength(10_000);
    const tempos: number[] = [];
    for (let k = 0; k < 5; k++) {
      const inicio = performance.now();
      derivar(grande, HOJE);
      tempos.push(performance.now() - inicio);
    }
    const mediana = tempos.sort((a, b) => a - b)[2] as number;
    expect(mediana).toBeLessThan(50);
  });
});
