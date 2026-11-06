import { describe, expect, it } from 'vitest';
import { competencia, dataCivil } from '../datas';
import { centavos } from '../dinheiro';
import {
  fatosVazios,
  type Cartao,
  type CartaoCiclo,
  type Fatos,
  type Ocorrencia,
  type Recorrencia,
  type RecorrenciaVersao,
} from '../modelo';
import {
  faturaDoGastoNoCartao,
  ocorrenciasDoMes,
  pendentesParaConfirmar,
  previsao,
  primeiraCompetenciaNaoConfirmada,
  resumoGastos,
  resumoRendas,
  versaoVigente,
} from './recorrencias';

const c = competencia;
const d = dataCivil;
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const controle = {
  createdAt: '2026-11-04T12:00:00-03:00',
  updatedAt: '2026-11-04T12:00:00-03:00',
  createdBy: id(99),
  isDeleted: false,
};
const CONTA = id(50);
const CARTAO = id(60);
const CATEGORIA = id(70);
let seq = 100;

const recorrencia = (
  natureza: Recorrencia['natureza'],
  inicio: string,
  extra: Partial<Recorrencia> = {},
): Recorrencia => ({
  ...controle,
  id: id(seq++),
  natureza,
  descricao: natureza === 'renda' ? 'Salário' : 'Aluguel',
  competenciaInicio: c(inicio),
  competenciaFim: null,
  autoConfirmar: false,
  ativa: true,
  ...extra,
});
const versao = (
  r: Recorrencia,
  vigenteDesde: string,
  valor: number,
  dia: number,
  extra: Partial<RecorrenciaVersao> = {},
): RecorrenciaVersao => ({
  ...controle,
  id: id(seq++),
  recorrenciaId: r.id,
  vigenteDesde: c(vigenteDesde),
  valor: centavos(valor),
  dia,
  formaPagamento: 'conta',
  contaId: CONTA,
  cartaoId: null,
  categoriaId: CATEGORIA,
  ...extra,
});
const noCartao = { formaPagamento: 'cartao', contaId: null, cartaoId: CARTAO } as const;
const confirmada = (
  r: Recorrencia,
  comp: string,
  valor: number,
  data: string,
  extra: Partial<Ocorrencia> = {},
): Ocorrencia => ({
  ...controle,
  id: id(seq++),
  recorrenciaId: r.id,
  competencia: c(comp),
  situacao: 'confirmada',
  valor: centavos(valor),
  data: d(data),
  contaId: CONTA,
  cartaoId: null,
  categoriaId: CATEGORIA,
  lancamentoId: id(seq++),
  compraId: null,
  ...extra,
});
const ignorada = (r: Recorrencia, comp: string): Ocorrencia => ({
  ...controle,
  id: id(seq++),
  recorrenciaId: r.id,
  competencia: c(comp),
  situacao: 'ignorada',
  valor: null,
  data: null,
  contaId: null,
  cartaoId: null,
  categoriaId: null,
  lancamentoId: null,
  compraId: null,
});
const fatos = (
  recorrencias: Recorrencia[],
  recorrenciaVersoes: RecorrenciaVersao[],
  ocorrencias: Ocorrencia[] = [],
): Fatos => ({ ...fatosVazios(), recorrencias, recorrenciaVersoes, ocorrencias });

// Seed (PROMPT 10) com M = 2026-11: Freelance R$ 1.000,00 até M−2 e R$ 1.200,00 a partir de M−1.
const freelance = recorrencia('renda', '2026-01', { descricao: 'Freelance' });
const freelanceVersoes = [
  versao(freelance, '2026-10', 120_000, 20),
  versao(freelance, '2026-01', 100_000, 20),
];

describe('versaoVigente', () => {
  it('usa a maior vigenteDesde ≤ competência (Freelance do seed)', () => {
    expect(versaoVigente(freelanceVersoes, c('2026-09'))?.valor).toBe(100_000);
    expect(versaoVigente(freelanceVersoes, c('2026-10'))?.valor).toBe(120_000);
    expect(versaoVigente(freelanceVersoes, c('2027-03'))?.valor).toBe(120_000);
  });

  it('antes da primeira versão não há versão', () => {
    expect(versaoVigente(freelanceVersoes, c('2025-12'))).toBeNull();
  });
});

