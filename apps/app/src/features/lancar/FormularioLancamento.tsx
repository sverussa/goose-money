import {
  type Competencia,
  dataCivil,
  type Derivado,
  type Lancamento,
  deMascara,
  ErroDeDominio,
  faturaDaCompra,
  previaDoPagamento,
  sugestoesDeLancamento,
} from '@goose-money/core';
import { Check, ChevronDown, CreditCard, TriangleAlert, X } from 'lucide-react';
import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui';
import { useRef, useState } from 'react';
import { type Control, Controller, useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router';

import { formatarData, formatarMesCurto, formatarMoeda } from '@/app/formatacao';
import { mensagens } from '@/app/mensagens';
import { BotaoSalvar } from '@/components/BotaoSalvar';
import { EmptyState } from '@/components/EstadosDaTela';
import { corDoTema } from '@/components/graficos/dados';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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

import { CampoData, CampoDescricao, GradeDeCategorias } from './campos';
import {
  comandoDoFormulario,
  contaComDataPosterior,
  novaDataDoSaldoInicial,
  podeSerPrevisto,
  valoresDoLancamento,
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
  gruposDeCategoria,
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
  listaAbertaRef,
  onFechar,
  telaCheia = false,
  titulo,
  editando,
}: {
  derivado: Derivado;
  inicial: Pick<ValoresDoFormulario, 'tipo' | 'contaId' | 'cartaoId' | 'data'>;
  valorRef: React.RefObject<HTMLInputElement | null>;
  /** Com as sugestões abertas, Esc fecha a lista e não o diálogo. */
  listaAbertaRef: React.RefObject<boolean>;
  onFechar: () => void;
  /** No compact (< 600 dp), o layout de tela cheia (T05-05); só o invólucro muda. */
  telaCheia?: boolean;
  /** O título do invólucro (DrawerTitle), mostrado no topo da tela cheia. */
  titulo?: React.ReactNode;
  /** Edição (T05-07): o formulário abre preenchido e grava por `editarLancamento`. */
  editando?: Lancamento;
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
    defaultValues: editando
      ? { ...valoresDoLancamento(editando), cartaoId: inicial.cartaoId, faturaCompetencia: '' }
      : {
          ...inicial,
          valor: 0,
          descricao: '',
          categoriaId: semCategoria,
          contaDestinoId: contas.find((c) => c.id !== inicial.contaId)?.id ?? '',
          faturaCompetencia: inicial.cartaoId
            ? (destinoPadrao(derivado, inicial.cartaoId) ?? '')
            : '',
          observacao: '',
          previsto: false,
          saldoInicial: 'manter',
        },
  });
  const { control, register, handleSubmit, setValue, setError, reset, formState } = form;
  const erros = formState.errors;
  const v = useWatch({ control });
  const tipo = v.tipo ?? inicial.tipo;
  const outro = useRef(false);

  const usaCartao = TIPOS_DE_CARTAO.includes(tipo);
  const cartao = cartoes.find((c) => c.id === v.cartaoId);
  const [maisOpcoes, setMaisOpcoes] = useState(false);
  const tipoDaCategoria = tipo === 'receita' ? 'receita' : 'despesa';
  const categorias = opcoesDeCategoria(fatos, tipoDaCategoria);
  const nomesDasCategorias = new Map(categorias.map((c) => [c.id, c.nome]));
  const sugestoes = sugestoesDeLancamento(fatos, tipoDaCategoria);
  const maisUsadas = sugestoes.maisUsadas.flatMap(
    (id) => categorias.find((c) => c.id === id) ?? [],
  );
  const contaPosterior = contaComDataPosterior(fatos, {
    ...form.getValues(),
    ...v,
  });
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
      comando = comandoDoFormulario(fatos, contexto(), valores, editando?.id);
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
    reset({
      ...valores,
      valor: 0,
      descricao: '',
      categoriaId: semCategoria,
      observacao: '',
      saldoInicial: 'manter',
    });
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

  const podeSalvar = !(usaCartao && cartoes.length === 0);
  const lancarOutro = (
    <Button
      type="button"
      variant="outlined"
      disabled={salvando}
      className={cn(telaCheia && 'h-12 w-full')}
      onClick={() => {
        enviar(true);
      }}
    >
      {mensagens.acoes.salvarELancarOutro}
    </Button>
  );
  const salvarBotao = (
    <BotaoSalvar salvando={salvando} disabled={!podeSalvar} className="px-6">
      {mensagens.acoes.salvar}
    </BotaoSalvar>
  );

  return (
    <form
      noValidate
      className={cn('flex flex-col', telaCheia ? 'h-full min-h-0' : 'gap-4.5')}
      onSubmit={(e) => {
        e.preventDefault();
        enviar(false);
      }}
    >
      {telaCheia && (
        // Full-screen dialog do compact (MobileLancar): fechar, título e Salvar no topo, sempre
        // visíveis, mesmo com o teclado aberto.
        <div className="flex h-app-bar shrink-0 items-center gap-1 px-2">
          <Button type="button" variant="icon" aria-label={mensagens.fechar} onClick={onFechar}>
            <X aria-hidden />
          </Button>
          <div className="flex-1">{titulo}</div>
          {salvarBotao}
        </div>
      )}
      <div
        className={cn(
          'flex flex-col gap-4.5',
          telaCheia && 'min-h-0 flex-1 overflow-y-auto px-4 pt-1 pb-4',
        )}
      >
        <ToggleGroupPrimitive.Root
          type="single"
          value={tipo}
          onValueChange={trocarTipo}
          aria-label={m.tipos.rotulo}
          className={cn(
            'flex gap-2',
            // No celular, uma linha que rola para o lado (MobileLancar).
            telaCheia ? '-mx-4 shrink-0 overflow-x-auto px-4' : 'flex-wrap',
          )}
        >
          {TIPOS.map((t) => (
            <ToggleGroupPrimitive.Item
              key={t}
              value={t}
              // Na edição, o tipo não muda (o core recusa): exclua e lance de novo.
              disabled={!!editando && t !== tipo}
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
                  'h-18 text-headline-lg',
                  telaCheia
                    ? 'rounded-none border-0 border-b-2 border-primary text-center focus-visible:ring-0'
                    : 'border-2 border-primary',
                  corDoValor[tipo],
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
            <CampoDescricao
              valor={v.descricao ?? ''}
              sugestoes={sugestoes.descricoes}
              categorias={nomesDasCategorias}
              listaAbertaRef={listaAbertaRef}
              aoMudar={(texto) => {
                setValue('descricao', texto);
              }}
              aoEscolher={(s) => {
                setValue('descricao', s.descricao);
                if (categorias.some((c) => c.id === s.categoriaId))
                  setValue('categoriaId', s.categoriaId);
              }}
            />

            {(tipo === 'despesa' || tipo === 'receita' || tipo === 'compra') && (
              <GradeDeCategorias
                maisUsadas={maisUsadas}
                grupos={gruposDeCategoria(fatos, tipoDaCategoria)}
                todas={categorias}
                valor={v.categoriaId ?? ''}
                erro={erros.categoriaId?.message}
                aoEscolher={(id) => {
                  setValue('categoriaId', id);
                }}
              />
            )}

            <CampoData
              hoje={derivado.hoje}
              valor={v.data ?? ''}
              campo={register('data')}
              erro={erros.data?.message}
              aoMudar={(d) => {
                setValue('data', d, { shouldValidate: formState.isSubmitted });
              }}
            />

            <div className="grid gap-4 medium:grid-cols-2">
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

            {contaPosterior && (
              <div
                role="note"
                className="flex flex-col gap-3 rounded-md bg-warning-container px-4 py-3 text-body-md text-on-warning-container"
              >
                <p className="flex gap-2">
                  <TriangleAlert aria-hidden className="mt-0.5 size-4.5 shrink-0" />
                  {m.anteriorAoSaldo.aviso(
                    contaPosterior.nome,
                    formatarData(contaPosterior.dataSaldoInicial),
                  )}
                </p>
                <fieldset className="flex flex-col gap-1">
                  <legend className="sr-only">{m.anteriorAoSaldo.rotulo}</legend>
                  {(['manter', 'mudar'] as const).map((opcao) => (
                    <label key={opcao} className="flex min-h-11 cursor-pointer items-center gap-3">
                      <input
                        type="radio"
                        value={opcao}
                        className="size-4.5 accent-primary"
                        {...register('saldoInicial')}
                      />
                      {opcao === 'manter'
                        ? m.anteriorAoSaldo.manter
                        : m.anteriorAoSaldo.mudar(
                            formatarData(novaDataDoSaldoInicial(v.data ?? '')),
                          )}
                    </label>
                  ))}
                </fieldset>
              </div>
            )}

            <Button
              type="button"
              variant="text"
              className="self-start"
              aria-expanded={maisOpcoes}
              aria-controls="lancar-mais-opcoes"
              onClick={() => {
                setMaisOpcoes(!maisOpcoes);
              }}
            >
              {m.maisOpcoes}
              <ChevronDown
                aria-hidden
                className={cn('transition-transform', maisOpcoes && 'rotate-180')}
              />
            </Button>
            {maisOpcoes && (
              <div id="lancar-mais-opcoes" className="flex flex-col gap-4">
                {podeSerPrevisto(tipo) && (
                  <div className="flex min-h-11 items-center gap-3">
                    <Controller
                      name="previsto"
                      control={control}
                      render={({ field }) => (
                        <Switch
                          id="lancar-previsto"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                    <Label htmlFor="lancar-previsto" className="text-body-md text-on-surface">
                      {m.previsto}
                    </Label>
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="lancar-observacao">{m.observacao}</Label>
                  <Textarea id="lancar-observacao" {...register('observacao')} />
                </div>
              </div>
            )}

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
      </div>

      {telaCheia ? (
        !editando && (
          <div className="shrink-0 border-t border-surface-container-highest bg-surface px-4 pt-3 pb-6">
            {lancarOutro}
          </div>
        )
      ) : (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="flex-1 text-label-md font-normal text-on-surface-variant">
            {m.dicaTeclas}
          </span>
          <Button type="button" variant="text" onClick={onFechar}>
            {mensagens.acoes.cancelar}
          </Button>
          {!editando && lancarOutro}
          {salvarBotao}
        </div>
      )}
    </form>
  );
}
