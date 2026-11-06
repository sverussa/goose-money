import { gerarParcelas } from '../cartoes';
import {
  competenciaDe,
  diaNoMes,
  somarMeses,
  ultimaData,
  type Competencia,
  type DataCivil,
} from '../datas';
import { centavos, D } from '../dinheiro';
import { tabelaPrice } from '../dividas';
import { fatosVazios, type Fatos, type Id, type Lancamento } from '../modelo';

/** Fatos sintéticos para os testes de desempenho de 9.3 (só os testes importam este arquivo). */

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
 * `lancamentos` lançamentos nos 24 meses até `hoje` (o mês de `hoje` e os 24 anteriores), 3 cartões com compras parceladas,
 * 2 dívidas (uma com parcela paga e amortização) e 8 recorrências com ocorrências confirmadas.
 */
export function gerarFatosVolumosos(lancamentos: number, hoje: DataCivil): Fatos {
  /** Primeiro mês com lançamentos; as demais datas são relativas a ele. */
  const base = somarMeses(competenciaDe(hoje), -24);
  const mes = (k: number): Competencia => somarMeses(base, k);
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
      dataSaldoInicial: k === 2 ? diaNoMes(mes(7), 15) : ultimaData(mes(-1)),
      cor: 'conta',
      incluirNoTotal: k !== 1,
      arquivada: false,
    });
    return id;
  });
  const conta = () => contas[sorteio(contas.length)] as Id;
  const dia = () => {
    const m = mes(sorteio(25));
    const data = diaNoMes(m, 1 + sorteio(28));
    return data > hoje ? hoje : data;
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
      competenciaInicial: mes(2),
      arquivado: false,
    });
    f.cartaoCiclos.push({
      ...controle,
      id: novoId(),
      cartaoId: id,
      vigenteDesde: mes(-10),
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
      dataContratacao: diaNoMes(mes(2), 10),
      destinoDoValor: destino,
      sistemaAmortizacao: 'price',
      taxaMensal: '0.0149',
      valorParcelaInformada: null,
      numeroParcelas: 48,
      dataPrimeiraParcela: diaNoMes(mes(3), 10),
      contaDebitoId: contas[0] as Id,
      categoriaId: destino === 'pago_a_terceiro' ? veiculo : null,
    });
    for (const l of tabelaPrice(pv, new D('0.0149'), 48, diaNoMes(mes(3), 10)))
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
      competenciaInicio: mes(2),
      competenciaFim: null,
      autoConfirmar: k % 2 === 0,
      ativa: true,
    });
    f.recorrenciaVersoes.push({
      ...controle,
      id: novoId(),
      recorrenciaId: id,
      vigenteDesde: mes(2),
      valor: centavos(10_000 + k * 1_000),
      dia: 5 + k,
      formaPagamento: noCartao ? 'cartao' : 'conta',
      contaId: noCartao ? null : (contas[0] as Id),
      cartaoId: noCartao ? (cartoes[0] as (typeof cartoes)[number]).id : null,
      categoriaId: renda ? salario : (despesas[0] as Id),
    });
    if (noCartao) continue;
    for (let m = mes(2); m < mes(23); m = somarMeses(m, 1)) {
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
