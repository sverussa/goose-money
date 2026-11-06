import { useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { mensagens } from '@/app/mensagens';
import * as auth from '@/data/auth';

import { ContextoSessao, type Sessao } from './useSessao';

interface Estado {
  usuario: auth.Usuario | null;
  carregando: boolean;
  erro: string | null;
}

/** Sessão do Supabase Auth (T03-01): as telas só aparecem depois de preparar o usuário (D39). */
export function SessaoProvider({ children }: { children: ReactNode }) {
  const consultas = useQueryClient();
  const navegar = useNavigate();
  const [estado, setEstado] = useState<Estado>({ usuario: null, carregando: true, erro: null });
  // Usuário já preparado nesta abertura do app: renovar o token não chama de novo.
  const preparado = useRef<string | null>(null);
  const ultimo = useRef<auth.Usuario | null>(null);

  const tratar = useCallback(async (usuario: auth.Usuario | null) => {
    ultimo.current = usuario;
    if (!usuario) {
      preparado.current = null;
      setEstado({ usuario: null, carregando: false, erro: null });
      return;
    }
    if (preparado.current !== usuario.id) {
      setEstado({ usuario: null, carregando: true, erro: null });
      try {
        await auth.inicializarUsuario();
      } catch {
        if (ultimo.current === usuario)
          setEstado({ usuario: null, carregando: false, erro: mensagens.sessao.erroAoPreparar });
        return;
      }
      preparado.current = usuario.id;
    }
    // Outra mudança chegou durante a preparação: vale a mais nova.
    if (ultimo.current === usuario) setEstado({ usuario, carregando: false, erro: null });
  }, []);

  useEffect(() => auth.aoMudarSessao((u) => void tratar(u)), [tratar]);

  const valor = useMemo<Sessao>(
    () => ({
      ...estado,
      tentarDeNovo: () => void tratar(ultimo.current),
      entrar: async (email, senha, manterConectado) => {
        // Até o aviso de sessão chegar, a rota protegida espera em vez de voltar ao login.
        setEstado((e) => ({ ...e, carregando: true }));
        const erro = await auth.entrar(email, senha, manterConectado);
        if (erro) setEstado((e) => ({ ...e, carregando: false }));
        return erro;
      },
      sair: async () => {
        await auth.sair();
        consultas.clear();
        void navegar('/login', { replace: true });
      },
    }),
    [estado, tratar, consultas, navegar],
  );

  return <ContextoSessao.Provider value={valor}>{children}</ContextoSessao.Provider>;
}
