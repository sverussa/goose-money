import {
  aPagarNosCartoes,
  arquivarCartao,
  type Cartao,
  type Comando,
  type Derivado,
  desarquivarCartao,
  ErroDeDominio,
  excluirCartao,
  limiteDisponivelDoCartao,
  obrigacoesDeCartao,
  type Permissao,
  podeArquivarCartao,
  podeExcluirCartao,
} from '@goose-money/core';
import { ChevronDown, CreditCard, EllipsisVertical, Plus } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';

import { formatarData, formatarMoeda } from '@/app/formatacao';
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
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useDerivado } from '@/queries/fatos';
import { useComando, useContexto } from '@/queries/useComando';

import { cicloAtual } from './formulario';
import { FormularioCartao } from './FormularioCartao';
import { mensagensCartoes as m } from './mensagens';

/** Grava o comando; a recusa do core vira o snackbar de erro (como em Contas). */
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

/** Item do menu; desabilitado, mostra o motivo logo abaixo (como em Contas). */
function ItemDoMenu({
  rotulo,
  permissao,
  aoEscolher,
}: {
  rotulo: string;
  permissao?: Permissao;
  aoEscolher: () => void;
}) {
  const motivo = permissao && !permissao.permitida ? permissao.motivo : undefined;
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

/** Menu do cartão (6.5): Editar, Configurar ciclo, Arquivar ou Desarquivar, Excluir. */
function MenuDoCartao({ cartao, d, editar }: { cartao: Cartao; d: Derivado; editar: () => void }) {
  const rodar = useRodar();
  const navegar = useNavigate();
  // Ao abrir o formulário, o foco não volta ao botão do menu: roubaria o que se digita nele.
  const abriuDialogo = useRef(false);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="icon"
          aria-label={m.menu.rotulo(cartao.nome)}
          className="-my-2 -mr-2 text-inherit"
        >
          <EllipsisVertical aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onCloseAutoFocus={(e) => {
          if (abriuDialogo.current) e.preventDefault();
          abriuDialogo.current = false;
        }}
      >
        {!cartao.arquivado && (
          <>
            <ItemDoMenu
              rotulo={m.menu.editar}
              aoEscolher={() => {
                abriuDialogo.current = true;
                editar();
              }}
            />
            {/* O diálogo Configurar ciclo é da tela do cartão (T05-15). */}
            <ItemDoMenu
              rotulo={m.menu.ciclo}
              aoEscolher={() => {
                void navegar(`/cartoes/${cartao.id}?acao=ciclo`);
              }}
            />
          </>
        )}
        {cartao.arquivado ? (
          <ItemDoMenu
            rotulo={m.menu.desarquivar}
            aoEscolher={() => {
              rodar((ctx) => desarquivarCartao(d.fatos, ctx, cartao.id));
            }}
          />
        ) : (
          <ItemDoMenu
            rotulo={m.menu.arquivar}
            permissao={podeArquivarCartao(d.fatos, cartao.id, d.hoje)}
            aoEscolher={() => {
              rodar((ctx) => arquivarCartao(d.fatos, ctx, cartao.id));
            }}
          />
        )}
        <ItemDoMenu
          rotulo={m.menu.excluir}
          permissao={podeExcluirCartao(d.fatos, cartao.id)}
          aoEscolher={() => {
            rodar((ctx) => excluirCartao(d.fatos, ctx, cartao.id));
          }}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Card no estilo cartão físico, com a face de PainelCartoes.dc.html e a barra de limite. */
function CardDoCartao({ cartao, d, editar }: { cartao: Cartao; d: Derivado; editar: () => void }) {
  const aberta = d.faturas.get(cartao.id)?.find((f) => f.status === 'aberta');
  const ciclo = cicloAtual(d, cartao);
  const disponivel = limiteDisponivelDoCartao(d, cartao.id);
  const usado = Math.min(100, Math.max(0, 100 - (disponivel / cartao.limite) * 100));
  return (
    <li className="relative flex flex-col overflow-hidden rounded-lg border border-surface-container-highest bg-surface-container-lowest">
      <div
        className="flex min-h-35 flex-col justify-between gap-6 p-5 text-on-primary dark:text-on-surface"
        style={{ background: corDoTema(cartao.cor) }}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Link
            to={`/cartoes/${cartao.id}`}
            className="flex-1 text-title-lg font-semibold after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none"
          >
            {cartao.nome}
          </Link>
          <span className="text-body-md">{m.ciclo(ciclo.diaFechamento, ciclo.diaVencimento)}</span>
          {/* Acima do link que cobre o card. */}
          <div className="relative z-10">
            <MenuDoCartao cartao={cartao} d={d} editar={editar} />
          </div>
        </div>
        {aberta && (
          <div className="flex flex-col gap-0.5">
            <span className="text-body-md">
              {m.faturaAberta(formatarData(aberta.vencimento).slice(0, 5))}
            </span>
            <MoneyText valor={aberta.saldo} className="text-headline-md font-medium" />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1.5 px-5 pt-4 pb-5">
        <div className="flex justify-between gap-2 text-body-md">
          <span className="text-on-surface-variant">{m.limiteDisponivel}</span>
          <span className="font-semibold">
            {m.limiteDe(formatarMoeda(disponivel), formatarMoeda(cartao.limite))}
          </span>
        </div>
        <Progress value={usado} aria-label={m.limiteUsado} className="h-2" />
      </div>
    </li>
  );
}

function Lista({ d }: { d: Derivado }) {
  const [busca, setBusca] = useSearchParams();
  const [editando, setEditando] = useState<Cartao | null>(null);
  const [verArquivados, setVerArquivados] = useState(false);
  // "Novo cartão" e o "Cadastrar cartão" do formulário de lançamento (T05-03) chegam com `?novo=1`.
  const novo = busca.has('novo');
  const abrirNovo = () => {
    setBusca((b) => {
      const x = new URLSearchParams(b);
      x.set('novo', '1');
      return x;
    });
  };
  const fechar = () => {
    setEditando(null);
    if (novo)
      setBusca(
        (b) => {
          const x = new URLSearchParams(b);
          x.delete('novo');
          return x;
        },
        { replace: true },
      );
  };
  const ativos = d.fatos.cartoes.filter((c) => !c.arquivado);
  const arquivados = d.fatos.cartoes.filter((c) => c.arquivado);
  const botaoNovo = (
    <Button onClick={abrirNovo}>
      <Plus aria-hidden />
      {m.novo}
    </Button>
  );
  const cards = (cartoes: readonly Cartao[]) => (
    <ul className="grid gap-4 expanded:grid-cols-2">
      {cartoes.map((c) => (
        <CardDoCartao
          key={c.id}
          cartao={c}
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
          { rotulo: m.aPagar, valor: aPagarNosCartoes(d) },
          { rotulo: m.obrigacoes, valor: obrigacoesDeCartao(d) },
        ]}
        acoes={botaoNovo}
      />
      {ativos.length === 0 ? (
        <EmptyState Icone={CreditCard} frase={m.vazio} acao={botaoNovo} />
      ) : (
        <section aria-label={m.lista}>{cards(ativos)}</section>
      )}
      {arquivados.length > 0 && (
        <section className="flex flex-col gap-3">
          <Button
            variant="text"
            className="self-start"
            aria-expanded={verArquivados}
            onClick={() => {
              setVerArquivados(!verArquivados);
            }}
          >
            {m.arquivados(arquivados.length)}
            <ChevronDown
              aria-hidden
              className={cn('transition-transform', verArquivados && 'rotate-180')}
            />
          </Button>
          {verArquivados && cards(arquivados)}
        </section>
      )}
      <FormularioCartao
        // Um formulário novo a cada abertura: os valores iniciais são os do cartão escolhido.
        key={editando?.id ?? (novo ? 'novo' : 'fechado')}
        aberto={novo || editando !== null}
        d={d}
        cartao={editando ?? undefined}
        onFechar={fechar}
      />
    </>
  );
}

/** `#/cartoes` (6.5): lista, cadastro, edição, arquivamento e exclusão (T05-11). */
export function CartoesPagina() {
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
