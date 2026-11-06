import { useEffect } from 'react';

/** Digitando num campo: atalhos de uma tecla não valem (4.1, item 9). */
export function emCampoDeTexto(alvo: EventTarget | null): boolean {
  if (!(alvo instanceof HTMLElement)) return false;
  return alvo.isContentEditable || alvo.matches('input, textarea, select');
}

/** Diálogo, menu ou popover aberto: os atalhos da tela esperam ele fechar. */
export const haCamadaAberta = (): boolean =>
  document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"]') !== null;

const semModificador = (e: KeyboardEvent) => !e.ctrlKey && !e.metaKey && !e.altKey;

/** Atalho de uma tecla da tela: sem modificador, fora de campo e sem camada aberta. */
export const atalhoDaTela = (e: KeyboardEvent): boolean =>
  semModificador(e) && !emCampoDeTexto(e.target) && !haCamadaAberta();

/** `Ctrl + K` (Windows e Linux) ou `Cmd + K` (macOS), inclusive dentro de um campo. */
export const atalhoDaBusca = (e: KeyboardEvent): boolean =>
  (e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k';

/** No macOS a tecla é "⌘"; nos outros, "Ctrl". */
export const teclaModificadora = (): string =>
  /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘' : 'Ctrl';

/** Atalhos globais da casca: `N` abre o lançamento e `Ctrl/Cmd + K`, a busca. */
export function useAtalhos({ lancar, buscar }: { lancar: () => void; buscar: () => void }) {
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (atalhoDaBusca(e)) {
        e.preventDefault();
        buscar();
      } else if (e.key.toLowerCase() === 'n' && !e.shiftKey && atalhoDaTela(e)) {
        e.preventDefault();
        lancar();
      }
    }
    window.addEventListener('keydown', aoTeclar);
    return () => {
      window.removeEventListener('keydown', aoTeclar);
    };
  }, [lancar, buscar]);
}
