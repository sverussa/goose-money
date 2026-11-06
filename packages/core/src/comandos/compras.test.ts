import { describe, expect, it } from 'vitest';
import { montarFaturas } from '../cartoes';
import { saldo } from '../contas';
import type { Fatos } from '../modelo';
import { arquivarCartao } from './cadastros';
import {
  CARTAO,
  cenario,
  CONTA_A,
  contexto,
  d,
  HOJE,
  JUROS,
  MERCADO,
  r$,
  recusa,
  SALARIO,
  verificar,
} from './cenario';
import {
  anteciparParcelasDaCompra,
  cancelarCompraDoCartao,
  editarCompra,
  excluirCompra,
  lancarAjusteDeCompra,
  lancarEncargoOuEstorno,
  type NovaCompra,
  novaCompra,
  pagarFatura,
} from './compras';

const compra = (campos: Partial<NovaCompra> = {}): NovaCompra => ({
  cartaoId: CARTAO,
  data: HOJE,
  descricao: 'Fone',
  categoriaId: MERCADO,
  observacao: null,
  valorTotal: r$(1000),
  numeroParcelas: 3,
  ...campos,
});

/** Os fatos com a compra e o id dela. */
function comCompra(campos: Partial<NovaCompra> = {}, f: Fatos = cenario()): [Fatos, string] {
  const cmd = novaCompra(f, contexto(), compra(campos));
  return [verificar(f, cmd), cmd.mudancas[0]?.id as string];
}

const parcelas = (f: Fatos, compraId: string) =>
  f.parcelas
    .filter((p) => p.compraId === compraId)
    .sort((a, b) => a.numero - b.numero)
    .map((p) => [p.numero, p.valor, p.competencia]);

describe('novaCompra', () => {
  it('em 10x gera 1 compra + 10 parcelas num único comando', () => {
    const f = cenario();
    const cmd = novaCompra(f, contexto(), compra({ valorTotal: r$(4200), numeroParcelas: 10 }));
    expect(cmd.descricao).toBe('Compra lançada');
    expect(cmd.mudancas.map((m) => m.entidade)).toEqual([
      'compras',
      ...Array<string>(10).fill('parcelas'),
    ]);
    expect(cmd.mudancas.every((m) => m.acao === 'inserir')).toBe(true);
    verificar(f, cmd);
  });

  it('R$ 1.000,00 em 3x: 333,34 + 333,33 + 333,33 em faturas consecutivas (11.3)', () => {
    const [f, id] = comCompra();
    expect(parcelas(f, id)).toEqual([
      [1, r$(333.34), '2026-12'],
      [2, r$(333.33), '2027-01'],
      [3, r$(333.33), '2027-02'],
    ]);
  });

  it('recusa categoria de receita, cartão arquivado e valor zero', () => {
    const f = cenario();
    recusa(() => novaCompra(f, contexto(), compra({ categoriaId: SALARIO })), /não é de despesa/);
    recusa(() => novaCompra(f, contexto(), compra({ valorTotal: r$(0) })), 'Precisa ser > 0');
    const arquivado = verificar(f, arquivarCartao(f, contexto(), CARTAO));
    recusa(() => novaCompra(arquivado, contexto(), compra()), 'está arquivado');
  });
});

describe('editarCompra', () => {
  it('descrição e categoria alteram só a compra', () => {
    const [f, id] = comCompra();
    const cmd = editarCompra(f, contexto(), id, { descricao: 'Fone novo' });
    expect(cmd.mudancas).toEqual([
      { entidade: 'compras', acao: 'alterar', id, dados: { descricao: 'Fone novo' } },
    ]);
    verificar(f, cmd);
  });

  it('valor ou parcelas regeneram todas as parcelas', () => {
    const [f, id] = comCompra();
    const depois = verificar(
      f,
      editarCompra(f, contexto(), id, { valorTotal: r$(1200), numeroParcelas: 2 }),
    );
    expect(parcelas(depois, id)).toEqual([
      [1, r$(600), '2026-12'],
      [2, r$(600), '2027-01'],
    ]);
  });

  it('com parcela em fatura fechada, "Editar valor" é recusado com o motivo (11.3)', () => {
    const [f, id] = comCompra({ data: d('2026-10-01') });
    recusa(() => editarCompra(f, contexto(), id, { valorTotal: r$(1) }), /Use "Lançar ajuste"/);
    verificar(f, editarCompra(f, contexto(), id, { observacao: 'ok' }));
    recusa(() => editarCompra(f, contexto(), 'x', {}), 'Compra não encontrada');
  });
});

