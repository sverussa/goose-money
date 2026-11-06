import { describe, expect, it } from 'vitest';
import { competencia, dataCivil } from '../datas';
import { type Centavos, centavos } from '../dinheiro';
import {
  fatosVazios,
  type Cartao,
  type Compra,
  type Fatos,
  type ItemFatura,
  type Lancamento,
  type Parcela,
} from '../modelo';
import { gerarParcelas } from './compras';
import {
  destinoPadraoDoPagamento,
  type Fatura,
  itensPrevistosNaFatura,
  montarFaturas,
  previaDoPagamento,
} from './faturas';

const c = competencia;
const d = dataCivil;
const r$ = (reais: number) => centavos(reais * 100);
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const controle = {
  createdAt: '2026-11-04T12:00:00-03:00',
  updatedAt: '2026-11-04T12:00:00-03:00',
  createdBy: id(99),
  isDeleted: false,
};
const CONTA = id(50);
const CATEGORIA = id(70);
let seq = 100;

/** Cartão A (fecha 3, vence 10), controlado desde `inicial`. */
function cenario(inicial = '2026-10'): Fatos & { cartao: Cartao } {
  const cartao: Cartao = {
    ...controle,
    id: id(1),
    nome: 'Cartão A',
    instituicao: null,
    cor: 'cartao-a',
    limite: r$(10_000),
    contaPagamentoId: CONTA,
    competenciaInicial: c(inicial),
    arquivado: false,
  };
  const f = fatosVazios();
  f.cartoes.push(cartao);
  f.cartaoCiclos.push({
    ...controle,
    id: id(2),
    cartaoId: cartao.id,
    vigenteDesde: c('2026-01'),
    diaFechamento: 3,
    diaVencimento: 10,
  });
  return { ...f, cartao };
}

function comprar(f: Fatos & { cartao: Cartao }, data: string, total: Centavos, n = 1): Compra {
  const compra: Compra = {
    ...controle,
    id: id(seq++),
    cartaoId: f.cartao.id,
    data: d(data),
    descricao: 'Compra',
    categoriaId: CATEGORIA,
    observacao: null,
    valorTotal: total,
    numeroParcelas: n,
    cancelada: false,
  };
  f.compras.push(compra);
  for (const p of gerarParcelas(compra, f.cartao, f.cartaoCiclos))
    f.parcelas.push({ ...controle, id: id(seq++), compraId: compra.id, ...p } satisfies Parcela);
  return compra;
}

function pagar(
  f: Fatos & { cartao: Cartao },
  fatura: string,
  valor: Centavos,
  data = '2026-11-04',
) {
  f.lancamentos.push({
    ...controle,
    id: id(seq++),
    tipo: 'pagamento_fatura',
    status: 'efetivado',
    data: d(data),
    valor,
    descricao: null,
    observacao: null,
    contaId: CONTA,
    contaDestinoId: null,
    categoriaId: null,
    cartaoId: f.cartao.id,
    faturaCompetencia: c(fatura),
    dividaId: null,
    parcelaDividaId: null,
  } satisfies Lancamento);
}

function item(
  f: Fatos & { cartao: Cartao },
  tipo: ItemFatura['tipo'],
  fatura: string,
  valor: Centavos,
  compraId: string | null = null,
) {
  f.itensFatura.push({
    ...controle,
    id: id(seq++),
    cartaoId: f.cartao.id,
    competencia: c(fatura),
    tipo,
    data: d(`${fatura}-01`),
    valor,
    descricao: null,
    compraId,
    categoriaId: tipo === 'encargo' || (tipo === 'estorno' && compraId === null) ? CATEGORIA : null,
  });
}

const faturas = (f: Fatos & { cartao: Cartao }, hoje: string) =>
  montarFaturas(f, f.cartao.id, d(hoje));
const de = (fs: readonly Fatura[], m: string) => fs.find((x) => x.competencia === m) as Fatura;
const resumo = (x: Fatura) => ({ saldo: x.saldo, status: x.status, parcial: x.pagaParcialmente });

