import { createContext, useContext } from 'react';

/**
 * Lugares da casca que as telas preenchem por portal: o da top app bar (seletor de mês) e o logo
 * abaixo da Barra, fixo com ela (cabecalho de contexto, 4.2).
 */
export interface Slots {
  appBar: HTMLElement | null;
  cabecalho: HTMLElement | null;
}

export const ContextoSlots = createContext<Slots>({ appBar: null, cabecalho: null });

export const useSlots = (): Slots => useContext(ContextoSlots);
