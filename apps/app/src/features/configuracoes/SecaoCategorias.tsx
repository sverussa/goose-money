import {
  type Categoria,
  criarCategoria,
  type Derivado,
  editarCategoria,
  ErroDeDominio,
  excluirCategoria,
} from '@goose-money/core';
import { Check, EllipsisVertical, Lock, Plus } from 'lucide-react';
import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui';
import { createElement, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { mensagens } from '@/app/mensagens';
import { BotaoSalvar } from '@/components/BotaoSalvar';
import { corDoTema } from '@/components/graficos/dados';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toggleVariants } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ItemDoMenu } from '@/features/cartoes/menu';
import { resolverZod } from '@/features/lancar/formulario';
import { cn } from '@/lib/utils';
import { useComando, useContexto } from '@/queries/useComando';

import {
  camposDaCategoria,
  CORES,
  esquemaDaCategoria,
  ICONES,
  iconeDe,
  itensMovidos,
  type LinhaDaCategoria,
  linhasDasCategorias,
  listaDosItens,
  paisPossiveis,
  type ValoresDaCategoria,
  valoresIniciais,
} from './categorias';
import { mensagensConfiguracoes, nomesDosIcones } from './mensagens';

const m = mensagensConfiguracoes.categorias;
const f = m.formulario;
/** O Select do Radix não aceita valor vazio. */
const SEM_PAI = 'nenhuma';

type Dialogo = { tipo: 'nova' } | { tipo: 'editar' | 'excluir'; categoria: Categoria };

function Selo() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* Focável: o teclado também abre a explicação. */}
        <span
          tabIndex={0}
          className="flex items-center gap-1 rounded-sm text-label-md text-on-surface-variant"
        >
          <Lock aria-hidden className="size-3.5" />
          {m.selo}
        </span>
      </TooltipTrigger>
      <TooltipContent>{m.trava}</TooltipContent>
    </Tooltip>
  );
}

