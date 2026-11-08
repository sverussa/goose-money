/** Textos de Dívidas (6.6, DividaDetalhe.dc.html). */
export const mensagensDividas = {
  totais: 'Totais das dívidas',
  saldoDevedor: 'Saldo devedor de dívidas',
  aVencerNoMes: (mes: string) => `Parcelas a vencer em ${mes}`,
  nova: 'Nova dívida',
  lista: 'Dívidas cadastradas',
  vazio: 'Cadastre um empréstimo ou financiamento para acompanhar parcelas e saldo devedor.',
  tipo: { emprestimo: 'Empréstimo', financiamento: 'Financiamento' },
  sistema: { price: 'Price', sac: 'SAC', parcela_informada: 'Parcela informada' },
  destino: { creditado_em_conta: 'Creditado em conta', pago_a_terceiro: 'Pago a terceiro' },
  progresso: (pagas: number, total: number) => `${String(pagas)}/${String(total)}`,
  quita: (mes: string) => `quita ${mes}`,
  quitada: 'quitada',
  parcelasPagas: (pagas: number, total: number) =>
    `Parcelas pagas: ${String(pagas)} de ${String(total)}`,
  proxima: (data: string, valor: string) => `Próxima: ${data} · ${valor}`,
  semProxima: 'Todas as parcelas pagas',
  naoEncontrada: 'Esta dívida não existe mais.',
  voltar: 'Voltar para Dívidas',
  detalhe: {
    amortizar: 'Amortizar',
    registrarPagamento: 'Registrar pagamento',
    menu: (credor: string) => `Ações de ${credor}`,
    excluir: 'Excluir dívida',
    detalheExcluir: 'A dívida e as parcelas saem do Goose Money',
    resumo: 'Resumo do contrato',
    valorContratado: 'Valor contratado',
    taxaInformada: 'Taxa informada',
    taxaImplicita: 'Taxa implícita',
    dicaTaxaImplicita:
      'Calculada a partir do valor contratado, do valor da parcela e do número de parcelas.',
    taxa: (taxa: string) => `${taxa} a.m.`,
    sistema: (nome: string) => `Sistema · ${nome}`,
    oQueE: (termo: string) => `O que é ${termo}?`,
    dicaSistema: {
      price: 'Price: parcelas iguais; os juros diminuem e a amortização aumenta a cada mês.',
      sac: 'SAC: a amortização é igual em todas as parcelas; os juros e a parcela diminuem a cada mês.',
      parcela_informada:
        'Parcela informada: o valor da parcela vem do contrato e a taxa é calculada a partir dele.',
    },
    parcelas: (n: number, valor: string) => `${String(n)} × ${valor}`,
    nParcelas: (n: number) => `${String(n)} parcelas`,
    destino: 'Destino do valor',
    totalPago: 'Total pago',
    juros: 'Juros pagos · a pagar',
    jurosValores: (pagos: string, aPagar: string) => `${pagos} · ${aPagar}`,
    comoConta: {
      pago_a_terceiro: (categoria: string) =>
        `Como o valor foi pago direto a terceiro, cada parcela inteira conta como despesa de ${categoria} no mês em que vence.`,
      creditado_em_conta:
        'Como o valor entrou na conta, só os juros de cada parcela contam como despesa; a amortização devolve o que entrou.',
    },
    semCategoria: 'A classificar',
    antesDoCadastro: (n: number) =>
      n === 1
        ? 'A parcela paga antes do cadastro não gera histórico.'
        : `As ${String(n)} parcelas pagas antes do cadastro não geram histórico.`,
  },
  graficos: {
    numero: 'Parcela',
    saldo: {
      emAberto: (saldo: string, mes: string) => `Faltam ${saldo}, zerando em ${mes}`,
      quitada: 'Dívida quitada: o saldo devedor chegou a zero',
      subtitulo: (n: number, pagas: number) =>
        `Saldo devedor após cada parcela · vida da dívida (${String(n)} parcelas) · hoje, ${String(pagas)} pagas`,
      pago: 'Saldo devedor',
      previsto: 'Saldo devedor previsto',
      vazio: 'Sem saldo devedor nesta dívida',
    },
    juros: {
      amortizacaoCresce: 'A cada parcela, menos juros e mais amortização',
      amortizacaoConstante: 'A cada parcela, menos juros e a mesma amortização',
      outra: (fatia: string) => `Juros são ${fatia} do total das parcelas`,
      semJuros: 'Sem juros: cada parcela só amortiza a dívida',
      subtitulo: 'Juros × amortização por parcela · vida da dívida',
      juros: 'Juros',
      amortizacao: 'Amortização',
      vazio: 'Sem parcelas nesta dívida',
    },
    dicaDoClique: 'Clique numa parcela para ver a linha na tabela.',
  },
  tabela: {
    titulo: 'Tabela de amortização',
    nota: (n: number) =>
      `${String(n)} parcelas · a última parcela ajusta os centavos para zerar o saldo`,
    numero: 'Nº',
    vencimento: 'Vencimento',
    parcela: 'Parcela',
    juros: 'Juros',
    amortizacao: 'Amortização',
    saldo: 'Saldo devedor',
    status: 'Status',
    aVencer: 'A vencer',
    proxima: 'A vencer · próxima',
    vencida: 'Vencida',
  },
  excluir: {
    titulo: (credor: string) => `Excluir ${credor}?`,
    explicacao: (n: number) =>
      `A dívida e as ${String(n)} parcelas saem do Goose Money. Dá para desfazer logo depois.`,
    confirmar: 'Excluir dívida',
    voltar: 'Voltar',
  },
};
