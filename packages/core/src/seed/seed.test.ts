import { describe, expect, it } from 'vitest';
import { validarInvariantesDosFatos, validarReferencias } from '../backup';
import { faturaDaCompra, type Fatura } from '../cartoes';
import { anteriorAoSaldoInicial, movimentosDeCaixa } from '../contas';
import { competencia, dataCivil, type DataCivil } from '../datas';
import { centavos } from '../dinheiro';
import { type Fatos, fatosSchema } from '../modelo';
import {
  aPagarNosCartoes,
  derivar,
  patrimonioLiquido,
  previstoAteOFimDoMes,
  resultado,
  saldoEmContas,
} from '../motor';
import { periodo } from '../periodos';
import { ocorrenciasDoMes } from '../recorrencias';
import { categoriasIniciais, gerarSeed } from '.';

const d = dataCivil;
const c = competencia;
const USUARIO = '0a1b2c3d-1111-4222-8333-444455556666';
const HOJE = d('2026-11-04');
const SEED = gerarSeed(HOJE, USUARIO);

const porNome = <T extends { nome: string }>(lista: readonly T[], nome: string) =>
  lista.find((x) => x.nome === nome) as T;
const fatura = (f: Fatos, cartao: string, m: string, hoje: DataCivil = HOJE): Fatura =>
  derivar(f, hoje)
    .faturas.get(porNome(f.cartoes, cartao).id)
    ?.find((x) => x.competencia === m) as Fatura;

describe('gerarSeed', () => {
  it.each(['2026-11-04', '2026-11-25', '2026-01-31', '2026-03-01', '2028-02-29'])(
    'em %s todos os registros passam nos schemas, referências e invariantes',
    (hoje) => {
      const f = gerarSeed(d(hoje), USUARIO);
      expect(fatosSchema.safeParse(f).error?.issues).toBeUndefined();
      expect(validarReferencias(f)).toEqual([]);
      expect(validarInvariantesDosFatos(f)).toEqual([]);
      expect(f.lancamentos.every((l) => l.status === 'previsto' || l.data <= hoje)).toBe(true);
    },
  );

  it('o mesmo dia gera os mesmos dados; outro dia, outros', () => {
    expect(gerarSeed(HOJE, USUARIO)).toEqual(SEED);
    expect(gerarSeed(d('2026-11-05'), USUARIO).compras).not.toEqual(SEED.compras);
  });

  it('ids e dono são do usuário', () => {
    expect(
      SEED.contas.every((x) => x.createdBy === USUARIO && x.id.endsWith(USUARIO.slice(8))),
    ).toBe(true);
    expect(
      new Set(
        Object.values(SEED)
          .flat()
          .map((x) => (x as { id: string }).id),
      ).size,
    ).toBe(Object.values(SEED).flat().length);
  });

  it('categorias de sistema, as 8 de despesa da paleta e Renda (D40)', () => {
    const iniciais = categoriasIniciais({
      agora: '2026-11-04T12:00:00Z',
      usuario: USUARIO,
      novoId: () => USUARIO,
    });
    expect(iniciais.filter((x) => x.sistema !== null).map((x) => x.sistema)).toEqual([
      'a_classificar',
      'juros_encargos',
      'tarifas',
      'ajuste_saldo',
    ]);
    expect(iniciais.filter((x) => x.sistema === null).map((x) => [x.nome, x.cor])).toEqual([
      ['Moradia', 'categorica-1'],
      ['Transporte', 'categorica-2'],
      ['Alimentação', 'categorica-3'],
      ['Compras', 'categorica-4'],
      ['Saúde e bem-estar', 'categorica-5'],
      ['Assinaturas', 'categorica-6'],
      ['Lazer', 'categorica-7'],
      ['Outras', 'categorica-8'],
      ['Renda', 'categorica-8'],
    ]);
    expect(porNome(iniciais, 'Renda').tipo).toBe('receita');
  });
});

