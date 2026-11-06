import * as React from 'react';
import { cn } from '@/lib/utils';
import { Drawer as DrawerPrimitive } from 'vaul';

function Drawer(props: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  return <DrawerPrimitive.Root data-slot="drawer" {...props} />;
}

function DrawerTrigger(props: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerPortal(props: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

function DrawerClose(props: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

function DrawerOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  return (
    <DrawerPrimitive.Overlay
      data-slot="drawer-overlay"
      className={cn('fixed inset-0 z-50 bg-scrim/40', className)}
      {...props}
    />
  );
}

/**
 * Bottom sheet M3 (raio 28 no topo, com alça) ou, com `telaCheia`, o full-screen dialog do
 * compact (MobileLancar): ocupa a tela toda, sem raio nem alça.
 */
function DrawerContent({
  className,
  children,
  telaCheia = false,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content> & { telaCheia?: boolean }) {
  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Content
        data-slot="drawer-content"
        data-tela-cheia={telaCheia}
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 flex flex-col bg-surface text-on-surface',
          telaCheia ? 'top-0 h-dvh' : 'max-h-[90dvh] rounded-t-xl bg-surface-container-low',
          className,
        )}
        {...props}
      >
        {!telaCheia && (
          <div
            aria-hidden
            className="mx-auto mt-4 h-1 w-8 shrink-0 rounded-full bg-on-surface-variant/40"
          />
        )}
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
}

function DrawerHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="drawer-header"
      className={cn('flex flex-col gap-1 p-4', className)}
      {...props}
    />
  );
}

function DrawerFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn('mt-auto flex flex-col gap-2 p-4', className)}
      {...props}
    />
  );
}

function DrawerTitle({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn('text-title-lg', className)}
      {...props}
    />
  );
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn('text-body-md text-on-surface-variant', className)}
      {...props}
    />
  );
}

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};
