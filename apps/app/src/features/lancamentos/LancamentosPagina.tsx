import type { Derivado, Lancamento, Periodo } from '@goose-money/core';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import {
  ArrowDown,
  ArrowLeftRight,
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
import { formatarMoeda } from '@/app/formatacao';
import { ContextHeader } from '@/components/ContextHeader';
import { EmptyState, EstadoDaCarga } from '@/components/EstadosDaTela';
import { MoneyText } from '@/components/MoneyText';
import { PeriodPicker } from '@/components/PeriodPicker';
import { usePeriodoDaUrl } from '@/components/periodo';
import { StatusChip } from '@/components/StatusChip';
import { Button } from '@/components/ui/button';
import { EditarLancamento } from '@/features/lancar/EditarLancamento';
import { cn } from '@/lib/utils';
import { useDerivado } from '@/queries/fatos';

import { AcoesDoItem } from './Acoes';
import { Filtros } from './Filtros';
import {
  type EstadoDaTela,
  estadoDaUrl,
  type ItemDaTela,
  type Linha,
  linhasPorDia,
  recorte,
  rotuloDoDia,
  type Visao,
} from './lista';
import { mensagensLancamentos as m } from './mensagens';

const iconeDaOrigem = { cartao: CreditCard, recorrencia: CalendarSync, divida: FileText } as const;
const corDaNatureza = {
  entrada: 'bg-income-container text-income',
  saida: 'bg-expense-container text-expense',
  neutro: 'bg-transfer-container text-transfer',
} as const;
const tipoDoValor = { entrada: 'receita', saida: 'despesa', neutro: 'neutro' } as const;

function ItemDaLista({
  item,
  d,
  editar,
}: {
  item: ItemDaTela;
  d: Derivado;
  editar: (l: Lancamento) => void;
}) {
  const categoria = item.categoriaId ? d.porId.categorias.get(item.categoriaId) : undefined;
  const nome = (id: string | null) => (id ? d.porId.contas.get(id)?.nome : undefined);
  const destino = nome(item.contaDestinoId);
  const conta = destino ? `${nome(item.contaId) ?? ''} → ${destino}` : nome(item.contaId);
  const cartao =
    item.tipo === 'compra' && item.cartaoId ? d.porId.cartoes.get(item.cartaoId)?.nome : undefined;
  const Icone =
    item.natureza === 'neutro'
      ? ArrowLeftRight
      : item.origem === 'manual'
        ? item.natureza === 'entrada'
          ? ArrowUp
          : ArrowDown
        : iconeDaOrigem[item.origem];
  return (
    <div className="flex min-h-15 flex-wrap items-center gap-x-4 gap-y-2 px-5 py-2.5">
      <span
        aria-hidden
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-full',
          corDaNatureza[item.natureza],
        )}
      >
        <Icone className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 basis-64 flex-col gap-0.5">
        <span className="text-body-lg font-medium">{item.texto}</span>
        <span className="text-body-md text-on-surface-variant">
          {[categoria?.nome, conta, cartao].filter(Boolean).join(' · ')}
        </span>
      </span>
      {categoria?.sistema === 'a_classificar' && <StatusChip estado="aClassificar" />}
      {item.chips.map((c) => (
        <StatusChip key={c} estado={c} />
      ))}
      <AcoesDoItem item={item} d={d} editar={editar} />
      <MoneyText
        valor={item.valor}
        tipo={tipoDoValor[item.natureza]}
        className={cn(
          'min-w-30 justify-end text-body-lg font-semibold',
          !item.soma && 'text-on-surface-variant',
        )}
      />
    </div>
  );
}

/**
 * Lista agrupada por dia, virtualizada (D9): a página rola inteira e só as linhas visíveis existem
 * no DOM. Cada dia é um card; as linhas do mesmo dia formam o card pelas bordas.
 */
