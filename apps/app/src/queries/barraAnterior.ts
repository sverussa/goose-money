import type { IndicadoresDaBarra } from '@goose-money/core';
import { useSyncExternalStore } from 'react';

/**
 * Valores da Barra de Totais logo antes da última gravação (T03-04), para a animação e o chip de
 * variação da T04-06. `versao` muda a cada gravação, mesmo com os mesmos valores.
 */
export interface BarraAnterior {
  valores: IndicadoresDaBarra;
  versao: number;
}

let atual: BarraAnterior | null = null;
let agora: IndicadoresDaBarra | null = null;
const avisos = new Set<() => void>();

/** A Barra mostrada agora (useComando mantém em dia). */
export function registrarBarraAtual(valores: IndicadoresDaBarra): void {
  agora = valores;
}

/** Antes de cada gravação, inclusive do Desfazer clicado depois de outras gravações. */
export function guardarBarraAnterior(): void {
  if (!agora) return;
  atual = { valores: agora, versao: (atual?.versao ?? 0) + 1 };
  for (const a of avisos) a();
}

const assinar = (aviso: () => void) => {
  avisos.add(aviso);
  return () => {
    avisos.delete(aviso);
  };
};

export const useBarraAnterior = (): BarraAnterior | null =>
  useSyncExternalStore(assinar, () => atual);
