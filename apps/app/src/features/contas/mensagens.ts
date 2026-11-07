/** Textos de Contas (6.4). A lista e o formulário não têm design (DESIGN-HANDOFF 7). */
export const mensagensContas = {
  totais: 'Totais das contas',
  saldoEmContas: 'Saldo em contas',
  saldoEmTodas: 'Saldo em todas as contas',
  nova: 'Nova conta',
  lista: 'Contas',
  foraDoTotal: 'Fora do total',
  arquivadas: (n: number) => `Arquivadas (${String(n)})`,
  arquivada: 'Arquivada',
  vazio: 'Cadastre sua primeira conta',
  semSaldo: 'Antes do saldo inicial',
  tipos: {
    corrente: 'Conta corrente',
    poupanca: 'Poupança',
    investimento: 'Investimento',
    dinheiro: 'Dinheiro',
    outra: 'Outra',
  },
  menu: {
    rotulo: (nome: string) => `Ações de ${nome}`,
    editar: 'Editar',
    arquivar: 'Arquivar',
    desarquivar: 'Desarquivar',
    excluir: 'Excluir',
  },
  formulario: {
    tituloNova: 'Nova conta',
    tituloEditar: 'Editar conta',
    nome: 'Nome',
    instituicao: 'Instituição (opcional)',
    tipo: 'Tipo',
    saldoInicial: 'Saldo inicial',
    dicaSaldo: 'Digite só números. "Negativo" vale para o cheque especial.',
    negativo: 'Negativo',
    dataSaldo: 'Data do saldo inicial',
    dicaData: 'Saldo no fim deste dia: os movimentos até essa data já estão nele.',
    cor: 'Cor',
    corN: (n: number) => `Cor ${String(n)}`,
    incluir: 'Incluir no total',
    dicaIncluir: 'Fora do total, a conta não entra em Saldo em contas nem em Previsto.',
    pagaCartao: 'A conta de pagamento de um cartão ativo precisa ficar no total.',
    previa: {
      titulo: 'O que muda ao salvar',
      saldo: (antes: string, depois: string) => `Saldo atual: ${antes} → ${depois}`,
      passam: (n: number) =>
        n === 1
          ? '1 movimento passa a ficar anterior ao saldo inicial'
          : `${String(n)} movimentos passam a ficar anteriores ao saldo inicial`,
      deixam: (n: number) =>
        n === 1
          ? '1 movimento deixa de ficar anterior ao saldo inicial'
          : `${String(n)} movimentos deixam de ficar anteriores ao saldo inicial`,
    },
    erros: {
      nome: 'Informe o nome',
      data: 'Informe a data',
    },
  },
} as const;
