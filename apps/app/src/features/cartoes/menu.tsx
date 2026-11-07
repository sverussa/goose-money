import type { Permissao } from '@goose-money/core';

import { DropdownMenuItem } from '@/components/ui/dropdown-menu';

/**
 * Item do menu; desabilitado, mostra o motivo logo abaixo (como em Contas). `detalhe` é o texto
 * de apoio do item habilitado (CartaoFatura.dc.html).
 */
export function ItemDoMenu({
  rotulo,
  permissao,
  detalhe,
  aoEscolher,
}: {
  rotulo: string;
  permissao?: Permissao;
  detalhe?: string;
  aoEscolher: () => void;
}) {
  const motivo = permissao && !permissao.permitida ? permissao.motivo : undefined;
  const apoio = motivo ?? detalhe;
  return (
    <DropdownMenuItem
      disabled={motivo !== undefined}
      onSelect={aoEscolher}
      className="flex-col items-start gap-0.5"
    >
      <span>{rotulo}</span>
      {apoio && (
        <span className="max-w-72 text-label-md font-normal text-on-surface-variant">{apoio}</span>
      )}
    </DropdownMenuItem>
  );
}
