import { type Comando, contratarDivida, type Derivado, ErroDeDominio } from '@goose-money/core';
import { Check } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';

import { formatarMoeda, formatarTaxa } from '@/app/formatacao';
import { mensagens } from '@/app/mensagens';
import { BotaoSalvar } from '@/components/BotaoSalvar';
import { MoneyText } from '@/components/MoneyText';
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { CampoDeValor } from '@/features/cartoes/CampoDeValor';
import {
  aClassificar,
  contaInicial,
  contasAtivas,
  lerUltimaConta,
  opcoesDeCategoria,
} from '@/features/lancar/padroes';
import { cn } from '@/lib/utils';
import { useComando, useContexto } from '@/queries/useComando';

import {
  camposDaDivida,
  type ErrosDaDivida,
  errosDaEtapa,
  type Etapa,
  ETAPAS,
  MAX_PARCELAS_DIVIDA,
  type PreviaDaDivida,
  previaDaDivida,
  registraEntrada,
  type ValoresDaDivida,
  valoresIniciaisDaDivida,
} from './cadastro';
import { mensagensDividas } from './mensagens';
import { TabelaDeAmortizacao } from './TabelaDeAmortizacao';

const m = mensagensDividas.cadastro;
const md = mensagensDividas.detalhe;

function Erro({ id, texto }: { id: string; texto: string | undefined }) {
  return texto ? (
    <p id={id} className="text-label-md text-error">
      {texto}
    </p>
  ) : null;
}

/** Rótulo, campo, dica e erro, ligados por id (como no formulário de cartão). */
export function Campo({
  id,
  rotulo,
  erro,
  dica,
  children,
}: {
  id: string;
  rotulo: string;
  erro: string | undefined;
  dica?: string;
  children: (aria: { 'aria-invalid'?: boolean; 'aria-describedby'?: string }) => ReactNode;
}) {
  const descrita = [dica && `${id}-dica`, erro && `${id}-erro`].filter(Boolean).join(' ');
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id} data-erro={!!erro}>
        {rotulo}
      </Label>
      {children({ 'aria-invalid': !!erro || undefined, 'aria-describedby': descrita || undefined })}
      {dica && (
        <p id={`${id}-dica`} className="text-label-md font-normal text-on-surface-variant">
          {dica}
        </p>
      )}
      <Erro id={`${id}-erro`} texto={erro} />
    </div>
  );
}

