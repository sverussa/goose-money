import { describe, expect, it } from 'vitest';
import { dataCivil } from '../datas';
import { centavos, D, somar } from '../dinheiro';
import {
  amortizarExtraordinario,
  despesaDaParcela,
  type DividaCalculo,
  type ParcelaCalculo,
  resumoDaDivida,
  saldoDevedor,
  statusParcela,
} from './operacoes';
import { type LinhaTabela, tabelaPrice, tabelaSac } from './tabelas';

const c = centavos;
const d = dataCivil;

const price: DividaCalculo = {
  valorContratado: c(4_000_000),
  destinoDoValor: 'creditado_em_conta',
  sistemaAmortizacao: 'price',
  taxaMensal: '0.0149',
  valorParcelaInformada: null,
  numeroParcelas: 48,
};
const sac: DividaCalculo = { ...price, sistemaAmortizacao: 'sac' };

/** Parcelas gravadas com as `pagas` primeiras já pagas. */
const gravar = (linhas: LinhaTabela[], pagas: number): ParcelaCalculo[] =>
  linhas.map((l) => ({
    numero: l.numero,
    vencimento: l.vencimento,
    valor: l.valor,
    juros: l.juros,
    amortizacao: l.amortizacao,
    pagaAntesDoCadastro: false,
    paga: l.numero <= pagas,
  }));

const tabela = tabelaPrice(price.valorContratado, new D('0.0149'), 48, d('2026-12-10'));
const parcelas = gravar(tabela, 18);
const pagas = parcelas.slice(0, 18);
const hoje = d('2028-06-01'); // depois da 18ª (2028-05-10), antes da 19ª (2028-06-10)

/** D3: amortizações das parcelas + amortização extra = PV; parcela = juros + amortização. */
function conferir(novas: ParcelaCalculo[], valor: number, pv: number) {
  expect(somar([...pagas, ...novas].map((p) => p.amortizacao)) + valor).toBe(pv);
  novas.forEach((p) => {
    expect(p.valor).toBe(p.juros + p.amortizacao);
    expect(p.paga).toBe(false);
  });
}

describe('saldoDevedor', () => {
  it('é o SD após a última parcela paga', () => {
    expect(saldoDevedor(parcelas)).toBe(tabela[17]?.saldoDevedor);
  });

  it('é zero com tudo pago e PV sem nada pago', () => {
    expect(saldoDevedor(gravar(tabela, 48))).toBe(0);
    expect(saldoDevedor(gravar(tabela, 0))).toBe(4_000_000);
  });
});

describe('statusParcela', () => {
  const p = parcelas[18] as ParcelaCalculo; // vence 2028-06-10
  it.each([
    [{ ...p }, '2028-06-10', 'a_vencer'],
    [{ ...p }, '2028-06-11', 'vencida'],
    [{ ...p, paga: true }, '2028-06-11', 'paga'],
    [{ ...p, pagaAntesDoCadastro: true }, '2028-06-11', 'paga_antes_do_cadastro'],
  ] as const)('%#: %s', (parcela, dia, status) => {
    expect(statusParcela(parcela, d(dia))).toBe(status);
  });
});

