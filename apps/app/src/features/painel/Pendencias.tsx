import {
  aplicar,
  type Comando,
  confirmarOcorrencia,
  type Contexto,
  type DataCivil,
  type Derivado,
  type Pendencia,
  pendencias,
  podeConfirmarTodos,
  somarDias,
} from '@goose-money/core';
import {
  ArrowUp,
  CalendarDays,
  CreditCard,
  Landmark,
  type LucideIcon,
  TriangleAlert,
} from 'lucide-react';
import { Link } from 'react-router';

import { formatarData, formatarMes } from '@/app/formatacao';
import { chipDaFatura, type EstadoDoChip } from '@/components/estados';
import { MoneyText } from '@/components/MoneyText';
import { StatusChip } from '@/components/StatusChip';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRodar } from '@/features/cartoes/rodar';

import { mensagensPainel } from './mensagens';

const m = mensagensPainel.pendencias;
const ddmm = (d: DataCivil) => formatarData(d).slice(0, 5);

/** Várias confirmações gravadas juntas, numa transação; o Desfazer desfaz todas. */
function emLote(d: Derivado, ctx: Contexto, lista: readonly Pendencia[]): Comando {
  let fatos = d.fatos;
  const mudancas: Comando['mudancas'][number][] = [];
  const inversas: Comando['inversas'][number][] = [];
  for (const p of lista) {
    if (p.tipo !== 'renda' && p.tipo !== 'gasto') continue;
    const c = confirmarOcorrencia(fatos, ctx, p.recorrenciaId, p.competencia);
    fatos = aplicar(fatos, c.mudancas);
    mudancas.push(...c.mudancas);
    inversas.unshift(...c.inversas);
  }
  return { mudancas, inversas, descricao: m.confirmados(lista.length) };
}

interface Linha {
  chave: string;
  Icone: LucideIcon;
  titulo: string;
  detalhe: string;
  chip: EstadoDoChip;
  rotuloDoChip?: string;
  /** Destino da ação direta: o diálogo (Pagar fatura, Registrar pagamento) ou a tela do módulo. */
  destino: string;
}

/** Texto, chip e destino de cada pendência do core (6.2, Main.dc.html). */
function linhaDa(d: Derivado, p: Pendencia): Linha {
  switch (p.tipo) {
    case 'fatura': {
      const f = d.faturas.get(p.cartaoId)?.find((x) => x.competencia === p.competencia);
      return {
        chave: `fatura-${p.cartaoId}-${p.competencia}`,
        Icone: CreditCard,
        titulo: m.fatura(p.texto, formatarMes(p.competencia).toLocaleLowerCase('pt-BR')),
        detalhe: f ? m.detalheFatura(ddmm(f.fechamento), ddmm(f.vencimento)) : '',
        chip: f ? chipDaFatura[f.status] : 'faturaFechada',
        destino: `/cartoes/${p.cartaoId}?acao=pagar`,
      };
    }
    case 'renda':
      return {
        chave: `renda-${p.recorrenciaId}-${p.competencia}`,
        Icone: ArrowUp,
        titulo: m.renda(p.texto),
        detalhe: m.detalheRenda(ddmm(p.data)),
        chip: 'atrasado',
        destino: '/rendas',
      };
    case 'gasto': {
      const vencido = p.data < d.hoje;
      return {
        chave: `gasto-${p.recorrenciaId}-${p.competencia}`,
        Icone: CalendarDays,
        titulo: m.gasto(p.texto),
        detalhe: m.detalheGasto(ddmm(p.data)),
        chip: vencido ? 'vencido' : 'venceEmBreve',
        rotuloDoChip:
          p.data === d.hoje
            ? m.venceHoje
            : p.data === somarDias(d.hoje, 1)
              ? m.venceAmanha
              : undefined,
        destino: '/gastos-fixos',
      };
    }
    case 'parcela_divida':
      return {
        chave: `parcela-${p.parcelaDividaId}`,
        Icone: Landmark,
        titulo: m.parcela(p.texto, p.numero),
        detalhe: m.detalheParcela(ddmm(p.data)),
        chip: 'vencido',
        destino: `/dividas/${p.dividaId}?acao=pagar&parcela=${p.parcelaDividaId}`,
      };
  }
}

/** O que pede ação logo: botão cheio; o resto, contornado (Main.dc.html). */
const URGENTES: readonly EstadoDoChip[] = ['vencido', 'atrasado', 'venceEmBreve', 'faturaVencida'];

/**
 * Card Pendências (6.2), acima de tudo na Visão geral e só quando houver: itens de `pendencias`
 * com a ação direta e "Confirmar todos os fixos" para as recorrências até hoje.
 */
export function Pendencias({ d }: { d: Derivado }) {
  const rodar = useRodar();
  const lista = pendencias(d);
  if (lista.length === 0) return null;
  const fixos = podeConfirmarTodos(lista, d.hoje);
  return (
    <Card variant="outlined" className="gap-0 py-2">
      <section aria-labelledby="pendencias-titulo">
        <div className="flex flex-wrap items-center gap-3 px-5 py-3">
          <TriangleAlert aria-hidden className="size-5.5 text-warning" />
          <h2 id="pendencias-titulo" className="flex-1 text-title-md">
            {m.titulo(lista.length)}
          </h2>
          {fixos.length > 0 && (
            <Button
              variant="outlined"
              onClick={() => {
                rodar((ctx) => emLote(d, ctx, fixos));
              }}
            >
              {m.confirmarTodos}
            </Button>
          )}
        </div>
        <ul>
          {lista.map((p) => {
            const l = linhaDa(d, p);
            return (
              <li
                key={l.chave}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-surface-container-high px-5 py-3"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant">
                  <l.Icone aria-hidden className="size-5" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-body-lg font-medium">{l.titulo}</span>
                  <span className="text-body-md text-on-surface-variant">{l.detalhe}</span>
                </span>
                <StatusChip estado={l.chip} rotulo={l.rotuloDoChip} />
                <MoneyText
                  valor={p.valor}
                  className="min-w-28 text-right text-body-lg font-semibold"
                />
                <Button
                  asChild
                  variant={URGENTES.includes(l.chip) ? 'filled' : 'outlined'}
                  className="min-w-32"
                >
                  <Link to={l.destino} aria-label={m.acao(p.acao, l.titulo)}>
                    {p.acao}
                  </Link>
                </Button>
              </li>
            );
          })}
        </ul>
      </section>
    </Card>
  );
}
