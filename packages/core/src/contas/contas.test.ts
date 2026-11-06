import { describe, expect, it } from 'vitest';
import { competencia, dataCivil } from '../datas';
import { centavos } from '../dinheiro';
import {
  fatosVazios,
  type Conta,
  type Fatos,
  type Lancamento,
  type TipoLancamento,
} from '../modelo';
import {
  anteriorAoSaldoInicial,
  diferencaDeAjuste,
  extratoMensal,
  impactoDoNovoSaldoInicial,
  movimentosDeCaixa,
  saldo,
} from './index';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const controle = (n: number) => ({
  id: id(n),
  createdAt: '2026-11-05T12:00:00Z',
  updatedAt: '2026-11-05T12:00:00Z',
  createdBy: id(99),
  isDeleted: false,
});
const A = id(1);
const B = id(2);
const d = dataCivil;
const c = centavos;

const conta = (n: number, saldoInicial: number, dataSaldoInicial: string): Conta => ({
  ...controle(n),
  nome: `Conta ${String(n)}`,
  instituicao: null,
  tipo: 'corrente',
  saldoInicial: c(saldoInicial),
  dataSaldoInicial: d(dataSaldoInicial),
  cor: 'azul',
  incluirNoTotal: true,
  arquivada: false,
});

let proximo = 100;
const lanc = (
  tipo: TipoLancamento,
  data: string,
  valor: number,
  extra: Partial<Lancamento> = {},
): Lancamento => ({
  ...controle(proximo++),
  tipo,
  status: 'efetivado',
  data: d(data),
  valor: c(valor),
  descricao: null,
  observacao: null,
  contaId: A,
  contaDestinoId: null,
  categoriaId: null,
  cartaoId: null,
  faturaCompetencia: null,
  dividaId: null,
  parcelaDividaId: null,
  ...extra,
});

const fatos = (contas: Conta[], lancamentos: Lancamento[]): Fatos => ({
  ...fatosVazios(),
  contas,
  lancamentos,
});

describe('PROMPT 11.2: saldo inicial R$ 1.000,00 em 31/07', () => {
  const contaA = conta(1, 100000, '2026-07-31');
  const f = fatos(
    [contaA],
    [lanc('despesa', '2026-07-31', 20000), lanc('despesa', '2026-08-01', 20000)],
  );
  const marcas = () => movimentosDeCaixa(f, A).map((m) => anteriorAoSaldoInicial(m, contaA));

  it('despesa em 31/07 não altera o saldo e fica marcada', () => {
    expect(saldo(f, A, d('2026-07-31'))).toBe(100000);
    expect(marcas()[0]).toBe(true);
  });

  it('despesa em 01/08 deixa R$ 800,00', () => {
    expect(saldo(f, A, d('2026-08-01'))).toBe(80000);
    expect(marcas()[1]).toBe(false);
  });

  it('saldo em 30/07 é indisponível', () => {
    expect(saldo(f, A, d('2026-07-30'))).toBeNull();
  });
});

describe('movimentosDeCaixa', () => {
  it('aplica o sinal de cada tipo (3.3) e ordena por data', () => {
    const f = fatos(
      [conta(1, 0, '2026-01-01')],
      [
        lanc('amortizacao', '2026-02-08', 8),
        lanc('receita', '2026-02-01', 1),
        lanc('despesa', '2026-02-02', 2),
        lanc('transferencia', '2026-02-03', 3, { contaDestinoId: B }),
        lanc('ajuste', '2026-02-04', -4),
        lanc('pagamento_fatura', '2026-02-05', 5),
        lanc('captacao', '2026-02-06', 6),
        lanc('pagamento_divida', '2026-02-07', 7),
      ],
    );
    expect(movimentosDeCaixa(f, A).map((m) => [m.lancamento.tipo, m.valor])).toEqual([
      ['receita', 1],
      ['despesa', -2],
      ['transferencia', -3],
      ['ajuste', -4],
      ['pagamento_fatura', -5],
      ['captacao', 6],
      ['pagamento_divida', -7],
      ['amortizacao', -8],
    ]);
  });

  it('desempata a mesma data por criação e depois por id', () => {
    const tarde = { createdAt: '2026-11-05T13:00:00Z' };
    const x = lanc('receita', '2026-02-01', 1, tarde);
    const y = lanc('receita', '2026-02-01', 2);
    const z = lanc('receita', '2026-02-01', 3, tarde);
    const f = fatos([conta(1, 0, '2026-01-01')], [z, x, y]);
    expect(movimentosDeCaixa(f, A).map((m) => m.lancamento)).toEqual([y, x, z]);
  });

  it('ignora lançamentos de outras contas', () => {
    const f = fatos(
      [conta(1, 0, '2026-01-01')],
      [lanc('receita', '2026-02-01', 1, { contaId: B })],
    );
    expect(movimentosDeCaixa(f, A)).toEqual([]);
  });
});

describe('transferência entre duas contas', () => {
  const f = fatos(
    [conta(1, 100000, '2026-01-01'), conta(2, 0, '2026-01-01')],
    [lanc('transferencia', '2026-02-10', 50000, { contaDestinoId: B })],
  );

  it('aparece nos dois extratos com sinais opostos', () => {
    const fev = competencia('2026-02');
    expect(extratoMensal(f, A, fev).linhas.map((l) => l.movimento.valor)).toEqual([-50000]);
    expect(extratoMensal(f, B, fev).linhas.map((l) => l.movimento.valor)).toEqual([50000]);
    expect(saldo(f, A, d('2026-02-10'))).toBe(50000);
    expect(saldo(f, B, d('2026-02-10'))).toBe(50000);
  });
});

