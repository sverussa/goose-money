import {
  arquivarConta,
  type Comando,
  type Conta,
  type Derivado,
  desarquivarConta,
  ErroDeDominio,
  excluirConta,
  permissoesDaConta,
  saldoEmContas,
  saldoEmTodasAsContas,
} from '@goose-money/core';
import { ChevronDown, EllipsisVertical, Landmark, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { toast } from 'sonner';

import { ContextHeader } from '@/components/ContextHeader';
import { EmptyState, EstadoDaCarga } from '@/components/EstadosDaTela';
import { corDoTema } from '@/components/graficos/dados';
import { MoneyText } from '@/components/MoneyText';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useDerivado } from '@/queries/fatos';
import { useComando, useContexto } from '@/queries/useComando';

import { FormularioConta } from './FormularioConta';
import { mensagensContas as m } from './mensagens';

/** Grava o comando; a recusa do core vira o snackbar de erro. */
function useRodar() {
  const { executar } = useComando();
  const contexto = useContexto();
  return (montar: (ctx: ReturnType<typeof contexto>) => Comando) => {
    try {
      void executar(montar(contexto()));
    } catch (e) {
      if (!(e instanceof ErroDeDominio)) throw e;
      toast.error(e.message);
    }
  };
}

/** Item do menu; desabilitado, mostra o motivo logo abaixo (6.4, D21). */
function ItemDoMenu({
  rotulo,
  motivo,
  aoEscolher,
}: {
  rotulo: string;
  motivo?: string;
  aoEscolher: () => void;
}) {
  return (
    <DropdownMenuItem
      disabled={motivo !== undefined}
      onSelect={aoEscolher}
      className="flex-col items-start gap-0.5"
    >
      <span>{rotulo}</span>
      {motivo && (
        <span className="max-w-64 text-label-md font-normal text-on-surface-variant">{motivo}</span>
      )}
    </DropdownMenuItem>
  );
}

