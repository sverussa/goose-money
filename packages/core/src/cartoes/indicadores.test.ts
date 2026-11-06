import { describe, expect, it } from 'vitest';
import { competencia, dataCivil } from '../datas';
import { type Centavos, centavos } from '../dinheiro';
import { fatosVazios, type Cartao, type Compra, type Fatos, type ItemFatura } from '../modelo';
import { gerarParcelas } from './compras';
import { montarFaturas } from './faturas';
import {
  aPagarNoCartao,
  comprasParceladasAtivas,
  limiteDisponivel,
  obrigacoesDoCartao,
  pagaAntesDoCadastro,
  parcelasComprometidas,
  parcelasRestantes,
  podeArquivarCartao,
  podeExcluirCartao,
  primeiraFaturaControlada,
} from './indicadores';

const c = competencia;
const d = dataCivil;
const r$ = (reais: number) => centavos(Math.round(reais * 100));
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const controle = {
  createdAt: '2026-11-04T12:00:00-03:00',
  updatedAt: '2026-11-04T12:00:00-03:00',
  createdBy: id(99),
  isDeleted: false,
};
const CATEGORIA = id(70);
const HOJE = d('2026-11-04');
let seq = 100;

/** Cartão (fecha F, vence V), controlado desde `inicial`. */
function cartao(f: Fatos, nome: string, inicial = '2026-10', fecha = 3, vence = 10): Cartao {
  const x: Cartao = {
    ...controle,
    id: id(seq++),
    nome,
    instituicao: null,
    cor: 'cartao-a',
    limite: r$(10_000),
    contaPagamentoId: id(50),
    competenciaInicial: c(inicial),
    arquivado: false,
  };
  f.cartoes.push(x);
  f.cartaoCiclos.push({
    ...controle,
    id: id(seq++),
    cartaoId: x.id,
    vigenteDesde: c('2026-01'),
    diaFechamento: fecha,
    diaVencimento: vence,
  });
  return x;
}

function comprar(f: Fatos, k: Cartao, data: string, total: Centavos, n = 1, descricao = 'Compra') {
  const compra: Compra = {
    ...controle,
    id: id(seq++),
    cartaoId: k.id,
    data: d(data),
    descricao,
    categoriaId: CATEGORIA,
    observacao: null,
    valorTotal: total,
    numeroParcelas: n,
    cancelada: false,
  };
  f.compras.push(compra);
  for (const p of gerarParcelas(compra, k, f.cartaoCiclos))
    f.parcelas.push({ ...controle, id: id(seq++), compraId: compra.id, ...p });
  return compra;
}

function item(f: Fatos, k: Cartao, tipo: ItemFatura['tipo'], fatura: string, valor: Centavos) {
  f.itensFatura.push({
    ...controle,
    id: id(seq++),
    cartaoId: k.id,
    competencia: c(fatura),
    tipo,
    data: d(`${fatura}-01`),
    valor,
    descricao: null,
    compraId: null,
    categoriaId: tipo === 'saldo_anterior_cadastro' ? null : CATEGORIA,
  });
}

function pagar(f: Fatos, k: Cartao, fatura: string, valor: Centavos) {
  f.lancamentos.push({
    ...controle,
    id: id(seq++),
    tipo: 'pagamento_fatura',
    status: 'efetivado',
    data: HOJE,
    valor,
    descricao: null,
    observacao: null,
    contaId: id(50),
    contaDestinoId: null,
    categoriaId: null,
    cartaoId: k.id,
    faturaCompetencia: c(fatura),
    dividaId: null,
    parcelaDividaId: null,
  });
}

