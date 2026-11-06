/** Textos do login, de "Esqueci a senha" e de "Nova senha" (D10). */

/** Mínimo do Supabase Auth (`minimum_password_length`, D28). */
export const SENHA_MINIMA = 8;

export const mensagensAcesso = {
  login: {
    apoio: 'Entre para ver quanto você tem, quanto deve e quanto vai sobrar.',
    mostrarSenha: 'Mostrar senha',
    ocultarSenha: 'Ocultar senha',
    manterConectado: 'Manter conectado neste dispositivo',
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
