import { deMascara, ErroDeDominio, type Fatos, lancar } from '@goose-money/core';
import { Check } from 'lucide-react';
import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui';
import { useRef } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { formatarMoeda } from '@/app/formatacao';
import { mensagens } from '@/app/mensagens';
import { BotaoSalvar } from '@/components/BotaoSalvar';
import { corDoTema } from '@/components/graficos/dados';
import { Button } from '@/components/ui/button';
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
import { cn } from '@/lib/utils';
import { useComando, useContexto } from '@/queries/useComando';

import { mensagensLancar as m } from './mensagens';
import {
  camposDoLancamento,
  esquemaDoFormulario,
  resolverZod,
  TIPOS,
  TIPOS_PRONTOS,
  type TipoDoFormulario,
  type ValoresDoFormulario,
} from './formulario';
import { aClassificar, contasAtivas, guardarUltimaConta, opcoesDeCategoria } from './padroes';

/** Até R$ 999.999.999,99: 11 dígitos. */
const MAX_DIGITOS = 11;

function Erro({ id, texto }: { id: string; texto: string | undefined }) {
  if (!texto) return null;
  return (
    <p id={id} className="text-label-md text-error">
      {texto}
    </p>
  );
}

/**
 * O conteúdo do formulário de lançamento (7.1–7.3), o mesmo no diálogo e na tela cheia (T05-05).
 * Grava pelo comando do core e `useComando` (T03-04): "Salvando…", depois "Lançado · Desfazer".
 */
