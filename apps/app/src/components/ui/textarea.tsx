import * as React from 'react';
import { cn } from '@/lib/utils';
import { campo } from '@/components/ui/input';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(campo, 'field-sizing-content min-h-24 py-4', className)}
      {...props}
    />
  );
}

export { Textarea };
