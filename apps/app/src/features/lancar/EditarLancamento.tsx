import type { Lancamento } from '@goose-money/core';
import { useRef } from 'react';

import { EstadoDaCarga } from '@/components/EstadosDaTela';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { useDerivado } from '@/queries/fatos';

import { FormularioLancamento } from './FormularioLancamento';
import { mensagensLancar as m } from './mensagens';
import { useCompact } from './useCompact';

/**
 * "Abrir para editar" de Lançamentos (T05-07): o mesmo formulário de lançamento, preenchido com o
 * lançamento e no mesmo invólucro (diálogo ou tela cheia no compact).
 */
export function EditarLancamento({
  lancamento,
  onFechar,
}: {
  lancamento: Lancamento | null;
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
  const formulario = (titulo: React.ReactNode) =>
    derivado.estado !== 'pronto' || !lancamento ? (
      <EstadoDaCarga carga={derivado} />
    ) : (
      <FormularioLancamento
        derivado={derivado.dados}
        inicial={{
          tipo: 'despesa',
          contaId: lancamento.contaId,
          cartaoId: '',
          data: lancamento.data,
        }}
        editando={lancamento}
        valorRef={valorRef}
        listaAbertaRef={listaAbertaRef}
        onFechar={onFechar}
        telaCheia={telaCheia}
        titulo={titulo}
      />
    );
  return telaCheia ? (
    <Drawer open={!!lancamento} onOpenChange={aoMudar} repositionInputs={false}>
      <DrawerContent telaCheia {...props}>
        {formulario(<DrawerTitle>{m.tituloEdicao}</DrawerTitle>)}
      </DrawerContent>
    </Drawer>
  ) : (
    <Dialog open={!!lancamento} onOpenChange={aoMudar}>
      <DialogContent {...props}>
        <DialogHeader>
          <DialogTitle>{m.tituloEdicao}</DialogTitle>
        </DialogHeader>
        {formulario(null)}
      </DialogContent>
    </Dialog>
  );
}
