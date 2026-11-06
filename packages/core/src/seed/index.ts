import { datasDaFatura, montarFaturas } from '../cartoes';
import {
  aplicar,
  type Comando,
  confirmarEmLote,
  confirmarOcorrencia,
  type Contexto,
  contratarDivida,
  criarCartao,
  criarConta,
  criarRecorrencia,
  lancar,
  lancarEncargoOuEstorno,
  novaCompra,
  novaVersaoDaRecorrencia,
  type NovaVersao,
  pagarFatura,
  registrarPagamentoDeParcela,
  salvarPreferencias,
} from '../comandos';
import {
  type Competencia,
  competenciaDe,
  type DataCivil,
  diaNoMes,
  somarDias,
  somarMeses,
  ultimaData,
} from '../datas';
import { type Centavos, centavos, D, paraCentavos } from '../dinheiro';
import {
  type Categoria,
  type CategoriaSistema,
  type Fatos,
  fatosVazios,
  type Id,
  type Lancamento,
  type TipoCategoria,
} from '../modelo';
import { previsao } from '../recorrencias';

/** Dados de exemplo de PROMPT 10, relativos a `hoje` (M0 = mês de hoje), montados pelos comandos. */

const r$ = (reais: number): Centavos => centavos(Math.round(reais * 100));

/** Id determinístico do usuário: a sequência nos 8 primeiros dígitos e o resto do `criadoPor`. */
export const geradorDeIds = (criadoPor: Id, inicio = 1): (() => Id) => {
  let n = inicio;
  return () => `${(n++).toString(16).padStart(8, '0')}${criadoPor.slice(8)}`;
};

type Inicial = [nome: string, tipo: TipoCategoria, icone: string, sistema: CategoriaSistema | null];
/** As 4 de sistema (MODELO-DADOS 3.1), as 8 de despesa da paleta, na ordem das cores, e "Renda" (D40, T02-08). */
const INICIAIS: Inicial[] = [
  ['A classificar', 'ambos', 'circle-help', 'a_classificar'],
  ['Juros e encargos', 'despesa', 'percent', 'juros_encargos'],
  ['Tarifas', 'despesa', 'receipt', 'tarifas'],
  ['Ajuste de saldo', 'ambos', 'scale', 'ajuste_saldo'],
  ['Moradia', 'despesa', 'house', null],
  ['Transporte', 'despesa', 'car', null],
  ['Alimentação', 'despesa', 'utensils', null],
  ['Compras', 'despesa', 'shopping-bag', null],
  ['Saúde e bem-estar', 'despesa', 'heart-pulse', null],
  ['Assinaturas', 'despesa', 'repeat', null],
  ['Lazer', 'despesa', 'party-popper', null],
  ['Outras', 'despesa', 'ellipsis', null],
  ['Renda', 'receita', 'banknote', null],
];
/** A paleta tem 8 cores; "Renda" usa a de "Outras", que nunca aparece com ela num gráfico de despesas. */
const corDe = (i: number) => `categorica-${String(Math.min(i, 8))}`;

/** Categorias de um usuário novo (D39, D40); a inicialização do banco é a T02-08. */
export function categoriasIniciais(ctx: Omit<Contexto, 'hoje'>): Categoria[] {
  let cor = 0;
  return INICIAIS.map(([nome, tipo, icone, sistema]) => ({
    id: ctx.novoId(),
    createdAt: ctx.agora,
    updatedAt: ctx.agora,
    createdBy: ctx.usuario,
    isDeleted: false,
    nome,
    tipo,
    icone,
    cor: sistema === null ? corDe(++cor) : null,
    categoriaPaiId: null,
    sistema,
  }));
}

/** Gerador congruente linear com semente fixa: o mesmo dia gera os mesmos dados. */
function sorteador(hoje: DataCivil) {
  let s = Number(hoje.replaceAll('-', ''));
  return (n: number): number => {
    s = (s * 1_103_515_245 + 12_345) % 2_147_483_648;
    return s % n;
  };
}

