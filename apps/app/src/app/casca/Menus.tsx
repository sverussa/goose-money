import type { Badges } from '@goose-money/core';
import { LogOut, Menu, Wallet } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

import { mensagens } from '../mensagens';
import { useSessao } from '../providers/useSessao';
import {
  type ItemDoMenu,
  itemAtivo,
  itensDaBarra,
  itensDoMais,
  itensDoMenu,
  numeroDoBadge,
} from './navegacao';

const m = mensagens.navegacao;

function useAtivo() {
  const { pathname, search } = useLocation();
  return itemAtivo(pathname, search);
}

/** Número visível do badge; o leitor de tela ouve "N pendências". */
function NumeroDoBadge({ n, className }: { n: number; className?: string }) {
  if (n === 0) return null;
  return (
    <>
      <Badge aria-hidden className={className}>
        {n}
      </Badge>
      <span className="sr-only">, {m.pendencias(n)}</span>
    </>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-3 px-4 pt-2 pb-5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-on-primary">
        <Wallet aria-hidden className="size-5.5" />
      </span>
      <span className="flex flex-col">
        <span className="text-title-md font-bold">{mensagens.app}</span>
        <span className="text-label-md font-normal text-on-surface-variant">{m.subtitulo}</span>
      </span>
    </div>
  );
}

/** Linha do drawer e do "Mais": 52 dp, pílula, ativo em secondary-container (Nav.dc.html). */
function LinhaDoMenu({
  item,
  ativo,
  badges,
  aoNavegar,
}: {
  item: ItemDoMenu;
  ativo: boolean;
  badges: Badges | null;
  aoNavegar?: () => void;
}) {
  return (
    <Link
      to={item.rota}
      aria-current={ativo ? 'page' : undefined}
      onClick={aoNavegar}
      className={cn(
        'flex h-13 items-center gap-3 rounded-full px-4 text-body-md font-medium text-on-surface-variant hover:bg-on-surface/8',
        ativo &&
          'bg-secondary-container font-semibold text-on-secondary-container hover:bg-secondary-container',
      )}
    >
      <item.Icone aria-hidden className="size-5.5 shrink-0" strokeWidth={1.8} />
      <span className="flex-1">{item.rotulo}</span>
      <NumeroDoBadge n={numeroDoBadge([item], badges)} />
    </Link>
  );
}

/** Drawer fixo (≥ 840 dp) com os 9 itens, badges e rodapé com o usuário e "Sair" (5.1, D18). */
export function MenuLateral({ badges }: { badges: Badges | null }) {
  const ativo = useAtivo();
  const { usuario, sair } = useSessao();
  const email = usuario?.email ?? '';
  return (
    <nav
      aria-label={m.menuPrincipal}
      className="hidden h-dvh w-drawer shrink-0 flex-col gap-1 overflow-y-auto bg-surface-container-low px-3 pt-4 pb-6 text-on-surface expanded:sticky expanded:top-0 expanded:flex"
    >
      <Logo />
      {itensDoMenu.map((item) => (
        <LinhaDoMenu key={item.chave} item={item} ativo={item === ativo} badges={badges} />
      ))}
      <div className="min-h-6 flex-1" />
      <div className="mx-4 mt-2 flex items-center gap-3 border-t border-outline-variant pt-4">
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary-container text-label-lg text-on-secondary-container"
        >
          {email.charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 truncate text-body-md font-medium">{email}</span>
        <Button variant="icon" aria-label={mensagens.sessao.sair} onClick={() => void sair()}>
          <LogOut />
        </Button>
      </div>
    </nav>
  );
}

/** Destino do rail e da barra: pílula de ícone com o rótulo embaixo (M3). */
function Destino({
  rotulo,
  Icone,
  ativo,
  badge,
  className,
}: {
  rotulo: string;
  Icone: ItemDoMenu['Icone'];
  ativo: boolean;
  badge: number;
  className?: string;
}) {
  return (
    <span
      className={cn('relative flex min-h-14 flex-col items-center justify-center gap-1', className)}
    >
      <span
        className={cn(
          'flex h-8 w-14 items-center justify-center rounded-full',
          ativo && 'bg-secondary-container text-on-secondary-container',
        )}
      >
        <Icone aria-hidden className="size-5.5" strokeWidth={1.8} />
      </span>
      <NumeroDoBadge
        n={badge}
        className="absolute top-1 left-1/2 ml-1.5 h-4 min-w-4 px-1 text-label-md"
      />
      <span className={cn('text-label-md', ativo && 'font-semibold text-on-surface')}>
        {rotulo}
      </span>
    </span>
  );
}

/** Navigation rail (600–839 dp) com os 9 itens; não desenhado, segue o vocabulário do drawer. */
export function MenuRail({ badges }: { badges: Badges | null }) {
  const ativo = useAtivo();
  return (
    <nav
      aria-label={m.menuPrincipal}
      className="fixed inset-y-0 left-0 z-30 hidden w-20 flex-col items-center gap-1 overflow-y-auto bg-surface-container-low py-4 text-on-surface-variant medium:flex expanded:hidden"
    >
      <span className="mb-3 flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-on-primary">
        <Wallet aria-hidden className="size-5.5" />
      </span>
      {itensDoMenu.map((item) => (
        <Link
          key={item.chave}
          to={item.rota}
          aria-current={item === ativo ? 'page' : undefined}
          className="w-full rounded-md hover:bg-on-surface/8"
        >
          <Destino
            rotulo={item.rotulo}
            Icone={item.Icone}
            ativo={item === ativo}
            badge={numeroDoBadge([item], badges)}
          />
        </Link>
      ))}
    </nav>
  );
}

/** Navigation bar do compact (< 600 dp): 4 itens e "Mais", que abre os itens 5 a 9 (5.1). */
export function BarraDeNavegacao({ badges }: { badges: Badges | null }) {
  const ativo = useAtivo();
  const [mais, setMais] = useState(false);
  const maisAtivo = ativo !== undefined && itensDoMais.includes(ativo);
  return (
    <>
      <nav
        aria-label={m.navegacaoPrincipal}
        className="fixed inset-x-0 bottom-0 z-30 grid h-20 grid-cols-5 items-center bg-surface-container text-on-surface-variant medium:hidden"
      >
        {itensDaBarra.map((item) => (
          <Link key={item.chave} to={item.rota} aria-current={item === ativo ? 'page' : undefined}>
            <Destino
              rotulo={item.rotulo}
              Icone={item.Icone}
              ativo={item === ativo}
              badge={numeroDoBadge([item], badges)}
            />
          </Link>
        ))}
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={mais}
          onClick={() => {
            setMais(true);
          }}
          className="cursor-pointer"
        >
          <Destino
            rotulo={m.mais}
            Icone={Menu}
            ativo={maisAtivo}
            badge={numeroDoBadge(itensDoMais, badges)}
          />
        </button>
      </nav>
      <Sheet open={mais} onOpenChange={setMais}>
        <SheetContent side="bottom" className="rounded-t-xl pb-6">
          <SheetHeader>
            <SheetTitle>{m.mais}</SheetTitle>
            <SheetDescription className="sr-only">{m.menuPrincipal}</SheetDescription>
          </SheetHeader>
          <nav aria-label={m.mais} className="flex flex-col gap-1 px-3">
            {itensDoMais.map((item) => (
              <LinhaDoMenu
                key={item.chave}
                item={item}
                ativo={item === ativo}
                badges={badges}
                aoNavegar={() => {
                  setMais(false);
                }}
              />
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
