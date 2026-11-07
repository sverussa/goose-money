import type { Fatos, Id } from '@goose-money/core';
import { ChevronDown } from 'lucide-react';
import { useSearchParams } from 'react-router';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toggleVariants } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';

import {
  ESTADOS,
  type EstadoDaTela,
  filtrosAtivos,
  ORIGENS,
  REALIZADOS,
  TIPOS_DA_VISAO,
} from './lista';
import { mensagensLancamentos as m } from './mensagens';

const f = m.filtros;

interface Opcao {
  valor: string;
  rotulo: string;
  nivel?: number;
}

/** Um filter chip com menu (6.3): marcado quando há valor; o rótulo diz quantos ou qual. */
function Chip({
  rotulo,
  opcoes,
  escolhidos,
  unico,
  aoMudar,
  resumo,
  ativo = escolhidos.length > 0,
}: {
  rotulo: string;
  opcoes: readonly Opcao[];
  escolhidos: readonly string[];
  unico?: boolean;
  aoMudar: (valores: string[]) => void;
  resumo?: string;
  ativo?: boolean;
}) {
  const nome =
    resumo ??
    (escolhidos.length === 1
      ? `${rotulo}: ${opcoes.find((o) => o.valor === escolhidos[0])?.rotulo ?? ''}`
      : escolhidos.length > 1
        ? `${rotulo} (${String(escolhidos.length)})`
        : rotulo);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(toggleVariants(), 'gap-1.5')}
        data-state={ativo ? 'on' : 'off'}
      >
        {nome}
        <ChevronDown aria-hidden className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-96 overflow-y-auto">
        {unico ? (
          <DropdownMenuRadioGroup
            value={escolhidos[0] ?? ''}
            onValueChange={(v) => {
              aoMudar(v ? [v] : []);
            }}
          >
            <DropdownMenuRadioItem value="">{f.todas}</DropdownMenuRadioItem>
            {opcoes.map((o) => (
              <DropdownMenuRadioItem key={o.valor} value={o.valor}>
                {o.rotulo}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        ) : (
          opcoes.map((o) => (
            <DropdownMenuCheckboxItem
              key={o.valor}
              checked={escolhidos.includes(o.valor)}
              className={cn(o.nivel && 'pl-12')}
              onSelect={(e) => {
                e.preventDefault(); // vários de uma vez, sem fechar o menu
              }}
              onCheckedChange={(marcado) => {
                aoMudar(
                  marcado ? [...escolhidos, o.valor] : escolhidos.filter((x) => x !== o.valor),
                );
              }}
            >
              {o.rotulo}
            </DropdownMenuCheckboxItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Categorias de primeiro nível, cada uma seguida das subcategorias. */
function opcoesDeCategoria(fatos: Fatos): Opcao[] {
  const raizes = fatos.categorias
    .filter((c) => c.categoriaPaiId === null && c.sistema !== 'ajuste_saldo')
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  return raizes.flatMap((r) => [
    { valor: r.id, rotulo: r.nome },
    ...fatos.categorias
      .filter((c) => c.categoriaPaiId === r.id)
      .map((c) => ({ valor: c.id, rotulo: c.nome, nivel: 1 })),
  ]);
}

/** Filtros de 6.3 (tipo, conta, cartão, categoria, estado, origem), todos na URL. */
export function Filtros({ fatos, estado }: { fatos: Fatos; estado: EstadoDaTela }) {
  const [, setBusca] = useSearchParams();
  const mudar = (nome: string) => (valores: readonly string[]) => {
    setBusca(
      (b) => {
        const nova = new URLSearchParams(b);
        if (valores.length) nova.set(nome, valores.join(','));
        else nova.delete(nome);
        return nova;
      },
      { replace: true },
    );
  };
  const limpar = () => {
    setBusca(
      (b) => {
        const nova = new URLSearchParams(b);
        for (const nome of ['tipo', 'conta', 'cartao', 'categoria', 'estado', 'origem'])
          nova.delete(nome);
        return nova;
      },
      { replace: true },
    );
  };
  const comId = (lista: readonly { id: Id; nome: string }[]) =>
    lista.map((x) => ({ valor: x.id, rotulo: x.nome }));
  const estadosPadrao = estado.estados.join() === REALIZADOS.join();
  return (
    <div role="group" aria-label={f.rotulo} className="flex flex-wrap items-center gap-2">
      <Chip
        rotulo={f.tipo}
        opcoes={TIPOS_DA_VISAO[estado.visao].map((t) => ({ valor: t, rotulo: m.tipos[t] }))}
        escolhidos={estado.tipos}
        aoMudar={mudar('tipo')}
      />
      <Chip
        rotulo={f.conta}
        unico
        opcoes={comId(fatos.contas)}
        escolhidos={estado.contaId ? [estado.contaId] : []}
        aoMudar={mudar('conta')}
      />
      <Chip
        rotulo={f.cartao}
        unico
        opcoes={comId(fatos.cartoes)}
        escolhidos={estado.cartaoId ? [estado.cartaoId] : []}
        aoMudar={mudar('cartao')}
      />
      <Chip
        rotulo={f.categoria}
        opcoes={opcoesDeCategoria(fatos)}
        escolhidos={estado.categorias}
        aoMudar={mudar('categoria')}
      />
      <Chip
        rotulo={f.estado}
        opcoes={ESTADOS.map((e) => ({ valor: e, rotulo: m.estados[e] }))}
        escolhidos={estado.estados}
        ativo={!estadosPadrao}
        resumo={estadosPadrao ? f.realizados : undefined}
        aoMudar={(valores) => {
          // Sem nenhum marcado ou só os realizados: o padrão, fora da URL.
          const ordenados = ESTADOS.filter((e) => valores.includes(e));
          mudar('estado')(ordenados.join() === REALIZADOS.join() ? [] : ordenados);
        }}
      />
      <Chip
        rotulo={f.origem}
        opcoes={ORIGENS.map((o) => ({ valor: o, rotulo: m.origens[o] }))}
        escolhidos={estado.origens}
        aoMudar={mudar('origem')}
      />
      {filtrosAtivos(estado) > 0 && (
        <Button variant="text" onClick={limpar}>
          {f.limpar}
        </Button>
      )}
    </div>
  );
}
