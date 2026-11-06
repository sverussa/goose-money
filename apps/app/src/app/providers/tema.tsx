import {
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';

import { CHAVE_TEMA, ContextoTema, type Tema } from './useTema';

const consulta = () => window.matchMedia('(prefers-color-scheme: dark)');
const assinarSistema = (avisar: () => void) => {
  const mq = consulta();
  mq.addEventListener('change', avisar);
  return () => {
    mq.removeEventListener('change', avisar);
  };
};

function lerTema(): Tema {
  try {
    const t = localStorage.getItem(CHAVE_TEMA);
    return t === 'claro' || t === 'escuro' ? t : 'sistema';
  } catch {
    return 'sistema';
  }
}

/** Claro, escuro ou seguir o sistema (T04-02): a classe `dark` no `<html>` troca as variáveis. */
export function TemaProvider({ children }: { children: ReactNode }) {
  const [tema, setEstado] = useState<Tema>(lerTema);
  const sistemaEscuro = useSyncExternalStore(assinarSistema, () => consulta().matches);
  const escuro = tema === 'escuro' || (tema === 'sistema' && sistemaEscuro);

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', escuro);
  }, [escuro]);

  const setTema = useCallback((t: Tema) => {
    try {
      localStorage.setItem(CHAVE_TEMA, t);
    } catch {
      // Sem armazenamento: vale só nesta abertura.
    }
    setEstado(t);
  }, []);

  const valor = useMemo(() => ({ tema, escuro, setTema }), [tema, escuro, setTema]);
  return <ContextoTema value={valor}>{children}</ContextoTema>;
}
