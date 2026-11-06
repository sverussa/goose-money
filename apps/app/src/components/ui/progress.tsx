import * as React from 'react';
import { cn } from '@/lib/utils';
import { Progress as ProgressPrimitive } from 'radix-ui';

// Progresso linear M3 (limite, parcelas pagas): 4 dp, trilho em secondary-container.
function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={value}
      className={cn(
        'relative h-1 w-full overflow-hidden rounded-full bg-secondary-container',
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="size-full rounded-full bg-primary transition-transform"
        style={{ transform: `translateX(-${String(100 - (value ?? 0))}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
