/** Chave da preferência "Manter conectado" (tela de login, T05-01). Fica sempre no localStorage. */
export const CHAVE_MANTER_CONECTADO = 'goose-money:manter-conectado';

type Armazenamento = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/**
 * Sessão do Supabase em localStorage com "Manter conectado"; senão em sessionStorage (PROMPT 6.1).
 */
export function criarArmazenamentoSessao(local: Armazenamento, sessao: Armazenamento) {
  // O verificador do PKCE (T03-08) fica sempre no localStorage: o link do e-mail costuma abrir
  // numa aba nova, que não vê o sessionStorage da aba que pediu. Ele some depois da troca.
  const escolhido = (chave: string) =>
    chave.endsWith('-code-verifier') || local.getItem(CHAVE_MANTER_CONECTADO) === 'true'
      ? local
      : sessao;
  return {
    getItem: (chave: string) => escolhido(chave).getItem(chave),
    setItem: (chave: string, valor: string) => {
      escolhido(chave).setItem(chave, valor);
    },
    // Sair apaga dos dois, para não sobrar sessão se a preferência mudou.
    removeItem: (chave: string) => {
      local.removeItem(chave);
      sessao.removeItem(chave);
    },
  };
}