describe('casos de borda de PROMPT 10 com hoje = 04/11/2026', () => {
  it('4 contas com saldo inicial no último dia de M−4; Investimentos fora do total', () => {
    expect(
      SEED.contas.map((x) => [x.nome, x.saldoInicial, x.incluirNoTotal, x.dataSaldoInicial]),
    ).toEqual([
      ['Conta corrente', centavos(320000), true, '2026-07-31'],
      ['Poupança', centavos(800000), true, '2026-07-31'],
      ['Carteira', centavos(15000), true, '2026-07-31'],
      ['Investimentos', centavos(1500000), false, '2026-07-31'],
    ]);
  });

  it('cartão: compra no dia do fechamento, estorno, pagamento parcial e pagamento a mais', () => {
    const a = porNome(SEED.cartoes, 'Cartão A');
    const noFechamento = SEED.compras.find((x) => x.descricao === 'Compra no dia do fechamento');
    expect(noFechamento?.data).toBe('2026-10-03');
    expect(faturaDaCompra(a, SEED.cartaoCiclos, d('2026-10-03'))).toBe('2026-11');

    const estorno = SEED.itensFatura.find((i) => i.tipo === 'estorno');
    expect(estorno).toMatchObject({
      valor: centavos(-8990),
      cartaoId: a.id,
      competencia: '2026-11',
    });
    expect(SEED.compras.find((x) => x.id === estorno?.compraId)?.valorTotal).toBe(centavos(8990));

    // B de M−1 paga em 60%: o resto é transportado para a de M0, com o encargo de juros
    const bOutubro = fatura(SEED, 'Cartão B', '2026-10', d('2026-10-05'));
    expect(bOutubro.pagaParcialmente).toBe(true);
    expect(bOutubro.totalPago * 100).toBe(
      Math.round(((bOutubro.saldo + bOutubro.totalPago) * 100 * 60) / 100),
    );
    expect(fatura(SEED, 'Cartão B', '2026-10').status).toBe('transportada');
    const bNovembro = fatura(SEED, 'Cartão B', '2026-11');
    expect(bNovembro.itens.find((i) => i.tipo === 'saldo_anterior_nao_pago')?.valor).toBe(
      bOutubro.saldo,
    );
    expect(bNovembro.itens.find((i) => i.tipo === 'encargo')?.valor).toBe(centavos(3870));

    // A de M−2 paga com R$ 50,00 a mais: crédito na seguinte
    expect(fatura(SEED, 'Cartão A', '2026-09').status).toBe('paga');
    const aOutubro = fatura(SEED, 'Cartão A', '2026-10');
    expect(aOutubro.itens.find((i) => i.tipo === 'credito_pagamento')?.valor).toBe(centavos(-5000));
  });

  it('compras parceladas e entre 15 e 25 compras à vista por mês', () => {
    const parcelas = (descricao: string) => {
      const compra = SEED.compras.find((x) => x.descricao === descricao);
      return SEED.parcelas.filter((p) => p.compraId === compra?.id).map((p) => p.valor);
    };
    expect(parcelas('Notebook')).toEqual(Array<number>(10).fill(42000));
    expect(parcelas('Geladeira')).toEqual(Array<number>(6).fill(40000));
    expect(parcelas('Fone')).toEqual([33334, 33333, 33333]);
    for (const m of ['2026-08', '2026-09', '2026-10']) {
      const n = SEED.compras.filter((x) => x.descricao === 'Compra' && x.data.startsWith(m)).length;
      expect(n).toBeGreaterThanOrEqual(15);
      expect(n).toBeLessThanOrEqual(25);
    }
  });

  it('recorrências: Freelance em duas versões, Energia no dia 31 com o valor real de M−1', () => {
    const freelance = porNome(
      SEED.recorrencias.map((r) => ({ ...r, nome: r.descricao })),
      'Freelance',
    );
    expect(
      SEED.recorrenciaVersoes
        .filter((v) => v.recorrenciaId === freelance.id)
        .map((v) => [v.vigenteDesde, v.valor]),
    ).toEqual([
      ['2026-08', centavos(100000)],
      ['2026-10', centavos(120000)],
    ]);
    const energia = ocorrenciasDoMes(SEED, c('2026-10'), HOJE).find(
      (o) => o.recorrencia.descricao === 'Energia',
    );
    expect(energia).toMatchObject({
      status: 'confirmada',
      valor: centavos(21240),
      data: '2026-10-31',
    });
    const salario = SEED.lancamentos.filter((l) => l.descricao === 'Salário').map((l) => l.data);
    expect(salario).toEqual(['2026-08-05', '2026-09-05', '2026-10-05']);
    const previstos = SEED.lancamentos
      .filter((l) => l.status === 'previsto')
      .map((l) => [l.descricao, l.data]);
    expect(previstos).toEqual([
      ['13º salário', '2026-12-20'],
      ['IPVA', '2027-01-15'],
    ]);
  });

  it('Freelance de M0 fica atrasado só depois do dia 20', () => {
    const status = (hoje: string) =>
      ocorrenciasDoMes(gerarSeed(d(hoje), USUARIO), c('2026-11'), d(hoje)).find(
        (o) => o.recorrencia.descricao === 'Freelance',
      )?.status;
    expect(status('2026-11-04')).toBe('prevista');
    expect(status('2026-11-25')).toBe('atrasada');
  });

  it('dívidas com as parcelas pagas antes do cadastro', () => {
    const pagas = (credor: string) => {
      const divida = SEED.dividas.find((x) => x.credor === credor);
      return SEED.parcelasDivida.filter((p) => p.dividaId === divida?.id && p.pagaAntesDoCadastro)
        .length;
    };
    expect([pagas('Financiamento do veículo'), pagas('Empréstimo pessoal')]).toEqual([12, 3]);
    expect(SEED.lancamentos.some((l) => l.tipo === 'captacao')).toBe(false);
  });

  it('histórico: duas transferências, um anterior ao saldo inicial e dois "A classificar"', () => {
    const transferencias = SEED.lancamentos.filter((l) => l.tipo === 'transferencia');
    expect(transferencias).toHaveLength(2);
    expect(transferencias.map((t) => t.contaDestinoId)).toContain(
      porNome(SEED.contas, 'Investimentos').id,
    );
    const corrente = porNome(SEED.contas, 'Conta corrente');
    expect(
      movimentosDeCaixa(SEED, corrente.id).filter((m) => anteriorAoSaldoInicial(m, corrente)),
    ).toHaveLength(1);
    const aClassificar = SEED.categorias.find((x) => x.sistema === 'a_classificar')?.id;
    expect(SEED.lancamentos.filter((l) => l.categoriaId === aClassificar)).toHaveLength(2);
  });

  it('indicadores da Barra (valores obtidos; os de TotalsBar.dc.html são ilustrativos)', () => {
    const derivado = derivar(SEED, HOJE);
    expect({
      saldoEmContas: saldoEmContas(derivado), // ilustrativo R$ 11.255,51
      previsto: previstoAteOFimDoMes(derivado), // R$ 12.297,62
      aPagarNosCartoes: aPagarNosCartoes(derivado), // R$ 4.375,87
      resultado: resultado(derivado, periodo(d('2026-11-01'), d('2026-11-30'))), // −R$ 4.337,36
      patrimonioLiquido: patrimonioLiquido(derivado), // −R$ 16.854,03
    }).toEqual({
      saldoEmContas: 1275155,
      previsto: 1159138,
      aPagarNosCartoes: 748980,
      resultado: -542386,
      patrimonioLiquido: -1686727,
    });
  });
});
