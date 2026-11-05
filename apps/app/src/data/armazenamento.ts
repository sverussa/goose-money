/** Chave da preferência "Manter conectado" (tela de login, T05-01). Fica sempre no localStorage. */
export const CHAVE_MANTER_CONECTADO = 'goose-money:manter-conectado';

type Armazenamento = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/**
 * Sessão do Supabase em localStorage com "Manter conectado"; senão em sessionStorage (PROMPT 6.1).
 */
export function criarArmazenamentoSessao(local: Armazenamento, sessao: Armazenamento) {
  const escolhido = () => (local.getItem(CHAVE_MANTER_CONECTADO) === 'true' ? local : sessao);
  return {
    getItem: (chave: string) => escolhido().getItem(chave),
    setItem: (chave: string, valor: string) => {
      escolhido().setItem(chave, valor);
    },
    // Sair apaga dos dois, para não sobrar sessão se a preferência mudou.
    removeItem: (chave: string) => {
      local.removeItem(chave);
      sessao.removeItem(chave);
    },
  };
}
