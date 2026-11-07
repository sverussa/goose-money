import {
  type Centavos,
  centavos,
  type Conta,
  criarConta,
  dataCivil,
  type Derivado,
  editarConta,
  ErroDeDominio,
  impactoDoNovoSaldoInicial,
} from '@goose-money/core';
import { Check } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { formatarMoeda } from '@/app/formatacao';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Toggle } from '@/components/ui/toggle';
import { resolverZod } from '@/features/lancar/formulario';
import { cn } from '@/lib/utils';
import { useComando, useContexto } from '@/queries/useComando';

import {
  camposDaConta,
  CORES,
  esquemaDaConta,
  pagaCartaoAtivo,
  TIPOS_DE_CONTA,
  type ValoresDaConta,
  valoresIniciais,
} from './formulario';
import { mensagensContas } from './mensagens';

const f = mensagensContas.formulario;

function Erro({ id, texto }: { id: string; texto: string | undefined }) {
  return texto ? (
    <p id={id} className="text-label-md text-error">
      {texto}
    </p>
  ) : null;
}

function Campos({
  d,
  conta,
  onFechar,
}: {
  d: Derivado;
  conta: Conta | undefined;
  onFechar: () => void;
}) {
  const { executar, salvando } = useComando();
  const contexto = useContexto();
  const form = useForm<ValoresDaConta>({
    resolver: resolverZod(esquemaDaConta),
    defaultValues: valoresIniciais(d.fatos, d.hoje, conta),
  });
  const { control, register, handleSubmit, setValue, setError, formState } = form;
  // Com saldo zero, o sinal "−" escolhido fica guardado até o primeiro dígito.
  const [sinalNegativo, setSinalNegativo] = useState(false);
  const erros = formState.errors;
  const v = useWatch({ control });
  const travado = conta !== undefined && conta.incluirNoTotal && pagaCartaoAtivo(d.fatos, conta.id);

  // Mudar saldo inicial ou data mostra antes de salvar o que muda (6.4, D21).
  let previa = null;
  if (
    conta &&
    v.saldoInicial !== undefined &&
    v.dataSaldoInicial &&
    (v.saldoInicial !== conta.saldoInicial || v.dataSaldoInicial !== conta.dataSaldoInicial)
  )
    try {
      previa = impactoDoNovoSaldoInicial(
        d.fatos,
        conta,
        centavos(v.saldoInicial),
        dataCivil(v.dataSaldoInicial),
        d.hoje,
      );
    } catch {
      previa = null;
    }
  const semSaldo = (c: Centavos | null) =>
    c === null ? mensagensContas.semSaldo : formatarMoeda(c);

  async function salvar(valores: ValoresDaConta) {
    let comando;
    try {
      const campos = camposDaConta(valores);
      comando = conta
        ? editarConta(d.fatos, contexto(), conta.id, campos)
        : criarConta(d.fatos, contexto(), campos);
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
        <Label htmlFor="conta-nome" data-erro={!!erros.nome}>
          {f.nome}
        </Label>
        <Input
          id="conta-nome"
          autoComplete="off"
          aria-invalid={!!erros.nome || undefined}
          aria-describedby={erros.nome ? 'conta-nome-erro' : undefined}
          className="h-13"
          {...register('nome')}
        />
        <Erro id="conta-nome-erro" texto={erros.nome?.message} />
      </div>

      <div className="grid gap-4 medium:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="conta-instituicao">{f.instituicao}</Label>
          <Input id="conta-instituicao" className="h-12" {...register('instituicao')} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="conta-tipo">{f.tipo}</Label>
          <Controller
            name="tipo"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(t) => {
                  field.onChange(t);
                  // Investimento nasce fora do total; os outros tipos, dentro (6.4).
                  if (!conta) setValue('incluirNoTotal', t !== 'investimento');
                }}
              >
                <SelectTrigger id="conta-tipo" className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_DE_CONTA.map((t) => (
                    <SelectItem key={t} value={t}>
                      {mensagensContas.tipos[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="grid gap-4 medium:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="conta-saldo">{f.saldoInicial}</Label>
          <Controller
            name="saldoInicial"
            control={control}
            render={({ field }) => {
              const absoluto = Math.abs(field.value);
              const negativo = field.value < 0 || (field.value === 0 && sinalNegativo);
              return (
                <div className="flex items-center gap-2">
                  <Input
                    id="conta-saldo"
                    inputMode="numeric"
                    autoComplete="off"
                    className="h-12 flex-1"
                    aria-describedby="conta-saldo-dica"
                    // A máscara preenche da direita: o cursor fica sempre no fim.
                    onSelect={(e) => {
                      const el = e.currentTarget;
                      const fim = el.value.length;
                      // Seleção (para apagar tudo) fica; só o cursor solto vai para o fim.
                      if (el.selectionStart === el.selectionEnd && el.selectionStart !== fim)
                        el.setSelectionRange(fim, fim);
                    }}
                    // Vazio no zero, como o valor do lançamento: o primeiro dígito já vale.
                    placeholder={formatarMoeda(centavos(0))}
                    value={
                      absoluto === 0 ? '' : formatarMoeda(centavos(negativo ? -absoluto : absoluto))
                    }
                    onChange={(e) => {
                      const digitos = e.target.value.replace(/\D/g, '').replace(/^0+/, '');
                      if (digitos.length > 11) return;
                      const n = Number(digitos || '0');
                      field.onChange(negativo ? -n : n);
                    }}
                  />
                  <Toggle
                    className="h-12"
                    pressed={negativo}
                    onPressedChange={(p) => {
                      setSinalNegativo(p);
                      field.onChange(p ? -absoluto : absoluto);
                    }}
                  >
                    {negativo && <Check aria-hidden />}
                    {f.negativo}
                  </Toggle>
                </div>
              );
            }}
          />
          <p id="conta-saldo-dica" className="text-label-md font-normal text-on-surface-variant">
            {f.dicaSaldo}
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="conta-data" data-erro={!!erros.dataSaldoInicial}>
            {f.dataSaldo}
          </Label>
          <Input
            id="conta-data"
            type="date"
            className="h-12"
            aria-describedby="conta-data-dica"
            aria-invalid={!!erros.dataSaldoInicial || undefined}
            {...register('dataSaldoInicial')}
          />
          <p id="conta-data-dica" className="text-label-md font-normal text-on-surface-variant">
            {f.dicaData}
          </p>
          <Erro id="conta-data-erro" texto={erros.dataSaldoInicial?.message} />
        </div>
      </div>

      {previa && (
        <div
          role="note"
          aria-label={f.previa.titulo}
          className="flex flex-col gap-1 rounded-md bg-secondary-container px-4 py-3 text-body-md text-on-secondary-container"
        >
          <p className="text-label-lg">{f.previa.titulo}</p>
          <p>
            {f.previa.saldo(semSaldo(previa.saldoAtualAntes), semSaldo(previa.saldoAtualDepois))}
          </p>
          {previa.passamAAnterior > 0 && <p>{f.previa.passam(previa.passamAAnterior)}</p>}
          {previa.deixamDeAnterior > 0 && <p>{f.previa.deixam(previa.deixamDeAnterior)}</p>}
        </div>
      )}

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

      <div className="flex flex-col gap-1">
        <div className="flex min-h-11 items-center gap-3">
          <Controller
            name="incluirNoTotal"
            control={control}
            render={({ field }) => (
              <Switch
                id="conta-incluir"
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={travado}
                aria-describedby="conta-incluir-dica"
              />
            )}
          />
          <Label htmlFor="conta-incluir" className="text-body-md text-on-surface">
            {f.incluir}
          </Label>
        </div>
        <p id="conta-incluir-dica" className="text-label-md font-normal text-on-surface-variant">
          {travado ? f.pagaCartao : f.dicaIncluir}
        </p>
      </div>

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

/** Nova conta ou editar conta (6.4), num diálogo no vocabulário do LancarDialog. */
export function FormularioConta({
  aberto,
  d,
  conta,
  onFechar,
}: {
  aberto: boolean;
  d: Derivado;
  conta?: Conta;
  onFechar: () => void;
}) {
  return (
    <Dialog
      open={aberto}
      onOpenChange={(a) => {
        if (!a) onFechar();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{conta ? f.tituloEditar : f.tituloNova}</DialogTitle>
          <DialogDescription className="sr-only">{f.dicaData}</DialogDescription>
        </DialogHeader>
        <Campos d={d} conta={conta} onFechar={onFechar} />
      </DialogContent>
    </Dialog>
  );
}
