import { badges, type Badges } from '@goose-money/core';
import { Suspense, useMemo } from 'react';
import { Link, Outlet, useLocation } from 'react-router';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDerivado } from '@/queries/fatos';
import { LogOut, Settings } from 'lucide-react';

import { BannerSemConexao } from '../BannerSemConexao';
import { mensagens } from '../mensagens';
import { useSessao } from '../providers/useSessao';
import { BarraProvisoria } from './BarraProvisoria';
import { itemAtivo } from './navegacao';
import { BarraDeNavegacao, MenuLateral, MenuRail } from './Menus';

/** Badges do menu, direto do core (T01-21). */
function useBadges(): Badges | null {
  const d = useDerivado();
  return useMemo(() => (d.estado === 'pronto' ? badges(d.dados) : null), [d]);
}

function MenuDoUsuario() {
  const { usuario, sair } = useSessao();
  const email = usuario?.email ?? '';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="tonal"
          aria-label={mensagens.navegacao.menuDoUsuario}
          className="size-10 shrink-0 px-0"
        >
          {email.charAt(0).toUpperCase()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel className="truncate">{email}</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link to="/configuracoes">
            <Settings /> {mensagens.navegacao.itens.configuracoes}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void sair()}>
          <LogOut /> {mensagens.sessao.sair}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Estrutura de toda tela autenticada (5.2): top app bar, Barra de Totais (fixa), cabeçalho de
 * contexto (T04-07), conteúdo e FAB "+ Lançar" (T05-02); navegação conforme a largura (5.1).
 */
export function AppShell() {
  const b = useBadges();
  const { pathname, search } = useLocation();
  const titulo = itemAtivo(pathname, search)?.rotulo ?? mensagens.app;

  return (
    <div className="min-h-dvh bg-surface text-on-surface expanded:flex">
      <title>{`${titulo} · ${mensagens.app}`}</title>
      <MenuLateral badges={b} />
      <MenuRail badges={b} />
      <div className="flex min-w-0 flex-1 flex-col pb-20 medium:pb-0 medium:pl-20 expanded:pl-0">
        <header className="flex min-h-app-bar items-center gap-1 py-2 pr-2 pl-4 medium:gap-3 medium:px-6">
          <h1 className="flex-1 truncate text-title-lg">{titulo}</h1>
          {/* Seletor de mês (T04-07) e busca (T04-09) entram aqui. */}
          <MenuDoUsuario />
        </header>
        <div className="sticky top-0 z-20">
          {/* Faixa "Sem conexão" (T03-05) logo abaixo da top app bar, fixa junto com a Barra. */}
          <BannerSemConexao />
          <BarraProvisoria />
          {/* Cabeçalho de contexto do módulo (T04-07), fixo junto com a Barra. */}
        </div>
        <main className="mx-auto w-full max-w-conteudo flex-1 px-4 py-5 medium:px-6">
          <Suspense
            fallback={
              <p role="status" className="text-body-md">
                {mensagens.carregando}
              </p>
            }
          >
            <Outlet />
          </Suspense>
        </main>
        {/* FAB "+ Lançar" (T05-02), acima da navigation bar no compact. */}
      </div>
      <BarraDeNavegacao badges={b} />
    </div>
  );
}
