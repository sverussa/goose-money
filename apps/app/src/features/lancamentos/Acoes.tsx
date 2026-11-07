import {
  classificar,
  type Comando,
  type Derivado,
  ErroDeDominio,
  excluirLancamento,
  type Lancamento,
} from '@goose-money/core';
import { EllipsisVertical } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { corDoTema } from '@/components/graficos/dados';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { gruposDeCategoria } from '@/features/lancar/padroes';
import { TIPOS_EDITAVEIS } from '@/features/lancar/formulario';
import { useComando, useContexto } from '@/queries/useComando';

import type { ItemDaTela } from './lista';
import { mensagensLancamentos as m } from './mensagens';

const a = m.acoes;

/** Grava o comando; a recusa do core (conta arquivada, por exemplo) vira o snackbar de erro. */
function useRodar() {
  const { executar, salvando } = useComando();
  const contexto = useContexto();
  const rodar = (montar: (ctx: ReturnType<typeof contexto>) => Comando) => {
    try {
      void executar(montar(contexto()));
    } catch (e) {
      if (!(e instanceof ErroDeDominio)) throw e;
      toast.error(e.message);
    }
  };
  return { rodar, salvando };
}

/** "Classificar" rápido (6.3): escolhe a categoria sem abrir o formulário. */
function Classificar({ item, d }: { item: ItemDaTela; d: Derivado }) {
  const { rodar, salvando } = useRodar();
  const [aberto, setAberto] = useState(false);
  const id = item.lancamentoId ?? item.compraId;
  if (!id) return null;
  const grupos = gruposDeCategoria(d.fatos, item.tipo === 'receita' ? 'receita' : 'despesa');
  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button variant="outlined" className="h-9" disabled={salvando}>
          {a.classificar}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Command
          filter={(valor, busca) =>
            valor.toLocaleLowerCase('pt-BR').includes(busca.toLocaleLowerCase('pt-BR')) ? 1 : 0
          }
        >
          <CommandInput placeholder={a.buscarCategoria} aria-label={a.buscarCategoria} />
          <CommandList>
            <CommandEmpty>{a.nenhuma}</CommandEmpty>
            {grupos.map((g) => (
              <CommandGroup key={g.nome} heading={g.nome}>
                {g.itens
                  .filter((c) => c.id !== item.categoriaId)
                  .map((c) => (
                    <CommandItem
                      key={c.id}
                      value={c.nome}
                      onSelect={() => {
                        setAberto(false);
                        rodar((ctx) => classificar(d.fatos, ctx, [id], c.id));
                      }}
                    >
                      <span
                        aria-hidden
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ background: corDoTema(c.cor) }}
                      />
                      {c.nome}
                    </CommandItem>
                  ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Ações por item (6.3): "Classificar" nos itens em "A classificar" e o menu com Editar e Excluir
 * nos lançamentos em conta. Parcelas e compras abrem o menu da compra (T05-14, ainda não feito).
 */
export function AcoesDoItem({
  item,
  d,
  editar,
}: {
  item: ItemDaTela;
  d: Derivado;
  editar: (l: Lancamento) => void;
}) {
  const { rodar } = useRodar();
  const categoria = item.categoriaId ? d.porId.categorias.get(item.categoriaId) : undefined;
  const lancamento = item.lancamentoId
    ? d.fatos.lancamentos.find((l) => l.id === item.lancamentoId)
    : undefined;
  // Amortização não se edita nem se exclui (core); os outros lançamentos se excluem.
  const doMenu = lancamento?.tipo === 'amortizacao' ? undefined : lancamento;
  const editavel =
    doMenu !== undefined && (TIPOS_EDITAVEIS as readonly string[]).includes(doMenu.tipo);
  return (
    <>
      {categoria?.sistema === 'a_classificar' && <Classificar item={item} d={d} />}
      {doMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="icon" aria-label={a.mais(item.texto)}>
              <EllipsisVertical aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {editavel && (
              <DropdownMenuItem
                onSelect={() => {
                  editar(doMenu);
                }}
              >
                {a.editar}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onSelect={() => {
                rodar((ctx) => excluirLancamento(d.fatos, ctx, doMenu.id));
              }}
            >
              {a.excluir}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  );
}
