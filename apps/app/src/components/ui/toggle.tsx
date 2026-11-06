import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Toggle as TogglePrimitive } from 'radix-ui';

// Filter chip M3 do design: 36 dp, raio 8, borda outline-variant; selecionado em
// secondary-container, sem borda.
const toggleVariants = cva(
  "alvo inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-sm border border-outline-variant bg-surface-container-lowest px-3 text-body-md font-medium whitespace-nowrap text-on-surface-variant transition-colors hover:bg-on-surface/8 disabled:pointer-events-none disabled:opacity-38 data-[state=on]:border-transparent data-[state=on]:bg-secondary-container data-[state=on]:font-semibold data-[state=on]:text-on-secondary-container [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4.5",
);

function Toggle({
  className,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants(), className)}
      {...props}
    />
  );
}

export { Toggle, toggleVariants };