/** Gasto fixo com uma versão por `[vigenteDesde, cartão ou null = conta]`. */
function gastoFixo(
  f: Fatos,
  versoes: [string, Cartao | null][],
  { ativa = true, fim = null as string | null } = {},
) {
  const r = {
    ...controle,
    id: id(seq++),
    natureza: 'gasto' as const,
    descricao: 'Streaming',
    competenciaInicio: c((versoes[0] as [string, Cartao | null])[0]),
    competenciaFim: fim === null ? null : c(fim),
    autoConfirmar: false,
    ativa,
  };
  f.recorrencias.push(r);
  for (const [desde, x] of versoes)
    f.recorrenciaVersoes.push({
      ...controle,
      id: id(seq++),
      recorrenciaId: r.id,
      vigenteDesde: c(desde),
      valor: r$(40),
      dia: 20,
      formaPagamento: x ? 'cartao' : 'conta',
      contaId: x ? null : id(50),
      cartaoId: x ? x.id : null,
      categoriaId: CATEGORIA,
    });
}

const indicadores = (f: Fatos, k: Cartao, hoje = HOJE) => {
  const fs = montarFaturas(f, k.id, hoje);
  const obrigacoes = obrigacoesDoCartao(fs);
  return { aPagar: aPagarNoCartao(fs), obrigacoes, limite: limiteDisponivel(k, obrigacoes) };
};

describe('indicadores do cartão (3.5, 11.3)', () => {
  it('compra de R$ 1.000,00 em 3x reduz o Limite disponível em R$ 1.000,00', () => {
    const f = fatosVazios();
    const k = cartao(f, 'A');
    const antes = indicadores(f, k).limite;
    comprar(f, k, '2026-11-04', r$(1000), 3);
    expect(antes - indicadores(f, k).limite).toBe(r$(1000));
  });

  it('compra de R$ 1.200,00 em 12x: Obrigações +R$ 1.200,00; A pagar +R$ 100,00', () => {
    const f = fatosVazios();
    const k = cartao(f, 'A');
    comprar(f, k, '2026-10-20', r$(500)); // nov, fechada
    const antes = indicadores(f, k);
    comprar(f, k, '2026-11-04', r$(1200), 12); // dez (aberta) a nov/2027
    const depois = indicadores(f, k);
    expect(depois.obrigacoes - antes.obrigacoes).toBe(r$(1200));
    expect(depois.aPagar - antes.aPagar).toBe(r$(100));
    expect(antes).toMatchObject({ aPagar: r$(500), obrigacoes: r$(500) });
  });

  it('A pagar soma vencida e aberta; Obrigações inclui futuras e desconta créditos', () => {
    const f = fatosVazios();
    const k = cartao(f, 'A', '2026-11');
    const hoje = d('2026-11-20');
    comprar(f, k, '2026-10-10', r$(300)); // nov, vencida em 10/11
    comprar(f, k, '2026-11-10', r$(100)); // dez, aberta
    comprar(f, k, '2026-12-10', r$(50)); // jan, futura
    pagar(f, k, '2027-01', r$(80)); // pagamento antecipado: crédito de R$ 30,00 na futura
    const fs = montarFaturas(f, k.id, hoje);
    expect(fs.map((x) => x.status)).toEqual(['vencida', 'aberta', 'futura']);
    expect(aPagarNoCartao(fs)).toBe(r$(400));
    expect(obrigacoesDoCartao(fs)).toBe(r$(370));
  });

  it('faturas pagas e transportadas ficam fora; o transporte conta uma vez só', () => {
    const f = fatosVazios();
    const k = cartao(f, 'A');
    comprar(f, k, '2026-09-10', r$(1000)); // out
    pagar(f, k, '2026-10', r$(600)); // R$ 400,00 transportados para nov
    comprar(f, k, '2026-10-10', r$(200)); // nov
    pagar(f, k, '2026-11', r$(600)); // nov paga
    comprar(f, k, '2026-11-04', r$(100)); // dez
    const fs = montarFaturas(f, k.id, HOJE);
    expect(fs.map((x) => x.status)).toEqual(['transportada', 'paga', 'aberta']);
    expect(indicadores(f, k)).toMatchObject({ aPagar: r$(100), obrigacoes: r$(100) });
  });

  it('Limite disponível não passa do limite quando há crédito', () => {
    const f = fatosVazios();
    const k = cartao(f, 'A');
    pagar(f, k, '2026-12', r$(50));
    expect(indicadores(f, k)).toMatchObject({ obrigacoes: r$(-50), limite: r$(10_000) });
  });

  it('gastos fixos previstos no cartão nunca entram', () => {
    const f = fatosVazios();
    const k = cartao(f, 'A');
    gastoFixo(f, [['2026-11', k]]);
    expect(indicadores(f, k)).toMatchObject({ aPagar: 0, obrigacoes: 0, limite: r$(10_000) });
  });
});

