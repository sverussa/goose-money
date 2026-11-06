/** Textos do formulário de lançamento (7.1–7.3, LancarDialog.dc.html). */
export const mensagensLancar = {
  fab: 'Lançar',
  titulo: 'Novo lançamento',
  tipos: {
    rotulo: 'Tipo de lançamento',
    despesa: 'Despesa',
    receita: 'Receita',
    compra: 'Compra no cartão',
    transferencia: 'Transferência',
    pagamento: 'Pagamento de fatura',
  },
  valor: 'Valor',
  dicaValor: 'Digite só números: 1590 vira R$ 15,90',
  descricao: 'Descrição (opcional)',
  categoria: 'Categoria',
  data: 'Data',
  conta: 'Conta',
  cartao: 'Cartão',
  de: 'De',
  para: 'Para',
  fatura: 'Fatura',
  faturaDe: (mes: string) => `fatura de ${mes}`,
  caiNaFatura: (mes: string) => `Cai na fatura de ${mes}.`,
  saldoTotal: 'Saldo total',
  previa: {
    resta: (valor: string) => `Depois do pagamento, restam ${valor} nesta fatura.`,
    quita: 'O pagamento quita esta fatura.',
    credito: (valor: string) => `Sobram ${valor} de crédito para a próxima fatura.`,
  },
  /** Transferência entre contas com inclusão diferente no total (3.10). */
  aviso: {
    cai: (fora: string, valor: string) =>
      `${fora} está fora do total: o Saldo em contas vai cair ${valor}. Resultado e Patrimônio líquido não mudam.`,
    sobe: (fora: string, valor: string) =>
      `${fora} está fora do total: o Saldo em contas vai subir ${valor}. Resultado e Patrimônio líquido não mudam.`,
  },
  dicaTeclas: 'Enter salva · Esc fecha',
  erros: {
    valor: 'Informe um valor maior que zero',
    conta: 'Escolha a conta',
    categoria: 'Escolha a categoria',
    data: 'Informe a data',
    cartao: 'Escolha o cartão',
    fatura: 'Escolha a fatura',
    contaDestino: 'Escolha a conta de destino',
    mesmaConta: 'Escolha uma conta de destino diferente da origem',
  },
  semCartao: {
    frase: 'Para lançar no cartão, cadastre antes um cartão.',
    acao: 'Cadastrar cartão',
  },
  semConta: {
    frase: 'Para lançar, cadastre antes a sua primeira conta.',
    acao: 'Cadastrar conta',
  },
} as const;
