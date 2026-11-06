import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Tabs as TabsPrimitive } from 'radix-ui';

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root data-slot="tabs" className={cn('flex flex-col', className)} {...props} />
  );
}

// Primárias: sublinhado de 3 dp em primary (Painel). Secundárias: roláveis, uma por fatura
// (CartaoFatura), com duas linhas (mês e estado) e altura de 56 dp.
const tabsListVariants = cva('flex border-b border-surface-container-highest', {
  variants: {
    variant: {
      primary: 'w-full',
      secondary: 'w-full overflow-x-auto',
    },
  },
  defaultVariants: { variant: 'primary' },
});

function TabsList({
  className,
  variant = 'primary',
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn('group/tabs-list', tabsListVariants({ variant }), className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex min-h-tab cursor-pointer items-center justify-center gap-2 border-b-3 border-transparent px-4 text-body-md font-medium whitespace-nowrap text-on-surface-variant transition-colors hover:bg-on-surface/8 focus-visible:-outline-offset-3 disabled:pointer-events-none disabled:opacity-38 data-[state=active]:border-primary data-[state=active]:font-semibold data-[state=active]:text-primary [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4.5",
        'group-data-[variant=secondary]/tabs-list:min-h-14 group-data-[variant=secondary]/tabs-list:min-w-24 group-data-[variant=secondary]/tabs-list:shrink-0 group-data-[variant=secondary]/tabs-list:flex-col group-data-[variant=secondary]/tabs-list:gap-0.5',
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('flex-1 pt-4', className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };
