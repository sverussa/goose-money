import * as React from 'react';
import { Command as CommandPrimitive } from 'cmdk';
import { cn } from '@/lib/utils';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SearchIcon } from 'lucide-react';

// Busca M3 (D17, `Command`): barra de busca de 56 dp e itens de lista de 48 dp.

function Command({ className, ...props }: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        'flex size-full flex-col overflow-hidden bg-surface-container-high text-on-surface',
        className,
      )}
      {...props}
    />
  );
}

function CommandDialog({
  title,
  description,
  children,
  className,
  onCloseAutoFocus,
  ...props
}: React.ComponentProps<typeof Dialog> & {
  title: string;
  description: string;
  className?: string;
  /** Depois de fechar (fim da animação e devolução do foco). */
  onCloseAutoFocus?: React.ComponentProps<typeof DialogContent>['onCloseAutoFocus'];
}) {
  return (
    <Dialog {...props}>
      <DialogContent
        showCloseButton={false}
        onCloseAutoFocus={onCloseAutoFocus}
        className={cn('top-24 max-w-xl translate-y-0 gap-0 overflow-hidden p-0', className)}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div
      data-slot="command-input-wrapper"
      className="flex h-14 items-center gap-3 border-b border-outline-variant px-4"
    >
      <SearchIcon aria-hidden className="size-5 shrink-0 text-on-surface-variant" />
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(
          'h-full w-full bg-transparent text-body-lg outline-none placeholder:text-on-surface-variant disabled:cursor-not-allowed',
          className,
        )}
        {...props}
      />
    </div>
  );
}

function CommandList({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn('max-h-96 scroll-py-2 overflow-x-hidden overflow-y-auto py-2', className)}
      {...props}
    />
  );
}

function CommandEmpty({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn('px-4 py-6 text-center text-body-md text-on-surface-variant', className)}
      {...props}
    />
  );
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        '**:[[cmdk-group-heading]]:px-4 **:[[cmdk-group-heading]]:py-2 **:[[cmdk-group-heading]]:text-label-md **:[[cmdk-group-heading]]:text-on-surface-variant',
        className,
      )}
      {...props}
    />
  );
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn('my-1 h-px bg-outline-variant', className)}
      {...props}
    />
  );
}

function CommandItem({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "relative flex min-h-12 cursor-pointer items-center gap-3 px-4 py-1.5 text-body-md outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:text-outline data-[selected=true]:bg-on-surface/8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5 [&_svg]:text-on-surface-variant",
        className,
      )}
      {...props}
    />
  );
}

function CommandShortcut({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn('ml-auto text-label-md text-on-surface-variant', className)}
      {...props}
    />
  );
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
};