describe('montarFaturas', () => {
  it('lista de competenciaInicial até a última com movimento, com datas, em ordem', () => {
    const f = cenario();
    comprar(f, '2026-10-15', r$(300), 3); // nov, dez, jan
    const fs = faturas(f, '2026-11-05');
    expect(fs.map((x) => x.competencia)).toEqual(['2026-10', '2026-11', '2026-12', '2027-01']);
    expect(de(fs, '2026-11')).toMatchObject({ fechamento: '2026-11-03', vencimento: '2026-11-10' });
    expect(fs.map((x) => x.status)).toEqual(['paga', 'fechada', 'aberta', 'futura']);
    expect(de(fs, '2027-01').saldo).toBe(r$(100));
  });

  it('sem movimento, vai até a aberta', () => {
    const fs = faturas(cenario('2026-11'), '2026-11-05');
    expect(fs.map((x) => [x.competencia, x.status])).toEqual([
      ['2026-11', 'paga'],
      ['2026-12', 'aberta'],
    ]);
  });

  it('saldo = parcelas + encargos − estornos + ajustes − pagamentos', () => {
    const f = cenario();
    const compra = comprar(f, '2026-10-15', r$(1000));
    item(f, 'encargo', '2026-11', r$(50));
    item(f, 'estorno', '2026-11', r$(-100), compra.id);
    item(f, 'ajuste_compra', '2026-11', r$(-30), compra.id);
    pagar(f, '2026-11', r$(20));
    const nov = de(faturas(f, '2026-11-05'), '2026-11');
    expect(nov.saldo).toBe(r$(900));
    expect(nov.totalPago).toBe(r$(20));
    expect(nov.pagamentos).toHaveLength(1);
    expect(nov.itens.map((i) => [i.tipo, i.valor])).toEqual([
      ['parcela', r$(1000)],
      ['encargo', r$(50)],
      ['estorno', r$(-100)],
      ['ajuste_compra', r$(-30)],
    ]);
  });

  describe('pagamento parcial (11.3): R$ 1.000,00 com R$ 600,00', () => {
    const f = cenario();
    comprar(f, '2026-10-15', r$(1000)); // fatura nov: fecha 03/11, vence 10/11
    pagar(f, '2026-11', r$(600));

    it('fechada: saldo R$ 400,00 e "Paga parcialmente"', () => {
      expect(resumo(de(faturas(f, '2026-11-05'), '2026-11'))).toEqual({
        saldo: r$(400),
        status: 'fechada',
        parcial: true,
      });
    });

    it('vence hoje ainda é fechada; depois, vencida', () => {
      expect(de(faturas(f, '2026-11-10'), '2026-11').status).toBe('fechada');
      expect(resumo(de(faturas(f, '2026-11-11'), '2026-11'))).toEqual({
        saldo: r$(400),
        status: 'vencida',
        parcial: true,
      });
    });

    it('no fechamento seguinte vira "Saldo anterior não pago" e a antiga fica "Transportada" com zero', () => {
      expect(de(faturas(f, '2026-12-02'), '2026-11').status).toBe('vencida');
      const fs = faturas(f, '2026-12-03');
      expect(resumo(de(fs, '2026-11'))).toEqual({
        saldo: 0,
        status: 'transportada',
        parcial: false,
      });
      const dez = de(fs, '2026-12');
      expect(dez.itens).toEqual([
        { tipo: 'saldo_anterior_nao_pago', valor: r$(400), de: '2026-11' },
      ]);
      expect(resumo(dez)).toEqual({ saldo: r$(400), status: 'fechada', parcial: false });
    });
  });

  it('pagamento excedente (11.3): R$ 500,00 com R$ 550,00 → "Paga" e crédito de −R$ 50,00', () => {
    const f = cenario();
    comprar(f, '2026-10-15', r$(500));
    pagar(f, '2026-11', r$(550));
    comprar(f, '2026-11-20', r$(200));
    const fs = faturas(f, '2026-11-05');
    expect(resumo(de(fs, '2026-11'))).toEqual({ saldo: 0, status: 'paga', parcial: false });
    const dez = de(fs, '2026-12');
    expect(dez.itens[0]).toEqual({ tipo: 'credito_pagamento', valor: r$(-50), de: '2026-11' });
    expect(dez.saldo).toBe(r$(150));
  });

  it('pagamento antecipado excedente fica na aberta até ela fechar', () => {
    const f = cenario();
    comprar(f, '2026-11-10', r$(100)); // dez
    pagar(f, '2026-12', r$(300));
    let fs = faturas(f, '2026-11-20');
    expect(resumo(de(fs, '2026-12'))).toEqual({
      saldo: r$(-200),
      status: 'aberta',
      parcial: false,
    });
    expect(fs.some((x) => x.competencia === '2027-01')).toBe(false);
    fs = faturas(f, '2026-12-03');
    expect(resumo(de(fs, '2026-12'))).toEqual({ saldo: 0, status: 'paga', parcial: false });
    expect(de(fs, '2027-01')).toMatchObject({ saldo: r$(-200), status: 'aberta' });
  });

  it('aberta com pagamento e saldo também tem "Paga parcialmente"', () => {
    const f = cenario();
    comprar(f, '2026-11-10', r$(100));
    pagar(f, '2026-12', r$(40));
    expect(resumo(de(faturas(f, '2026-11-20'), '2026-12'))).toEqual({
      saldo: r$(60),
      status: 'aberta',
      parcial: true,
    });
  });

  it('cartão em uso (11.3): "Saldo anterior ao cadastro" entra no saldo; parcelas anteriores ficam fora', () => {
    const f = cenario('2026-12'); // cadastrado em 04/11: aberta = dez
    item(f, 'saldo_anterior_cadastro', '2026-11', r$(900));
    comprar(f, '2026-06-15', r$(1200), 12); // jul/2026 a jun/2027
    const fs = faturas(f, '2026-11-04');
    expect(fs[0]?.competencia).toBe('2026-11');
    expect(resumo(de(fs, '2026-11'))).toEqual({
      saldo: r$(900),
      status: 'fechada',
      parcial: false,
    });
    expect(de(fs, '2026-11').itens.map((i) => i.tipo)).toEqual(['saldo_anterior_cadastro']);
    expect(de(fs, '2026-12')).toMatchObject({ saldo: r$(100), status: 'aberta' });
    expect(fs.at(-1)?.competencia).toBe('2027-06');
    expect(fs.filter((x) => x.status === 'futura')).toHaveLength(6);
  });

  it('cartão inexistente', () => {
    expect(() => montarFaturas(fatosVazios(), id(1), d('2026-11-04'))).toThrow(RangeError);
  });
});

