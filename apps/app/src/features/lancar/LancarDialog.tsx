import { Plus, Wallet } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { useLancar } from '@/app/casca/useLancar';
import { EmptyState, EstadoDaCarga } from '@/components/EstadosDaTela';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { useDerivado } from '@/queries/fatos';
import { useHoje } from '@/queries/relogio';

import { FormularioLancamento } from './FormularioLancamento';
import { useCompact } from './useCompact';
import { mensagensLancar as m } from './mensagens';
import {
  cartaoInicial,
  contaInicial,
  lerUltimaConta,
  lerUltimoCartao,
  padraoDaTela,
} from './padroes';

/** FAB "+ Lançar" (5.2): estendido no topo da página, só o ícone depois de rolar. */
function QuickAddFab() {
  const abrir = useLancar();
  const [rolou, setRolou] = useState(false);
  useEffect(() => {
    const aoRolar = () => {
      setRolou(window.scrollY > 0);
    };
    window.addEventListener('scroll', aoRolar, { passive: true });
    return () => {
      window.removeEventListener('scroll', aoRolar);
    };
  }, []);
  return (
    <button
      type="button"
      onClick={abrir}
      aria-keyshortcuts="N"
      aria-haspopup="dialog"
      className={cn(
        'fixed right-4 bottom-24 z-30 flex h-14 cursor-pointer items-center gap-3 rounded-lg bg-primary-container text-label-lg text-on-primary-container shadow-fab transition-[padding] hover:bg-primary-container/90 medium:right-6 medium:bottom-6',
        rolou ? 'w-14 justify-center' : 'pr-5 pl-4',
      )}
    >
      <Plus aria-hidden className="size-6" />
      <span className={cn(rolou && 'sr-only')}>{m.fab}</span>
    </button>
  );
}

/**
 * Formulário de lançamento (7.1): abre pelo FAB, pela tecla N e pela busca, no tipo padrão da tela
 * (7.2) e com o foco no valor. Sem nenhuma conta, leva ao cadastro de conta.
 */
export function LancarDialog({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const derivado = useDerivado();
  const hoje = useHoje();
  const { pathname } = useLocation();
  const navegar = useNavigate();
  const valorRef = useRef<HTMLInputElement>(null);
  const listaAbertaRef = useRef(false);

  const telaCheia = useCompact();

  function conteudo(titulo: React.ReactNode) {
    const comTitulo = (corpo: React.ReactNode) =>
      telaCheia ? (
        <div className="flex flex-col gap-4 p-4">
          {titulo}
          {corpo}
        </div>
      ) : (
        corpo
      );
    if (derivado.estado !== 'pronto') return comTitulo(<EstadoDaCarga carga={derivado} />);
    const { fatos } = derivado.dados;
    const padrao = padraoDaTela(pathname);
    const contaId = contaInicial(fatos, padrao.contaId, lerUltimaConta());
    const cartaoId = cartaoInicial(fatos, padrao.cartaoId, lerUltimoCartao());
    if (!contaId)
      return comTitulo(
        <EmptyState
          Icone={Wallet}
          frase={m.semConta.frase}
          acao={
            <Button
              onClick={() => {
                onFechar();
                void navegar('/contas?nova=1');
              }}
            >
              {m.semConta.acao}
            </Button>
          }
        />,
      );
    return (
      <FormularioLancamento
        derivado={derivado.dados}
        inicial={{ tipo: padrao.tipo, contaId, cartaoId: cartaoId ?? '', data: hoje }}
        valorRef={valorRef}
        listaAbertaRef={listaAbertaRef}
        onFechar={onFechar}
        telaCheia={telaCheia}
        titulo={titulo}
      />
    );
  }

  // Os dois invólucros são diálogos do Radix: Esc com as sugestões abertas fecha só a lista
  // (padrão combobox) e o foco começa no valor.
  const aoEsc = (e: KeyboardEvent) => {
    if (listaAbertaRef.current) e.preventDefault();
  };
  const focarValor = (e: Event) => {
    if (!valorRef.current) return;
    e.preventDefault();
    valorRef.current.focus();
  };
  const aoMudar = (a: boolean) => {
    if (!a) onFechar();
  };

  return (
    <>
      <QuickAddFab />
      {telaCheia ? (
        <Drawer open={aberto} onOpenChange={aoMudar} repositionInputs={false}>
          <DrawerContent
            telaCheia
            aria-describedby={undefined}
            onEscapeKeyDown={aoEsc}
            onOpenAutoFocus={focarValor}
          >
            {conteudo(<DrawerTitle>{m.titulo}</DrawerTitle>)}
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={aberto} onOpenChange={aoMudar}>
          <DialogContent
            aria-describedby={undefined}
            onEscapeKeyDown={aoEsc}
            onOpenAutoFocus={focarValor}
          >
            <DialogHeader>
              <DialogTitle>{m.titulo}</DialogTitle>
            </DialogHeader>
            {conteudo(null)}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
