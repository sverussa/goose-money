import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

import { atalhoDaTela } from '@/app/casca/atalhos';

import { useSlots } from '@/app/casca/useSlots';
import { formatarMes } from '@/app/formatacao';
import { mensagens } from '@/app/mensagens';

import { useMesDaUrl } from './periodo';
import { Button } from './ui/button';

/** "◀ Novembro 2026 ▶" na top app bar das telas mensais; o mês fica na URL (`?mes=`). */
export function MonthSelector() {
  const [mes, deslocar] = useMesDaUrl();
  const { appBar } = useSlots();

  // ← e → mudam o mês (4.1, item 9), fora dos campos e sem diálogo aberto. Antes da pintura:
  // com o mês na tela, a tecla já vale.
  useLayoutEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (!atalhoDaTela(e) || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
      e.preventDefault();
      deslocar(e.key === 'ArrowLeft' ? -1 : 1);
    }
    window.addEventListener('keydown', aoTeclar);
    return () => {
      window.removeEventListener('keydown', aoTeclar);
    };
  }, [deslocar]);
  const seletor = (
    // No compact, a top app bar não comporta o seletor ao lado do título: ele desce para uma linha
    // própria, centralizado.
    <div className="order-last flex w-full items-center justify-center gap-1 medium:order-none medium:w-auto">
      <Button
        variant="icon"
        className="size-11"
        aria-label={mensagens.mes.anterior}
        onClick={() => {
          deslocar(-1);
        }}
      >
        <ChevronLeft />
      </Button>
      <span aria-live="polite" className="min-w-32 text-center text-body-lg font-medium">
        {formatarMes(mes)}
      </span>
      <Button
        variant="icon"
        className="size-11"
        aria-label={mensagens.mes.proximo}
        onClick={() => {
          deslocar(1);
        }}
      >
        <ChevronRight />
      </Button>
    </div>
  );
  return appBar ? createPortal(seletor, appBar) : seletor;
}