export function FormularioLancamento({
  fatos,
  inicial,
  valorRef,
  onFechar,
}: {
  fatos: Fatos;
  inicial: Pick<ValoresDoFormulario, 'tipo' | 'contaId' | 'data'>;
  valorRef: React.RefObject<HTMLInputElement | null>;
  onFechar: () => void;
}) {
  const { executar, salvando } = useComando();
  const contexto = useContexto();
  const semCategoria = aClassificar(fatos) ?? '';
  const form = useForm<ValoresDoFormulario>({
    resolver: resolverZod(esquemaDoFormulario),
    defaultValues: { ...inicial, valor: 0, descricao: '', categoriaId: semCategoria },
  });
  const { control, register, handleSubmit, setValue, setError, reset, formState } = form;
  const erros = formState.errors;
  const tipo = useWatch({ control, name: 'tipo' });
  const tipoDaCategoria = tipo === 'receita' ? 'receita' : 'despesa';
  const categorias = opcoesDeCategoria(fatos, tipoDaCategoria);
  const contas = contasAtivas(fatos);
  const outro = useRef(false);

  async function salvar(v: ValoresDoFormulario) {
    let comando;
    try {
      comando = lancar(fatos, contexto(), camposDoLancamento(v));
    } catch (e) {
      if (!(e instanceof ErroDeDominio)) throw e;
      setError('root', { message: e.message });
      return;
    }
    if (!(await executar(comando))) return;
    guardarUltimaConta(v.contaId);
    if (!outro.current) {
      onFechar();
      return;
    }
    // "Salvar e lançar outro": volta ao valor mantendo tipo, conta e data (7.1).
    reset({ ...v, valor: 0, descricao: '', categoriaId: semCategoria });
    valorRef.current?.focus();
  }
  const enviar = (lancarOutro: boolean) => {
    outro.current = lancarOutro;
    void handleSubmit(salvar)();
  };

  function trocarTipo(novo: string) {
    if (!novo) return;
    setValue('tipo', novo as TipoDoFormulario);
    // A categoria escolhida pode não servir ao tipo novo.
    const atual = form.getValues('categoriaId');
    const tipoNovo = novo === 'receita' ? 'receita' : 'despesa';
    if (!opcoesDeCategoria(fatos, tipoNovo).some((c) => c.id === atual))
      setValue('categoriaId', semCategoria);
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4.5"
      onSubmit={(e) => {
        e.preventDefault();
        enviar(false);
      }}
    >
      <ToggleGroupPrimitive.Root
        type="single"
        value={tipo}
        onValueChange={trocarTipo}
        aria-label={m.tipos.rotulo}
        className="flex flex-wrap gap-2"
      >
        {TIPOS.map((t) => (
          <ToggleGroupPrimitive.Item
            key={t}
            value={t}
            disabled={!TIPOS_PRONTOS.includes(t)}
            className={toggleVariants()}
          >
            {t === tipo && <Check aria-hidden />}
            {m.tipos[t]}
          </ToggleGroupPrimitive.Item>
        ))}
      </ToggleGroupPrimitive.Root>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lancar-valor" data-erro={!!erros.valor}>
          {m.valor}
        </Label>
        <Controller
          name="valor"
          control={control}
          render={({ field }) => (
            <Input
              ref={(el) => {
                field.ref(el);
                valorRef.current = el;
              }}
              id="lancar-valor"
              inputMode="numeric"
              autoComplete="off"
              placeholder={formatarMoeda(deMascara('0'))}
              value={field.value ? formatarMoeda(deMascara(String(field.value))) : ''}
              onChange={(e) => {
                const digitos = e.target.value.replace(/\D/g, '').replace(/^0+/, '');
                if (digitos.length <= MAX_DIGITOS) field.onChange(deMascara(digitos));
              }}
              onBlur={field.onBlur}
              aria-invalid={!!erros.valor || undefined}
              aria-describedby={erros.valor ? 'lancar-valor-erro' : 'lancar-valor-dica'}
              className={cn(
                'h-18 border-2 border-primary text-headline-lg',
                tipo === 'receita' ? 'text-income' : 'text-expense',
              )}
            />
          )}
        />
        {erros.valor ? (
          <Erro id="lancar-valor-erro" texto={erros.valor.message} />
        ) : (
          <p id="lancar-valor-dica" className="text-label-md font-normal text-on-surface-variant">
            {m.dicaValor}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lancar-descricao">{m.descricao}</Label>
        <Input
          id="lancar-descricao"
          autoComplete="off"
          className="h-13"
          {...register('descricao')}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lancar-categoria">{m.categoria}</Label>
        <Controller
          name="categoriaId"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="lancar-categoria" className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span
                      aria-hidden
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: corDoTema(c.cor) }}
                    />
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <Erro id="lancar-categoria-erro" texto={erros.categoriaId?.message} />
      </div>

      <div className="grid gap-4 medium:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lancar-data" data-erro={!!erros.data}>
            {m.data}
          </Label>
          <Input
            id="lancar-data"
            type="date"
            className="h-12"
            aria-invalid={!!erros.data || undefined}
            {...register('data')}
          />
          <Erro id="lancar-data-erro" texto={erros.data?.message} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lancar-conta" data-erro={!!erros.contaId}>
            {m.conta}
          </Label>
          <Controller
            name="contaId"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id="lancar-conta"
                  className="h-12"
                  aria-invalid={!!erros.contaId || undefined}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <Erro id="lancar-conta-erro" texto={erros.contaId?.message} />
        </div>
      </div>

      {erros.root && (
        <p role="alert" className="text-body-md text-error">
          {erros.root.message}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="flex-1 text-label-md font-normal text-on-surface-variant">
          {m.dicaTeclas}
        </span>
        <Button type="button" variant="text" onClick={onFechar}>
          {mensagens.acoes.cancelar}
        </Button>
        <Button
          type="button"
          variant="outlined"
          disabled={salvando}
          onClick={() => {
            enviar(true);
          }}
        >
          {mensagens.acoes.salvarELancarOutro}
        </Button>
        <BotaoSalvar salvando={salvando} className="px-6">
          {mensagens.acoes.salvar}
        </BotaoSalvar>
      </div>
    </form>
  );
}