describe('cartão já em uso (3.5, 11.3)', () => {
  /** Cadastrado em 04/11 (aberta = dez), com fatura fechada de nov a pagar e compra antiga. */
  function emUso() {
    const f = fatosVazios();
    const k = cartao(f, 'A', '2026-12');
    item(f, k, 'saldo_anterior_cadastro', '2026-11', r$(900));
    const compra = comprar(f, k, '2026-06-15', r$(1200), 12); // jul/2026 a jun/2027
    return { f, k, compra };
  }

  it('a primeira fatura controlada é a aberta na data do cadastro', () => {
    const { k } = emUso();
    expect(primeiraFaturaControlada(k)).toBe('2026-12');
  });

  it('parcelas anteriores ficam "Paga antes do cadastro"; as demais seguem 3.6', () => {
    const { f, k } = emUso();
    const antes = f.parcelas.filter((p) => pagaAntesDoCadastro(k, p));
    expect(antes.map((p) => p.competencia)).toEqual([
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
      '2026-11',
    ]);
  });

  it('"Saldo anterior ao cadastro" entra em A pagar e Obrigações; parcelas antigas não', () => {
    const { f, k } = emUso();
    expect(indicadores(f, k)).toEqual({
      aPagar: r$(900 + 100),
      obrigacoes: r$(900 + 700),
      limite: r$(10_000 - 1600),
    });
  });

  it('a tabela de parceladas ignora as parcelas pagas antes do cadastro', () => {
    const { f } = emUso();
    expect(comprasParceladasAtivas(f, HOJE).linhas[0]).toMatchObject({
      atual: 6,
      de: 12,
      restantes: 7,
      valorRestante: r$(700),
    });
  });
});

describe('parcelasRestantes (3.5)', () => {
  it('as posteriores à última fatura fechada, em ordem', () => {
    const f = fatosVazios();
    const k = cartao(f, 'A');
    const compra = comprar(f, k, '2026-10-10', r$(300), 3); // nov, dez, jan
    comprar(f, k, '2026-10-10', r$(999), 2); // outra compra
    const rs = parcelasRestantes(compra, [...f.parcelas].reverse(), c('2026-11'));
    expect(rs.map((p) => [p.numero, p.competencia])).toEqual([
      [2, '2026-12'],
      [3, '2027-01'],
    ]);
  });
});

