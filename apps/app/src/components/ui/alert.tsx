import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Banner persistente M3 (5.2, 6.2 Projeções): raio 12, ícone à esquerda, ação opcional à direita.
const alertVariants = cva(
  "flex w-full items-start gap-3.5 rounded-md px-4 py-3.5 text-body-md [&>svg]:mt-px [&>svg]:shrink-0 [&>svg:not([class*='size-'])]:size-5.5",
  {
    variants: {
      variant: {
        info: 'bg-surface-container text-on-surface [&>svg]:text-primary',
        warning: 'bg-warning-container text-on-warning-container',
        error: 'bg-error-container text-on-error-container',
      },
    },
    defaultVariants: { variant: 'info' },
  },
);

/** Sem `role` por padrão: quem usa escolhe `note` (aviso fixo), `status` ou `alert` (urgente). */
function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return <div data-slot="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="alert-title" className={cn('font-semibold', className)} {...props} />;
}

function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="alert-description" className={cn('flex-1', className)} {...props} />;
}

function AlertAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-action"
      className={cn('-my-1.5 ml-auto shrink-0', className)}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription, AlertAction };
