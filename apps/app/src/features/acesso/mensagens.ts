/** Textos do login, de "Criar conta", de "Esqueci a senha" e de "Nova senha" (D10). */

/** Mínimo do Supabase Auth (`minimum_password_length`, D28). */
export const SENHA_MINIMA = 8;

export const mensagensAcesso = {
  login: {
    apoio: 'Entre para ver quanto você tem, quanto deve e quanto vai sobrar.',
    mostrarSenha: 'Mostrar senha',
    ocultarSenha: 'Ocultar senha',
    manterConectado: 'Manter conectado neste dispositivo',
    criarConta: 'Criar conta',
    // T05-30: o texto de `mensagens.sessao.emailNaoConfirmado` no login.
    emailNaoConfirmado: 'Confirme seu e-mail para entrar',
  },
  criar: {
    titulo: 'Criar conta',
    explicacao:
      'Informe seu e-mail e uma senha. Você vai receber um link para confirmar o cadastro.',
    confirmar: 'Confirmar senha',
    criar: 'Criar conta',
    salvando: 'Salvando…',
    emailInvalido: 'Informe um e-mail válido',
    // Neutra: não revela se a conta já existe (6.1, D28).
    enviado: 'Se o e-mail puder ser cadastrado, você vai receber um link de confirmação',
    semConexao: 'Sem conexão para criar a conta',
    erro: 'Não foi possível criar a conta. Tente de novo.',
    jaTenhoConta: 'Já tenho conta',
  },
  confirmar: {
    titulo: 'Confirmar e-mail',
    verificando: 'Verificando o link…',
    invalido: 'Link inválido ou expirado',
    voltar: 'Voltar ao login',
  },
  esqueciSenha: 'Esqueci a senha',
  voltarAoLogin: 'Voltar para o login',
  esqueci: {
    titulo: 'Esqueci a senha',
    explicacao: 'Informe o e-mail da conta para receber um link de redefinição.',
    enviar: 'Enviar link',
    enviando: 'Enviando…',
    // Neutra: não revela se o e-mail tem conta (6.1).
    enviado: 'Se o e-mail estiver cadastrado, você vai receber um link para criar uma senha nova.',
    semConexao: 'Sem conexão para enviar o link',
    erro: 'Não foi possível enviar o link. Tente de novo em alguns minutos.',
  },
  redefinir: {
    titulo: 'Nova senha',
    nova: 'Nova senha',
    confirmar: 'Confirmar nova senha',
    salvar: 'Salvar senha',
    salvando: 'Salvando…',
    verificando: 'Verificando o link…',
    invalido: 'Link inválido ou expirado',
    pedirNovo: 'Pedir novo link',
    curta: `A senha precisa ter pelo menos ${String(SENHA_MINIMA)} caracteres`,
    diferentes: 'As senhas não são iguais',
    mesma: 'A nova senha precisa ser diferente da atual',
    fraca: 'Senha fraca: escolha outra',
    semConexao: 'Sem conexão para salvar a senha',
    erro: 'Não foi possível salvar a senha. Tente de novo.',
    alterada: 'Senha alterada. Entre com a senha nova.',
  },
} as const;
