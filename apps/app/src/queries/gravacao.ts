import type { Comando, Fatos, Mudanca } from '@goose-money/core';
import type { MutationOptions, QueryClient, QueryKey } from '@tanstack/react-query';

import { aplicarGravadas, type Gravadas, mensagemDoErroAoGravar } from '@/data/gravacao';

/** O que a mutação de `useComando` grava: as mudanças e, fora do Desfazer, o comando. */
export interface Gravacao {
  mudancas: readonly Mudanca[];
  /** Nulo no próprio Desfazer. */
  comando: Comando | null;
}

export interface Avisos {
  gravado: (comando: Comando) => void;
  desfeito: () => void;
  erro: (mensagem: string) => void;
}

interface Dependencias {
  consultas: QueryClient;
  /** Chave dos fatos do usuário; nula sem sessão. */
  chave: QueryKey | null;
  executar: (mudancas: readonly Mudanca[]) => Promise<Gravadas>;
  avisos: Avisos;
  online: () => boolean;
}

/**
 * Grava primeiro e só então aplica as linhas devolvidas no cache (D14), sem recarregar tudo.
 * Se a gravação falha, o cache não é tocado e o aviso de erro mostra a mensagem.
 */
export function opcoesDaGravacao(d: Dependencias): MutationOptions<void, unknown, Gravacao> {
  return {
    mutationFn: async ({ mudancas }) => {
      const gravadas = await d.executar(mudancas);
      if (d.chave)
        d.consultas.setQueryData<Fatos>(d.chave, (f) => (f ? aplicarGravadas(f, gravadas) : f));
    },
    onSuccess: (_, { comando }) => {
      if (comando) d.avisos.gravado(comando);
      else d.avisos.desfeito();
    },
    onError: (erro) => {
      d.avisos.erro(mensagemDoErroAoGravar(erro, d.online()));
    },
  };
}
