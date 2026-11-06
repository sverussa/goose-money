import { dataCivil, type DataCivil } from '@goose-money/core';
import { useSyncExternalStore } from 'react';

// Único módulo do app que lê o relógio (D12). O core recebe "hoje" como parâmetro.

const doisDigitos = (n: number) => String(n).padStart(2, '0');

/** Data civil de hoje no fuso do dispositivo (3.11). */
export function hojeLocal(): DataCivil {
  const d = new Date();
  return dataCivil(
    `${String(d.getFullYear())}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`,
  );
}

/** Instante ISO das colunas de controle (o banco regrava `created_at` e `updated_at`). */
export const agoraIso = (): string => new Date().toISOString();

const msAteAmanha = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime() - d.getTime();
};

/** Avisa na virada do dia (timer até a meia-noite seguinte) e quando a janela volta ao foco. */
export function assinarHoje(
  aviso: () => void,
  janela: Pick<EventTarget, 'addEventListener' | 'removeEventListener'> = window,
): () => void {
  let timer: ReturnType<typeof setTimeout>;
  const armar = () => {
    timer = setTimeout(() => {
      aviso();
      armar();
    }, msAteAmanha());
  };
  armar();
  janela.addEventListener('focus', aviso);
  return () => {
    clearTimeout(timer);
    janela.removeEventListener('focus', aviso);
  };
}

const assinar = (aviso: () => void) => assinarHoje(aviso);

/** "Hoje" sempre correto, sem recarregar a página. */
export const useHoje = (): DataCivil => useSyncExternalStore(assinar, hojeLocal);