describe('previsao', () => {
  it('devolve valor, data, conta e categoria da versão vigente', () => {
    expect(previsao(freelance, freelanceVersoes, c('2026-09'))).toEqual({
      recorrenciaId: freelance.id,
      competencia: c('2026-09'),
      valor: 100_000,
      data: d('2026-09-20'),
      formaPagamento: 'conta',
      contaId: CONTA,
      cartaoId: null,
      categoriaId: CATEGORIA,
    });
    expect(previsao(freelance, freelanceVersoes, c('2026-11'))?.valor).toBe(120_000);
  });

  it('gasto no dia 31 cai no dia 30 em novembro e no 28 ou 29 em fevereiro (11.6)', () => {
    const energia = recorrencia('gasto', '2026-01');
    const vs = [versao(energia, '2026-01', 18_000, 31)];
    expect(previsao(energia, vs, c('2026-11'))?.data).toBe('2026-11-30');
    expect(previsao(energia, vs, c('2027-02'))?.data).toBe('2027-02-28');
    expect(previsao(energia, vs, c('2028-02'))?.data).toBe('2028-02-29');
    expect(previsao(energia, vs, c('2026-12'))?.data).toBe('2026-12-31');
  });

  it('sem previsão fora de [início, fim]', () => {
    const r = recorrencia('gasto', '2026-03', { competenciaFim: c('2026-05') });
    const vs = [versao(r, '2026-03', 1_000, 10)];
    expect(previsao(r, vs, c('2026-02'))).toBeNull();
    expect(previsao(r, vs, c('2026-05'))).not.toBeNull();
    expect(previsao(r, vs, c('2026-06'))).toBeNull();
  });

  it('ignora versões de outras recorrências e fica sem previsão sem versão', () => {
    const outra = recorrencia('gasto', '2026-01');
    expect(previsao(outra, freelanceVersoes, c('2026-11'))).toBeNull();
  });
});

describe('ocorrenciasDoMes', () => {
  const hoje = d('2026-11-10');

  it('salário confirmado continua R$ 6.500,00 com nova versão de R$ 7.000,00 (11.6)', () => {
    const salario = recorrencia('renda', '2026-01');
    const vs = [versao(salario, '2026-01', 650_000, 5), versao(salario, '2026-12', 700_000, 5)];
    const f = fatos([salario], vs, [confirmada(salario, '2026-11', 650_000, '2026-11-05')]);
    expect(ocorrenciasDoMes(f, c('2026-11'), hoje)[0]).toMatchObject({
      status: 'confirmada',
      valor: 650_000,
    });
    expect(ocorrenciasDoMes(f, c('2026-12'), hoje)[0]).toMatchObject({
      status: 'prevista',
      valor: 700_000,
    });
    expect(ocorrenciasDoMes(f, c('2027-06'), hoje)[0]?.valor).toBe(700_000);
    expect(ocorrenciasDoMes(f, c('2026-10'), hoje)[0]?.valor).toBe(650_000);
  });

  it('ocorrência gravada não muda quando uma versão nova é criada', () => {
    const salario = recorrencia('renda', '2026-01');
    const gravada = confirmada(salario, '2026-11', 640_000, '2026-11-06');
    const antes = ocorrenciasDoMes(
      fatos([salario], [versao(salario, '2026-01', 650_000, 5)], [gravada]),
      c('2026-11'),
      hoje,
    );
    const depois = ocorrenciasDoMes(
      fatos(
        [salario],
        [versao(salario, '2026-01', 650_000, 5), versao(salario, '2026-11', 700_000, 1)],
        [gravada],
      ),
      c('2026-11'),
      hoje,
    );
    expect(depois).toEqual(antes);
    expect(depois[0]).toMatchObject({ valor: 640_000, data: '2026-11-06', ocorrencia: gravada });
  });

  it('status prevista, atrasada, vencida e ignorada, em ordem de data e de id', () => {
    const renda = recorrencia('renda', '2026-01');
    const gasto = recorrencia('gasto', '2026-01');
    const hojeGasto = recorrencia('gasto', '2026-01');
    const ignorado = recorrencia('gasto', '2026-01');
    const inativa = recorrencia('gasto', '2026-01', { ativa: false });
    const mesmoDia = recorrencia('gasto', '2026-01');
    const f = fatos(
      [mesmoDia, renda, gasto, hojeGasto, ignorado, inativa],
      [
        versao(renda, '2026-01', 100, 5),
        versao(gasto, '2026-01', 200, 3),
        versao(hojeGasto, '2026-01', 300, 10),
        versao(ignorado, '2026-01', 400, 20),
        versao(inativa, '2026-01', 500, 1),
        versao(mesmoDia, '2026-01', 600, 20),
      ],
      [ignorada(ignorado, '2026-11')],
    );
    expect(
      ocorrenciasDoMes(f, c('2026-11'), hoje).map((o) => [o.recorrencia.id, o.status, o.data]),
    ).toEqual([
      [gasto.id, 'vencida', '2026-11-03'],
      [renda.id, 'atrasada', '2026-11-05'],
      [hojeGasto.id, 'prevista', '2026-11-10'],
      [ignorado.id, 'ignorada', '2026-11-20'],
      [mesmoDia.id, 'prevista', '2026-11-20'],
    ]);
  });

  it('confirmada no cartão e fora da vigência usa o retrato; ignorada fora dela some', () => {
    const r = recorrencia('gasto', '2026-01', { competenciaFim: c('2026-10') });
    const outra = recorrencia('gasto', '2026-01', { competenciaFim: c('2026-10') });
    const gravada = confirmada(r, '2026-11', 5_590, '2026-11-12', {
      contaId: null,
      lancamentoId: null,
      cartaoId: CARTAO,
      compraId: id(seq++),
    });
    const f = fatos(
      [r, outra],
      [versao(r, '2026-01', 5_590, 12, noCartao), versao(outra, '2026-01', 1, 1)],
      [gravada, ignorada(outra, '2026-11')],
    );
    expect(ocorrenciasDoMes(f, c('2026-11'), hoje)).toEqual([
      {
        recorrencia: r,
        recorrenciaId: r.id,
        competencia: c('2026-11'),
        valor: 5_590,
        data: d('2026-11-12'),
        formaPagamento: 'cartao',
        contaId: null,
        cartaoId: CARTAO,
        categoriaId: CATEGORIA,
        status: 'confirmada',
        ocorrencia: gravada,
      },
    ]);
  });
});

