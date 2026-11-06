import * as React from 'react';
import { cn } from '@/lib/utils';
import { Label as LabelPrimitive } from 'radix-ui';

// Rótulo acima do campo (Login): 13 dp, peso 500, on-surface-variant; em erro, error.
function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        'flex items-center gap-2 text-label-md text-on-surface-variant select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-38 peer-disabled:cursor-not-allowed peer-disabled:opacity-38 data-[erro=true]:text-error',
        className,
      )}
      {...props}
    />
  );
}

export { Label };
