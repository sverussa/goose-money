/** Rota de login com a rota pedida em `voltar` (PROMPT 6.1). */
export function urlDoLogin(rotaPedida: string): string {
  return rotaPedida === '/' ? '/login' : `/login?voltar=${encodeURIComponent(rotaPedida)}`;
}

/**
 * Para onde ir depois de entrar. Só rotas internas: `voltar` vem da URL e não pode levar a outro
 * site (`//x.com`, `https://…`) nem de volta ao login.
 */
export function rotaDeVolta(busca: string): string {
  const voltar = new URLSearchParams(busca).get('voltar');
  if (!voltar?.startsWith('/') || voltar.startsWith('//') || voltar.startsWith('/login'))
    return '/';
  return voltar;
}
