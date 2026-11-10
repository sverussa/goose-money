import { mensagensRecorrencias as base } from '@/features/recorrencias/mensagens';

/** Textos de Gastos fixos (6.8, GastosFixos.dc.html). */
export const mensagensGastos = {
  totais: 'Totais dos gastos fixos',
  previsto: 'Previsto no mês',
  pago: 'Pago',
  aPagar: 'A pagar',
  vencido: 'Vencido',
  comprometimento: 'Comprometimento da renda',
  dicaComprometimento:
    '(gastos fixos + parcelas de compras parceladas + parcelas de dívidas do mês) ÷ rendas fixas do mês',
  nova: 'Novo gasto fixo',
  lista: (mes: string) => `Gastos fixos de ${mes}`,
  vazio:
    'Cadastre o aluguel, as contas da casa e as assinaturas para ver o mês inteiro antes dele.',
  semNoMes: 'Nenhum gasto fixo neste mês.',
  dia: 'dia',
  diaDoMes: (dia: number) => `Dia ${String(dia)}`,
  detalhe: {
    caiNaFatura: (mes: string) => `cai na fatura de ${mes}`,
    diaAjustado: (dia: number, vira: number, mes: string) =>
      `dia ${String(dia)} vira ${String(vira)} em ${mes}`,
    anterior: (mes: string, valor: string) => `${mes} foi ${valor}`,
  },
  nota: (nome: string, cartao: string, fatura: string) =>
    `${nome} é pago no ${cartao}: ao confirmar, vira compra à vista e entra na fatura de ${fatura}. Ele nunca é somado duas vezes na projeção.`,
  chip: {
    confirmada: (data: string) => `Paga · ${data}`,
    ignorada: 'Ignorado este mês',
    prevista: (data: string) => `Prevista · ${data}`,
    vencida: (data: string) => `Vencida · ${data}`,
    venceHoje: 'Vence hoje',
    venceAmanha: 'Vence amanhã',
    venceEm: (data: string) => `Vence ${data}`,
  },
  menu: {
    ...base.menu,
    detalheExcluir: 'Sai da lista e da projeção; os pagamentos já lançados continuam',
  },
  pagar: {
    ...base.confirmar,
    titulo: 'Pagar',
    acao: (nome: string) => `Pagar: ${nome}`,
    valor: 'Valor pago',
    data: 'Data do pagamento',
    entra: (valor: string, conta: string) => `Saem ${valor} de ${conta}.`,
  },
  noCartao: {
    ...base.confirmar,
    titulo: 'Confirmar no cartão',
    acao: (nome: string) => `Confirmar no cartão: ${nome}`,
    valor: 'Valor da compra',
    data: 'Data da compra',
    entra: (valor: string, cartao: string, fatura: string) =>
      `Vira uma compra à vista de ${valor} no ${cartao}, na fatura de ${fatura}.`,
  },
  formulario: {
    ...base.formulario,
    tituloNova: 'Novo gasto fixo',
    explicacao: 'Gasto que se repete todo mês, pago em conta ou no cartão.',
    dicaAutomatica: 'Lança o pagamento sozinho na data prevista, ao abrir o Goose Money.',
    criar: 'Criar gasto fixo',
  },
} as const;
