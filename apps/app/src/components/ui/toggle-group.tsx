import * as React from 'react';
import { cn } from '@/lib/utils';
import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui';

// Segmented button M3 do design: 40 dp, borda outline, divisória entre os segmentos, selecionado
// em secondary-container com ícone de marcado.
function ToggleGroup({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      className={cn(
        'inline-flex w-fit items-stretch overflow-hidden rounded-full border border-outline',
        className,
      )}
      {...props}
    />
  );
}

function ToggleGroupItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      className={cn(
        "alvo inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 border-r border-outline bg-surface-container-lowest px-4.5 text-body-md font-medium whitespace-nowrap text-on-surface transition-colors last:border-r-0 hover:bg-on-surface/8 focus-visible:z-10 focus-visible:-outline-offset-3 disabled:pointer-events-none disabled:opacity-38 data-[state=on]:bg-secondary-container data-[state=on]:font-semibold data-[state=on]:text-on-secondary-container [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4.5",
        className,
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
}

export { ToggleGroup, ToggleGroupItem };
