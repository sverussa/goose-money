import { QueryClient } from '@tanstack/react-query';

/** Cache dos fatos do usuário (D18, D20): recarrega ao voltar o foco e a conexão. */
export const clienteDeConsultas = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
      staleTime: 30_000,
    },
  },
});
