import {
  type Derivado,
  despesas,
  type ItemReconhecido,
  type Periodo,
  receitas,
  resultado,
} from '@goose-money/core';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import {
  ArrowDown,
  ArrowUp,
  CalendarSync,
  Check,
  CreditCard,
  FileText,
  ReceiptText,
  Search,
} from 'lucide-react';
import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';

import { useLancar } from '@/app/casca/useLancar';
import { ContextHeader } from '@/components/ContextHeader';
import { EmptyState, EstadoDaCarga } from '@/components/EstadosDaTela';
import { MoneyText } from '@/components/MoneyText';
import { PeriodPicker } from '@/components/PeriodPicker';
import { usePeriodoDaUrl } from '@/components/periodo';
import { StatusChip } from '@/components/StatusChip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDerivado } from '@/queries/fatos';

import { filtrosDaUrl, itensDoRecorte, type Linha, linhasPorDia, rotuloDoDia } from './lista';
import { mensagensLancamentos as m } from './mensagens';

const iconeDaOrigem = { cartao: CreditCard, recorrencia: CalendarSync, divida: FileText } as const;

function ItemDaLista({ item, d }: { item: ItemReconhecido; d: Derivado }) {
  const categoria = d.porId.categorias.get(item.categoriaId);
  const conta = item.contaId ? d.porId.contas.get(item.contaId) : undefined;
  const receita = item.tipo === 'receita';
  const Icone =
    item.origem === 'manual' ? (receita ? ArrowUp : ArrowDown) : iconeDaOrigem[item.origem];
  // Estorno e ajuste para menos são despesa negativa: aparecem como entrada.
  const entrada = receita || item.valor < 0;
  return (
    <div className="flex min-h-15 flex-wrap items-center gap-4 px-5 py-2.5">
      <span
        aria-hidden
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-full',
          entrada ? 'bg-income-container text-income' : 'bg-expense-container text-expense',
        )}
      >
        <Icone className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 basis-64 flex-col gap-0.5">
        <span className="text-body-lg font-medium">{item.texto}</span>
        <span className="text-body-md text-on-surface-variant">
          {[categoria?.nome, conta?.nome].filter(Boolean).join(' · ')}
        </span>
      </span>
      {categoria?.sistema === 'a_classificar' && <StatusChip estado="aClassificar" />}
      {item.estado === 'a_pagar' && <StatusChip estado="aPagar" />}
      {item.estado === 'vencido' && <StatusChip estado="vencido" />}
      <MoneyText
        valor={item.valor}
        tipo={entrada ? 'receita' : 'despesa'}
        className="min-w-30 justify-end text-body-lg font-semibold"
      />
    </div>
  );
}

/**
 * Lista agrupada por dia, virtualizada (D9): a página rola inteira e só as linhas visíveis existem
 * no DOM. Cada dia é um card; as linhas do mesmo dia formam o card pelas bordas.
 */
