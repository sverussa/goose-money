import type { Comando, Contexto } from '@goose-money/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';

import { mensagens } from '@/app/mensagens';
import { useSessao } from '@/app/providers/useSessao';
import { executar } from '@/data/gravar';

import { guardarBarraAnterior, registrarBarraAtual } from './barraAnterior';
import { chaveDosFatos, useBarraDeTotais } from './fatos';
import { opcoesDaGravacao } from './gravacao';
import { agoraIso, useHoje } from './relogio';

const m = mensagens.gravacao;

/** O `Contexto` dos comandos do core: hoje, instante, usuário e gerador de ids (D12, D72). */
export function useContexto(): () => Contexto {
  const hoje = useHoje();
  const { usuario } = useSessao();
  const id = usuario?.id ?? '';
  return useCallback(
    () => ({ hoje, agora: agoraIso(), usuario: id, novoId: () => crypto.randomUUID() }),
    [hoje, id],
  );
}

/**
 * Executa um comando do core (T03-04): grava, atualiza o cache e mostra o snackbar com
 * "Desfazer"; erro mostra o snackbar de erro e nada muda. `salvando` serve ao "Salvando…".
 */
export function useComando() {
  const consultas = useQueryClient();
  const { usuario } = useSessao();
  const barra = useBarraDeTotais();
  // Valores antes de cada gravação, para a animação e o chip da Barra (T04-06).
  useEffect(() => {
    if (barra.estado === 'pronto') registrarBarraAtual(barra.dados);
  }, [barra]);

  const mutacao = useMutation(
    opcoesDaGravacao({
      consultas,
      chave: usuario ? chaveDosFatos(usuario.id) : null,
      executar,
      online: () => navigator.onLine,
      avisos: {
        gravado: (comando) =>
          toast(comando.descricao, {
            action: {
              label: m.desfazer,
              onClick: () => {
                guardarBarraAnterior();
                mutacao.mutate({ mudancas: comando.inversas, comando: null });
              },
            },
          }),
        desfeito: () => toast(m.desfeito),
        erro: (mensagem) => toast.error(mensagem),
      },
    }),
  );

  const { mutateAsync } = mutacao;
  /** Devolve `true` se gravou; o formulário fecha só nesse caso. */
  const rodar = useCallback(
    (comando: Comando): Promise<boolean> => {
      guardarBarraAnterior();
      return mutateAsync({ mudancas: comando.mudancas, comando }).then(
        () => true,
        () => false,
      );
    },
    [mutateAsync],
  );

  return { executar: rodar, salvando: mutacao.isPending };
}