describe('pendentesParaConfirmar', () => {
  it('app fechado de 01/11 a 10/11: salário do dia 5 vira lançamento de 05/11 (11.6)', () => {
    const salario = recorrencia('renda', '2026-11', { autoConfirmar: true });
    const vs = [versao(salario, '2026-11', 650_000, 5)];
    expect(pendentesParaConfirmar(fatos([salario], vs), d('2026-11-10'))).toEqual([
      {
        recorrenciaId: salario.id,
        competencia: c('2026-11'),
        lancamento: {
          tipo: 'receita',
          status: 'efetivado',
          data: d('2026-11-05'),
          valor: 650_000,
          descricao: 'Salário',
          observacao: null,
          contaId: CONTA,
          contaDestinoId: null,
          categoriaId: CATEGORIA,
          cartaoId: null,
          faturaCompetencia: null,
          dividaId: null,
          parcelaDividaId: null,
        },
        compra: null,
      },
    ]);
    const gravada = confirmada(salario, '2026-11', 650_000, '2026-11-05');
    expect(pendentesParaConfirmar(fatos([salario], vs, [gravada]), d('2026-11-10'))).toEqual([]);
  });

  it('desde o início, em ordem cronológica, com data ≤ hoje e sem ocorrência gravada', () => {
    const salario = recorrencia('renda', '2026-08', { autoConfirmar: true });
    const streaming = recorrencia('gasto', '2026-09', {
      autoConfirmar: true,
      descricao: 'Streaming',
      competenciaFim: c('2026-10'),
    });
    const manual = recorrencia('gasto', '2026-01');
    const inativa = recorrencia('gasto', '2026-01', { autoConfirmar: true, ativa: false });
    const f = fatos(
      [salario, streaming, manual, inativa],
      [
        versao(salario, '2026-08', 650_000, 5),
        versao(streaming, '2026-09', 5_590, 1, noCartao),
        versao(manual, '2026-01', 1, 1),
        versao(inativa, '2026-01', 1, 1),
      ],
      [ignorada(salario, '2026-09')],
    );
    const pendentes = pendentesParaConfirmar(f, d('2026-11-04'));
    expect(pendentes.map((p) => [p.recorrenciaId, p.lancamento?.data ?? p.compra?.data])).toEqual([
      [salario.id, '2026-08-05'],
      [streaming.id, '2026-09-01'],
      [streaming.id, '2026-10-01'],
      [salario.id, '2026-10-05'],
    ]);
    expect(pendentes[1]).toEqual({
      recorrenciaId: streaming.id,
      competencia: c('2026-09'),
      lancamento: null,
      compra: {
        cartaoId: CARTAO,
        data: d('2026-09-01'),
        descricao: 'Streaming',
        categoriaId: CATEGORIA,
        observacao: null,
        valorTotal: 5_590,
        numeroParcelas: 1,
        cancelada: false,
      },
    });
    // Gasto em conta vira despesa.
    const aluguel = recorrencia('gasto', '2026-11', { autoConfirmar: true });
    const g = fatos([aluguel], [versao(aluguel, '2026-11', 180_000, 4)]);
    expect(pendentesParaConfirmar(g, d('2026-11-04'))[0]?.lancamento?.tipo).toBe('despesa');
    expect(pendentesParaConfirmar(g, d('2026-11-03'))).toEqual([]);
  });
});

