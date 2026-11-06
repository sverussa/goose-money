/** Textos comuns do app (D10). Os de cada tela ficam em `src/features/<funcionalidade>/mensagens.ts`. */
export const mensagens = {
  app: 'Goose Money',
  carregando: 'Carregando…',
  tentarDeNovo: 'Tentar de novo',
  conexao: {
    titulo: 'Sem conexão',
    texto:
      'Os dados mostrados podem estar desatualizados e nada pode ser salvo até a internet voltar.',
    salvarBloqueado: 'Sem conexão: nada pode ser salvo agora',
  },
  carga: {
    erro: 'Não foi possível carregar os seus dados.',
  },
  gravacao: {
    desfazer: 'Desfazer',
    desfeito: 'Desfeito',
    salvar: 'Salvar',
    salvando: 'Salvando…',
    semConexao: 'Sem conexão: tente de novo quando a internet voltar',
    sessaoExpirada: 'Sua sessão expirou. Entre de novo para salvar.',
    duplicado: 'Já existe um registro com esses dados.',
    referencia: 'Um item ligado a este não existe mais. Atualize a página e tente de novo.',
    naoEncontrado: 'Este item não existe mais; talvez tenha sido excluído em outro aparelho.',
    regra: 'Os dados não passaram nas regras de gravação.',
    erro: 'Não foi possível salvar. Tente de novo.',
  },
  sessao: {
    entrar: 'Entrar',
    entrando: 'Entrando…',
    sair: 'Sair',
    email: 'E-mail',
    senha: 'Senha',
    manterConectado: 'Manter conectado',
    credencialInvalida: 'E-mail ou senha inválidos',
    semConexao: 'Sem conexão para entrar',
    emailNaoConfirmado: 'Confirme o e-mail antes de entrar',
    erroAoEntrar: 'Não foi possível entrar. Tente de novo.',
    erroAoPreparar: 'Não foi possível preparar a sua conta.',
  },
} as const;
