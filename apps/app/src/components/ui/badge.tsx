import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Slot } from 'radix-ui';

// Badge do menu (Nav): 20 dp, pílula, error/on-error, número em Label Medium semibold.
const badgeVariants = cva(
  'inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-label-md font-semibold whitespace-nowrap',
  {
    variants: {
      variant: {
        error: 'bg-error text-on-error',
        neutral: 'bg-secondary-container text-on-secondary-container',
      },
    },
    defaultVariants: { variant: 'error' },
  },
);

function Badge({
  className,
  variant = 'error',
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'span';
  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
