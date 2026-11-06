import type { CSSProperties } from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

// Snackbar M3 (D17): superfície inversa e raio extra-small, sem `next-themes`.
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
      {...props}
    />
  );
}

export { Toaster };
