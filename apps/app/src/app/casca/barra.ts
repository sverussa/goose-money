import { type Centavos, centavos, type IndicadoresDaBarra, menos } from '@goose-money/core';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useBarraAnterior } from '@/queries/barraAnterior';

const reduzido = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Valor mostrado animando do antigo ao novo em ~400 ms (4.1, item 3); com
 * `prefers-reduced-motion`, troca no quadro seguinte. Vale também para o Desfazer.
 */
export function useValorAnimado(valor: Centavos): Centavos {
  const [mostrado, setMostrado] = useState(valor);
  const ultimo = useRef(valor);
  useEffect(() => {
    const de = ultimo.current;
    ultimo.current = valor;
    if (de === valor) return;
    const duracao = reduzido() ? 0 : 400;
    const inicio = performance.now();
    let quadro = 0;
    const passo = (t: number) => {
      const p = duracao === 0 ? 1 : Math.min(1, (t - inicio) / duracao);
      const suave = 1 - (1 - p) ** 3;
      setMostrado(centavos(Math.round(de + (valor - de) * suave)));
      if (p < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => {
      cancelAnimationFrame(quadro);
    };
  }, [valor]);
  return mostrado;
}

export type Variacoes = Partial<Record<keyof IndicadoresDaBarra, Centavos>>;

/**
 * Chip de variação por 2 s depois de uma gravação (5.3): a diferença de cada indicador para os
 * valores guardados antes dela (T03-04). O prazo conta de quando os valores novos chegam; depois
 * dele, recargas não acendem o chip de novo para a mesma gravação.
 */
export function useVariacoes(atual: IndicadoresDaBarra | null): Variacoes {
  const anterior = useBarraAnterior();
  // Gravações feitas antes de a Barra aparecer não mostram chip.
  const [versaoAoMontar] = useState(anterior?.versao ?? 0);
  const [vencida, setVencida] = useState(versaoAoMontar);

  const diferencas = useMemo((): Variacoes => {
    if (!anterior || !atual || anterior.versao <= vencida) return {};
    return Object.fromEntries(
      (Object.keys(atual) as (keyof IndicadoresDaBarra)[])
        .map((k) => [k, menos(atual[k], anterior.valores[k])] as const)
        .filter(([, d]) => d !== 0),
    );
  }, [anterior, atual, vencida]);

  const versao = anterior?.versao ?? 0;
  const temDiferenca = Object.keys(diferencas).length > 0;
  useEffect(() => {
    if (!temDiferenca) return;
    const t = setTimeout(() => {
      setVencida(versao);
    }, 2000);
    return () => {
      clearTimeout(t);
    };
  }, [temDiferenca, versao]);

  return diferencas;
}