describe('faturaDoGastoNoCartao', () => {
  const cartao: Cartao = {
    ...controle,
    id: CARTAO,
    nome: 'Cartão A',
    instituicao: null,
    cor: 'cartao-a',
    limite: centavos(800_000),
    contaPagamentoId: CONTA,
    competenciaInicial: c('2026-01'),
    arquivado: false,
  };
  const ciclo: CartaoCiclo = {
    ...controle,
    id: id(seq++),
    cartaoId: CARTAO,
    vigenteDesde: c('2026-01'),
    diaFechamento: 3,
    diaVencimento: 10,
  };
  const f = { ...fatosVazios(), cartoes: [cartao], cartaoCiclos: [ciclo] };

  it('usa o ciclo do cartão (fecha dia 3, vence dia 10)', () => {
    expect(faturaDoGastoNoCartao(f, { cartaoId: CARTAO, data: d('2026-11-12') })).toBe('2026-12');
    expect(faturaDoGastoNoCartao(f, { cartaoId: CARTAO, data: d('2026-11-02') })).toBe('2026-11');
  });

  it('gasto em conta não tem fatura; cartão inexistente é erro', () => {
    expect(faturaDoGastoNoCartao(f, { cartaoId: null, data: d('2026-11-12') })).toBeNull();
    expect(() => faturaDoGastoNoCartao(f, { cartaoId: id(1), data: d('2026-11-12') })).toThrow(
      RangeError,
    );
  });
});

describe('primeiraCompetenciaNaoConfirmada', () => {
  it('primeira competência desde o início sem ocorrência gravada', () => {
    const salario = recorrencia('renda', '2026-10');
    expect(primeiraCompetenciaNaoConfirmada(fatos([salario], []), salario)).toBe('2026-10');
    const f = fatos(
      [salario],
      [],
      [
        confirmada(salario, '2026-10', 1, '2026-10-05'),
        ignorada(salario, '2026-11'),
        confirmada(salario, '2027-01', 1, '2027-01-05'),
      ],
    );
    expect(primeiraCompetenciaNaoConfirmada(f, salario)).toBe('2026-12');
  });
});

describe('resumoRendas e resumoGastos', () => {
  it('previsto = recebido + a receber + atrasado; ignoradas ficam de fora', () => {
    const salario = recorrencia('renda', '2026-01');
    const extra = recorrencia('renda', '2026-01');
    const atrasada = recorrencia('renda', '2026-01');
    const aluguel = recorrencia('gasto', '2026-01');
    const internet = recorrencia('gasto', '2026-01');
    const academia = recorrencia('gasto', '2026-01');
    const ignorado = recorrencia('gasto', '2026-01');
    const f = fatos(
      [salario, extra, atrasada, aluguel, internet, academia, ignorado],
      [
        versao(salario, '2026-01', 650_000, 5),
        versao(extra, '2026-01', 120_000, 20),
        versao(atrasada, '2026-01', 30_000, 2),
        versao(aluguel, '2026-01', 180_000, 10),
        versao(internet, '2026-01', 11_990, 15),
        versao(academia, '2026-01', 9_900, 3),
        versao(ignorado, '2026-01', 5_000, 1),
      ],
      [
        confirmada(salario, '2026-11', 640_000, '2026-11-05'),
        confirmada(aluguel, '2026-11', 180_000, '2026-11-10'),
        ignorada(ignorado, '2026-11'),
      ],
    );
    expect(resumoRendas(f, c('2026-11'), d('2026-11-10'))).toEqual({
      previsto: 790_000,
      recebido: 640_000,
      aReceber: 120_000,
      atrasado: 30_000,
    });
    expect(resumoGastos(f, c('2026-11'), d('2026-11-10'))).toEqual({
      previsto: 201_890,
      pago: 180_000,
      aPagar: 11_990,
      vencido: 9_900,
    });
  });
});