function Linha({
  linha: { categoria: c, filhas, pai },
  abrir,
}: {
  linha: LinhaDaCategoria;
  abrir: (d: Dialogo) => void;
}) {
  // O diálogo só abre depois que o menu fecha e devolve o foco ao botão (como em Cartões).
  const aoFechar = useRef<Dialogo | null>(null);
  const apoio = c.sistema
    ? m.sistema[c.sistema]
    : pai
      ? m.subcategoriaDe(pai.nome)
      : [
          m.tipos[c.tipo === 'receita' ? 'receita' : 'despesa'],
          filhas.map((x) => x.nome).join(', '),
        ]
          .filter(Boolean)
          .join(' · ');
  return (
    <li
      className={cn(
        'flex min-h-12 items-center gap-3 border-b border-surface-container py-1 text-body-md last:border-b-0',
        pai && 'pl-6',
      )}
    >
      <span
        aria-hidden
        className="size-3.5 shrink-0 rounded-full"
        style={{ background: corDoTema(c.cor) }}
      />
      {createElement(iconeDe(c.icone), {
        'aria-hidden': true,
        className: 'size-4.5 shrink-0 text-on-surface-variant',
      })}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium">{c.nome}</span>
        <span className="text-label-md font-normal text-on-surface-variant">{apoio}</span>
      </span>
      {c.sistema ? (
        <Selo />
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="icon" aria-label={m.menu.rotulo(c.nome)} className="-my-1">
              <EllipsisVertical aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            onCloseAutoFocus={() => {
              const d = aoFechar.current;
              aoFechar.current = null;
              if (d) abrir(d);
            }}
          >
            <ItemDoMenu
              rotulo={m.menu.editar}
              aoEscolher={() => {
                aoFechar.current = { tipo: 'editar', categoria: c };
              }}
            />
            <ItemDoMenu
              rotulo={m.menu.excluir}
              aoEscolher={() => {
                aoFechar.current = { tipo: 'excluir', categoria: c };
              }}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  );
}

function Erro({ id, texto }: { id: string; texto: string | undefined }) {
  return texto ? (
    <p id={id} className="text-label-md text-error">
      {texto}
    </p>
  ) : null;
}

function Campos({
  d,
  categoria,
  onFechar,
}: {
  d: Derivado;
  categoria: Categoria | undefined;
  onFechar: () => void;
}) {
  const { executar, salvando } = useComando();
  const contexto = useContexto();
  const { control, register, handleSubmit, setValue, setError, formState } =
    useForm<ValoresDaCategoria>({
      resolver: resolverZod(esquemaDaCategoria),
      defaultValues: valoresIniciais(d.fatos.categorias, categoria),
    });
  const erros = formState.errors;
  const pai = useWatch({ control, name: 'pai' });
  const temFilhas =
    categoria !== undefined && d.fatos.categorias.some((c) => c.categoriaPaiId === categoria.id);
  const pais = paisPossiveis(d.fatos.categorias, categoria?.id);
  const dicaDoTipo = pai ? f.tipoDaPai : temFilhas ? f.tipoDasFilhas : undefined;

  async function salvar(v: ValoresDaCategoria) {
    let comando;
    try {
      const campos = camposDaCategoria(v);
      comando = categoria
        ? editarCategoria(d.fatos, contexto(), categoria.id, campos)
        : criarCategoria(d.fatos, contexto(), campos);
    } catch (e) {
      if (!(e instanceof ErroDeDominio)) throw e;
      setError('root', { message: e.message });
      return;
    }
    if (await executar(comando)) onFechar();
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4.5"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(salvar)();
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="categoria-nome" data-erro={!!erros.nome}>
          {f.nome}
        </Label>
        <Input
          id="categoria-nome"
          autoComplete="off"
          aria-invalid={!!erros.nome || undefined}
          aria-describedby={erros.nome ? 'categoria-nome-erro' : undefined}
          className="h-13"
          {...register('nome')}
        />
        <Erro id="categoria-nome-erro" texto={erros.nome?.message} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="categoria-pai">{f.pai}</Label>
        <Controller
          name="pai"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value || SEM_PAI}
              disabled={temFilhas}
              onValueChange={(v) => {
                const escolhida = pais.find((p) => p.id === v);
                field.onChange(escolhida ? v : '');
                // A subcategoria tem o tipo da pai (D35).
                if (escolhida?.tipo === 'despesa' || escolhida?.tipo === 'receita')
                  setValue('tipo', escolhida.tipo);
              }}
            >
              <SelectTrigger
                id="categoria-pai"
                className="h-12"
                aria-describedby={temFilhas ? 'categoria-pai-dica' : undefined}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM_PAI}>{f.semPai}</SelectItem>
                {pais.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {temFilhas && (
          <p id="categoria-pai-dica" className="text-label-md font-normal text-on-surface-variant">
            {f.paiComFilhas}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <span id="categoria-tipo" className="text-label-md text-on-surface-variant">
          {f.tipo}
        </span>
        <Controller
          name="tipo"
          control={control}
          render={({ field }) => (
            <ToggleGroupPrimitive.Root
              type="single"
              value={field.value}
              onValueChange={(t) => {
                if (t) field.onChange(t);
              }}
              disabled={dicaDoTipo !== undefined}
              aria-labelledby="categoria-tipo"
              aria-describedby={dicaDoTipo ? 'categoria-tipo-dica' : undefined}
              className="flex flex-wrap gap-2"
            >
              {(['despesa', 'receita'] as const).map((t) => (
                <ToggleGroupPrimitive.Item key={t} value={t} className={toggleVariants()}>
                  {t === field.value && <Check aria-hidden />}
                  {m.tipos[t]}
                </ToggleGroupPrimitive.Item>
              ))}
            </ToggleGroupPrimitive.Root>
          )}
        />
        {dicaDoTipo && (
          <p id="categoria-tipo-dica" className="text-label-md font-normal text-on-surface-variant">
            {dicaDoTipo}
          </p>
        )}
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="pb-2 text-label-md text-on-surface-variant">{f.icone}</legend>
        <Controller
          name="icone"
          control={control}
          render={({ field }) => (
            <div role="radiogroup" aria-label={f.icone} className="flex flex-wrap gap-1">
              {Object.entries(ICONES).map(([nome, Icone]) => (
                <button
                  key={nome}
                  type="button"
                  role="radio"
                  aria-checked={field.value === nome}
                  aria-label={nomesDosIcones[nome] ?? nome}
                  onClick={() => {
                    field.onChange(nome);
                  }}
                  className={cn(
                    'alvo flex size-10 cursor-pointer items-center justify-center rounded-full text-on-surface-variant hover:bg-on-surface/8',
                    field.value === nome && 'bg-secondary-container text-on-secondary-container',
                  )}
                >
                  <Icone aria-hidden className="size-5" />
                </button>
              ))}
            </div>
          )}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="pb-2 text-label-md text-on-surface-variant">{f.cor}</legend>
        <Controller
          name="cor"
          control={control}
          render={({ field }) => (
            <div role="radiogroup" aria-label={f.cor} className="flex flex-wrap gap-2">
              {CORES.map((c, i) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={field.value === c}
                  aria-label={f.corN(i + 1)}
                  onClick={() => {
                    field.onChange(c);
                  }}
                  className={cn(
                    'alvo flex size-9 cursor-pointer items-center justify-center rounded-full text-on-primary',
                    field.value === c && 'ring-2 ring-on-surface ring-offset-2 ring-offset-surface',
                  )}
                  style={{ background: corDoTema(c) }}
                >
                  {field.value === c && <Check aria-hidden className="size-4.5" />}
                </button>
              ))}
            </div>
          )}
        />
      </fieldset>

      {erros.root && (
        <p role="alert" className="text-body-md text-error">
          {erros.root.message}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="text" onClick={onFechar}>
          {mensagens.acoes.cancelar}
        </Button>
        <BotaoSalvar salvando={salvando} className="px-6">
          {mensagens.acoes.salvar}
        </BotaoSalvar>
      </div>
    </form>
  );
}

function Formulario({
  d,
  categoria,
  onFechar,
}: {
  d: Derivado;
  categoria?: Categoria;
  onFechar: () => void;
}) {
  return (
    <Dialog
      open
      onOpenChange={(a) => {
        if (!a) onFechar();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{categoria ? f.tituloEditar : f.tituloNova}</DialogTitle>
          <DialogDescription className="sr-only">{f.descricao}</DialogDescription>
        </DialogHeader>
        <Campos d={d} categoria={categoria} onFechar={onFechar} />
      </DialogContent>
    </Dialog>
  );
}

/** Confirmação da exclusão (D49): diz o que vai para "A classificar"; tudo num comando só. */
function Excluir({
  d,
  categoria,
  onFechar,
}: {
  d: Derivado;
  categoria: Categoria;
  onFechar: () => void;
}) {
  const { executar, salvando } = useComando();
  const contexto = useContexto();
  const x = m.excluir;
  // Montado uma vez, ao abrir: depois de gravar, a categoria já não está nos fatos. O menu só
  // existe nas categorias comuns, que o core deixa excluir.
  const [{ comando, n, filhas }] = useState(() => {
    const c = excluirCategoria(d.fatos, contexto(), categoria.id);
    return {
      comando: c,
      n: itensMovidos(d.fatos, c),
      filhas: d.fatos.categorias.filter((x) => x.categoriaPaiId === categoria.id).length,
    };
  });
  const explicacao = [
    filhas > 0 && x.comSubcategorias(filhas),
    n.total > 0 ? x.vaoPara(listaDosItens(n)) : x.semUso,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <Dialog
      open
      onOpenChange={(a) => {
        if (!a) onFechar();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{x.titulo(categoria.nome)}</DialogTitle>
          <DialogDescription>{explicacao}</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="flex flex-wrap items-center justify-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const descricao = n.total > 0 ? m.movidos(n.total) : comando.descricao;
            void executar({ ...comando, descricao }).then((ok) => {
              if (ok) onFechar();
            });
          }}
        >
          <Button type="button" variant="text" onClick={onFechar}>
            {x.voltar}
          </Button>
          <BotaoSalvar salvando={salvando} variant="destructive">
            {x.confirmar}
          </BotaoSalvar>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Seção Categorias (6.9): lista, cadastro, edição e exclusão; as de sistema ficam travadas. */
export function Categorias({ d }: { d: Derivado }) {
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);
  const fechar = () => {
    setDialogo(null);
  };
  return (
    <section
      aria-labelledby="config-categorias"
      className="flex flex-col gap-2 rounded-lg border border-surface-container-highest bg-surface-container-lowest p-5"
    >
      <div className="flex items-center gap-2">
        <h2 id="config-categorias" className="flex-1 text-title-md font-semibold">
          {m.titulo}
        </h2>
        <Button
          variant="outlined"
          onClick={() => {
            setDialogo({ tipo: 'nova' });
          }}
        >
          <Plus aria-hidden />
          {m.nova}
        </Button>
      </div>
      <ul className="flex flex-col">
        {linhasDasCategorias(d.fatos.categorias).map((l) => (
          <Linha key={l.categoria.id} linha={l} abrir={setDialogo} />
        ))}
      </ul>
      {dialogo?.tipo === 'nova' && <Formulario d={d} onFechar={fechar} />}
      {dialogo?.tipo === 'editar' && (
        <Formulario d={d} categoria={dialogo.categoria} onFechar={fechar} />
      )}
      {dialogo?.tipo === 'excluir' && (
        <Excluir d={d} categoria={dialogo.categoria} onFechar={fechar} />
      )}
    </section>
  );
}