/** Escolha única em botões, com o check do escolhido (como "Informar" da Nova compra). */
export function Opcoes<T extends string>({
  rotulo,
  valor,
  opcoes,
  aoMudar,
}: {
  rotulo: string;
  valor: T;
  opcoes: Record<T, string>;
  aoMudar: (v: T) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="pb-2 text-label-md text-on-surface-variant">{rotulo}</legend>
      <ToggleGroup
        type="single"
        aria-label={rotulo}
        value={valor}
        onValueChange={(v) => {
          if (v) aoMudar(v as T);
        }}
        className="flex-wrap"
      >
        {(Object.keys(opcoes) as T[]).map((k) => (
          <ToggleGroupItem key={k} value={k}>
            {valor === k && <Check aria-hidden />}
            {opcoes[k]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </fieldset>
  );
}

export function Seletor({
  id,
  valor,
  opcoes,
  aoMudar,
  aria,
}: {
  id: string;
  valor: string;
  opcoes: { id: string; nome: string }[];
  aoMudar: (id: string) => void;
  aria: { 'aria-invalid'?: boolean; 'aria-describedby'?: string };
}) {
  return (
    <Select value={valor} onValueChange={aoMudar}>
      <SelectTrigger id={id} className="h-12" {...aria}>
        <SelectValue placeholder={m.semConta} />
      </SelectTrigger>
      <SelectContent>
        {opcoes.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.nome}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Previa({ previa }: { previa: PreviaDaDivida }) {
  const { t, linhas, totalJuros, diferencaUltima } = previa;
  const { divida, resumo } = t;
  const primeira = t.parcelas[0];
  const itens: [string, ReactNode][] = [
    [md.valorContratado, <MoneyText key="v" valor={resumo.valorContratado} />],
    [
      resumo.taxaImplicita ? md.taxaImplicita : md.taxaInformada,
      md.taxa(formatarTaxa(resumo.taxa)),
    ],
    [
      md.sistema(mensagensDividas.sistema[divida.sistemaAmortizacao]),
      divida.sistemaAmortizacao === 'sac' || !primeira
        ? md.nParcelas(resumo.total)
        : md.parcelas(resumo.total, formatarMoeda(primeira.valor)),
    ],
    ...(diferencaUltima === null
      ? []
      : ([
          [m.diferencaUltima, m.diferenca(formatarMoeda(diferencaUltima), diferencaUltima > 0)],
        ] as [string, ReactNode][])),
    [m.totalJuros, <MoneyText key="j" valor={totalJuros} />],
    [m.saldoFinal, <MoneyText key="s" valor={linhas.at(-1)?.saldo ?? resumo.saldoDevedor} />],
  ];
  return (
    <div className="flex flex-col gap-4">
      <dl aria-label={m.resumo} className="grid grid-cols-2 gap-4 medium:grid-cols-3">
        {itens.map(([rotulo, valor]) => (
          <div key={rotulo} className="flex flex-col gap-0.5">
            <dt className="text-label-md font-normal text-on-surface-variant">{rotulo}</dt>
            <dd className="text-body-lg font-semibold">{valor}</dd>
          </div>
        ))}
      </dl>
      <TabelaDeAmortizacao t={t} linhas={linhas} destacada={null} />
    </div>
  );
}

function Etapas({ d, onFechar }: { d: Derivado; onFechar: () => void }) {
  const { executar, salvando } = useComando();
  const contexto = useContexto();
  const hoje = d.hoje;
  const contas = contasAtivas(d.fatos);
  const categorias = opcoesDeCategoria(d.fatos, 'despesa');
  const [v, setV] = useState<ValoresDaDivida>(() =>
    valoresIniciaisDaDivida(
      hoje,
      contaInicial(d.fatos, null, lerUltimaConta()) ?? '',
      aClassificar(d.fatos) ?? categorias[0]?.id ?? '',
    ),
  );
  const [k, setK] = useState(0);
  const etapa = ETAPAS[k] as Etapa;
  const [erros, setErros] = useState<ErrosDaDivida>({});
  const [erroDoCore, setErroDoCore] = useState<string | null>(null);
  // O comando e a prévia ficam presos aos fatos de quando foram montados: depois de gravar, a
  // dívida já está nos fatos e a prévia não teria o que mostrar.
  const [montado, setMontado] = useState<{ comando: Comando; previa: PreviaDaDivida } | null>(null);
  const titulo = useRef<HTMLHeadingElement>(null);
  const primeira = useRef(true);
  // Cada etapa nova leva o foco ao título dela; a primeira fica com o foco do diálogo.
  useEffect(() => {
    if (primeira.current) primeira.current = false;
    else titulo.current?.focus();
  }, [k]);

  const mudar = (x: Partial<ValoresDaDivida>) => {
    setV((atual) => ({ ...atual, ...x }));
    setErroDoCore(null);
  };
  const entrada = registraEntrada(v, hoje);

  /** A dívida montada pelo core (as regras dele valem antes da prévia). */
  function montar(): Comando | null {
    const { campos, contratacao } = camposDaDivida(v, hoje);
    try {
      return contratarDivida(d.fatos, contexto(), campos, contratacao);
    } catch (e) {
      if (!(e instanceof ErroDeDominio)) throw e;
      setErroDoCore(e.message);
      return null;
    }
  }

  async function continuar() {
    const novos = errosDaEtapa(etapa, v, hoje);
    setErros(novos);
    if (Object.keys(novos).length > 0) return;
    if (etapa === 'previa') {
      if (montado && (await executar(montado.comando))) onFechar();
      return;
    }
    // Das condições em diante a dívida já fecha: o core confere antes de seguir.
    if (k >= 2) {
      const comando = montar();
      if (!comando) return;
      setMontado({ comando, previa: previaDaDivida(d, comando) });
    }
    setK(k + 1);
  }

  const id = (campo: string) => `divida-${campo}`;
  const campos: Record<Etapa, ReactNode> = {
    contrato: (
      <>
        <Opcoes
          rotulo={m.tipo}
          valor={v.tipo}
          opcoes={mensagensDividas.tipo}
          aoMudar={(tipo) => {
            mudar({
              tipo,
              destino: tipo === 'financiamento' ? 'pago_a_terceiro' : 'creditado_em_conta',
            });
          }}
        />
        <Campo id={id('credor')} rotulo={m.credor} erro={erros.credor} dica={m.dicaCredor}>
          {(aria) => (
            <Input
              id={id('credor')}
              autoComplete="off"
              className="h-12"
              value={v.credor}
              onChange={(ev) => {
                mudar({ credor: ev.target.value });
              }}
              {...aria}
            />
          )}
        </Campo>
        <div className="grid gap-4 medium:grid-cols-2">
          <Campo id={id('valor')} rotulo={m.valorContratado} erro={erros.valorContratado}>
            {(aria) => (
              <CampoDeValor
                id={id('valor')}
                valor={v.valorContratado}
                aoMudar={(valorContratado) => {
                  mudar({ valorContratado });
                }}
                {...aria}
              />
            )}
          </Campo>
          <Campo id={id('data')} rotulo={m.dataContratacao} erro={erros.dataContratacao}>
            {(aria) => (
              <Input
                id={id('data')}
                type="date"
                className="h-12"
                max={hoje}
                value={v.dataContratacao}
                onChange={(ev) => {
                  mudar({ dataContratacao: ev.target.value });
                }}
                {...aria}
              />
            )}
          </Campo>
        </div>
      </>
    ),
    destino: (
      <>
        <Opcoes
          rotulo={m.destino}
          valor={v.destino}
          opcoes={mensagensDividas.destino}
          aoMudar={(destino) => {
            mudar({ destino });
          }}
        />
        <p role="note" className="rounded-md bg-surface-container px-4 py-3 text-body-md">
          {m.explicacao[v.destino]}
        </p>
        {v.destino === 'creditado_em_conta' ? (
          <>
            <div className="flex min-h-14 items-center justify-between gap-3 rounded-md bg-surface-container-low px-4">
              <div className="flex flex-col py-2">
                <Label htmlFor={id('entrada')} className="text-body-lg text-on-surface">
                  {m.registrarEntrada}
                </Label>
                <span
                  id={id('entrada-dica')}
                  className="text-label-md font-normal text-on-surface-variant"
                >
                  {m.dicaRegistrarEntrada}
                </span>
              </div>
              <Switch
                id={id('entrada')}
                aria-describedby={id('entrada-dica')}
                checked={entrada}
                onCheckedChange={(registrarEntrada) => {
                  mudar({ registrarEntrada });
                }}
              />
            </div>
            {entrada && (
              <Campo id={id('conta-credito')} rotulo={m.contaCredito} erro={erros.contaCreditoId}>
                {(aria) => (
                  <Seletor
                    id={id('conta-credito')}
                    valor={v.contaCreditoId}
                    opcoes={contas}
                    aoMudar={(contaCreditoId) => {
                      mudar({ contaCreditoId });
                    }}
                    aria={aria}
                  />
                )}
              </Campo>
            )}
          </>
        ) : (
          <Campo id={id('categoria')} rotulo={m.categoria} erro={erros.categoriaId}>
            {(aria) => (
              <Seletor
                id={id('categoria')}
                valor={v.categoriaId}
                opcoes={categorias}
                aoMudar={(categoriaId) => {
                  mudar({ categoriaId });
                }}
                aria={aria}
              />
            )}
          </Campo>
        )}
      </>
    ),
    condicoes: (
      <>
        <Opcoes
          rotulo={m.sistema}
          valor={v.sistema}
          opcoes={mensagensDividas.sistema}
          aoMudar={(sistema) => {
            mudar({ sistema });
          }}
        />
        <div className="grid gap-4 medium:grid-cols-2">
          {v.sistema === 'parcela_informada' ? (
            <Campo id={id('parcela')} rotulo={m.valorParcela} erro={erros.valorParcela}>
              {(aria) => (
                <CampoDeValor
                  id={id('parcela')}
                  valor={v.valorParcela}
                  aoMudar={(valorParcela) => {
                    mudar({ valorParcela });
                  }}
                  {...aria}
                />
              )}
            </Campo>
          ) : (
            <Campo id={id('taxa')} rotulo={m.taxa} erro={erros.taxa} dica={m.dicaTaxa}>
              {(aria) => (
                <Input
                  id={id('taxa')}
                  inputMode="decimal"
                  autoComplete="off"
                  className="h-12"
                  value={v.taxa}
                  onChange={(ev) => {
                    mudar({ taxa: ev.target.value.replace('.', ',') });
                  }}
                  {...aria}
                />
              )}
            </Campo>
          )}
          <Campo id={id('n')} rotulo={m.numeroParcelas} erro={erros.numeroParcelas}>
            {(aria) => (
              <Input
                id={id('n')}
                inputMode="numeric"
                autoComplete="off"
                maxLength={String(MAX_PARCELAS_DIVIDA).length}
                className="h-12"
                value={String(v.numeroParcelas || '')}
                onChange={(ev) => {
                  mudar({ numeroParcelas: Number(ev.target.value.replace(/\D/g, '')) });
                }}
                {...aria}
              />
            )}
          </Campo>
          <Campo
            id={id('primeira')}
            rotulo={m.dataPrimeiraParcela}
            erro={erros.dataPrimeiraParcela}
          >
            {(aria) => (
              <Input
                id={id('primeira')}
                type="date"
                className="h-12"
                value={v.dataPrimeiraParcela}
                onChange={(ev) => {
                  mudar({ dataPrimeiraParcela: ev.target.value });
                }}
                {...aria}
              />
            )}
          </Campo>
          <Campo id={id('conta-debito')} rotulo={m.contaDebito} erro={erros.contaDebitoId}>
            {(aria) => (
              <Seletor
                id={id('conta-debito')}
                valor={v.contaDebitoId}
                opcoes={contas}
                aoMudar={(contaDebitoId) => {
                  mudar({ contaDebitoId });
                }}
                aria={aria}
              />
            )}
          </Campo>
        </div>
      </>
    ),
    antes: (
      <Campo
        id={id('pagas')}
        rotulo={m.parcelasPagas}
        erro={erros.parcelasPagas}
        dica={m.dicaParcelasPagas(v.numeroParcelas)}
      >
        {(aria) => (
          <Input
            id={id('pagas')}
            inputMode="numeric"
            autoComplete="off"
            maxLength={String(MAX_PARCELAS_DIVIDA).length}
            className="h-12 w-32"
            value={String(v.parcelasPagas)}
            onChange={(ev) => {
              mudar({ parcelasPagas: Number(ev.target.value.replace(/\D/g, '')) });
            }}
            {...aria}
          />
        )}
      </Campo>
    ),
    previa: montado && <Previa previa={montado.previa} />,
  };

  return (
    <form
      noValidate
      className="flex flex-col gap-4.5"
      onSubmit={(ev) => {
        ev.preventDefault();
        void continuar();
      }}
    >
      <ol aria-label={m.etapas} className="flex flex-wrap gap-x-4 gap-y-1">
        {ETAPAS.map((x, i) => (
          <li
            key={x}
            aria-current={i === k ? 'step' : undefined}
            className={cn(
              'flex items-center gap-1.5 text-label-lg',
              i === k ? 'text-primary' : 'text-on-surface-variant',
            )}
          >
            <span
              aria-hidden
              className={cn(
                'flex size-6 items-center justify-center rounded-full text-label-md',
                i < k
                  ? 'bg-primary text-on-primary'
                  : i === k
                    ? 'bg-primary-container text-on-primary-container'
                    : 'bg-surface-container-high',
              )}
            >
              {i < k ? <Check className="size-3.5" /> : i + 1}
            </span>
            {m.nomes[x]}
          </li>
        ))}
      </ol>
      <h3 ref={titulo} tabIndex={-1} className="text-title-md focus-visible:outline-none">
        {m.etapa(k + 1, ETAPAS.length, m.nomes[etapa])}
      </h3>
      {campos[etapa]}

      {erroDoCore && (
        <p role="alert" className="text-body-md text-error">
          {erroDoCore}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="text" onClick={onFechar}>
          {mensagens.acoes.cancelar}
        </Button>
        {k > 0 && (
          <Button
            type="button"
            variant="outlined"
            disabled={salvando}
            onClick={() => {
              setErros({});
              setErroDoCore(null);
              setK(k - 1);
            }}
          >
            {m.voltar}
          </Button>
        )}
        {etapa === 'previa' ? (
          <BotaoSalvar salvando={salvando} className="px-6">
            {m.salvar}
          </BotaoSalvar>
        ) : (
          <Button type="submit" className="px-6">
            {m.continuar}
          </Button>
        )}
      </div>
    </form>
  );
}

/** "Nova dívida" (6.6): o stepper de 5 etapas, aberto por `?nova=1` na lista e no detalhe. */
export function NovaDivida({ d }: { d: Derivado }) {
  const [busca, setBusca] = useSearchParams();
  const fechar = () => {
    setBusca(
      (b) => {
        const x = new URLSearchParams(b);
        x.delete('nova');
        return x;
      },
      { replace: true },
    );
  };
  const aberto = busca.get('nova') === '1';
  return (
    <Dialog
      open={aberto}
      onOpenChange={(a) => {
        if (!a) fechar();
      }}
    >
      <DialogContent className="max-w-240">
        <DialogHeader>
          <DialogTitle>{m.titulo}</DialogTitle>
          <DialogDescription className="sr-only">{m.etapas}</DialogDescription>
        </DialogHeader>
        {aberto && <Etapas d={d} onFechar={fechar} />}
      </DialogContent>
    </Dialog>
  );
}