export function gerarSeed(hoje: DataCivil, criadoPor: Id): Fatos {
  const novoId = geradorDeIds(criadoPor);
  const agora = `${hoje}T12:00:00Z`;
  const ctx = (h: DataCivil = hoje): Contexto => ({ hoje: h, agora, usuario: criadoPor, novoId });
  const sorteio = sorteador(hoje);
  const mes = (k: number): Competencia => somarMeses(competenciaDe(hoje), k);
  const dia = (k: number, d: number): DataCivil => diaNoMes(mes(k), d);
  const inicio = ultimaData(mes(-4));

  let f: Fatos = { ...fatosVazios(), categorias: categoriasIniciais(ctx()) };
  const fazer = (cmd: (f: Fatos) => Comando): Id => {
    const c = cmd(f);
    f = aplicar(f, c.mudancas);
    return c.mudancas[0]?.id as Id;
  };
  const cat = (nome: string): Id => f.categorias.find((x) => x.nome === nome)?.id as Id;

  fazer((x) =>
    salvarPreferencias(x, ctx(), {
      limiteAlerta: r$(500),
      horizontePadrao: 12,
      ocultarValoresAoAbrir: false,
    }),
  );

  // Contas (saldo inicial no último dia de M−4)
  const conta = (
    nome: string,
    tipo: 'corrente' | 'poupanca' | 'dinheiro' | 'investimento',
    saldo: number,
    cor: number,
  ) =>
    fazer((x) =>
      criarConta(x, ctx(), {
        nome,
        instituicao: null,
        tipo,
        saldoInicial: r$(saldo),
        dataSaldoInicial: inicio,
        cor: `categorica-${String(cor)}`,
        incluirNoTotal: tipo !== 'investimento',
      }),
    );
  const corrente = conta('Conta corrente', 'corrente', 3200, 1);
  const poupanca = conta('Poupança', 'poupanca', 8000, 2);
  const carteira = conta('Carteira', 'dinheiro', 150, 3);
  const investimentos = conta('Investimentos', 'investimento', 15000, 4);

  // Cartões, controlados desde o saldo inicial
  const cartao = (
    nome: string,
    cor: string,
    limite: number,
    diaFechamento: number,
    diaVencimento: number,
  ) =>
    fazer((x) =>
      criarCartao(x, ctx(inicio), {
        nome,
        instituicao: null,
        cor,
        limite: r$(limite),
        contaPagamentoId: corrente,
        diaFechamento,
        diaVencimento,
        saldoFaturaFechada: r$(0),
      }),
    );
  const cartaoA = cartao('Cartão A', 'cartao-a', 8000, 3, 10);
  const cartaoB = cartao('Cartão B', 'cartao-b', 4000, 25, 5);

  // Recorrências desde M−3
  const versao = (
    valor: number,
    d: number,
    categoria: string,
    cartaoId: Id | null = null,
  ): NovaVersao => ({
    valor: r$(valor),
    dia: d,
    formaPagamento: cartaoId === null ? 'conta' : 'cartao',
    contaId: cartaoId === null ? corrente : null,
    cartaoId,
    categoriaId: cat(categoria),
  });
  const recorrencia = (
    natureza: 'renda' | 'gasto',
    descricao: string,
    v: NovaVersao,
    autoConfirmar = false,
  ) =>
    fazer((x) =>
      criarRecorrencia(
        x,
        ctx(),
        { natureza, descricao, competenciaInicio: mes(-3), competenciaFim: null, autoConfirmar },
        v,
      ),
    );
  recorrencia('renda', 'Salário', versao(6500, 5, 'Renda'), true);
  const freelance = recorrencia('renda', 'Freelance', versao(1000, 20, 'Renda'));
  fazer((x) => novaVersaoDaRecorrencia(x, ctx(), freelance, mes(-1), versao(1200, 20, 'Renda')));
  const energia = recorrencia('gasto', 'Energia', versao(180, 31, 'Moradia'));
  const gastos = [
    recorrencia('gasto', 'Aluguel', versao(1800, 10, 'Moradia')),
    recorrencia('gasto', 'Internet', versao(119.9, 15, 'Moradia')),
    recorrencia('gasto', 'Academia', versao(99, 5, 'Saúde e bem-estar')),
    energia,
    recorrencia('gasto', 'Streaming', versao(55.9, 12, 'Assinaturas', cartaoA)),
  ];

  // Lançamentos avulsos
  const lancamento = (
    campos: Partial<Lancamento> & Pick<Lancamento, 'tipo' | 'data' | 'valor' | 'contaId'>,
  ) =>
    fazer((x) =>
      lancar(x, ctx(), {
        status: 'efetivado',
        descricao: null,
        observacao: null,
        contaDestinoId: null,
        categoriaId: null,
        cartaoId: null,
        faturaCompetencia: null,
        dividaId: null,
        parcelaDividaId: null,
        ...campos,
      }),
    );
  lancamento({
    tipo: 'receita',
    status: 'previsto',
    data: dia(1, 20),
    valor: r$(3250),
    descricao: '13º salário',
    contaId: corrente,
    categoriaId: cat('Renda'),
  });
  lancamento({
    tipo: 'despesa',
    status: 'previsto',
    data: dia(2, 15),
    valor: r$(1300),
    descricao: 'IPVA',
    contaId: corrente,
    categoriaId: cat('Transporte'),
  });

  // Dívidas: as primeiras parcelas foram pagas antes do cadastro (em M−4)
  const credito = { valorParcelaInformada: null, contaDebitoId: corrente } as const;
  fazer((x) =>
    contratarDivida(
      x,
      ctx(inicio),
      {
        ...credito,
        tipo: 'financiamento',
        credor: 'Financiamento do veículo',
        valorContratado: r$(40000),
        dataContratacao: dia(-16, 10),
        destinoDoValor: 'pago_a_terceiro',
        sistemaAmortizacao: 'price',
        taxaMensal: '0.0149',
        numeroParcelas: 48,
        dataPrimeiraParcela: dia(-15, 10),
        categoriaId: cat('Transporte'),
      },
      { parcelasPagas: 12, contaCaptacaoId: null },
    ),
  );
  fazer((x) =>
    contratarDivida(
      x,
      ctx(inicio),
      {
        ...credito,
        tipo: 'emprestimo',
        credor: 'Empréstimo pessoal',
        valorContratado: r$(4800),
        dataContratacao: dia(-7, 15),
        destinoDoValor: 'creditado_em_conta',
        sistemaAmortizacao: 'parcela_informada',
        taxaMensal: null,
        valorParcelaInformada: r$(450),
        numeroParcelas: 12,
        dataPrimeiraParcela: dia(-6, 15),
        categoriaId: null,
      },
      { parcelasPagas: 3, contaCaptacaoId: null },
    ),
  );

  // Compras no cartão
  const compra = (
    cartaoId: Id,
    data: DataCivil,
    descricao: string,
    categoria: string,
    valor: Centavos,
    n = 1,
  ) =>
    fazer((x) =>
      novaCompra(x, ctx(), {
        cartaoId,
        data,
        descricao,
        categoriaId: cat(categoria),
        observacao: null,
        valorTotal: valor,
        numeroParcelas: n,
      }),
    );
  compra(cartaoA, dia(-2, 12), 'Notebook', 'Compras', r$(4200), 10);
  compra(cartaoB, dia(-1, 8), 'Geladeira', 'Compras', r$(2400), 6);
  compra(cartaoA, hoje, 'Fone', 'Compras', r$(1000), 3);
  const avulsas = ['Alimentação', 'Transporte', 'Lazer', 'Compras', 'Saúde e bem-estar'];
  for (let k = -3; k <= 0; k++)
    for (let i = 15 + sorteio(11); i > 0; i--) {
      const data = dia(k, 1 + sorteio(31));
      if (data <= hoje)
        compra(
          sorteio(2) ? cartaoA : cartaoB,
          data,
          'Compra',
          avulsas[sorteio(5)] as string,
          centavos(1500 + sorteio(28500)),
        );
    }
  // No dia exato do fechamento: cai na fatura seguinte (3.5)
  compra(cartaoA, dia(-1, 3), 'Compra no dia do fechamento', 'Alimentação', r$(64.5));
  const tenis = compra(cartaoA, dia(-1, 5), 'Tênis', 'Compras', r$(89.9));
  fazer((x) =>
    lancarEncargoOuEstorno(x, ctx(), {
      tipo: 'estorno',
      cartaoId: cartaoA,
      valor: r$(89.9),
      data: dia(-1, 9),
      descricao: 'Estorno do tênis',
      compraId: tenis,
      categoriaId: null,
    }),
  );

  // Histórico em conta de M−3 até hoje
  const variadas = ['Alimentação', 'Transporte', 'Lazer', 'Saúde e bem-estar', 'Outras'];
  for (let k = -3; k <= 0; k++) {
    for (const [contaId, n, maximo] of [
      [corrente, 6, 40000],
      [carteira, 3, 5000],
    ] as const)
      for (let i = 0; i < n; i++) {
        const data = dia(k, 1 + sorteio(31));
        if (data <= hoje)
          lancamento({
            tipo: 'despesa',
            data,
            valor: centavos(1000 + sorteio(maximo)),
            contaId,
            categoriaId: cat(variadas[sorteio(5)] as string),
          });
      }
    if (dia(k, 28) <= hoje)
      lancamento({
        tipo: 'receita',
        data: dia(k, 28),
        valor: centavos(4000 + sorteio(2000)),
        contaId: poupanca,
        descricao: 'Rendimentos',
        categoriaId: cat('Renda'),
      });
  }
  lancamento({
    tipo: 'transferencia',
    data: dia(-2, 6),
    valor: r$(1000),
    contaId: corrente,
    contaDestinoId: investimentos,
    descricao: 'Aplicação',
  });
  lancamento({
    tipo: 'transferencia',
    data: dia(-1, 8),
    valor: r$(200),
    contaId: corrente,
    contaDestinoId: carteira,
    descricao: 'Saque',
  });
  lancamento({
    tipo: 'despesa',
    data: somarDias(inicio, -2),
    valor: r$(120),
    contaId: corrente,
    descricao: 'Farmácia',
    categoriaId: cat('Saúde e bem-estar'),
  });
  for (const data of [dia(-1, 25), dia(0, 1)])
    lancamento({
      tipo: 'despesa',
      data,
      valor: r$(45),
      contaId: corrente,
      categoriaId: cat('A classificar'),
    });

  // Recorrências até hoje: Energia de M−1 com o valor real; Freelance de M0 fica atrasado
  for (let k = -3; k <= 0; k++)
    for (const r of [...gastos, ...(k < 0 ? [freelance] : [])]) {
      const p = previsao(
        f.recorrencias.find((x) => x.id === r) as Fatos['recorrencias'][number],
        f.recorrenciaVersoes,
        mes(k),
      );
      if (p && p.data <= hoje)
        fazer((x) =>
          confirmarOcorrencia(
            x,
            ctx(),
            r,
            mes(k),
            r === energia && k === -1 ? { valor: r$(212.4) } : {},
          ),
        );
    }
  fazer((x) => confirmarEmLote(x, ctx()));

  // Parcelas de dívida que venceram depois do cadastro, pagas no vencimento
  for (const p of [...f.parcelasDivida].sort((a, b) => (a.vencimento < b.vencimento ? -1 : 1)))
    if (!p.pagaAntesDoCadastro && p.vencimento <= hoje)
      fazer((x) => registrarPagamentoDeParcela(x, ctx(), p.id, { data: p.vencimento }));

  // Faturas vencidas pagas no vencimento: A de M−2 com R$ 50,00 a mais; B de M−1 em 60%
  for (const cartaoId of [cartaoA, cartaoB]) {
    const c = f.cartoes.find((x) => x.id === cartaoId) as Fatos['cartoes'][number];
    for (let m = c.competenciaInicial; m <= mes(0); m = somarMeses(m, 1)) {
      const { vencimento } = datasDaFatura(c, f.cartaoCiclos, m);
      if (vencimento >= hoje) continue;
      const saldo =
        montarFaturas(f, cartaoId, vencimento).find((x) => x.competencia === m)?.saldo ?? r$(0);
      const valor =
        cartaoId === cartaoA && m === mes(-2)
          ? centavos(saldo + r$(50))
          : cartaoId === cartaoB && m === mes(-1)
            ? paraCentavos(new D(saldo).times('0.6'))
            : saldo;
      if (valor > 0)
        fazer((x) =>
          pagarFatura(x, ctx(), { cartaoId, valor, data: vencimento, faturaCompetencia: m }),
        );
      if (cartaoId === cartaoB && m === mes(-1))
        fazer((x) =>
          lancarEncargoOuEstorno(x, ctx(), {
            tipo: 'encargo',
            cartaoId,
            valor: r$(38.7),
            data: somarDias(vencimento, 1),
            descricao: 'Juros do rotativo',
            compraId: null,
            categoriaId: cat('Juros e encargos'),
          }),
        );
    }
  }
  return f;
}
