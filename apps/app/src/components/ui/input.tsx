import * as React from 'react';
import { cn } from '@/lib/utils';

// Campo outlined do Login: 56 dp, raio 4, foco com borda de 2 dp em primary, erro em error.
const campo =
  'w-full min-w-0 rounded-xs border border-outline bg-transparent px-4 text-body-lg text-on-surface transition-colors placeholder:text-on-surface-variant focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-38 aria-invalid:border-error aria-invalid:ring-1 aria-invalid:ring-error aria-invalid:ring-inset';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input type={type} data-slot="input" className={cn(campo, 'h-14', className)} {...props} />
  );
}

export { Input, campo };
