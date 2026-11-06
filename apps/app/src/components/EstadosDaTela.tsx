import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { mensagens } from '@/app/mensagens';
import type { Carga } from '@/queries/fatos';

import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';

/** Estado vazio que ensina (4.1, item 8): ícone grande, uma frase de propósito e um botão. */
export function EmptyState({
  Icone,
  frase,
  acao,
}: {
  Icone: LucideIcon;
  frase: string;
  acao?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
      <span className="flex size-20 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant">
        <Icone aria-hidden className="size-10" strokeWidth={1.5} />
      </span>
      <p className="max-w-sm text-body-lg">{frase}</p>
      {acao}
    </div>
  );
}

/** Esqueleto enquanto os fatos carregam. */
export function EstadoCarregando({ linhas = 4 }: { linhas?: number }) {
  return (
    <div role="status" className="flex flex-col gap-3">
      <span className="sr-only">{mensagens.carregando}</span>
      {Array.from({ length: linhas }, (_, i) => (
        <Skeleton key={i} aria-hidden className="h-14 w-full rounded-md" />
      ))}
    </div>
  );
}

/** Falha ao carregar: a mensagem e "Tentar de novo". */
export function EstadoErro({
  mensagem,
  tentarDeNovo,
}: {
  mensagem: string;
  tentarDeNovo: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-md bg-error-container p-4 text-on-error-container"
    >
      <p className="text-body-md">{mensagem}</p>
      <Button variant="outlined" onClick={tentarDeNovo}>
        {mensagens.tentarDeNovo}
      </Button>
    </div>
  );
}

/** Carregando ou erro de qualquer `Carga`; `null` quando pronta (a tela mostra os dados). */
export function EstadoDaCarga({ carga }: { carga: Carga<unknown> }) {
  if (carga.estado === 'carregando') return <EstadoCarregando />;
  if (carga.estado === 'erro')
    return <EstadoErro mensagem={carga.mensagem} tentarDeNovo={carga.tentarDeNovo} />;
  return null;
}
