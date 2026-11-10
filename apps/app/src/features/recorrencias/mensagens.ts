/** Textos comuns a Rendas fixas e Gastos fixos (3.8, 6.7, 6.8): formulário e confirmação. */
export const mensagensRecorrencias = {
  menu: {
    rotulo: (nome: string) => `Ações de ${nome}`,
    ignorar: 'Ignorar este mês',
    detalheIgnorar: 'Sai da projeção e dos totais deste mês',
    editar: 'Editar',
    excluir: 'Excluir',
  },
  confirmar: {
    explicacao: (nome: string, mes: string) => `${nome} de ${mes}`,
    dataInvalida: 'Informe uma data válida.',
    dataFutura: 'A data não pode ser depois de hoje.',
    previa: 'Antes de salvar',
    diferenca: (valor: string, mais: boolean) =>
      `${valor} ${mais ? 'a mais' : 'a menos'} que o previsto.`,
  },
  formulario: {
    tituloEditar: (nome: string) => `Editar ${nome}`,
    descricao: 'Descrição',
    valor: 'Valor',
    dia: 'Dia',
    forma: 'Forma de pagamento',
    formas: { conta: 'Em conta', cartao: 'No cartão' },
    conta: 'Conta',
    cartao: 'Cartão',
    notaFatura: 'Fatura do cartão',
    fatura: (mes: string, fatura: string) => `O gasto de ${mes} cai na fatura de ${fatura}.`,
    categoria: 'Categoria',
    inicio: 'Começa em',
    dicaInicio: 'O mês de início não muda depois de criada.',
    fim: 'Termina em (opcional)',
    automatica: 'Confirmação automática',
    aPartirDe: 'Aplicar a partir de',
    opcao: (mes: string, primeira: boolean) => (primeira ? `${mes} · 1ª não confirmada` : mes),
    vale: (mes: string) => `Vale de ${mes} em diante.`,
    continua: (mes: string, valor: string) =>
      `${mes.charAt(0).toLocaleUpperCase('pt-BR')}${mes.slice(1)} continua ${valor}: meses já confirmados nunca mudam. Para corrigir um mês passado, edite o lançamento dele.`,
    historico: 'Histórico de versões',
    nova: 'nova',
    desde: (mes: string) => `a partir de ${mes}`,
    intervalo: (de: string, ate: string) => (de === ate ? de : `${de} – ${ate}`),
    versao: (valor: string, dia: number) => `${valor} · dia ${String(dia)}`,
    salvarNova: 'Salvar nova versão',
    erros: {
      descricao: 'Informe a descrição.',
      valor: 'Informe um valor maior que zero.',
      dia: 'Informe um dia de 1 a 31.',
      conta: 'Escolha a conta.',
      cartao: 'Escolha o cartão.',
      categoria: 'Escolha a categoria.',
      mes: 'Informe o mês.',
      fimAntes: 'O fim não pode ser antes do início.',
    },
  },
} as const;

/** O que muda entre Rendas e Gastos fixos no formulário. */
export type TextosDoFormulario = typeof mensagensRecorrencias.formulario & {
  tituloNova: string;
  explicacao: string;
  dicaAutomatica: string;
  criar: string;
};

/** O que muda entre "Confirmar recebimento", "Pagar" e "Confirmar no cartão". */
export type TextosDaConfirmacao = typeof mensagensRecorrencias.confirmar & {
  titulo: string;
  valor: string;
  data: string;
  /** A frase da prévia: o valor e a conta, ou o cartão e a fatura (`mes` só no cartão). */
  entra: (valor: string, onde: string, mes: string) => string;
};
