import type { Centavos } from '@goose-money/core';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { useSlots } from '@/app/casca/useSlots';

import { MoneyText, type TipoDeValor } from './MoneyText';

export interface IndicadorDoCabecalho {
  rotulo: string;
  valor: Centavos;
  tipo?: TipoDeValor;
}

/**
 * Totais do módulo (fatura, extrato, mês…), fixos logo abaixo da Barra de Totais ao rolar (4.2).
 * Os valores chegam prontos do core; aqui só se mostram.
 */
export function ContextHeader({
  rotulo,
  indicadores,
  acoes,
}: {
  /** Nome da região para o leitor de tela ("Totais da fatura"). */
  rotulo: string;
  indicadores: readonly IndicadorDoCabecalho[];
  acoes?: ReactNode;
}) {
  const { cabecalho } = useSlots();
  const conteudo = (
    <section
      aria-label={rotulo}
      className="flex flex-wrap items-center gap-3 border-b border-surface-container-highest bg-surface px-4 py-3.5 medium:px-6"
    >
      <dl className="flex flex-1 flex-wrap gap-3">
        {indicadores.map((i) => (
          <div key={i.rotulo} className="flex min-w-36 flex-1 flex-col">
            <dt className="text-label-md font-normal text-on-surface-variant">{i.rotulo}</dt>
            <dd>
              <MoneyText valor={i.valor} tipo={i.tipo} className="text-lg font-semibold" />
            </dd>
          </div>
        ))}
      </dl>
      {acoes && <div className="flex shrink-0 items-center gap-2">{acoes}</div>}
    </section>
  );
  // Fora da casca (páginas de revisão), fica no próprio lugar.
  return cabecalho ? createPortal(conteudo, cabecalho) : conteudo;
}
