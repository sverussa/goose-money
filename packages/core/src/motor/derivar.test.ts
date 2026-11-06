import { describe, expect, it } from 'vitest';
import { gerarParcelas, montarFaturas } from '../cartoes';
import { saldo } from '../contas';
import { competencia, competenciaDe, dataCivil, diaNoMes, somarMeses, ultimaData } from '../datas';
import { centavos, D } from '../dinheiro';
import { tabelaPrice } from '../dividas';
import { fatosVazios, type Fatos, type Id, type Lancamento } from '../modelo';
import { ocorrenciasDoMes, pendentesParaConfirmar } from '../recorrencias';
import { derivar } from './derivar';

/** Relógio de alta resolução do Vitest; o core não tem os tipos de DOM nem de Node. */
declare const performance: { now(): number };

const c = competencia;
const d = dataCivil;
const HOJE = d('2026-11-04');
let seq = 1;
const novoId = (): Id => `00000000-0000-4000-8000-${String(seq++).padStart(12, '0')}`;
const controle = {
  createdAt: '2026-11-04T12:00:00-03:00',
  updatedAt: '2026-11-04T12:00:00-03:00',
  createdBy: '00000000-0000-4000-8000-999999999999',
  isDeleted: false,
};

/** Gerador determinístico (LCG) para os fatos sintéticos. */
function aleatorio(semente: number) {
  let s = semente;
  return (n: number) => {
    s = (s * 1_103_515_245 + 12_345) % 2_147_483_648;
    return s % n;
  };
}

/**
 * `lancamentos` lançamentos de 24 meses até hoje, 3 cartões com compras parceladas,
 * 2 dívidas (uma com parcela paga e amortização) e 8 recorrências com ocorrências confirmadas.
 */
