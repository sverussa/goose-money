import { type Comando, ErroDeDominio } from '@goose-money/core';
import { toast } from 'sonner';

import { useComando, useContexto } from '@/queries/useComando';

/** Grava o comando; a recusa do core vira o snackbar de erro (como em Contas). */
export function useRodar() {
  const { executar } = useComando();
  const contexto = useContexto();
  return (montar: (ctx: ReturnType<typeof contexto>) => Comando) => {
    try {
      void executar(montar(contexto()));
    } catch (e) {
      if (!(e instanceof ErroDeDominio)) throw e;
      toast.error(e.message);
    }
  };
}
