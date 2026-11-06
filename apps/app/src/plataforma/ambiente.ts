/** Rodando dentro do app desktop (Tauri 2), e não no navegador. */
export const estaNoTauri = (): boolean =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
