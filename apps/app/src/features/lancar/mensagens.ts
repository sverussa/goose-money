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
  dicaTeclas: 'Enter salva · Esc fecha',
  erros: {
    valor: 'Informe um valor maior que zero',
    conta: 'Escolha a conta',
    categoria: 'Escolha a categoria',
    data: 'Informe a data',
  },
  semConta: {
    frase: 'Para lançar, cadastre antes a sua primeira conta.',
    acao: 'Cadastrar conta',
  },
} as const;
