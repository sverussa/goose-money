import { isAuthApiError, isAuthRetryableFetchError } from '@supabase/supabase-js';

import { mensagens } from '@/app/mensagens';

/** Erro do Supabase Auth ao entrar → texto da tela de login (PROMPT 6.1). */
export function mensagemDoErroAoEntrar(erro: unknown, online = true): string {
  const m = mensagens.sessao;
  if (!online || isAuthRetryableFetchError(erro) || erro instanceof TypeError) return m.semConexao;
  if (isAuthApiError(erro)) {
    if (erro.code === 'invalid_credentials') return m.credencialInvalida;
    if (erro.code === 'email_not_confirmed') return m.emailNaoConfirmado;
  }
  return m.erroAoEntrar;
}
