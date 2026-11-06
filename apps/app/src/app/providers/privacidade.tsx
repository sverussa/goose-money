import { type ReactNode, useCallback, useMemo, useState } from 'react';

import { useFatos } from '@/queries/fatos';

import { ContextoPrivacidade } from './usePrivacidade';

const CHAVE = 'goose-money:privacidade';

function lerEscolha(): boolean | null {
  try {
    const v = sessionStorage.getItem(CHAVE);
    return v === null ? null : v === 'true';
  } catch {
    return null;
  }
}

/**
 * Modo privacidade (5.3): ao abrir, segue a preferência "ocultar valores ao abrir" (6.9); a
 * escolha feita no botão de olho vale até fechar o app (sessionStorage).
 */
export function PrivacidadeProvider({ children }: { children: ReactNode }) {
  const fatos = useFatos();
  const [escolha, setEscolha] = useState(lerEscolha);
  const preferencia =
    fatos.estado === 'pronto' ? (fatos.dados.preferencias?.ocultarValoresAoAbrir ?? false) : false;
  const oculto = escolha ?? preferencia;

  const alternar = useCallback(() => {
    const novo = !oculto;
    try {
      sessionStorage.setItem(CHAVE, String(novo));
    } catch {
      // Sem armazenamento: vale até recarregar.
    }
    setEscolha(novo);
  }, [oculto]);

  const valor = useMemo(() => ({ oculto, alternar }), [oculto, alternar]);
  return <ContextoPrivacidade value={valor}>{children}</ContextoPrivacidade>;
}
