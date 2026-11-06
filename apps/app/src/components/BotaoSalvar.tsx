import type { ComponentProps } from 'react';

import { mensagens } from '@/app/mensagens';
import { Button } from '@/components/ui/button';
import { useConexao } from '@/queries/useConexao';

const m = mensagens.gravacao;

/**
 * Botão de salvar dos formulários: "Salvando…" enquanto grava (T03-04) e desabilitado, com a
 * explicação, enquanto não há conexão (T03-05).
 */
export function BotaoSalvar({
  salvando,
  children = m.salvar,
  disabled,
  ...props
}: ComponentProps<typeof Button> & { salvando: boolean }) {
  const online = useConexao();
  // ponytail: `title` até o Tooltip do shadcn chegar na T04-03.
  return (
    <span title={online ? undefined : mensagens.conexao.salvarBloqueado}>
      <Button
        type="submit"
        disabled={disabled === true || salvando || !online}
        aria-busy={salvando}
        {...props}
      >
        {salvando ? m.salvando : children}
      </Button>
    </span>
  );
}
