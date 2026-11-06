import { mensagens } from '@/app/mensagens';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/**
 * Formulário de lançamento (T05-02 a T05-05). Provisório: a casca já o abre pelo FAB, pela
 * tecla N e pela busca; a tarefa da tela troca só este arquivo.
 */
export function LancarDialog({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  return (
    <Dialog
      open={aberto}
      onOpenChange={(a) => {
        if (!a) onFechar();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mensagens.lancar.titulo}</DialogTitle>
          <DialogDescription>{mensagens.lancar.provisorio}</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