describe('ajuste, antecipação, cancelamento e exclusão (3.6)', () => {
  it('ajuste: item vinculado à compra na fatura aberta, só com parcela em fatura fechada', () => {
    const [f, id] = comCompra({ data: d('2026-10-01') });
    const cmd = lancarAjusteDeCompra(f, contexto(), id, r$(-10));
    expect(cmd.mudancas[0]?.dados).toMatchObject({
      tipo: 'ajuste_compra',
      competencia: '2026-12',
      compraId: id,
      valor: r$(-10),
    });
    verificar(f, cmd);
    const [g, outra] = comCompra();
    recusa(() => lancarAjusteDeCompra(g, contexto(), outra, r$(10)), /Edite o valor da compra/);
  });

  it('antecipar move as últimas para a aberta, renumera e remove e reinsere as parcelas (D78)', () => {
    const [f, id] = comCompra();
    const cmd = anteciparParcelasDaCompra(f, contexto(), id, 1, r$(50));
    expect(cmd.mudancas.filter((m) => m.acao === 'alterar')).toHaveLength(3);
    expect(
      cmd.mudancas.filter((m) => m.entidade === 'parcelas' && m.acao === 'inserir'),
    ).toHaveLength(3);
    const depois = verificar(f, cmd);
    expect(parcelas(depois, id)).toEqual([
      [1, r$(333.34), '2026-12'],
      [2, r$(333.33), '2026-12'],
      [3, r$(333.33), '2027-01'],
    ]);
    expect(depois.itensFatura[0]).toMatchObject({ tipo: 'estorno', valor: r$(-50), compraId: id });
    expect(verificar(f, anteciparParcelasDaCompra(f, contexto(), id, 2)).itensFatura).toEqual([]);
    recusa(() => anteciparParcelasDaCompra(f, contexto(), id, 3), /Antecipar de 1 a 2/);
    const [g, avista] = comCompra({ numeroParcelas: 1 });
    recusa(
      () => anteciparParcelasDaCompra(g, contexto(), avista, 1),
      'Nenhuma parcela em fatura futura.',
    );
  });

  it('cancelar exclui as parcelas não faturadas e estorna as faturadas se o banco estornou', () => {
    const [f, id] = comCompra({ data: d('2026-10-01') });
    const cmd = cancelarCompraDoCartao(f, contexto(), id, true);
    expect(cmd.descricao).toBe('Compra cancelada');
    const depois = verificar(f, cmd);
    expect(parcelas(depois, id)).toEqual([
      [1, r$(333.34), '2026-10'],
      [2, r$(333.33), '2026-11'],
    ]);
    expect(depois.itensFatura[0]).toMatchObject({ tipo: 'estorno', valor: r$(-666.67) });
    expect(verificar(f, cancelarCompraDoCartao(f, contexto(), id, false)).itensFatura).toEqual([]);
    recusa(() => cancelarCompraDoCartao(depois, contexto(), id, false), 'Compra cancelada.');
  });

  it('excluir compra parcelada exclui a compra e todas as parcelas no mesmo comando (11.8)', () => {
    const [f, id] = comCompra({ numeroParcelas: 10 });
    const cmd = excluirCompra(f, contexto(), id);
    expect(cmd.mudancas).toHaveLength(11);
    expect(cmd.mudancas.every((m) => m.acao === 'alterar' && m.dados.isDeleted === true)).toBe(
      true,
    );
    const depois = verificar(f, cmd);
    expect([depois.compras, depois.parcelas]).toEqual([[], []]);
    const [g, fechada] = comCompra({ data: d('2026-10-01') });
    recusa(() => excluirCompra(g, contexto(), fechada), /Use "Cancelar compra"/);
  });

  it('excluir leva os itens da compra', () => {
    const [f, id] = comCompra();
    const comEstorno = verificar(f, anteciparParcelasDaCompra(f, contexto(), id, 1, r$(10)));
    expect(verificar(comEstorno, excluirCompra(comEstorno, contexto(), id)).itensFatura).toEqual(
      [],
    );
  });
});

describe('faturas', () => {
  it('pagar fatura: destino e conta padrão (3.5); só sai do saldo da conta', () => {
    const [f] = comCompra({ data: d('2026-10-01') });
    const cmd = pagarFatura(f, contexto(), { cartaoId: CARTAO, valor: r$(666.67), data: HOJE });
    expect(cmd.mudancas[0]?.dados).toMatchObject({
      tipo: 'pagamento_fatura',
      contaId: CONTA_A,
      cartaoId: CARTAO,
      faturaCompetencia: '2026-11', // a de outubro foi transportada
    });
    const depois = verificar(f, cmd);
    expect(saldo(depois, CONTA_A, HOJE)).toBe(r$(333.33));
    expect(montarFaturas(depois, CARTAO, HOJE)[1]?.status).toBe('paga');
    recusa(
      () => pagarFatura(f, contexto(), { cartaoId: CARTAO, valor: r$(1), data: d('2026-11-05') }),
      /data futura/,
    );
  });

  it('encargo e estorno caem na fatura da data', () => {
    const [f, id] = comCompra();
    const base = { cartaoId: CARTAO, data: HOJE, descricao: 'Juros', compraId: null };
    const encargo = lancarEncargoOuEstorno(f, contexto(), {
      ...base,
      tipo: 'encargo',
      valor: r$(38.7),
      categoriaId: JUROS,
    });
    expect(encargo.descricao).toBe('Encargo lançado');
    expect(encargo.mudancas[0]?.dados).toMatchObject({ competencia: '2026-12', valor: r$(38.7) });
    verificar(f, encargo);
    const estorno = lancarEncargoOuEstorno(f, contexto(), {
      ...base,
      tipo: 'estorno',
      valor: r$(89.9),
      compraId: id,
      categoriaId: null,
    });
    expect(estorno.mudancas[0]?.dados).toMatchObject({ tipo: 'estorno', valor: r$(-89.9) });
    verificar(f, estorno);
    recusa(
      () =>
        lancarEncargoOuEstorno(f, contexto(), {
          ...base,
          tipo: 'encargo',
          valor: r$(0),
          categoriaId: JUROS,
        }),
      /maior que zero/,
    );
    const outro = { ...f, compras: f.compras.map((x) => ({ ...x, cartaoId: CONTA_A })) };
    recusa(
      () =>
        lancarEncargoOuEstorno(outro, contexto(), {
          ...base,
          tipo: 'estorno',
          valor: r$(1),
          compraId: id,
          categoriaId: null,
        }),
      'A compra é de outro cartão',
    );
  });
});
