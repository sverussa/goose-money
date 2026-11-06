import {
  type Competencia,
  competencia,
  competenciaDe,
  type DataCivil,
  type Periodo,
  periodoDaUrl,
  periodoParaUrl,
  periodoPreset,
  type Preset,
  somarMeses,
} from '@goose-money/core';
import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router';

import { useHoje } from '@/queries/relogio';

/** Mês da URL (`?mes=2026-11`); ausente ou inválido vira o mês de hoje. */
export function mesDaUrl(busca: URLSearchParams, hoje: DataCivil): Competencia {
  try {
    return competencia(busca.get('mes') ?? '');
  } catch {
    return competenciaDe(hoje);
  }
}

/** Período da URL (`?de=…&ate=…`, 8.2); ausente ou inválido vira `padrao`. */
export function periodoDaBusca(busca: URLSearchParams, padrao: () => Periodo): Periodo {
  try {
    return periodoDaUrl(busca);
  } catch {
    return padrao();
  }
}

/**
 * Mês das telas mensais, guardado na URL. `deslocar` parte do último mês pedido, não do último
 * render: a navegação do React Router é uma transição, e duas teclas seguidas (ou a tecla
 * segurada) chegariam antes de a URL nova aparecer.
 */
export function useMesDaUrl(): [Competencia, (meses: number) => void] {
  const [busca, setBusca] = useSearchParams();
  const hoje = useHoje();
  const mes = mesDaUrl(busca, hoje);
  const pedido = useRef(mes);
  useLayoutEffect(() => {
    pedido.current = mes;
  }, [mes]);
  const deslocar = useCallback(
    (meses: number) => {
      pedido.current = somarMeses(pedido.current, meses);
      const alvo = pedido.current;
      setBusca((b) => {
        const nova = new URLSearchParams(b);
        nova.set('mes', alvo);
        return nova;
      });
    },
    [setBusca],
  );
  return [mes, deslocar];
}

const chaveDoPeriodo = (chave: string) => `goose-money:periodo:${chave}`;

function lembrado(chave: string): URLSearchParams | null {
  try {
    const v = sessionStorage.getItem(chaveDoPeriodo(chave));
    return v === null ? null : new URLSearchParams(v);
  } catch {
    return null;
  }
}

/**
 * Período das telas com `PeriodPicker` (8.2): vem da URL; sem ele, o último escolhido nesta aba
 * do navegador para a mesma tela (`chave`); senão, o `padrao`.
 */
export function usePeriodoDaUrl(chave: string, padrao: Preset): [Periodo, (p: Periodo) => void] {
  const [busca, setBusca] = useSearchParams();
  const hoje = useHoje();
  const periodo = useMemo(() => {
    const doPadrao = () => periodoPreset(padrao, hoje);
    if (busca.has('de') || busca.has('ate')) return periodoDaBusca(busca, doPadrao);
    const guardado = lembrado(chave);
    return guardado ? periodoDaBusca(guardado, doPadrao) : doPadrao();
  }, [busca, chave, padrao, hoje]);

  const setPeriodo = useCallback(
    (p: Periodo) => {
      try {
        sessionStorage.setItem(chaveDoPeriodo(chave), periodoParaUrl(p));
      } catch {
        // Sem armazenamento: fica só na URL.
      }
      setBusca((b) => {
        const nova = new URLSearchParams(b);
        nova.set('de', p.de);
        nova.set('ate', p.ate);
        return nova;
      });
    },
    [chave, setBusca],
  );
  return [periodo, setPeriodo];
}