function ListaVirtual({
  linhas,
  d,
  editar,
}: {
  linhas: readonly Linha[];
  d: Derivado;
  editar: (l: Lancamento) => void;
}) {
  const lista = useRef<HTMLDivElement>(null);
  const [inicio, setInicio] = useState(0);
  useLayoutEffect(() => {
    setInicio(lista.current?.offsetTop ?? 0);
  }, []);
  const v = useWindowVirtualizer({
    count: linhas.length,
    estimateSize: (i) => (linhas[i]?.tipo === 'dia' ? 57 : 61),
    overscan: 8,
    scrollMargin: inicio,
    getItemKey: (i) => {
      const l = linhas[i];
      return !l ? i : l.tipo === 'dia' ? `dia:${l.data}` : l.item.chave;
    },
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
                {l.semCaixa === 'cartao' ? (
                  <span>{m.noCartao}</span>
                ) : l.semCaixa === 'total' ? (
                  <span>{m.noTotal(formatarMoeda(l.total))}</span>
                ) : (
                  <MoneyText valor={l.total} />
                )}
              </h2>
            ) : (
              <div
                className={cn(
                  'border-x border-t border-surface-container-highest bg-surface-container-lowest',
                  l.ultimo && 'rounded-b-lg border-b',
                )}
              >
                <ItemDaLista item={l.item} d={d} editar={editar} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const tipoNoCabecalho = {
  receitas: 'receita',
  despesas: 'despesa',
  entradas: 'receita',
  saidas: 'despesa',
  resultado: undefined,
} as const;

function Recorte({ d, periodo, estado }: { d: Derivado; periodo: Periodo; estado: EstadoDaTela }) {
  const lancar = useLancar();
  const [editando, setEditando] = useState<Lancamento | null>(null);
  const r = useMemo(() => recorte(d, periodo, estado), [d, periodo, estado]);
  const linhas = useMemo(() => linhasPorDia(r.itens), [r]);
  return (
    <>
      <ContextHeader
        rotulo={m.totais}
        indicadores={r.cabecalho.map((c) => ({
          rotulo: m.cabecalho[c.chave],
          valor: c.valor,
          tipo: tipoNoCabecalho[c.chave],
        }))}
      />
      {linhas.length === 0 ? (
        <EmptyState
          Icone={ReceiptText}
          frase={m.vazio}
          acao={<Button onClick={lancar}>{m.lancar}</Button>}
        />
      ) : (
        <ListaVirtual linhas={linhas} d={d} editar={setEditando} />
      )}
      <EditarLancamento
        lancamento={editando}
        onFechar={() => {
          setEditando(null);
        }}
      />
    </>
  );
}

/** Seletor da visão (6.3), na URL (`?visao=`). */
function SeletorDeVisao({ visao }: { visao: Visao }) {
  const [, setBusca] = useSearchParams();
  return (
    <ToggleGroupPrimitive.Root
      type="single"
      value={visao}
      onValueChange={(v) => {
        if (!v) return;
        setBusca((b) => {
          const nova = new URLSearchParams(b);
          nova.set('visao', v);
          // Os tipos de uma visão não valem na outra.
          nova.delete('tipo');
          return nova;
        });
      }}
      aria-label={m.visao}
      className="inline-flex w-fit overflow-hidden rounded-full border border-outline"
    >
      {(['competencia', 'movimentacoes'] as const).map((v) => (
        <ToggleGroupPrimitive.Item
          key={v}
          value={v}
          className="alvo inline-flex h-10 cursor-pointer items-center gap-2 border-r border-outline bg-surface-container-lowest px-4.5 text-body-md font-medium text-on-surface last:border-r-0 hover:bg-on-surface/8 data-[state=on]:bg-secondary-container data-[state=on]:font-semibold data-[state=on]:text-on-secondary-container"
        >
          {v === visao && <Check aria-hidden className="size-4.5" />}
          {m.visoes[v]}
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  );
}

/** `#/lancamentos` (6.3): as visões Receitas e despesas e Movimentações (T05-06, T05-07). */
export function LancamentosPagina() {
  const derivado = useDerivado();
  const [periodo, setPeriodo] = usePeriodoDaUrl('lancamentos', 'este-mes');
  const [busca, setBusca] = useSearchParams();
  const estado = useMemo(() => estadoDaUrl(busca), [busca]);
  return (
    <div className="flex flex-col gap-4">
      <SeletorDeVisao visao={estado.visao} />
      <PeriodPicker periodo={periodo} onChange={setPeriodo} />
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-12 min-w-0 flex-1 basis-64 items-center gap-2 rounded-full bg-surface-container px-4 focus-within:ring-2 focus-within:ring-primary">
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
        {derivado.estado === 'pronto' && <Filtros fatos={derivado.dados.fatos} estado={estado} />}
      </div>
      <p className="text-body-md text-on-surface-variant">{m.explica[estado.visao]}</p>
      {derivado.estado === 'pronto' ? (
        <Recorte d={derivado.dados} periodo={periodo} estado={estado} />
      ) : (
        <EstadoDaCarga carga={derivado} />
      )}
    </div>
  );
}
