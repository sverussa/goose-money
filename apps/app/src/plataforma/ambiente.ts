/** Rodando dentro do app desktop (Tauri 2), e não no navegador. */
export const estaNoTauri = (): boolean =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

/**
 * Para onde o link de um e-mail do Auth volta (T03-08): `goosemoney://<rota>` no desktop, a
 * rota do `HashRouter` no navegador. No navegador, `?retorno=` vai antes do `#` porque, num link
 * expirado, o Auth troca o `#/<rota>` pelo erro e só mantém a busca.
 */
export const urlDeRetorno = (rota: string): string =>
  estaNoTauri()
    ? `goosemoney://${rota}`
    : `${window.location.origin}${window.location.pathname}?retorno=${rota}#/${rota}`;
