import type { Lancamento } from '@goose-money/core';
import { useRef } from 'react';

import { EstadoDaCarga } from '@/components/EstadosDaTela';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { useDerivado } from '@/queries/fatos';

import type { ValoresDoFormulario } from './formulario';
import { FormularioLancamento } from './FormularioLancamento';
import { mensagensLancar as m } from './mensagens';
import { useCompact } from './useCompact';

type Inicial = Pick<ValoresDoFormulario, 'tipo' | 'contaId' | 'cartaoId' | 'data'>;

/**
 * O formulário de lançamento num invólucro das telas (diálogo, ou tela cheia no compact), fora
 * do FAB: para editar (T05-07) ou para lançar com padrões da tela (Transferir, T05-10).
 */
function DialogoDoFormulario({
  aberto,
  titulo,
  inicial,
  editando,
  onFechar,
}: {
  aberto: boolean;
  titulo: string;
  inicial: Inicial | null;
  editando?: Lancamento;
  onFechar: () => void;
}) {
  const derivado = useDerivado();
  const telaCheia = useCompact();
  const valorRef = useRef<HTMLInputElement>(null);
  const listaAbertaRef = useRef(false);
  const aoMudar = (a: boolean) => {
    if (!a) onFechar();
  };
  const props = {
    'aria-describedby': undefined,
    onEscapeKeyDown: (e: KeyboardEvent) => {
      if (listaAbertaRef.current) e.preventDefault();
    },
    onOpenAutoFocus: (e: Event) => {
      if (!valorRef.current) return;
      e.preventDefault();
      valorRef.current.focus();
    },
  };
  const formulario = (rotulo: React.ReactNode) =>
    derivado.estado !== 'pronto' || !inicial ? (
      <EstadoDaCarga carga={derivado} />
    ) : (
      <FormularioLancamento
        derivado={derivado.dados}
        inicial={inicial}
        editando={editando}
        valorRef={valorRef}
        listaAbertaRef={listaAbertaRef}
        onFechar={onFechar}
        telaCheia={telaCheia}
        titulo={rotulo}
      />
    );
  return telaCheia ? (
    <Drawer open={aberto} onOpenChange={aoMudar} repositionInputs={false}>
      <DrawerContent telaCheia {...props}>
        {formulario(<DrawerTitle>{titulo}</DrawerTitle>)}
      </DrawerContent>
    </Drawer>
  ) : (
    <Dialog open={aberto} onOpenChange={aoMudar}>
      <DialogContent {...props}>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>
        {formulario(null)}
      </DialogContent>
    </Dialog>
  );
}

/** "Abrir para editar" de Lançamentos (T05-07): o mesmo formulário, preenchido. */
export function EditarLancamento({
  lancamento,
  onFechar,
}: {
  lancamento: Lancamento | null;
  onFechar: () => void;
}) {
  return (
    <DialogoDoFormulario
      aberto={!!lancamento}
      titulo={m.tituloEdicao}
      inicial={
        lancamento && {
          tipo: 'despesa',
          contaId: lancamento.contaId,
          cartaoId: '',
          data: lancamento.data,
        }
      }
      editando={lancamento ?? undefined}
      onFechar={onFechar}
    />
  );
}

/** Lançar com padrões dados pela tela, como "Transferir" no extrato (T05-10). */
export function LancarComPadrao({
  inicial,
  titulo = m.titulo,
  onFechar,
}: {
  inicial: Inicial | null;
  titulo?: string;
  onFechar: () => void;
}) {
  return (
    <DialogoDoFormulario aberto={!!inicial} titulo={titulo} inicial={inicial} onFechar={onFechar} />
  );
}
