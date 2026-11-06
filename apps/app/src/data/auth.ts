import type { Session } from '@supabase/supabase-js';

import { CHAVE_MANTER_CONECTADO } from './armazenamento';
import { mensagemDoErroAoEntrar } from './errosAuth';
import { supabase } from './supabase';

// Único lugar do app que chama `supabase.auth` (T03-01).

export interface Usuario {
  id: string;
  email: string | null;
}

const usuarioDa = (s: Session | null): Usuario | null =>
  s ? { id: s.user.id, email: s.user.email ?? null } : null;

/** Entra com e-mail e senha. Devolve a mensagem de erro para a tela, ou `null` se entrou. */
export async function entrar(
  email: string,
  senha: string,
  manterConectado: boolean,
): Promise<string | null> {
  // Decide o armazenamento antes de a sessão ser gravada (armazenamento.ts).
  localStorage.setItem(CHAVE_MANTER_CONECTADO, String(manterConectado));
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    return error ? mensagemDoErroAoEntrar(error, navigator.onLine) : null;
  } catch (e) {
    return mensagemDoErroAoEntrar(e, navigator.onLine);
  }
}

/** Encerra a sessão só neste aparelho. Sem rede, a sessão local é removida do mesmo jeito. */
export async function sair(): Promise<void> {
  await supabase.auth.signOut({ scope: 'local' });
}

export async function sessaoAtual(): Promise<Usuario | null> {
  const { data } = await supabase.auth.getSession();
  return usuarioDa(data.session);
}

/**
 * Avisa a cada mudança de sessão, começando pela atual. O aviso sai fora do callback do Supabase:
 * chamar o Supabase dentro dele trava a fila do Auth.
 */
export function aoMudarSessao(cb: (usuario: Usuario | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_evento, sessao) => {
    setTimeout(() => {
      cb(usuarioDa(sessao));
    }, 0);
  });
  return () => {
    data.subscription.unsubscribe();
  };
}

/** Prepara as categorias de sistema e as preferências do usuário (T02-08, D39). Idempotente. */
export async function inicializarUsuario(): Promise<void> {
  const { error } = await supabase.rpc('inicializar_usuario');
  if (error) throw new Error(error.message);
}

/** E-mail de "Esqueci a senha"; o link volta para `redirectTo` com `?code=` (PKCE, T03-08). */
export async function pedirRedefinicao(email: string, redirectTo: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

export async function redefinirSenha(nova: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: nova });
  if (error) throw error;
}
