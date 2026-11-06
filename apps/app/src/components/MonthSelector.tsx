import { somarMeses } from '@goose-money/core';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { createPortal } from 'react-dom';

import { useSlots } from '@/app/casca/useSlots';
import { formatarMes } from '@/app/formatacao';
import { mensagens } from '@/app/mensagens';

import { useMesDaUrl } from './periodo';
import { Button } from './ui/button';

/** "◀ Novembro 2026 ▶" na top app bar das telas mensais; o mês fica na URL (`?mes=`). */
export function MonthSelector() {
  const [mes, setMes] = useMesDaUrl();
  const { appBar } = useSlots();
  const seletor = (
    <div className="flex items-center gap-1">
      <Button
        variant="icon"
        className="size-11"
        aria-label={mensagens.mes.anterior}
        onClick={() => {
          setMes(somarMeses(mes, -1));
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
          setMes(somarMeses(mes, 1));
        }}
      >
        <ChevronRight />
      </Button>
    </div>
  );
  return appBar ? createPortal(seletor, appBar) : seletor;
}