describe('comprasParceladasAtivas (6.2)', () => {
  it('linhas por data da compra, com parcela atual, restantes e total do rodapé', () => {
    const f = fatosVazios();
    const a = cartao(f, 'A');
    const b = cartao(f, 'B', '2026-10', 25, 5);
    const fone = comprar(f, a, '2026-11-04', r$(1000), 3, 'Fone'); // dez a fev
    const notebook = comprar(f, a, '2026-09-12', r$(4200), 10, 'Notebook'); // out a jul/2027
    const geladeira = comprar(f, b, '2026-10-14', r$(2400), 6, 'Geladeira'); // nov a abr/2027
    comprar(f, a, '2026-11-01', r$(80)); // à vista: fora
    comprar(f, a, '2026-08-10', r$(200), 2); // set e out: já sem restantes
    const { linhas, total } = comprasParceladasAtivas(f, HOJE);
    expect(linhas).toEqual([
      {
        compra: notebook,
        cartao: a,
        atual: 3,
        de: 10,
        valorParcela: r$(420),
        restantes: 8,
        valorRestante: r$(3360),
        ultima: '2027-07',
      },
      {
        compra: geladeira,
        cartao: b,
        atual: 2,
        de: 6,
        valorParcela: r$(400),
        restantes: 5,
        valorRestante: r$(2000),
        ultima: '2027-04',
      },
      {
        compra: fone,
        cartao: a,
        atual: 1,
        de: 3,
        valorParcela: r$(333.34),
        restantes: 3,
        valorRestante: r$(1000),
        ultima: '2027-02',
      },
    ]);
    expect(total).toEqual({
      valorParcela: r$(1153.34),
      restantes: 16,
      valorRestante: r$(6360),
      ultima: '2027-07',
    });
  });

  it('sem compras parceladas ativas', () => {
    expect(comprasParceladasAtivas(fatosVazios(), HOJE)).toEqual({
      linhas: [],
      total: { valorParcela: 0, restantes: 0, valorRestante: 0, ultima: null },
    });
  });
});

describe('parcelasComprometidas (8.1)', () => {
  it('por cartão e competência, das abertas em diante, por 12 meses', () => {
    const f = fatosVazios();
    const a = cartao(f, 'A');
    const b = cartao(f, 'B', '2026-10', 25, 5);
    cartao(f, 'Sem parcelas');
    comprar(f, a, '2026-09-12', r$(4200), 10); // out a jul/2027
    comprar(f, b, '2026-10-14', r$(2400), 6); // nov a abr/2027
    comprar(f, a, '2026-11-04', r$(300), 15); // dez a fev/2028
    const serie = parcelasComprometidas(f, HOJE);
    expect(serie.map((m) => m.competencia)).toEqual([
      '2026-12',
      '2027-01',
      '2027-02',
      '2027-03',
      '2027-04',
      '2027-05',
      '2027-06',
      '2027-07',
      '2027-08',
      '2027-09',
      '2027-10',
      '2027-11',
    ]);
    expect(serie[0]?.cartoes).toEqual([
      { cartaoId: a.id, valor: r$(440) },
      { cartaoId: b.id, valor: r$(400) },
    ]);
    expect(serie[4]?.cartoes).toEqual([
      { cartaoId: a.id, valor: r$(440) },
      { cartaoId: b.id, valor: r$(400) },
    ]);
    expect(serie[11]?.cartoes).toEqual([
      { cartaoId: a.id, valor: r$(20) },
      { cartaoId: b.id, valor: 0 },
    ]);
    expect(parcelasComprometidas(f, HOJE, 3)).toHaveLength(3);
  });

  it('a janela começa na aberta mais antiga; parcelas em fatura fechada ficam fora', () => {
    const f = fatosVazios();
    const a = cartao(f, 'A'); // aberta dez
    const b = cartao(f, 'B', '2026-10', 10, 20); // aberta nov
    comprar(f, a, '2026-10-10', r$(200), 2); // nov (fechada) e dez
    comprar(f, b, '2026-09-15', r$(300), 3); // out (fechada), nov e dez
    expect(parcelasComprometidas(f, HOJE, 2)).toEqual([
      {
        competencia: '2026-11',
        cartoes: [
          { cartaoId: a.id, valor: 0 },
          { cartaoId: b.id, valor: r$(100) },
        ],
      },
      {
        competencia: '2026-12',
        cartoes: [
          { cartaoId: a.id, valor: r$(100) },
          { cartaoId: b.id, valor: r$(100) },
        ],
      },
    ]);
  });

  it('sem cartões', () => {
    expect(parcelasComprometidas(fatosVazios(), HOJE)).toEqual([]);
  });
});