describe('destinoPadraoDoPagamento (3.5)', () => {
  it('a vencida mais antiga com saldo', () => {
    const f = cenario();
    comprar(f, '2026-09-15', r$(100)); // out (vencida)
    comprar(f, '2026-10-15', r$(200)); // nov
    expect(destinoPadraoDoPagamento(faturas(f, '2026-11-02'))).toBe('2026-10');
  });

  it('a fechada com saldo antes da aberta', () => {
    const f = cenario();
    comprar(f, '2026-10-15', r$(200));
    comprar(f, '2026-11-15', r$(50));
    expect(destinoPadraoDoPagamento(faturas(f, '2026-11-05'))).toBe('2026-11');
  });

  it('sem fatura vencida ou fechada com saldo: a aberta', () => {
    const f = cenario();
    comprar(f, '2026-10-15', r$(200));
    pagar(f, '2026-11', r$(200));
    expect(destinoPadraoDoPagamento(faturas(f, '2026-11-05'))).toBe('2026-12');
  });

  it('sem aberta', () => {
    expect(() => destinoPadraoDoPagamento([])).toThrow(RangeError);
  });
});

describe('previaDoPagamento (6.5)', () => {
  const f = cenario();
  comprar(f, '2026-10-15', r$(1000));
  pagar(f, '2026-11', r$(600));
  const fs = faturas(f, '2026-11-05');

  it('saldo restante', () => {
    expect(previaDoPagamento(fs, c('2026-11'), r$(100))).toEqual({
      saldoRestante: r$(300),
      credito: 0,
    });
  });

  it('crédito para a próxima fatura', () => {
    expect(previaDoPagamento(fs, c('2026-11'), r$(450))).toEqual({
      saldoRestante: 0,
      credito: r$(50),
    });
  });

  it('fatura de destino inexistente', () => {
    expect(() => previaDoPagamento(fs, c('2030-01'), r$(1))).toThrow(RangeError);
  });
});

describe('itensPrevistosNaFatura (D46)', () => {
  function comGasto(dia: number) {
    const f = cenario();
    const r = {
      ...controle,
      id: id(seq++),
      natureza: 'gasto' as const,
      descricao: 'Streaming',
      competenciaInicio: c('2026-11'),
      competenciaFim: null,
      autoConfirmar: false,
      ativa: true,
    };
    f.recorrencias.push(r);
    f.recorrenciaVersoes.push({
      ...controle,
      id: id(seq++),
      recorrenciaId: r.id,
      vigenteDesde: c('2026-11'),
      valor: r$(40),
      dia,
      formaPagamento: 'cartao',
      contaId: null,
      cartaoId: f.cartao.id,
      categoriaId: CATEGORIA,
    });
    return { f, r };
  }

  it('gasto fixo previsto no cartão aparece na fatura certa e não entra no saldo', () => {
    const { f } = comGasto(20); // 20/11 → fatura de dez (fecha 03/12)
    comprar(f, '2026-11-10', r$(100));
    const hoje = d('2026-11-05');
    const dez = itensPrevistosNaFatura(f, f.cartao.id, c('2026-12'), hoje);
    expect(dez.map((o) => [o.competencia, o.data, o.valor])).toEqual([
      ['2026-11', '2026-11-20', r$(40)],
    ]);
    expect(itensPrevistosNaFatura(f, f.cartao.id, c('2026-11'), hoje)).toEqual([]);
    expect(de(montarFaturas(f, f.cartao.id, hoje), '2026-12').saldo).toBe(r$(100));
  });

  it('gasto no dia do fechamento cai na fatura seguinte', () => {
    const { f } = comGasto(3); // 03/12 → fatura de jan
    const jan = itensPrevistosNaFatura(f, f.cartao.id, c('2027-01'), d('2026-11-05'));
    expect(jan.map((o) => o.data)).toEqual(['2026-12-03']);
  });

  it('ocorrência gravada sai da lista (a compra confirmada já está na fatura)', () => {
    const { f, r } = comGasto(20);
    f.ocorrencias.push({
      ...controle,
      id: id(seq++),
      recorrenciaId: r.id,
      competencia: c('2026-11'),
      situacao: 'ignorada',
      valor: null,
      data: null,
      contaId: null,
      cartaoId: null,
      categoriaId: null,
      lancamentoId: null,
      compraId: null,
    });
    expect(itensPrevistosNaFatura(f, f.cartao.id, c('2026-12'), d('2026-11-05'))).toEqual([]);
  });

  it('cartão inexistente', () => {
    expect(() =>
      itensPrevistosNaFatura(fatosVazios(), id(1), c('2026-12'), d('2026-11-05')),
    ).toThrow(RangeError);
  });
});
