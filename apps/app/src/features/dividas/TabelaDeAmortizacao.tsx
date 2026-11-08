import type { TabelaDaDivida } from '@goose-money/core';
import { useEffect, useId, useRef } from 'react';

import { formatarData } from '@/app/formatacao';
import { MoneyText } from '@/components/MoneyText';
import { StatusChip } from '@/components/StatusChip';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

import { mensagensDividas } from './mensagens';
import { chipDaParcela, type LinhaDaAmortizacao } from './tabela';

const tb = mensagensDividas.tabela;

/** Tabela de amortização com o status de cada parcela; também na prévia do cadastro (T05-23). */
export function TabelaDeAmortizacao({
  t,
  linhas,
  destacada,
}: {
  t: TabelaDaDivida;
  linhas: readonly LinhaDaAmortizacao[];
  destacada: { numero: number; vez: number } | null;
}) {
  const refs = useRef(new Map<number, HTMLTableRowElement>());
  // A cada clique no gráfico (mesmo na mesma parcela), rola até a linha e leva o foco a ela.
  useEffect(() => {
    if (!destacada) return;
    const linha = refs.current.get(destacada.numero);
    const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    linha?.scrollIntoView({ block: 'center', behavior: suave ? 'smooth' : 'auto' });
    linha?.focus({ preventScroll: true });
  }, [destacada]);
  const proxima = t.resumo.proximaParcela?.numero;
  const id = useId();
  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <h2 id={id} className="text-title-md">
          {tb.titulo}
        </h2>
        <span className="text-body-md text-on-surface-variant">{tb.nota(t.parcelas.length)}</span>
      </div>
      <Table aria-labelledby={id}>
        <TableHeader>
          <TableRow className="bg-surface-container-low">
            <TableHead className="pl-5">{tb.numero}</TableHead>
            <TableHead>{tb.vencimento}</TableHead>
            <TableHead className="text-right">{tb.parcela}</TableHead>
            <TableHead className="text-right">{tb.juros}</TableHead>
            <TableHead className="text-right">{tb.amortizacao}</TableHead>
            <TableHead className="text-right">{tb.saldo}</TableHead>
            <TableHead className="pr-5">{tb.status}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {linhas.map(({ parcela: p, saldo }) => {
            const chip = chipDaParcela(p.status, p.numero === proxima);
            const marcada = destacada?.numero === p.numero;
            return (
              <TableRow
                key={p.id}
                ref={(no) => {
                  if (no) refs.current.set(p.numero, no);
                  else refs.current.delete(p.numero);
                }}
                tabIndex={-1}
                aria-current={marcada ? 'true' : undefined}
                className={cn(
                  'scroll-mt-40 focus-visible:outline-none',
                  marcada && 'bg-secondary-container hover:bg-secondary-container',
                )}
              >
                <TableCell className="pl-5 font-medium">{p.numero}</TableCell>
                <TableCell>{formatarData(p.vencimento)}</TableCell>
                <TableCell className="text-right">
                  <MoneyText valor={p.valor} />
                </TableCell>
                <TableCell className="text-right">
                  <MoneyText valor={p.juros} />
                </TableCell>
                <TableCell className="text-right">
                  <MoneyText valor={p.amortizacao} />
                </TableCell>
                <TableCell className="text-right font-medium">
                  <MoneyText valor={saldo} />
                </TableCell>
                <TableCell className="pr-5">
                  <StatusChip estado={chip.estado} rotulo={chip.rotulo} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