describe('movimento previsto', () => {
  it('não altera nenhum saldo nem entra no extrato', () => {
    const previsto = lanc('despesa', '2026-02-10', 30000, { status: 'previsto' });
    const f = fatos([conta(1, 100000, '2026-01-01')], [previsto]);
    expect(movimentosDeCaixa(f, A)).toEqual([]);
    expect(saldo(f, A, d('2026-12-31'))).toBe(100000);
    expect(extratoMensal(f, A, competencia('2026-02')).linhas).toEqual([]);
  });
});

describe('extratoMensal', () => {
  const hoje = d('2026-11-04');
  const f = fatos(
    [conta(1, 100000, '2026-09-15')],
    [
      lanc('receita', '2026-08-20', 1000),
      lanc('despesa', '2026-09-10', 2000),
      lanc('receita', '2026-09-20', 30000),
      lanc('despesa', '2026-09-30', 5000),
      lanc('ajuste', '2026-10-01', -700),
      lanc('despesa', '2026-10-31', 12000),
      lanc('receita', '2026-11-01', 4000),
      lanc('despesa', '2026-11-03', 1500),
    ],
  );

  it('abertura + entradas − saídas = fechamento em todo mês', () => {
    for (const m of ['2026-09', '2026-10', '2026-11']) {
      const e = extratoMensal(f, A, competencia(m));
      expect(e.abertura).not.toBeNull();
      expect((e.abertura ?? 0) + e.entradas - e.saidas).toBe(e.fechamento);
      expect(e.linhas.at(-1)?.saldo ?? e.abertura).toBe(e.fechamento);
    }
  });

  it('fechamento do mês corrente até hoje = saldo atual', () => {
    expect(extratoMensal(f, A, competencia('2026-11')).fechamento).toBe(saldo(f, A, hoje));
  });

  it('abre no saldo inicial no mês dele e marca os movimentos anteriores', () => {
    const e = extratoMensal(f, A, competencia('2026-09'));
    expect(e.abertura).toBe(100000);
    expect(e.linhas.map((l) => [l.anteriorAoSaldoInicial, l.saldo])).toEqual([
      [true, null],
      [false, 130000],
      [false, 125000],
    ]);
    expect([e.entradas, e.saidas, e.fechamento]).toEqual([30000, 5000, 125000]);
  });

  it('abre no último dia do mês anterior e traz o saldo corrente', () => {
    const e = extratoMensal(f, A, competencia('2026-10'));
    expect(e.abertura).toBe(125000);
    expect(e.linhas.map((l) => l.saldo)).toEqual([124300, 112300]);
    expect([e.entradas, e.saidas]).toEqual([0, 12700]);
  });

  it('mês anterior ao saldo inicial traz as linhas sem saldo', () => {
    const e = extratoMensal(f, A, competencia('2026-08'));
    expect(e.linhas.map((l) => [l.anteriorAoSaldoInicial, l.saldo])).toEqual([[true, null]]);
    expect([e.abertura, e.entradas, e.saidas, e.fechamento]).toEqual([null, 0, 0, null]);
  });
});

describe('diferencaDeAjuste', () => {
  const f = fatos([conta(1, 100000, '2026-09-15')], [lanc('despesa', '2026-10-01', 30000)]);

  it('é o saldo real menos o saldo do sistema na data', () => {
    expect(diferencaDeAjuste(f, A, c(65000), d('2026-10-02'))).toBe(-5000);
    expect(diferencaDeAjuste(f, A, c(70000), d('2026-10-02'))).toBe(0);
    expect(diferencaDeAjuste(f, A, c(80000), d('2026-10-02'))).toBe(10000);
  });

  it('é nula na data do saldo inicial ou antes (o ajuste não entraria no saldo)', () => {
    expect(diferencaDeAjuste(f, A, c(0), d('2026-09-15'))).toBeNull();
    expect(diferencaDeAjuste(f, A, c(0), d('2026-09-01'))).toBeNull();
  });
});

describe('impactoDoNovoSaldoInicial (D21)', () => {
  const hoje = d('2026-11-04');
  const contaA = conta(1, 100000, '2026-09-15');
  const f = fatos(
    [contaA],
    [
      lanc('despesa', '2026-09-10', 2000),
      lanc('receita', '2026-09-20', 30000),
      lanc('despesa', '2026-10-05', 5000),
    ],
  );

  it('adiantar a data tira movimentos do saldo', () => {
    expect(impactoDoNovoSaldoInicial(f, contaA, c(50000), d('2026-09-30'), hoje)).toEqual({
      saldoAtualAntes: 125000,
      saldoAtualDepois: 45000,
      passamAAnterior: 1,
      deixamDeAnterior: 0,
    });
  });

  it('recuar a data devolve movimentos ao saldo', () => {
    expect(impactoDoNovoSaldoInicial(f, contaA, c(100000), d('2026-09-01'), hoje)).toEqual({
      saldoAtualAntes: 125000,
      saldoAtualDepois: 123000,
      passamAAnterior: 0,
      deixamDeAnterior: 1,
    });
  });

  it('nova data depois de hoje deixa o saldo atual indisponível', () => {
    expect(
      impactoDoNovoSaldoInicial(f, contaA, c(0), d('2026-11-05'), hoje).saldoAtualDepois,
    ).toBeNull();
  });
});

it('conta inexistente é erro', () => {
  expect(() => saldo(fatosVazios(), A, d('2026-01-01'))).toThrow(RangeError);
});
