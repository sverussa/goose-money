import type { StatusFatura } from '@goose-money/core';
import {
  ArrowRightToLine,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  ChartPie,
  CircleAlert,
  CircleCheck,
  Clock,
  ClockAlert,
  Hourglass,
  Lock,
  LockOpen,
  type LucideIcon,
  Rewind,
  Sparkles,
  Tag,
} from 'lucide-react';

import { mensagens } from '@/app/mensagens';

const m = mensagens.estados;

/**
 * O único mapeamento estado → rótulo, cor e ícone do app (4.1 item 6): estados de 3.1, status de
 * fatura de 3.5 e os chips extras. Base: `statusChips` de design/theme-tokens.ts.
 */
export const chips = {
  previsto: {
    rotulo: m.previsto,
    cor: 'bg-forecast-container text-on-forecast-container',
    Icone: Clock,
  },
  aPagar: {
    rotulo: m.aPagar,
    cor: 'bg-surface-container-high text-on-surface-variant',
    Icone: Hourglass,
  },
  vencido: {
    rotulo: m.vencido,
    cor: 'bg-error-container text-on-error-container',
    Icone: CircleAlert,
  },
  atrasado: {
    rotulo: m.atrasado,
    cor: 'bg-warning-container text-on-warning-container',
    Icone: ClockAlert,
  },
  venceEmBreve: {
    rotulo: m.venceEmBreve,
    cor: 'bg-warning-container text-on-warning-container',
    Icone: CalendarClock,
  },
  faturaFutura: {
    rotulo: m.futura,
    cor: 'bg-surface-container text-on-surface-variant',
    Icone: CalendarDays,
  },
  faturaAberta: {
    rotulo: m.aberta,
    cor: 'bg-secondary-container text-on-secondary-container',
    Icone: LockOpen,
  },
  faturaFechada: {
    rotulo: m.fechada,
    cor: 'bg-surface-container-high text-on-surface-variant',
    Icone: Lock,
  },
  faturaVencida: {
    rotulo: m.vencida,
    cor: 'bg-error-container text-on-error-container',
    Icone: CircleAlert,
  },
  faturaPaga: {
    rotulo: m.paga,
    cor: 'bg-income-container text-on-income-container',
    Icone: CircleCheck,
  },
  faturaTransportada: {
    rotulo: m.transportada,
    cor: 'bg-surface-container text-on-surface-variant',
    Icone: ArrowRightToLine,
  },
  pagaParcialmente: {
    rotulo: m.pagaParcialmente,
    cor: 'bg-transfer-container text-on-transfer-container',
    Icone: ChartPie,
  },
  aClassificar: {
    rotulo: m.aClassificar,
    cor: 'bg-warning-container text-on-warning-container',
    Icone: Tag,
  },
  novo: {
    rotulo: m.novo,
    cor: 'bg-secondary-container text-on-secondary-container',
    Icone: Sparkles,
  },
  anteriorAoSaldoInicial: {
    rotulo: m.anteriorAoSaldoInicial,
    cor: 'bg-surface-container text-on-surface-variant',
    Icone: Rewind,
  },
  pagaAntesDoCadastro: {
    rotulo: m.pagaAntesDoCadastro,
    cor: 'bg-surface-container text-on-surface-variant',
    Icone: CalendarCheck,
  },
} satisfies Record<string, { rotulo: string; cor: string; Icone: LucideIcon }>;

export type EstadoDoChip = keyof typeof chips;
export const estadosDoChip = Object.keys(chips) as EstadoDoChip[];

/** Status de fatura do core (3.5) → chip. */
export const chipDaFatura: Record<StatusFatura, EstadoDoChip> = {
  futura: 'faturaFutura',
  aberta: 'faturaAberta',
  fechada: 'faturaFechada',
  vencida: 'faturaVencida',
  paga: 'faturaPaga',
  transportada: 'faturaTransportada',
};
