import * as React from 'react';
import { cn } from '@/lib/utils';
import { Checkbox as CheckboxPrimitive } from 'radix-ui';
import { CheckIcon } from 'lucide-react';

// Checkbox M3: 18 dp, raio 2, marcado em primary; alvo de 48 dp.
function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer alvo flex size-4.5 shrink-0 cursor-pointer items-center justify-center rounded-xs border-2 border-on-surface-variant transition-colors disabled:cursor-not-allowed disabled:opacity-38 aria-invalid:border-error data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-on-primary',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center"
      >
        <CheckIcon className="size-3.5" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
