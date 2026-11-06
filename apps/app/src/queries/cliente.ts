import { onlineManager, QueryClient } from '@tanstack/react-query';

import { conexao } from '@/data/supabase';

// O TanStack pausa e retoma as consultas pela mesma conexão do banner (T03-05).
onlineManager.setEventListener((definir) =>
  conexao.assinar(() => {
    definir(conexao.online());
  }),
);

/**
 * Cache dos fatos do usuário (D18, D20): recarrega ao voltar o foco e, sempre, ao voltar a
 * conexão (outro aparelho pode ter gravado enquanto este estava sem rede).
 */
export const clienteDeConsultas = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      refetchOnReconnect: 'always',
      retry: 1,
      staleTime: 30_000,
    },
    // Gravação sem conexão falha na hora com mensagem (useComando), em vez de ficar pausada.
    mutations: { networkMode: 'always' },
  },
});
