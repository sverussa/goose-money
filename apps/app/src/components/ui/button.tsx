import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Slot } from 'radix-ui';

// Botões M3 do design: pílula de 40 dp, Label Large, alvo de 48 dp.
const buttonVariants = cva(
  "alvo inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full text-label-lg whitespace-nowrap transition-colors select-none disabled:pointer-events-none disabled:opacity-38 aria-disabled:pointer-events-none aria-disabled:opacity-38 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4.5",
  {
    variants: {
      variant: {
        filled: 'h-10 bg-primary px-4 text-on-primary hover:bg-primary/90',
        tonal:
          'h-10 bg-secondary-container px-4 text-on-secondary-container hover:bg-secondary-container/80',
        outlined: 'h-10 border border-outline px-4 text-primary hover:bg-primary/8',
        text: 'h-10 px-3 text-primary hover:bg-primary/8',
        icon: 'size-12 text-on-surface-variant hover:bg-on-surface/8 aria-expanded:bg-on-surface/8',
        destructive: 'h-10 bg-error px-4 text-on-error hover:bg-error/90',
      },
    },
    defaultVariants: { variant: 'filled' },
  },
);

function Button({
  className,
  variant = 'filled',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      className={cn(buttonVariants({ variant, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
