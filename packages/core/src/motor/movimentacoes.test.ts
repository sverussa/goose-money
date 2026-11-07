import { describe, expect, it } from 'vitest';

import {
  CARTAO,
  CONTA_A,
  CONTA_B,
  cenario,
  contexto,
  d,
  HOJE,
  MERCADO,
  r$,
  SALARIO,
  verificar,
} from '../comandos/cenario';
import { lancar } from '../comandos/lancamentos';
import { novaCompra, pagarFatura } from '../comandos/compras';
import { semVinculos } from '../comandos/mudancas';
import { periodo } from '../periodos';
import { derivar } from './derivar';
import { entradasESaidasDeCaixa, movimentacoes } from './movimentacoes';
import { receitasReconhecidas, despesasReconhecidas } from './reconhecimento';

const NOVEMBRO = periodo(d('2026-11-01'), d('2026-11-30'));

function fatos() {
  let f = cenario();
  const base = { ...semVinculos, status: 'efetivado' as const, data: d('2026-11-02') };
  f = verificar(
    f,
    lancar(f, contexto(), {
      ...base,
      tipo: 'receita',
      valor: r$(5000),
      contaId: CONTA_A,
      categoriaId: SALARIO,
    }),
  );
  f = verificar(
    f,
    lancar(f, contexto(), {
      ...base,
      tipo: 'despesa',
      valor: r$(200),
      descricao: 'Mercado do bairro',
      contaId: CONTA_A,
      categoriaId: MERCADO,
    }),
  );
  f = verificar(
    f,
    lancar(f, contexto(), {
      ...base,
      tipo: 'transferencia',
      valor: r$(1000),
      contaId: CONTA_A,
      contaDestinoId: CONTA_B,
    }),
  );
  f = verificar(
    f,
    lancar(f, contexto(), {
      ...base,
      tipo: 'despesa',
      status: 'previsto',
      data: d('2026-11-20'),
      valor: r$(300),
      contaId: CONTA_A,
      categoriaId: MERCADO,
    }),
  );
  f = verificar(
    f,
    novaCompra(f, contexto(), {
      cartaoId: CARTAO,
      data: d('2026-11-03'),
      descricao: 'Fone',
      categoriaId: MERCADO,
      observacao: null,
      valorTotal: r$(900),
      numeroParcelas: 3,
    }),
  );
  f = verificar(f, pagarFatura(f, contexto(), { cartaoId: CARTAO, valor: r$(100), data: HOJE }));
  return f;
}

describe('movimentacoes (T05-07)', () => {
  it('uma transferência aparece em Movimentações e não em Receitas e despesas', () => {
    const f = fatos();
    const tipos = movimentacoes(f, HOJE, NOVEMBRO).map((i) => i.tipo);
    expect(tipos).toEqual(['receita', 'despesa', 'transferencia', 'compra', 'pagamento_fatura']);
    const der = derivar(f, HOJE);
    const reconhecidos = [
      ...receitasReconhecidas(der, NOVEMBRO, {}),
      ...despesasReconhecidas(der, NOVEMBRO, {}),
    ];
    expect(
      reconhecidos.some((i) => i.registro.id === movimentacoes(f, HOJE, NOVEMBRO)[2]?.registro.id),
    ).toBe(false);
  });

  it('sinais, textos e origens', () => {
    const [receita, despesa, transf, compra, pagamento] = movimentacoes(fatos(), HOJE, NOVEMBRO);
    expect(receita).toMatchObject({ valor: r$(5000), texto: 'Salário', origem: 'manual' });
    expect(despesa).toMatchObject({ valor: r$(-200), texto: 'Mercado do bairro' });
    expect(transf).toMatchObject({ valor: r$(-1000), texto: 'Transferência · para Poupança' });
    expect(compra).toMatchObject({ valor: r$(-900), texto: 'Fone · 3x', origem: 'cartao' });
    expect(pagamento).toMatchObject({ texto: 'Pagamento de fatura · Cartão A', origem: 'cartao' });
  });

  it('previstos só com o filtro de estado; filtros de conta, cartão, tipo e busca', () => {
    const f = fatos();
    const com = movimentacoes(f, HOJE, NOVEMBRO, { estados: ['realizado', 'previsto'] });
    expect(com.filter((i) => i.estado === 'previsto')).toHaveLength(1);
    expect(movimentacoes(f, HOJE, NOVEMBRO, { contaId: CONTA_B }).map((i) => i.tipo)).toEqual([
      'transferencia',
    ]);
    expect(movimentacoes(f, HOJE, NOVEMBRO, { cartaoId: CARTAO })).toHaveLength(2);
    expect(movimentacoes(f, HOJE, NOVEMBRO, { tipos: ['compra'] })).toHaveLength(1);
    expect(movimentacoes(f, HOJE, NOVEMBRO, { busca: 'MERCADO' })).toHaveLength(1);
    expect(movimentacoes(f, HOJE, NOVEMBRO, { categorias: [MERCADO] })).toHaveLength(2);
  });

  it('entradas e saídas de caixa: sem transferências, compras e previstos', () => {
    const f = fatos();
    const itens = movimentacoes(f, HOJE, NOVEMBRO, { estados: ['realizado', 'previsto'] });
    expect(entradasESaidasDeCaixa(itens)).toEqual({ entradas: r$(5000), saidas: r$(-300) });
  });
});
