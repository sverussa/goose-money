import { mensagensAcesso, SENHA_MINIMA } from './mensagens';

const m = mensagensAcesso.redefinir;

/** Nova senha e confirmação: mínimo do Auth e as duas iguais. `null` se estiver tudo certo. */
export function validarNovaSenha(nova: string, confirmar: string): string | null {
  if (nova.length < SENHA_MINIMA) return m.curta;
  if (nova !== confirmar) return m.diferentes;
  return null;
}

/** Código de erro do Supabase Auth ao trocar a senha → texto do formulário. */
export function mensagemDoErroDaSenha(codigo: string): string {
  switch (codigo) {
    case 'same_password':
      return m.mesma;
    case 'weak_password':
      return m.fraca;
    case 'sem_conexao':
      return m.semConexao;
    default:
      return m.erro;
  }
}
