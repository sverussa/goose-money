import {
  type Competencia,
  dataCivil,
  type Derivado,
  deMascara,
  ErroDeDominio,
  faturaDaCompra,
  previaDoPagamento,
} from '@goose-money/core';
import { Check, CreditCard } from 'lucide-react';
import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui';
import { useRef } from 'react';
import { type Control, Controller, useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router';

import { formatarMesCurto, formatarMoeda } from '@/app/formatacao';
import { mensagens } from '@/app/mensagens';
import { BotaoSalvar } from '@/components/BotaoSalvar';
import { EmptyState } from '@/components/EstadosDaTela';
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
import { Toggle, toggleVariants } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';
import { useComando, useContexto } from '@/queries/useComando';

import {
  comandoDoFormulario,
  esquemaDoFormulario,
  resolverZod,
  TIPOS,
  TIPOS_DE_CARTAO,
  type TipoDoFormulario,
  type ValoresDoFormulario,
} from './formulario';
import { mensagensLancar as m } from './mensagens';
import {
  aClassificar,
  cartoesAtivos,
  contasAtivas,
  destinoPadrao,
  faturasParaPagar,
  guardarUltimaConta,
  guardarUltimoCartao,
  opcoesDeCategoria,
} from './padroes';

/** Até R$ 999.999.999,99: 11 dígitos. */
const MAX_DIGITOS = 11;

type Nome = keyof ValoresDoFormulario;

function Erro({ id, texto }: { id: string; texto: string | undefined }) {
  if (!texto) return null;
  return (
    <p id={id} className="text-label-md text-error">
      {texto}
    </p>
  );
}

interface Opcao {
  valor: string;
  rotulo: string;
  cor?: string | null;
}

/** Um seletor do formulário ligado ao React Hook Form, com rótulo e erro. */
function CampoSelect({
  nome,
  rotulo,
  opcoes,
  control,
  erro,
  aoMudar,
}: {
  nome: Nome;
  rotulo: string;
  opcoes: readonly Opcao[];
  control: Control<ValoresDoFormulario>;
  erro: string | undefined;
  aoMudar?: (valor: string) => void;
}) {
  const id = `lancar-${nome}`;
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <Label htmlFor={id} data-erro={!!erro}>
        {rotulo}
      </Label>
      <Controller
        name={nome}
        control={control}
        render={({ field }) => (
          <Select
            value={String(field.value)}
            onValueChange={(v) => {
              field.onChange(v);
              aoMudar?.(v);
            }}
          >
            <SelectTrigger
              id={id}
              className="h-12"
              aria-invalid={!!erro || undefined}
              aria-describedby={erro ? `${id}-erro` : undefined}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {opcoes.map((o) => (
                <SelectItem key={o.valor} value={o.valor}>
                  {o.cor !== undefined && (
                    <span
                      aria-hidden
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: corDoTema(o.cor) }}
                    />
                  )}
                  {o.rotulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      <Erro id={`${id}-erro`} texto={erro} />
    </div>
  );
}

/** Classe do valor pela natureza do tipo (LancarDialog.dc.html). */
const corDoValor: Record<TipoDoFormulario, string> = {
  despesa: 'text-expense',
  compra: 'text-expense',
  receita: 'text-income',
  transferencia: 'text-transfer',
  pagamento: 'text-transfer',
};

/**
 * O conteúdo do formulário de lançamento (7.1–7.3), o mesmo no diálogo e na tela cheia (T05-05).
 * Grava pelo comando do core e `useComando` (T03-04): "Salvando…", depois "Lançado · Desfazer".
 */
export function FormularioLancamento({
  derivado,
  inicial,
  valorRef,
  onFechar,
}: {
  derivado: Derivado;
  inicial: Pick<ValoresDoFormulario, 'tipo' | 'contaId' | 'cartaoId' | 'data'>;
  valorRef: React.RefObject<HTMLInputElement | null>;
  onFechar: () => void;
}) {
  const { fatos } = derivado;
  const { executar, salvando } = useComando();
  const contexto = useContexto();
  const navegar = useNavigate();
  const semCategoria = aClassificar(fatos) ?? '';
  const contas = contasAtivas(fatos);
  const cartoes = cartoesAtivos(fatos);
  const contaDoCartao = (id: string) => cartoes.find((c) => c.id === id)?.contaPagamentoId;

  const form = useForm<ValoresDoFormulario>({
    resolver: resolverZod(esquemaDoFormulario),
    defaultValues: {
      ...inicial,
      valor: 0,
      descricao: '',
      categoriaId: semCategoria,
      contaDestinoId: contas.find((c) => c.id !== inicial.contaId)?.id ?? '',
      faturaCompetencia: inicial.cartaoId ? (destinoPadrao(derivado, inicial.cartaoId) ?? '') : '',
    },
  });
  const { control, register, handleSubmit, setValue, setError, reset, formState } = form;
  const erros = formState.errors;
  const v = useWatch({ control });
  const tipo = v.tipo ?? inicial.tipo;
  const outro = useRef(false);

  const usaCartao = TIPOS_DE_CARTAO.includes(tipo);
  const cartao = cartoes.find((c) => c.id === v.cartaoId);
  const categorias = opcoesDeCategoria(fatos, tipo === 'receita' ? 'receita' : 'despesa');
  const opcoesDeConta = contas.map((c) => ({ valor: c.id, rotulo: c.nome }));
  const opcoesDeCartao = cartoes.map((c) => ({ valor: c.id, rotulo: c.nome }));
  const faturas = cartao ? faturasParaPagar(derivado, cartao.id) : [];
  const fatura = faturas.find((f) => f.competencia === v.faturaCompetencia);

  // No pagamento, o cartão traz a conta de pagamento dele e o destino padrão (3.5).
  function prepararPagamento(cartaoId: string) {
    const conta = contaDoCartao(cartaoId);
    if (conta) setValue('contaId', conta);
    setValue('faturaCompetencia', destinoPadrao(derivado, cartaoId) ?? '');
  }

  function trocarTipo(novo: string) {
    if (!novo) return;
    const t = novo as TipoDoFormulario;
    setValue('tipo', t);
    // A categoria escolhida pode não servir ao tipo novo; valor e data ficam (T05-03).
    const tipoDaCategoria = t === 'receita' ? 'receita' : 'despesa';
    if (
      !opcoesDeCategoria(fatos, tipoDaCategoria).some((c) => c.id === form.getValues('categoriaId'))
    )
      setValue('categoriaId', semCategoria);
    if (t === 'pagamento' && form.getValues('cartaoId'))
      prepararPagamento(form.getValues('cartaoId'));
  }

  async function salvar(valores: ValoresDoFormulario) {
    let comando;
    try {
      comando = comandoDoFormulario(fatos, contexto(), valores);
    } catch (e) {
      if (!(e instanceof ErroDeDominio)) throw e;
      setError('root', { message: e.message });
      return;
    }
    if (!(await executar(comando))) return;
    if (valores.tipo !== 'compra') guardarUltimaConta(valores.contaId);
    if (TIPOS_DE_CARTAO.includes(valores.tipo)) guardarUltimoCartao(valores.cartaoId);
    if (!outro.current) {
      onFechar();
      return;
    }
    // "Salvar e lançar outro": volta ao valor mantendo tipo, conta ou cartão e data (7.1).
    reset({ ...valores, valor: 0, descricao: '', categoriaId: semCategoria });
    valorRef.current?.focus();
  }
  const enviar = (lancarOutro: boolean) => {
    outro.current = lancarOutro;
    void handleSubmit(salvar)();
  };

  const valor = deMascara(String(v.valor ?? 0));
  const contaOrigem = contas.find((c) => c.id === v.contaId);
  const contaDestino = contas.find((c) => c.id === v.contaDestinoId);
  const aviso =
    tipo === 'transferencia' &&
    contaOrigem &&
    contaDestino &&
    contaOrigem.incluirNoTotal !== contaDestino.incluirNoTotal
      ? contaOrigem.incluirNoTotal
        ? m.aviso.cai(contaDestino.nome, formatarMoeda(valor))
        : m.aviso.sobe(contaOrigem.nome, formatarMoeda(valor))
      : null;
  let faturaDaData: Competencia | null = null;
  if (tipo === 'compra' && cartao && v.data)
    try {
      faturaDaData = faturaDaCompra(cartao, fatos.cartaoCiclos, dataCivil(v.data));
    } catch {
      faturaDaData = null;
    }
  const previa =
    tipo === 'pagamento' && fatura && valor > 0
      ? previaDoPagamento(faturas, fatura.competencia, valor)
      : null;

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
          <ToggleGroupPrimitive.Item key={t} value={t} className={toggleVariants()}>
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
              className={cn('h-18 border-2 border-primary text-headline-lg', corDoValor[tipo])}
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

      {usaCartao && cartoes.length === 0 ? (
        // Sem cartão cadastrado, compra e pagamento de fatura levam ao cadastro (D21).
        <EmptyState
          Icone={CreditCard}
          frase={m.semCartao.frase}
          acao={
            <Button
              type="button"
              onClick={() => {
                onFechar();
                void navegar('/cartoes?novo=1');
              }}
            >
              {m.semCartao.acao}
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lancar-descricao">{m.descricao}</Label>
            <Input
              id="lancar-descricao"
              autoComplete="off"
              className="h-13"
              {...register('descricao')}
            />
          </div>

          {(tipo === 'despesa' || tipo === 'receita' || tipo === 'compra') && (
            <CampoSelect
              nome="categoriaId"
              rotulo={m.categoria}
              control={control}
              erro={erros.categoriaId?.message}
              opcoes={categorias.map((c) => ({ valor: c.id, rotulo: c.nome, cor: c.cor }))}
            />
          )}

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

            {(tipo === 'despesa' || tipo === 'receita') && (
              <CampoSelect
                nome="contaId"
                rotulo={m.conta}
                control={control}
                erro={erros.contaId?.message}
                opcoes={opcoesDeConta}
              />
            )}

            {usaCartao && (
              <div className="flex flex-col gap-1.5">
                <CampoSelect
                  nome="cartaoId"
                  rotulo={m.cartao}
                  control={control}
                  erro={erros.cartaoId?.message}
                  opcoes={opcoesDeCartao}
                  aoMudar={(id) => {
                    if (tipo === 'pagamento') prepararPagamento(id);
                  }}
                />
                {faturaDaData && (
                  <p className="text-label-md font-normal text-on-surface-variant">
                    {m.caiNaFatura(formatarMesCurto(faturaDaData))}
                  </p>
                )}
              </div>
            )}

            {tipo === 'transferencia' && (
              <div className="flex flex-wrap gap-4 medium:col-span-2">
                <CampoSelect
                  nome="contaId"
                  rotulo={m.de}
                  control={control}
                  erro={erros.contaId?.message}
                  opcoes={opcoesDeConta}
                />
                <CampoSelect
                  nome="contaDestinoId"
                  rotulo={m.para}
                  control={control}
                  erro={erros.contaDestinoId?.message}
                  opcoes={opcoesDeConta}
                />
              </div>
            )}

            {tipo === 'pagamento' && (
              <>
                <CampoSelect
                  nome="contaId"
                  rotulo={m.conta}
                  control={control}
                  erro={erros.contaId?.message}
                  opcoes={opcoesDeConta}
                />
                <div className="flex flex-wrap items-end gap-2 medium:col-span-2">
                  <CampoSelect
                    nome="faturaCompetencia"
                    rotulo={m.fatura}
                    control={control}
                    erro={erros.faturaCompetencia?.message}
                    opcoes={faturas.map((f) => ({
                      valor: f.competencia,
                      rotulo: `${m.faturaDe(formatarMesCurto(f.competencia))} · ${formatarMoeda(f.saldo)}`,
                    }))}
                  />
                  {fatura && fatura.saldo > 0 && (
                    <Toggle
                      className="mb-1.5"
                      pressed={valor === fatura.saldo}
                      onPressedChange={() => {
                        setValue('valor', fatura.saldo);
                      }}
                    >
                      {valor === fatura.saldo && <Check aria-hidden />}
                      {m.saldoTotal}
                    </Toggle>
                  )}
                </div>
              </>
            )}
          </div>

          {aviso && (
            <p
              role="note"
              className="rounded-md bg-warning-container px-4 py-3 text-body-md text-on-warning-container"
            >
              {aviso}
            </p>
          )}
          {previa && (
            <p role="note" className="text-body-md text-on-surface-variant">
              {previa.credito > 0
                ? m.previa.credito(formatarMoeda(previa.credito))
                : previa.saldoRestante > 0
                  ? m.previa.resta(formatarMoeda(previa.saldoRestante))
                  : m.previa.quita}
            </p>
          )}
        </>
      )}

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
        <BotaoSalvar
          salvando={salvando}
          disabled={usaCartao && cartoes.length === 0}
          className="px-6"
        >
          {mensagens.acoes.salvar}
        </BotaoSalvar>
      </div>
    </form>
  );
}
