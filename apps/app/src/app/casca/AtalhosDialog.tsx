import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { mensagens } from '../mensagens';
import { teclaModificadora } from './atalhos';

const m = mensagens.atalhos;

/** Lista dos atalhos de teclado (4.1, item 9), aberta pelo menu do usuário. */
export function AtalhosDialog({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const mod = teclaModificadora();
  return (
    <Dialog
      open={aberto}
      onOpenChange={(a) => {
        if (!a) onFechar();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{m.titulo}</DialogTitle>
          <DialogDescription>{m.descricao}</DialogDescription>
        </DialogHeader>
        <dl className="flex flex-col">
          {m.lista.map(([tecla, acao]) => (
            <div
              key={acao}
              className="flex min-h-12 items-center gap-4 border-b border-surface-container-high last:border-b-0"
            >
              <dt className="w-20 shrink-0">
                <kbd className="rounded-xs bg-surface-container-high px-2 py-1 text-label-md">
                  {tecla.replace('{mod}', mod)}
                </kbd>
              </dt>
              <dd className="text-body-md">{acao}</dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
