import { useSyncExternalStore } from 'react';

// Largura compact do M3 (< 600 dp, `--breakpoint-medium`): o formulário abre em tela cheia (5.1).
const CONSULTA = '(width < 600px)';

const assinar = (aviso: () => void) => {
  const mql = window.matchMedia(CONSULTA);
  mql.addEventListener('change', aviso);
  return () => {
    mql.removeEventListener('change', aviso);
  };
};

export const useCompact = (): boolean =>
  useSyncExternalStore(assinar, () => window.matchMedia(CONSULTA).matches);