function gerarFatos(lancamentos: number): Fatos {
  const sorteio = aleatorio(42);
  const f = fatosVazios();
  const cat = (
    nome: string,
    tipo: 'receita' | 'despesa',
    sistema: 'juros_encargos' | null = null,
  ) => {
    const id = novoId();
    f.categorias.push({
      ...controle,
      id,
      nome,
      tipo,
      icone: 'tag',
      cor: sistema ? null : 'cat',
      categoriaPaiId: null,
      sistema,
    });
    return id;
  };
  const salario = cat('Salário', 'receita');
  const despesas = ['Mercado', 'Casa', 'Lazer', 'Saúde', 'Transporte'].map((n) =>
    cat(n, 'despesa'),
  );
  cat('Juros e encargos', 'despesa', 'juros_encargos');
  const veiculo = cat('Veículo', 'despesa');
  const contas = ['Corrente', 'Poupança', 'Carteira'].map((nome, k) => {
    const id = novoId();
    f.contas.push({
      ...controle,
      id,
      nome,
      instituicao: null,
      tipo: 'corrente',
      saldoInicial: centavos(100_000 * (k + 1)),
      dataSaldoInicial: d(k === 2 ? '2025-06-15' : '2024-10-31'),
      cor: 'conta',
      incluirNoTotal: k !== 1,
      arquivada: false,
    });
    return id;
  });
  const conta = () => contas[sorteio(contas.length)] as Id;
  const dia = () => {
    const m = somarMeses(c('2024-11'), sorteio(25));
    const data = diaNoMes(m, 1 + sorteio(28));
    return data > HOJE ? HOJE : data;
  };
  const lancar = (l: Partial<Lancamento> & Pick<Lancamento, 'tipo' | 'valor'>) => {
    const lanc: Lancamento = {
      ...controle,
      id: novoId(),
      status: 'efetivado',
      data: dia(),
      descricao: null,
      observacao: null,
      contaId: conta(),
      contaDestinoId: null,
      categoriaId: null,
      cartaoId: null,
      faturaCompetencia: null,
      dividaId: null,
      parcelaDividaId: null,
      ...l,
    };
    f.lancamentos.push(lanc);
    return lanc;
  };

  const cartoes = [
    ['Cartão A', 3, 10],
    ['Cartão B', 25, 5],
    ['Cartão C', 31, 7],
  ].map(([nome, fecha, vence]) => {
    const id = novoId();
    f.cartoes.push({
      ...controle,
      id,
      nome: nome as string,
      instituicao: null,
      cor: 'cartao',
      limite: centavos(2_000_000),
      contaPagamentoId: contas[0] as Id,
      competenciaInicial: c('2025-01'),
      arquivado: false,
    });
    f.cartaoCiclos.push({
      ...controle,
      id: novoId(),
      cartaoId: id,
      vigenteDesde: c('2024-01'),
      diaFechamento: fecha as number,
      diaVencimento: vence as number,
    });
    return f.cartoes.at(-1) as (typeof f.cartoes)[number];
  });
  for (let k = 0; k < 600; k++) {
    const cartao = cartoes[sorteio(3)] as (typeof cartoes)[number];
    const compra = {
      ...controle,
      id: novoId(),
      cartaoId: cartao.id,
      data: dia(),
      descricao: `Compra ${String(k)}`,
      categoriaId: despesas[sorteio(despesas.length)] as Id,
      observacao: null,
      valorTotal: centavos(1_000 + sorteio(300_000)),
      numeroParcelas: 1 + sorteio(12),
      cancelada: false,
    };
    f.compras.push(compra);
    for (const p of gerarParcelas(compra, cartao, f.cartaoCiclos))
      f.parcelas.push({ ...controle, id: novoId(), compraId: compra.id, ...p });
  }

  const dividas = (['creditado_em_conta', 'pago_a_terceiro'] as const).map((destino) => {
    const id = novoId();
    const pv = centavos(4_000_000);
    f.dividas.push({
      ...controle,
      id,
      tipo: destino === 'creditado_em_conta' ? 'emprestimo' : 'financiamento',
      credor: destino,
      valorContratado: pv,
      dataContratacao: d('2025-01-10'),
      destinoDoValor: destino,
      sistemaAmortizacao: 'price',
      taxaMensal: '0.0149',
      valorParcelaInformada: null,
      numeroParcelas: 48,
      dataPrimeiraParcela: d('2025-02-10'),
      contaDebitoId: contas[0] as Id,
      categoriaId: destino === 'pago_a_terceiro' ? veiculo : null,
    });
    for (const l of tabelaPrice(pv, new D('0.0149'), 48, d('2025-02-10')))
      f.parcelasDivida.push({
        ...controle,
        id: novoId(),
        dividaId: id,
        numero: l.numero,
        vencimento: l.vencimento,
        valor: l.valor,
        juros: l.juros,
        amortizacao: l.amortizacao,
        pagaAntesDoCadastro: false,
      });
    return id;
  });
  const [primeira] = f.parcelasDivida;
  if (primeira)
    lancar({
      tipo: 'pagamento_divida',
      valor: primeira.valor,
      data: primeira.vencimento,
      contaId: contas[0],
      dividaId: primeira.dividaId,
      parcelaDividaId: primeira.id,
    });
  lancar({ tipo: 'amortizacao', valor: centavos(100_000), dividaId: dividas[1] });
  lancar({ tipo: 'captacao', valor: centavos(4_000_000), dividaId: dividas[0] });

  for (let k = 0; k < 8; k++) {
    const id = novoId();
    const renda = k < 3;
    const noCartao = k >= 6;
    f.recorrencias.push({
      ...controle,
      id,
      natureza: renda ? 'renda' : 'gasto',
      descricao: `Recorrência ${String(k)}`,
      competenciaInicio: c('2025-01'),
      competenciaFim: null,
      autoConfirmar: k % 2 === 0,
      ativa: true,
    });
    f.recorrenciaVersoes.push({
      ...controle,
      id: novoId(),
      recorrenciaId: id,
      vigenteDesde: c('2025-01'),
      valor: centavos(10_000 + k * 1_000),
      dia: 5 + k,
      formaPagamento: noCartao ? 'cartao' : 'conta',
      contaId: noCartao ? null : (contas[0] as Id),
      cartaoId: noCartao ? (cartoes[0] as (typeof cartoes)[number]).id : null,
      categoriaId: renda ? salario : (despesas[0] as Id),
    });
    if (noCartao) continue;
    for (let m = c('2025-01'); m < c('2026-10'); m = somarMeses(m, 1)) {
      const data = diaNoMes(m, 5 + k);
      const l = lancar({
        tipo: renda ? 'receita' : 'despesa',
        valor: centavos(10_000 + k * 1_000),
        data,
        contaId: contas[0],
        categoriaId: renda ? salario : despesas[0],
      });
      f.ocorrencias.push({
        ...controle,
        id: novoId(),
        recorrenciaId: id,
        competencia: m,
        situacao: 'confirmada',
        valor: l.valor,
        data,
        contaId: l.contaId,
        cartaoId: null,
        categoriaId: l.categoriaId,
        lancamentoId: l.id,
        compraId: null,
      });
    }
  }

  while (f.lancamentos.length < lancamentos) {
    const r = sorteio(100);
    if (r < 15)
      lancar({ tipo: 'receita', valor: centavos(1 + sorteio(500_000)), categoriaId: salario });
    else if (r < 80)
      lancar({
        tipo: 'despesa',
        valor: centavos(1 + sorteio(50_000)),
        categoriaId: despesas[sorteio(despesas.length)],
        status: sorteio(20) === 0 ? 'previsto' : 'efetivado',
      });
    else if (r < 90) {
      const origem = conta();
      lancar({
        tipo: 'transferencia',
        valor: centavos(1 + sorteio(100_000)),
        contaId: origem,
        contaDestinoId: contas.find((x) => x !== origem),
      });
    } else {
      const data = dia();
      lancar({
        tipo: 'pagamento_fatura',
        valor: centavos(1 + sorteio(200_000)),
        data,
        cartaoId: (cartoes[sorteio(3)] as (typeof cartoes)[number]).id,
        faturaCompetencia: competenciaDe(data),
      });
    }
  }
  return f;
}

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
    // O menor tempo mede o código, não a disputa por CPU com outros testes em paralelo.
    expect(Math.min(...tempos)).toBeLessThan(50);
  });
});
