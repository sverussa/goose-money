import { type DataCivil, type SugestaoDeDescricao, somarDias } from '@goose-money/core';
import { Check, ChevronDown } from 'lucide-react';
import { type RefObject, useEffect, useState } from 'react';

import { corDoTema } from '@/components/graficos/dados';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Toggle } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';

import { mensagensLancar as m } from './mensagens';
import type { GrupoDeCategorias, OpcaoDeCategoria } from './padroes';

const MAX_SUGESTOES = 5;

/**
 * Descrição com autocomplete (7.3): as descrições já usadas que contêm o texto digitado. Escolher
 * uma preenche a categoria usada da última vez (`aoEscolher`). Padrão combobox do WAI-ARIA.
 */
export function CampoDescricao({
  valor,
  sugestoes,
  categorias,
  aoMudar,
  aoEscolher,
  listaAbertaRef,
}: {
  valor: string;
  sugestoes: readonly SugestaoDeDescricao[];
  categorias: ReadonlyMap<string, string>;
  aoMudar: (texto: string) => void;
  aoEscolher: (s: SugestaoDeDescricao) => void;
  /** Lido pelo diálogo: com a lista aberta, Esc fecha a lista e não o diálogo. */
  listaAbertaRef: RefObject<boolean>;
}) {
  const [foco, setFoco] = useState(false);
  const [ativa, setAtiva] = useState(-1);
  const [fechada, setFechada] = useState(false);
  const texto = valor.trim().toLocaleLowerCase('pt-BR');
  const opcoes = texto
    ? sugestoes
        .filter((s) => {
          const d = s.descricao.toLocaleLowerCase('pt-BR');
          return d.includes(texto) && d !== texto;
        })
        .slice(0, MAX_SUGESTOES)
    : [];
  const aberta = foco && !fechada && opcoes.length > 0;
  useEffect(() => {
    listaAbertaRef.current = aberta;
  }, [aberta, listaAbertaRef]);

  function escolher(s: SugestaoDeDescricao) {
    aoEscolher(s);
    setFechada(true);
    setAtiva(-1);
  }

  return (
    <div className="relative flex flex-col gap-1.5">
      <Label htmlFor="lancar-descricao">{m.descricao}</Label>
      <Input
        id="lancar-descricao"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={aberta}
        aria-controls="lancar-sugestoes"
        aria-activedescendant={
          aberta && ativa >= 0 ? `lancar-sugestao-${String(ativa)}` : undefined
        }
        autoComplete="off"
        className="h-13"
        value={valor}
        onChange={(e) => {
          aoMudar(e.target.value);
          setFechada(false);
          setAtiva(-1);
        }}
        onFocus={() => {
          setFoco(true);
        }}
        onBlur={() => {
          setFoco(false);
        }}
        onKeyDown={(e) => {
          if (!aberta) return;
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const passo = e.key === 'ArrowDown' ? 1 : -1;
            setAtiva((a) => (a + passo + opcoes.length) % opcoes.length);
          } else if (e.key === 'Enter' && ativa >= 0) {
            e.preventDefault();
            const s = opcoes[ativa];
            if (s) escolher(s);
          } else if (e.key === 'Escape') {
            setFechada(true);
          }
        }}
      />
      {aberta && (
        <ul
          id="lancar-sugestoes"
          role="listbox"
          aria-label={m.sugestoes}
          className="absolute top-full right-0 left-0 z-10 mt-1 flex flex-col rounded-xs bg-surface-container-lowest py-1 shadow-snackbar"
        >
          {opcoes.map((s, i) => (
            <li
              key={s.descricao}
              id={`lancar-sugestao-${String(i)}`}
              role="option"
              aria-selected={i === ativa}
              className={cn(
                'flex min-h-12 cursor-pointer items-center justify-between gap-4 px-4 text-body-lg',
                i === ativa && 'bg-surface-container',
              )}
              // `mousedown` antes do `blur` do campo, que fecharia a lista.
              onMouseDown={(e) => {
                e.preventDefault();
                escolher(s);
              }}
            >
              <span>{s.descricao}</span>
              <span className="text-body-md text-on-surface-variant">
                {categorias.get(s.categoriaId)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BotaoDeCategoria({
  opcao,
  marcada,
  aoEscolher,
}: {
  opcao: OpcaoDeCategoria;
  marcada: boolean;
  aoEscolher: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={marcada}
      onClick={aoEscolher}
      className={cn(
        'flex min-h-11 cursor-pointer items-center gap-2 rounded-sm border px-3 text-left text-body-md transition-colors hover:bg-on-surface/8',
        marcada
          ? 'border-2 border-primary bg-secondary-container font-semibold text-on-secondary-container'
          : 'border-outline-variant bg-surface-container-lowest font-medium text-on-surface',
      )}
    >
      <span
        aria-hidden
        className="size-2.5 shrink-0 rounded-full"
        style={{ background: corDoTema(opcao.cor) }}
      />
      {opcao.nome}
    </button>
  );
}

/**
 * Categoria em grade (7.3): as 8 mais usadas do tipo, a escolhida se não estiver entre elas, e
 * "Ver todas" com busca, agrupada pela categoria pai.
 */
export function GradeDeCategorias({
  maisUsadas,
  grupos,
  todas,
  valor,
  aoEscolher,
  erro,
}: {
  maisUsadas: readonly OpcaoDeCategoria[];
  grupos: readonly GrupoDeCategorias[];
  todas: readonly OpcaoDeCategoria[];
  valor: string;
  aoEscolher: (id: string) => void;
  erro: string | undefined;
}) {
  const [verTodas, setVerTodas] = useState(false);
  const escolhida = todas.find((c) => c.id === valor);
  const grade =
    escolhida && !maisUsadas.some((c) => c.id === valor) ? [...maisUsadas, escolhida] : maisUsadas;
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="pb-2 text-label-md text-on-surface-variant">{m.categoria}</legend>
      <div className="grid grid-cols-2 gap-2 medium:grid-cols-3">
        {grade.map((c) => (
          <BotaoDeCategoria
            key={c.id}
            opcao={c}
            marcada={c.id === valor}
            aoEscolher={() => {
              aoEscolher(c.id);
            }}
          />
        ))}
        <Popover open={verTodas} onOpenChange={setVerTodas}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-sm border border-outline-variant px-3 text-body-md font-semibold text-primary hover:bg-primary/8"
            >
              {m.verTodas}
              <ChevronDown aria-hidden className="size-4.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0">
            <Command
              filter={(item, busca) =>
                item.toLocaleLowerCase('pt-BR').includes(busca.toLocaleLowerCase('pt-BR')) ? 1 : 0
              }
            >
              <CommandInput placeholder={m.buscarCategoria} aria-label={m.buscarCategoria} />
              <CommandList>
                <CommandEmpty>{m.nenhumaCategoria}</CommandEmpty>
                {grupos.map((g) => (
                  <CommandGroup key={g.nome} heading={g.nome}>
                    {g.itens.map((c) => (
                      <CommandItem
                        key={c.id}
                        value={c.nome}
                        onSelect={() => {
                          aoEscolher(c.id);
                          setVerTodas(false);
                        }}
                      >
                        <span
                          aria-hidden
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ background: corDoTema(c.cor) }}
                        />
                        {c.nome}
                        {c.id === valor && <Check aria-hidden className="ml-auto" />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      {erro && <p className="text-label-md text-error">{erro}</p>}
    </fieldset>
  );
}

/** Data com chips "Hoje" e "Ontem" e o seletor nativo (D6). */
export function CampoData({
  hoje,
  valor,
  aoMudar,
  campo,
  erro,
}: {
  hoje: DataCivil;
  valor: string;
  aoMudar: (data: string) => void;
  campo: React.ComponentProps<'input'>;
  erro: string | undefined;
}) {
  const ontem = somarDias(hoje, -1);
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="lancar-data" data-erro={!!erro}>
        {m.data}
      </Label>
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            [hoje, m.hoje],
            [ontem, m.ontem],
          ] as const
        ).map(([d, rotulo]) => (
          <Toggle
            key={rotulo}
            className="h-10"
            pressed={valor === d}
            onPressedChange={() => {
              aoMudar(d);
            }}
          >
            {valor === d && <Check aria-hidden />}
            {rotulo}
          </Toggle>
        ))}
        <Input
          id="lancar-data"
          type="date"
          className="h-10 w-auto flex-1 rounded-sm"
          aria-invalid={!!erro || undefined}
          {...campo}
        />
      </div>
      {erro && <p className="text-label-md text-error">{erro}</p>}
    </div>
  );
}
