import { describe, expect, it } from 'vitest';
import { novaCompra } from '../comandos';
import { CARTAO, cenario, contexto, HOJE, MERCADO, r$ } from '../comandos/cenario';
import { aplicar } from '../comandos/mudancas';
import { dataCivil } from '../datas';
import { mais, menos } from '../dinheiro';
import { gerarSeed } from '../seed';
import { derivar } from './derivar';
import {
  obrigacoesDeCartao,
  patrimonioLiquido,
  saldoDevedorDeDividas,
  saldoEmTodasAsContas,
} from './indicadores';
import { causaDoPatrimonioNegativo } from './patrimonio';

describe('causaDoPatrimonioNegativo (D47)', () => {
  it('patrimônio zero ou positivo não tem causa', () => {
    expect(patrimonioLiquido(derivar(cenario(), HOJE))).toBeGreaterThanOrEqual(0);
    expect(causaDoPatrimonioNegativo(derivar(cenario(), HOJE))).toBeNull();
  });

  it('no seed, o saldo devedor das dívidas pesa mais; a decomposição fecha com o patrimônio', () => {
    const hoje = dataCivil('2026-11-04');
    const d = derivar(gerarSeed(hoje, '00000000-0000-4000-8000-000000000001'), hoje);
    const c = causaDoPatrimonioNegativo(d);
    expect(c).toEqual({
      patrimonio: patrimonioLiquido(d),
      saldoEmTodasAsContas: saldoEmTodasAsContas(d),
      obrigacoesDeCartao: obrigacoesDeCartao(d),
      saldoDevedorDeDividas: saldoDevedorDeDividas(d),
      compromissos: mais(obrigacoesDeCartao(d), saldoDevedorDeDividas(d)),
      maior: 'saldoDevedorDeDividas',
      valorDoMaior: saldoDevedorDeDividas(d),
    });
    expect(c && menos(c.saldoEmTodasAsContas, c.compromissos)).toBe(c?.patrimonio);
    expect(c && c.compromissos > c.saldoEmTodasAsContas).toBe(true);
  });

  it('sem dívidas, uma compra parcelada maior que as contas aponta as obrigações de cartão', () => {
    const f = cenario();
    const compra = novaCompra(f, contexto(), {
      cartaoId: CARTAO,
      data: HOJE,
      descricao: 'Notebook',
      categoriaId: MERCADO,
      observacao: null,
      valorTotal: r$(3000),
      numeroParcelas: 10,
    });
    const c = causaDoPatrimonioNegativo(derivar(aplicar(f, compra.mudancas), HOJE));
    expect(c).toMatchObject({
      maior: 'obrigacoesDeCartao',
      valorDoMaior: r$(3000),
      obrigacoesDeCartao: r$(3000),
      saldoDevedorDeDividas: r$(0),
      patrimonio: r$(1000 - 3000),
    });
  });
});
