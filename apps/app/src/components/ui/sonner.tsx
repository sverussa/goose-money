import type { CSSProperties } from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

// Snackbar M3 (D17): superfície inversa, raio 4, sombra (a única além do FAB) e ação em
// inverse-primary. Sem `next-themes`: as variáveis já mudam com o tema (T04-02).
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--color-inverse-surface)',
          '--normal-text': 'var(--color-inverse-on-surface)',
          '--normal-border': 'var(--color-inverse-surface)',
          '--border-radius': 'var(--radius-xs)',
        } as CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'min-h-12! gap-6! py-2! pr-2! pl-4! text-body-md! shadow-snackbar!',
          actionButton:
            'h-10! rounded-full! bg-transparent! px-3! text-label-lg! text-inverse-primary! hover:bg-inverse-primary/8!',
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
