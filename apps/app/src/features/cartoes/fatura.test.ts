import {
  competenciaDe,
  dataCivil,
  deMascara,
  derivar,
  gerarSeed,
  negar,
  somarMeses,
} from '@goose-money/core';
import { describe, expect, it } from 'vitest';

import { formatarData, formatarMesCurto, formatarMoeda } from '@/app/formatacao';

import { faturaEscolhida, linhasDaFatura } from './fatura';

const HOJE = dataCivil('2026-11-04');
const d = derivar(gerarSeed(HOJE, '00000000-0000-4000-8000-000000000001'), HOJE);
const cartao = (nome: string) => {
  const c = d.fatos.cartoes.find((x) => x.nome === nome);
  if (!c) throw new Error(`sem ${nome}`);
  return c;
};
const compra = (descricao: string) => {
  const c = d.fatos.compras.find((x) => x.descricao === descricao);
  if (!c) throw new Error(`sem ${descricao}`);
  return c;
};
const linhas = (nome: string, competencia: string) => {
  const c = cartao(nome);
  const f = (d.faturas.get(c.id) ?? []).find((x) => x.competencia === competencia);
  if (!f) throw new Error(`sem fatura ${competencia}`);
  return linhasDaFatura(d, c, f);
};

describe('itens da fatura (6.5)', () => {
  it('sem ?fatura= (ou com uma que não existe), abre a aberta', () => {
    const faturas = d.faturas.get(cartao('Cartão A').id) ?? [];
    expect(faturaEscolhida(faturas, null)?.status).toBe('aberta');
    expect(faturaEscolhida(faturas, '1999-01')?.status).toBe('aberta');
    expect(faturaEscolhida(faturas, '2026-10')?.competencia).toBe('2026-10');
  });

  it('parcela "n/N", compra no dia do fechamento e estorno vinculado', () => {
    const nov = linhas('Cartão A', '2026-11');
    expect(nov.find((l) => l.texto === 'Notebook · 2/10')?.detalhe).toBe(
      `Compras · ${formatarMoeda(compra('Notebook').valorTotal)} em 10x`,
    );
    expect(nov.find((l) => l.texto === 'Compra no dia do fechamento')?.chip).toBe(
      'Comprada no dia do fechamento',
    );
    const estorno = nov.find((l) => l.chip === 'Estorno');
    const tenis = compra('Tênis');
    expect(estorno?.valor).toBe(negar(tenis.valorTotal));
    expect(estorno?.detalhe).toBe(
      `Vinculado à compra Tênis de ${formatarData(tenis.data).slice(0, 5)}`,
    );
  });

  it('transporte: "Saldo anterior não pago" no B e "Crédito de pagamento" no A (3.5)', () => {
    const b = linhas('Cartão B', '2026-11')[0];
    expect(b).toMatchObject({
      texto: 'Saldo anterior não pago',
      detalhe: `Da fatura de ${formatarMesCurto(somarMeses(competenciaDe(HOJE), -1))}`,
    });
    expect(linhas('Cartão A', '2026-10')[0]).toMatchObject({
      texto: 'Crédito de pagamento',
      // A de M−2 foi paga com R$ 50,00 a mais (seed, seção 10).
      valor: negar(deMascara('5000')),
    });
  });
});
