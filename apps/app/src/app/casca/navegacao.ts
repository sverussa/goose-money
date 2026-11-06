import type { Badges } from '@goose-money/core';
import {
  Banknote,
  CalendarSync,
  CreditCard,
  HandCoins,
  Landmark,
  LayoutDashboard,
  type LucideIcon,
  ReceiptText,
  Settings,
  TrendingUp,
} from 'lucide-react';

import { mensagens } from '../mensagens';

const m = mensagens.navegacao.itens;

export interface ItemDoMenu {
  chave: string;
  rotulo: string;
  rota: string;
  Icone: LucideIcon;
  badge?: keyof Badges;
}

/** Menu principal (5.1), na ordem do raciocínio do usuário. */
export const itensDoMenu: readonly ItemDoMenu[] = [
  { chave: 'painel', rotulo: m.painel, rota: '/', Icone: LayoutDashboard },
  {
    chave: 'lancamentos',
    rotulo: m.lancamentos,
    rota: '/lancamentos',
    Icone: ReceiptText,
    badge: 'lancamentos',
  },
  { chave: 'contas', rotulo: m.contas, rota: '/contas', Icone: Landmark },
  { chave: 'cartoes', rotulo: m.cartoes, rota: '/cartoes', Icone: CreditCard, badge: 'cartoes' },
  { chave: 'dividas', rotulo: m.dividas, rota: '/dividas', Icone: HandCoins },
  { chave: 'rendas', rotulo: m.rendas, rota: '/rendas', Icone: Banknote, badge: 'rendasFixas' },
  {
    chave: 'gastos',
    rotulo: m.gastos,
    rota: '/gastos-fixos',
    Icone: CalendarSync,
    badge: 'gastosFixos',
  },
  { chave: 'projecoes', rotulo: m.projecoes, rota: '/projecoes', Icone: TrendingUp },
  { chave: 'configuracoes', rotulo: m.configuracoes, rota: '/configuracoes', Icone: Settings },
];

/** No compact, a navigation bar mostra os 4 primeiros e "Mais" abre os itens 5 a 9 (5.1). */
export const itensDaBarra = itensDoMenu.slice(0, 4);
export const itensDoMais = itensDoMenu.slice(4);

/**
 * Item do menu da rota atual. `/projecoes` é atalho para a aba Projeções do Painel
 * (`/?aba=projecoes`), então essa aba acende "Projeções", não "Painel".
 */
export function itemAtivo(caminho: string, busca: string): ItemDoMenu | undefined {
  if (caminho === '/') {
    const aba = new URLSearchParams(busca).get('aba');
    return itensDoMenu.find((i) => i.chave === (aba === 'projecoes' ? 'projecoes' : 'painel'));
  }
  return itensDoMenu.find(
    (i) => i.rota !== '/' && (caminho === i.rota || caminho.startsWith(`${i.rota}/`)),
  );
}

/** Número do badge de um item (0 sem badge); "Mais" soma os itens que ele abre. */
export const numeroDoBadge = (itens: readonly ItemDoMenu[], b: Badges | null): number =>
  b ? itens.reduce((s, i) => s + (i.badge ? b[i.badge] : 0), 0) : 0;
