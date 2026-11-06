import { cn } from '@/lib/utils';

import { chips, type EstadoDoChip } from './estados';

/** `rotulo` troca só o texto, para variações como "Vence amanhã"; cor e ícone ficam. */
export function StatusChip({
  estado,
  rotulo,
  className,
}: {
  estado: EstadoDoChip;
  rotulo?: string;
  className?: string;
}) {
  const { cor, Icone, ...padrao } = chips[estado];
  return (
    <span
      data-estado={estado}
      className={cn(
        'inline-flex h-6 w-fit shrink-0 items-center gap-1 rounded-sm px-2 text-label-md font-semibold whitespace-nowrap',
        cor,
        className,
      )}
    >
      <Icone aria-hidden className="size-3.5 shrink-0" />
      {rotulo ?? padrao.rotulo}
    </span>
  );
}
