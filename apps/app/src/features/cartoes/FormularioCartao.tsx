import {
  type Cartao,
  centavos,
  criarCartao,
  type Derivado,
  editarCartao,
  ErroDeDominio,
  limiteDisponivel,
  limiteDisponivelDoCartao,
  obrigacoesDoCartao,
  previaDoCadastro,
} from '@goose-money/core';
import { Check } from 'lucide-react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { formatarData, formatarMoeda } from '@/app/formatacao';
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
import { resolverZod } from '@/features/lancar/formulario';
import { cn } from '@/lib/utils';
import { useComando, useContexto } from '@/queries/useComando';

import {
  camposDoCartao,
  cicloAtual,
  contasDePagamento,
  CORES_DE_CARTAO,
  esquemaDoCartao,
  type ValoresDoCartao,
  valoresIniciais,
} from './formulario';
import { CampoDeValor } from './CampoDeValor';
import { mensagensCartoes } from './mensagens';

const f = mensagensCartoes.formulario;
function Erro({ id, texto }: { id: string; texto: string | undefined }) {
  return texto ? (
    <p id={id} className="text-label-md text-error">
      {texto}
    </p>
  ) : null;
}

function Campos({
  d,
  cartao,
  onFechar,
}: {
  d: Derivado;
  cartao: Cartao | undefined;
  onFechar: () => void;
}) {
  const { executar, salvando } = useComando();
  const contexto = useContexto();
  const form = useForm<ValoresDoCartao>({
    resolver: resolverZod(esquemaDoCartao),
    defaultValues: valoresIniciais(d.fatos, cartao, cartao && cicloAtual(d, cartao)),
  });
  const { control, register, handleSubmit, setError, formState } = form;
  const erros = formState.errors;
  const v = useWatch({ control });
  const contas = contasDePagamento(d.fatos);

  // Prévia (6.5): no cadastro, a fatura das compras de hoje; na edição, o novo Limite disponível.
  let previa: string[] = [];
  const diaOk = (n: number | undefined): n is number =>
    n !== undefined && Number.isInteger(n) && n >= 1 && n <= 31;
  if (cartao) {
    if (v.limite && v.limite > 0 && v.limite !== cartao.limite) {
      const obrigacoes = obrigacoesDoCartao(d.faturas.get(cartao.id) ?? []);
      previa = [
        f.previa.limite(
          formatarMoeda(limiteDisponivelDoCartao(d, cartao.id)),
          formatarMoeda(limiteDisponivel({ limite: centavos(v.limite) }, obrigacoes)),
        ),
      ];
    }
  } else if (diaOk(v.diaFechamento) && diaOk(v.diaVencimento)) {
    const p = previaDoCadastro(v.diaFechamento, v.diaVencimento, d.hoje);
    previa = [
      f.previa.cai(formatarData(p.vencimento)),
      f.previa.datas(formatarData(p.fechamento), formatarData(p.vencimento)),
    ];
  }

  async function salvar(valores: ValoresDoCartao) {
    let comando;
    try {
      const campos = camposDoCartao(valores);
      if (cartao) {
        const { nome, instituicao, cor, limite, contaPagamentoId } = campos;
        comando = editarCartao(d.fatos, contexto(), cartao.id, {
          nome,
          instituicao,
          cor,
          limite,
          contaPagamentoId,
        });
      } else comando = criarCartao(d.fatos, contexto(), campos);
    } catch (e) {
      if (!(e instanceof ErroDeDominio)) throw e;
      setError('root', { message: e.message });
      return;
    }
    if (await executar(comando)) onFechar();
  }

  const dia = (campo: 'diaFechamento' | 'diaVencimento', id: string, rotulo: string) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} data-erro={!!erros[campo]}>
        {rotulo}
      </Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={1}
        max={31}
        className="h-12"
        disabled={cartao !== undefined}
        aria-invalid={!!erros[campo] || undefined}
        aria-describedby={cartao ? 'cartao-ciclo-dica' : erros[campo] ? `${id}-erro` : undefined}
        {...register(campo, { valueAsNumber: true })}
      />
      <Erro id={`${id}-erro`} texto={erros[campo]?.message} />
    </div>
  );

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
        <Label htmlFor="cartao-nome" data-erro={!!erros.nome}>
          {f.nome}
        </Label>
        <Input
          id="cartao-nome"
          autoComplete="off"
          aria-invalid={!!erros.nome || undefined}
          aria-describedby={erros.nome ? 'cartao-nome-erro' : undefined}
          className="h-13"
          {...register('nome')}
        />
        <Erro id="cartao-nome-erro" texto={erros.nome?.message} />
      </div>

      <div className="grid gap-4 medium:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cartao-instituicao">{f.instituicao}</Label>
          <Input id="cartao-instituicao" className="h-12" {...register('instituicao')} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cartao-limite" data-erro={!!erros.limite}>
            {f.limite}
          </Label>
          <Controller
            name="limite"
            control={control}
            render={({ field }) => (
              <CampoDeValor
                id="cartao-limite"
                valor={field.value}
                aoMudar={field.onChange}
                aria-invalid={!!erros.limite || undefined}
                aria-describedby={erros.limite ? 'cartao-limite-erro' : undefined}
              />
            )}
          />
          <Erro id="cartao-limite-erro" texto={erros.limite?.message} />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="grid gap-4 medium:grid-cols-2">
          {dia('diaFechamento', 'cartao-fechamento', f.fechamento)}
          {dia('diaVencimento', 'cartao-vencimento', f.vencimento)}
        </div>
        {cartao && (
          <p id="cartao-ciclo-dica" className="text-label-md font-normal text-on-surface-variant">
            {f.dicaCiclo}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cartao-conta" data-erro={!!erros.contaPagamentoId}>
          {f.conta}
        </Label>
        <Controller
          name="contaPagamentoId"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger
                id="cartao-conta"
                className="h-12"
                aria-invalid={!!erros.contaPagamentoId || undefined}
                aria-describedby="cartao-conta-dica"
              >
                <SelectValue placeholder={contas.length ? undefined : f.semConta} />
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
        <p id="cartao-conta-dica" className="text-label-md font-normal text-on-surface-variant">
          {f.dicaConta}
        </p>
        <Erro id="cartao-conta-erro" texto={erros.contaPagamentoId?.message} />
      </div>

      {!cartao && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cartao-saldo-fechada">{f.saldoFechada}</Label>
          <Controller
            name="saldoFaturaFechada"
            control={control}
            render={({ field }) => (
              <CampoDeValor
                id="cartao-saldo-fechada"
                valor={field.value}
                aoMudar={field.onChange}
                aria-describedby="cartao-saldo-fechada-dica"
              />
            )}
          />
          <p
            id="cartao-saldo-fechada-dica"
            className="text-label-md font-normal text-on-surface-variant"
          >
            {f.dicaSaldoFechada}
          </p>
        </div>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="pb-2 text-label-md text-on-surface-variant">{f.cor}</legend>
        <Controller
          name="cor"
          control={control}
          render={({ field }) => (
            <div role="radiogroup" aria-label={f.cor} className="flex flex-wrap gap-2">
              {CORES_DE_CARTAO.map((c, i) => (
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
                    'alvo flex size-9 cursor-pointer items-center justify-center rounded-full text-on-primary dark:text-on-surface',
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

      {previa.length > 0 && (
        <div
          role="note"
          aria-label={f.previa.titulo}
          className="flex flex-col gap-1 rounded-md bg-secondary-container px-4 py-3 text-body-md text-on-secondary-container"
        >
          <p className="text-label-lg">{f.previa.titulo}</p>
          {previa.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      )}

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

/** Novo cartão ou editar cartão (6.5, D21), no vocabulário do formulário de conta. */
export function FormularioCartao({
  aberto,
  d,
  cartao,
  onFechar,
}: {
  aberto: boolean;
  d: Derivado;
  cartao?: Cartao;
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
          <DialogTitle>{cartao ? f.tituloEditar : f.tituloNovo}</DialogTitle>
          <DialogDescription className="sr-only">{f.descricao}</DialogDescription>
        </DialogHeader>
        <Campos d={d} cartao={cartao} onFechar={onFechar} />
      </DialogContent>
    </Dialog>
  );
}