describe('arquivar e excluir cartão (6.5, D21)', () => {
  it('arquivar com Obrigações > 0 é negado com motivo', () => {
    const f = fatosVazios();
    const k = cartao(f, 'A');
    comprar(f, k, '2026-11-04', r$(1200), 12);
    expect(podeArquivarCartao(f, k.id, HOJE)).toEqual({
      permitida: false,
      motivo: 'Há saldo em faturas do cartão, inclusive futuras.',
    });
  });

  it('arquivar com crédito, ou com saldos que se compensam, também é negado', () => {
    const f = fatosVazios();
    const k = cartao(f, 'A');
    pagar(f, k, '2026-12', r$(50));
    expect(podeArquivarCartao(f, k.id, HOJE).permitida).toBe(false);
    comprar(f, k, '2026-12-10', r$(50)); // jan: +50 contra −50 na aberta
    expect(obrigacoesDoCartao(montarFaturas(f, k.id, HOJE))).toBe(0);
    expect(podeArquivarCartao(f, k.id, HOJE).permitida).toBe(false);
  });

  it('arquivar com gasto fixo ativo no cartão é negado', () => {
    const f = fatosVazios();
    const k = cartao(f, 'A');
    gastoFixo(f, [['2026-11', k]]);
    expect(podeArquivarCartao(f, k.id, HOJE)).toEqual({
      permitida: false,
      motivo: 'Há gasto fixo ativo pago neste cartão.',
    });
  });

  it('gasto fixo que passa a usar o cartão depois também impede', () => {
    const f = fatosVazios();
    const k = cartao(f, 'A');
    gastoFixo(f, [
      ['2026-11', null],
      ['2027-03', k],
    ]);
    expect(podeArquivarCartao(f, k.id, HOJE).permitida).toBe(false);
  });

  it('arquivar é permitido sem saldo e sem gasto fixo vigente no cartão', () => {
    const f = fatosVazios();
    const k = cartao(f, 'A');
    const outro = cartao(f, 'B');
    comprar(f, k, '2026-09-10', r$(300)); // out
    pagar(f, k, '2026-10', r$(300));
    gastoFixo(f, [['2026-11', k]], { ativa: false });
    gastoFixo(f, [['2026-01', k]], { fim: '2026-10' }); // já terminou
    gastoFixo(f, [
      ['2026-01', k],
      ['2026-06', outro], // mudou de cartão antes de hoje
    ]);
    expect(podeArquivarCartao(f, k.id, HOJE)).toEqual({ permitida: true });
  });

  it('excluir com compras é negado e oferece "Arquivar"', () => {
    const f = fatosVazios();
    const k = cartao(f, 'A');
    comprar(f, k, '2026-11-04', r$(100));
    expect(podeExcluirCartao(f, k.id)).toEqual({
      permitida: false,
      motivo: 'O cartão tem compras, encargos, estornos ou pagamentos. Use "Arquivar".',
    });
  });

  it('excluir com item de fatura, pagamento ou gasto fixo é negado', () => {
    const casos: ((f: Fatos, k: Cartao) => unknown)[] = [
      (f, k) => {
        item(f, k, 'saldo_anterior_cadastro', '2026-11', r$(900));
      },
      (f, k) => {
        pagar(f, k, '2026-12', r$(10));
      },
      (f, k) => {
        gastoFixo(f, [['2026-11', k]], { ativa: false });
      },
    ];
    for (const caso of casos) {
      const f = fatosVazios();
      const k = cartao(f, 'A');
      caso(f, k);
      expect(podeExcluirCartao(f, k.id).permitida).toBe(false);
    }
  });

  it('excluir cartão sem movimento é permitido', () => {
    const f = fatosVazios();
    const k = cartao(f, 'A');
    const outro = cartao(f, 'B');
    comprar(f, outro, '2026-11-04', r$(100));
    expect(podeExcluirCartao(f, k.id)).toEqual({ permitida: true });
  });
});
