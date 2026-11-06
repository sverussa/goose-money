import { createContext, useContext } from 'react';

import type { Usuario } from '@/data/auth';

export interface Sessao {
  usuario: Usuario | null;
  /** Lendo a sessão salva, entrando ou preparando o usuário (T02-08). */
  carregando: boolean;
  /** A preparação do usuário falhou; as telas ficam bloqueadas até `tentarDeNovo`. */
  erro: string | null;
  tentarDeNovo: () => void;
  /** Devolve a mensagem de erro, ou `null` se entrou. */
  entrar: (email: string, senha: string, manterConectado: boolean) => Promise<string | null>;
  sair: () => Promise<void>;
}

export const ContextoSessao = createContext<Sessao | null>(null);

export function useSessao(): Sessao {
  const s = useContext(ContextoSessao);
  if (!s) throw new Error('useSessao fora do SessaoProvider');
  return s;
}