describe('amortizarExtraordinario', () => {
  const valor = c(1_000_000);

  it('reduzir prazo diminui o número de parcelas, mantém a parcela e zera o saldo', () => {
    const novas = amortizarExtraordinario(price, parcelas, valor, hoje, 'reduzirPrazo');
    expect(novas.length).toBeLessThan(30);
    expect(novas[0]).toMatchObject({ numero: 19, vencimento: '2028-06-10' });
    novas.slice(0, -1).forEach((p) => {
      expect(p.valor).toBe(117_249);
    });
    expect(novas.at(-1)?.valor).toBeLessThanOrEqual(117_249);
    conferir(novas, valor, 4_000_000);
  });

  it('reduzir valor mantém o número de parcelas e reduz a parcela', () => {
    const novas = amortizarExtraordinario(price, parcelas, valor, hoje, 'reduzirValor');
    expect(novas.map((p) => [p.numero, p.vencimento])).toEqual(
      parcelas.slice(18).map((p) => [p.numero, p.vencimento]),
    );
    expect(novas[0]?.valor).toBeLessThan(117_249);
    conferir(novas, valor, 4_000_000);
  });

  it('SAC: reduzir prazo mantém a amortização; reduzir valor mantém o prazo', () => {
    const t = gravar(tabelaSac(sac.valorContratado, new D('0.0149'), 48, d('2026-12-10')), 18);
    const prazo = amortizarExtraordinario(sac, t, valor, hoje, 'reduzirPrazo');
    expect(prazo.length).toBeLessThan(30);
    prazo.slice(0, -1).forEach((p) => {
      expect(p.amortizacao).toBe(83_333);
    });
    const parcela = amortizarExtraordinario(sac, t, valor, hoje, 'reduzirValor');
    expect(parcela).toHaveLength(30);
    expect(parcela[0]?.amortizacao).toBeLessThan(83_333);
    for (const novas of [prazo, parcela])
      expect(somar([...t.slice(0, 18), ...novas].map((p) => p.amortizacao)) + valor).toBe(
        4_000_000,
      );
  });

  it('parcela informada usa a taxa implícita', () => {
    const informada: DividaCalculo = {
      ...price,
      sistemaAmortizacao: 'parcela_informada',
      taxaMensal: null,
      valorParcelaInformada: c(117_249),
    };
    const novas = amortizarExtraordinario(informada, parcelas, valor, hoje, 'reduzirValor');
    expect(novas).toHaveLength(30);
    conferir(novas, valor, 4_000_000);
  });

  it('parcelas pagas não mudam e vencidas não pagas até a data ficam como estão (D3)', () => {
    const depois = d('2028-07-15'); // a 19ª (2028-06-10) e a 20ª (2028-07-10) estão vencidas
    const novas = amortizarExtraordinario(price, parcelas, valor, depois, 'reduzirValor');
    expect(novas.slice(0, 2)).toEqual(parcelas.slice(18, 20));
    expect(novas[2]?.numero).toBe(21);
    expect(novas).toHaveLength(30);
    conferir(novas, valor, 4_000_000);
  });

  it('amortizar todo o saldo a vencer quita as parcelas futuras', () => {
    const sd = saldoDevedor(parcelas);
    expect(amortizarExtraordinario(price, parcelas, sd, hoje, 'reduzirPrazo')).toEqual([]);
  });

  it.each([0, -1, 4_000_000])('rejeita valor %j', (v) => {
    expect(() => amortizarExtraordinario(price, parcelas, c(v), hoje, 'reduzirPrazo')).toThrow(
      RangeError,
    );
  });

  it('rejeita taxa ausente', () => {
    expect(() =>
      amortizarExtraordinario(
        { ...price, taxaMensal: null },
        parcelas,
        valor,
        hoje,
        'reduzirValor',
      ),
    ).toThrow(RangeError);
  });
});

describe('despesaDaParcela (3.3, 11.4)', () => {
  const p = parcelas[0] as ParcelaCalculo;

  it('empréstimo creditado em conta: só os juros', () => {
    expect(despesaDaParcela(price, p)).toBe(p.juros);
  });

  it('financiamento pago a terceiro: a parcela inteira', () => {
    expect(despesaDaParcela({ destinoDoValor: 'pago_a_terceiro' }, p)).toBe(p.valor);
  });

  it('paga antes do cadastro: nada', () => {
    expect(despesaDaParcela(price, { ...p, pagaAntesDoCadastro: true })).toBe(0);
  });
});

describe('resumoDaDivida', () => {
  it('soma pagos, juros e progresso (6.6)', () => {
    const r = resumoDaDivida(price, parcelas);
    expect(r).toMatchObject({
      valorContratado: 4_000_000,
      taxaImplicita: false,
      sistema: 'price',
      destino: 'creditado_em_conta',
      totalPago: 18 * 117_249,
      jurosPagos: somar(pagas.map((p) => p.juros)),
      jurosAPagar: somar(parcelas.slice(18).map((p) => p.juros)),
      pagas: 18,
      total: 48,
      saldoDevedor: tabela[17]?.saldoDevedor,
      proximaParcela: parcelas[18],
      quitacaoPrevista: '2030-11-10',
    });
    expect(r.taxa.toString()).toBe('0.0149');
  });

  it('inclui amortizações extraordinárias no total pago e mostra a taxa implícita', () => {
    const informada: DividaCalculo = {
      ...price,
      valorContratado: c(480_000),
      sistemaAmortizacao: 'parcela_informada',
      taxaMensal: null,
      valorParcelaInformada: c(45_000),
      numeroParcelas: 12,
    };
    const r = resumoDaDivida(informada, gravar(tabela, 0), [c(100), c(200)]);
    expect(r.taxaImplicita).toBe(true);
    expect(r.taxa.toDecimalPlaces(4).toString()).toBe('0.0186');
    expect(r.totalPago).toBe(300);
  });

  it('dívida quitada não tem próxima parcela', () => {
    const r = resumoDaDivida(price, gravar(tabela, 48));
    expect(r.proximaParcela).toBeNull();
    expect(r.quitacaoPrevista).toBeNull();
    expect(r.saldoDevedor).toBe(0);
  });
});