function ListaVirtual({ linhas, d }: { linhas: readonly Linha[]; d: Derivado }) {
  const lista = useRef<HTMLDivElement>(null);
  const [inicio, setInicio] = useState(0);
  useLayoutEffect(() => {
    setInicio(lista.current?.offsetTop ?? 0);
  }, []);
  const v = useWindowVirtualizer({
    count: linhas.length,
    estimateSize: (i) => (linhas[i]?.tipo === 'dia' ? 41 : 61),
    overscan: 8,
    scrollMargin: inicio,
  });
  return (
    <div
      ref={lista}
      role="list"
      aria-label={m.lista}
      className="relative w-full"
      style={{ height: v.getTotalSize() }}
    >
      {v.getVirtualItems().map((linha) => {
        const l = linhas[linha.index];
        if (!l) return null;
        return (
          <div
            key={linha.key}
            role="listitem"
            data-index={linha.index}
            ref={v.measureElement}
            className="absolute top-0 left-0 w-full"
            style={{ transform: `translateY(${String(linha.start - v.options.scrollMargin)}px)` }}
          >
            {l.tipo === 'dia' ? (
              <h2 className="mt-4 flex justify-between rounded-t-lg border border-b-0 border-surface-container-highest bg-surface-container-low px-5 py-2.5 text-label-lg text-on-surface-variant">
                <span>{rotuloDoDia(l.data)}</span>
                <MoneyText valor={l.total} />
              </h2>
            ) : (
              <div
                className={cn(
                  'border-x border-t border-surface-container-highest bg-surface-container-lowest',
                  l.ultimo && 'rounded-b-lg border-b',
                )}
              >
                <ItemDaLista item={l.item} d={d} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Recorte({ d, periodo }: { d: Derivado; periodo: Periodo }) {
  const [busca] = useSearchParams();
  const lancar = useLancar();
  const filtros = useMemo(() => filtrosDaUrl(busca), [busca]);
  const linhas = useMemo(
    () => linhasPorDia(itensDoRecorte(d, periodo, filtros)),
    [d, periodo, filtros],
  );
  return (
    <>
      <ContextHeader
        rotulo={m.totais}
        indicadores={[
          { rotulo: m.receitas, valor: receitas(d, periodo, filtros), tipo: 'receita' },
          { rotulo: m.despesas, valor: despesas(d, periodo, filtros), tipo: 'despesa' },
          { rotulo: m.resultado, valor: resultado(d, periodo, filtros) },
        ]}
      />
      {linhas.length === 0 ? (
        <EmptyState
          Icone={ReceiptText}
          frase={m.vazio}
          acao={<Button onClick={lancar}>{m.lancar}</Button>}
        />
      ) : (
        <ListaVirtual linhas={linhas} d={d} />
      )}
    </>
  );
}

/** Seletor da visão (6.3); Movimentações chega na T05-07. */
function SeletorDeVisao() {
  return (
    <ToggleGroupPrimitive.Root
      type="single"
      value="competencia"
      aria-label={m.visao}
      className="inline-flex w-fit overflow-hidden rounded-full border border-outline"
    >
      {(['competencia', 'movimentacoes'] as const).map((v) => (
        <ToggleGroupPrimitive.Item
          key={v}
          value={v}
          disabled={v === 'movimentacoes'}
          className="alvo inline-flex h-10 cursor-pointer items-center gap-2 border-r border-outline bg-surface-container-lowest px-4.5 text-body-md font-medium text-on-surface last:border-r-0 hover:bg-on-surface/8 disabled:cursor-not-allowed disabled:opacity-38 data-[state=on]:bg-secondary-container data-[state=on]:font-semibold data-[state=on]:text-on-secondary-container"
        >
          {v === 'competencia' && <Check aria-hidden className="size-4.5" />}
          {m.visoes[v]}
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  );
}

/** `#/lancamentos` (6.3): a visão "Receitas e despesas", por competência (T05-06). */
export function LancamentosPagina() {
  const derivado = useDerivado();
  const [periodo, setPeriodo] = usePeriodoDaUrl('lancamentos', 'este-mes');
  const [busca, setBusca] = useSearchParams();
  return (
    <div className="flex flex-col gap-4">
      <SeletorDeVisao />
      <PeriodPicker periodo={periodo} onChange={setPeriodo} />
      <label className="flex h-12 max-w-xl items-center gap-2 rounded-full bg-surface-container px-4 focus-within:ring-2 focus-within:ring-primary">
        <Search aria-hidden className="size-5 shrink-0 text-on-surface-variant" />
        <span className="sr-only">{m.busca}</span>
        <input
          type="search"
          placeholder={m.busca}
          className="min-w-0 flex-1 bg-transparent text-body-lg text-on-surface outline-none placeholder:text-on-surface-variant"
          value={busca.get('q') ?? ''}
          onChange={(e) => {
            const texto = e.target.value;
            setBusca(
              (b) => {
                const nova = new URLSearchParams(b);
                if (texto) nova.set('q', texto);
                else nova.delete('q');
                return nova;
              },
              { replace: true },
            );
          }}
        />
      </label>
      <p className="text-body-md text-on-surface-variant">{m.explicaCompetencia}</p>
      {derivado.estado === 'pronto' ? (
        <Recorte d={derivado.dados} periodo={periodo} />
      ) : (
        <EstadoDaCarga carga={derivado} />
      )}
    </div>
  );
}
