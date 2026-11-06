import * as React from 'react';
import { cn } from '@/lib/utils';
import { Switch as SwitchPrimitive } from 'radix-ui';

// Switch M3: trilho de 52 × 32, borda outline quando desligado, polegar maior quando ligado.
function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer group/switch alvo inline-flex h-8 w-13 shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors disabled:cursor-not-allowed disabled:opacity-38 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=unchecked]:border-outline data-[state=unchecked]:bg-surface-container-highest',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block rounded-full transition-all data-[state=checked]:size-6 data-[state=checked]:translate-x-5.5 data-[state=checked]:bg-on-primary data-[state=unchecked]:size-4 data-[state=unchecked]:translate-x-1.5 data-[state=unchecked]:bg-outline"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
