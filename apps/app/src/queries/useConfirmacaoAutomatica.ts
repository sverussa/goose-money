import type { Fatos } from '@goose-money/core';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useEffectEvent } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import { mensagens } from '@/app/mensagens';
import { useSessao } from '@/app/providers/useSessao';
import { aplicarGravadas } from '@/data/gravacao';
import { executar } from '@/data/gravar';
import { conexao } from '@/data/supabase';

import { confirmarPendentes } from './confirmacaoAutomatica';
import { chaveDosFatos, useFatos } from './fatos';
import { useHoje } from './relogio';
import { useContexto } from './useComando';
import { useConexao } from './useConexao';

const UMA_HORA = 60 * 60 * 1000;
/** Trava em memória: uma rodada por vez neste aparelho, mesmo com dois componentes montados. */
let rodando = false;

/**
 * Confirmação automática das recorrências (T03-06, 3.8): depois da primeira carga dos fatos, na
 * virada do dia, ao voltar a conexão e a cada hora com o app aberto. Montado uma vez, na área
 * autenticada.
 */
export function useConfirmacaoAutomatica(): void {
  const pronto = useFatos().estado === 'pronto';
  const hoje = useHoje();
  const online = useConexao();
  const { usuario } = useSessao();
  const criarContexto = useContexto();
  const consultas = useQueryClient();
  const navegar = useNavigate();

  const rodar = useEffectEvent(async () => {
    if (rodando || !usuario || !conexao.online()) return;
    const chave = chaveDosFatos(usuario.id);
    const fatos = consultas.getQueryData<Fatos>(chave);
    if (!fatos) return;
    rodando = true;
    try {
      const r = await confirmarPendentes(fatos, criarContexto(), executar);
      for (const g of r.gravadas)
        consultas.setQueryData<Fatos>(chave, (f) => (f ? aplicarGravadas(f, g) : f));
      // O que outro aparelho confirmou ainda não está no cache.
      if (r.conflitos > 0) void consultas.invalidateQueries({ queryKey: chave });
      const n = r.gravadas.length;
      if (n > 0)
        toast(mensagens.confirmacaoAutomatica.registrados(n), {
          action: {
            label: mensagens.confirmacaoAutomatica.revisar,
            onClick: () => void navegar(`/lancamentos?origem=recorrencia&criadosEm=${hoje}`),
          },
        });
    } catch {
      // Sem rede ou sessão: a próxima rodada (hora, dia ou reconexão) tenta de novo.
    } finally {
      rodando = false;
    }
  });

  // Também ao voltar a conexão: a rodada que não pôde rodar offline acontece logo.
  useEffect(() => {
    if (!pronto || !online) return;
    void rodar();
    const t = setInterval(() => void rodar(), UMA_HORA);
    return () => {
      clearInterval(t);
    };
  }, [pronto, hoje, online]);
}
