import { createContext, useContext } from 'react';

/** Abre o formulário de lançamento de qualquer tela (FAB, tecla N, busca). */
export const ContextoLancar = createContext<() => void>(() => undefined);

export const useLancar = (): (() => void) => useContext(ContextoLancar);
