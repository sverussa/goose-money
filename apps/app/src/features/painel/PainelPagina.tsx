import { Wallet } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';

import { PaginaProvisoria } from '@/app/PaginaProvisoria';
import { EmptyState, EstadoDaCarga } from '@/components/EstadosDaTela';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDerivado } from '@/queries/fatos';

import { mensagensPainel as m } from './mensagens';
import { VisaoGeral } from './VisaoGeral';

const ABAS = ['visao-geral', 'saldos', 'cartoes', 'projecoes'] as const;
type Aba = (typeof ABAS)[number];

/**
 * Abas primárias do Painel (6.2), na URL (`?aba=`; sem ela, a Visão geral). São abas (`tab`),
 * não links, para não se confundirem com o item "Projeções" do menu.
 */
function Abas({ atual }: { atual: Aba }) {
  const [, setBusca] = useSearchParams();
  const ir = (a: Aba) => {
    setBusca(a === 'visao-geral' ? {} : { aba: a });
  };
  return (
    <div
      role="tablist"
      aria-label={m.abas.rotulo}
      className="flex overflow-x-auto border-b border-surface-container-highest"
      onKeyDown={(e) => {
        const i = ABAS.indexOf(atual);
        const passo = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!passo) return;
        const proxima = ABAS[(i + passo + ABAS.length) % ABAS.length] ?? atual;
        ir(proxima);
        document.getElementById(`painel-aba-${proxima}`)?.focus();
      }}
    >
      {ABAS.map((a) => (
        <button
          key={a}
          id={`painel-aba-${a}`}
          type="button"
          role="tab"
          aria-selected={a === atual}
          tabIndex={a === atual ? 0 : -1}
          onClick={() => {
            ir(a);
          }}
          className={cn(
            'flex h-12 shrink-0 cursor-pointer items-center border-b-3 px-5 text-body-lg',
            a === atual
              ? 'border-primary font-semibold text-primary'
              : 'border-transparent font-medium text-on-surface-variant hover:bg-on-surface/8',
          )}
        >
          {m.abas[a]}
        </button>
      ))}
    </div>
  );
}

/** `#/` (6.2): Visão geral, Saldos, Cartões e Projeções. */
export function PainelPagina() {
  const [busca] = useSearchParams();
  const derivado = useDerivado();
  const pedida = busca.get('aba');
  const aba: Aba = ABAS.includes(pedida as Aba) ? (pedida as Aba) : 'visao-geral';
  let conteudo: React.ReactNode = <EstadoDaCarga carga={derivado} />;
  if (derivado.estado === 'pronto') {
    const d = derivado.dados;
    conteudo =
      d.fatos.contas.length === 0 ? (
        <EmptyState
          Icone={Wallet}
          frase={m.semContas}
          acao={
            <Button asChild>
              <Link to="/contas?nova=1">{m.cadastrarConta}</Link>
            </Button>
          }
        />
      ) : aba === 'visao-geral' ? (
        <VisaoGeral d={d} />
      ) : (
        <PaginaProvisoria />
      );
  }
  return (
    <div className="flex flex-col gap-4">
      <Abas atual={aba} />
      <div role="tabpanel" aria-labelledby={`painel-aba-${aba}`} className="flex flex-col gap-4">
        {conteudo}
      </div>
    </div>
  );
}