/** Menu da conta (6.4): Editar, Arquivar ou Desarquivar, Excluir, com o motivo quando não pode. */
function MenuDaConta({ conta, d, editar }: { conta: Conta; d: Derivado; editar: () => void }) {
  const rodar = useRodar();
  const pode = permissoesDaConta(d.fatos, conta.id, d.hoje);
  const motivo = (p: typeof pode.arquivar) => (p.permitida ? undefined : p.motivo);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="icon" aria-label={m.menu.rotulo(conta.nome)} className="-my-2 -mr-2">
          <EllipsisVertical aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {!conta.arquivada && <ItemDoMenu rotulo={m.menu.editar} aoEscolher={editar} />}
        {conta.arquivada ? (
          <ItemDoMenu
            rotulo={m.menu.desarquivar}
            aoEscolher={() => {
              rodar((ctx) => desarquivarConta(d.fatos, ctx, conta.id));
            }}
          />
        ) : (
          <ItemDoMenu
            rotulo={m.menu.arquivar}
            motivo={motivo(pode.arquivar)}
            aoEscolher={() => {
              rodar((ctx) => arquivarConta(d.fatos, ctx, conta.id));
            }}
          />
        )}
        <ItemDoMenu
          rotulo={m.menu.excluir}
          motivo={motivo(pode.excluir)}
          aoEscolher={() => {
            rodar((ctx) => excluirConta(d.fatos, ctx, conta.id));
          }}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Card da conta, no vocabulário do PainelSaldos: nome, "Fora do total", saldo, tipo e banco. */
function CardDaConta({ conta, d, editar }: { conta: Conta; d: Derivado; editar: () => void }) {
  const saldo = d.saldos.get(conta.id)?.atual ?? null;
  return (
    <li className="relative flex flex-col gap-2.5 rounded-lg border border-surface-container-highest bg-surface-container-lowest p-5">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="size-3 shrink-0 rounded-full"
          style={{ background: corDoTema(conta.cor) }}
        />
        <Link
          to={`/contas/${conta.id}`}
          className="flex-1 text-title-md font-medium after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none"
        >
          {conta.nome}
        </Link>
        {!conta.incluirNoTotal && (
          <span className="rounded-sm bg-surface-container px-2 py-0.5 text-label-md font-semibold text-on-surface-variant">
            {m.foraDoTotal}
          </span>
        )}
        {/* Acima do link que cobre o card. */}
        <div className="relative z-10">
          <MenuDaConta conta={conta} d={d} editar={editar} />
        </div>
      </div>
      {saldo === null ? (
        <span className="text-title-lg text-on-surface-variant">{m.semSaldo}</span>
      ) : (
        <MoneyText valor={saldo} className={cn('text-headline-md', saldo < 0 && 'text-expense')} />
      )}
      <span className="text-body-md text-on-surface-variant">
        {[m.tipos[conta.tipo], conta.instituicao].filter(Boolean).join(' · ')}
      </span>
    </li>
  );
}

function Lista({ d }: { d: Derivado }) {
  const [busca, setBusca] = useSearchParams();
  const [editando, setEditando] = useState<Conta | null>(null);
  const [verArquivadas, setVerArquivadas] = useState(false);
  // "Nova conta" e o FAB do primeiro uso (7.2) chegam com `?nova=1`.
  const nova = busca.has('nova');
  const abrirNova = () => {
    setBusca((b) => {
      const x = new URLSearchParams(b);
      x.set('nova', '1');
      return x;
    });
  };
  const fechar = () => {
    setEditando(null);
    if (nova)
      setBusca(
        (b) => {
          const x = new URLSearchParams(b);
          x.delete('nova');
          return x;
        },
        { replace: true },
      );
  };
  const ativas = d.fatos.contas.filter((c) => !c.arquivada);
  const arquivadas = d.fatos.contas.filter((c) => c.arquivada);
  const botaoNova = (
    <Button onClick={abrirNova}>
      <Plus aria-hidden />
      {m.nova}
    </Button>
  );
  const cards = (contas: readonly Conta[]) => (
    <ul className="grid gap-4 medium:grid-cols-2 expanded:grid-cols-3">
      {contas.map((c) => (
        <CardDaConta
          key={c.id}
          conta={c}
          d={d}
          editar={() => {
            setEditando(c);
          }}
        />
      ))}
    </ul>
  );
  return (
    <>
      <ContextHeader
        rotulo={m.totais}
        indicadores={[
          { rotulo: m.saldoEmContas, valor: saldoEmContas(d) },
          { rotulo: m.saldoEmTodas, valor: saldoEmTodasAsContas(d) },
        ]}
        acoes={botaoNova}
      />
      {ativas.length === 0 ? (
        <EmptyState Icone={Landmark} frase={m.vazio} acao={botaoNova} />
      ) : (
        <section aria-label={m.lista}>{cards(ativas)}</section>
      )}
      {arquivadas.length > 0 && (
        <section className="flex flex-col gap-3">
          <Button
            variant="text"
            className="self-start"
            aria-expanded={verArquivadas}
            onClick={() => {
              setVerArquivadas(!verArquivadas);
            }}
          >
            {m.arquivadas(arquivadas.length)}
            <ChevronDown
              aria-hidden
              className={cn('transition-transform', verArquivadas && 'rotate-180')}
            />
          </Button>
          {verArquivadas && cards(arquivadas)}
        </section>
      )}
      <FormularioConta
        // Um formulário novo a cada abertura: os valores iniciais são os da conta escolhida.
        key={editando?.id ?? (nova ? 'nova' : 'fechado')}
        aberto={nova || editando !== null}
        d={d}
        conta={editando ?? undefined}
        onFechar={fechar}
      />
    </>
  );
}

/** `#/contas` (6.4): lista, cadastro, edição, arquivamento e exclusão (T05-08). */
export function ContasPagina() {
  const derivado = useDerivado();
  return (
    <div className="flex flex-col gap-4">
      {derivado.estado === 'pronto' ? (
        <Lista d={derivado.dados} />
      ) : (
        <EstadoDaCarga carga={derivado} />
      )}
    </div>
  );
}
