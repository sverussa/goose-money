import { WifiOff } from 'lucide-react';

import { useConexao } from '@/queries/useConexao';

import { mensagens } from './mensagens';

const m = mensagens.conexao;

/** Faixa fixa abaixo da top app bar enquanto não há conexão (T03-05, 9.3). */
export function BannerSemConexao() {
  const online = useConexao();
  if (online) return null;
  return (
    <div
      role="status"
      className="sticky top-0 z-10 flex items-start gap-2 bg-destructive/10 px-4 py-2 text-sm text-foreground"
    >
      <WifiOff aria-hidden className="mt-0.5 size-4 shrink-0" />
      <p>
        <strong>{m.titulo}.</strong> {m.texto}
      </p>
    </div>
  );
}
