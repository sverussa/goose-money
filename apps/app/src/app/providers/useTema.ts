import { createContext, useContext } from 'react';

export type Tema = 'claro' | 'escuro' | 'sistema';

/** Preferência do aparelho (D20, D64); `public/tema-inicial.js` lê a mesma chave. */
export const CHAVE_TEMA = 'goose-money:tema';

export interface ContextoDeTema {
  tema: Tema;
  /** O tema em uso agora (em "sistema", o do SO). */
  escuro: boolean;
  setTema: (tema: Tema) => void;
}

export const ContextoTema = createContext<ContextoDeTema | null>(null);

export function useTema(): ContextoDeTema {
  const t = useContext(ContextoTema);
  if (!t) throw new Error('useTema fora do TemaProvider');
  return t;
}
