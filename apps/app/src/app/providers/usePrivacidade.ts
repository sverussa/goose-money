import { createContext, useContext } from 'react';

export interface Privacidade {
  /** Modo privacidade: todo `MoneyText` mostra "R$ ••••••" (5.3). */
  oculto: boolean;
  alternar: () => void;
}

export const ContextoPrivacidade = createContext<Privacidade | null>(null);

export function usePrivacidade(): Privacidade {
  const p = useContext(ContextoPrivacidade);
  if (!p) throw new Error('usePrivacidade fora do PrivacidadeProvider');
  return p;
}
