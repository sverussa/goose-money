import {
  type Centavos,
  type Comando,
  type Competencia,
  confirmarOcorrencia,
  type Derivado,
  ErroDeDominio,
  faturaDoGastoNoCartao,
  menos,
  type NaturezaRecorrencia,
  type OcorrenciaDoMes,
  type Recorrencia,
} from '@goose-money/core';
import { type ReactNode, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { formatarMesCurto, formatarMoeda } from '@/app/formatacao';
import { mensagens } from '@/app/mensagens';
import { BotaoSalvar } from '@/components/BotaoSalvar';
import { StatusChip } from '@/components/StatusChip';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { CampoDeValor } from '@/features/cartoes/CampoDeValor';
import { dataValida } from '@/features/cartoes/compra';
import { Campo, Seletor } from '@/features/dividas/NovaDivida';
import { resolverZod } from '@/features/lancar/formulario';
import {
  cartoesAtivos,
  contasAtivas,
  lerUltimaConta,
  lerUltimoCartao,
  opcoesDeCategoria,
} from '@/features/lancar/padroes';
import { useComando, useContexto } from '@/queries/useComando';

import {
  mensagensRecorrencias,
  type TextosDaConfirmacao,
  type TextosDoFormulario,
} from './mensagens';
import {
  comandoDaRecorrencia,
  dataDaConfirmacao,
  esquemaDaRecorrencia,
  faturaDoFormulario,
  mesPorExtenso,
  opcoesAPartirDe,
  previaDaEdicao,
  type ValoresDaRecorrencia,
  valoresIniciais,
} from './recorrencias';

const f = mensagensRecorrencias.formulario;

function Dialogo({
  titulo,
  explicacao,
  onFechar,
  children,
}: {
  titulo: string;
  explicacao: string;
  onFechar: () => void;
  children: ReactNode;
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
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{explicacao}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

function Rodape({
  salvando,
  rotulo,
  desabilitado = false,
  onFechar,
}: {
  salvando: boolean;
  rotulo: string;
  desabilitado?: boolean;
  onFechar: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button type="button" variant="text" onClick={onFechar}>
        {mensagens.acoes.cancelar}
      </Button>
      <BotaoSalvar salvando={salvando} disabled={desabilitado} className="px-6">
        {rotulo}
      </BotaoSalvar>
    </div>
  );
}

function Nota({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div
      role="note"
      aria-label={rotulo}
      className="flex flex-col gap-1 rounded-md bg-surface-container-low px-4 py-3 text-body-md"
    >
      {children}
    </div>
  );
}

/**
 * "Confirmar recebimento", "Pagar" ou "Confirmar no cartão" (3.8, 6.7, 6.8): valor (o previsto) e
 * data (a prevista, até hoje) editáveis. No cartão, vira compra à vista na fatura do ciclo.
 */
export function ConfirmarOcorrencia({
  d,
  o,
  textos: mc,
  onFechar,
}: {
  d: Derivado;
  o: OcorrenciaDoMes;
  textos: TextosDaConfirmacao;
  onFechar: () => void;
}) {
  const { executar, salvando } = useComando();
  const contexto = useContexto();
  const [valor, setValor] = useState<Centavos>(o.valor);
  const [data, setData] = useState<string>(dataDaConfirmacao(o, d.hoje));
  const [erro, setErro] = useState<string | null>(null);
  const dia = dataValida(data);
  const erroData = !dia ? mc.dataInvalida : dia > d.hoje ? mc.dataFutura : undefined;
  const onde = o.contaId
    ? d.porId.contas.get(o.contaId)?.nome
    : o.cartaoId
      ? d.porId.cartoes.get(o.cartaoId)?.nome
      : undefined;
  const fatura =
    dia && o.cartaoId ? faturaDoGastoNoCartao(d.fatos, { cartaoId: o.cartaoId, data: dia }) : null;
  const diferenca = menos(valor, o.valor);

  async function salvar() {
    if (!dia || erroData || valor <= 0) return;
    let comando;
    try {
      comando = confirmarOcorrencia(d.fatos, contexto(), o.recorrenciaId, o.competencia, {
        valor,
        data: dia,
      });
    } catch (e) {
      if (!(e instanceof ErroDeDominio)) throw e;
      setErro(e.message);
      return;
    }
    if (await executar(comando)) onFechar();
  }

  return (
    <Dialogo
      titulo={mc.titulo}
      explicacao={mc.explicacao(o.recorrencia.descricao, mesPorExtenso(o.competencia))}
      onFechar={onFechar}
    >
      <form
        noValidate
        className="flex flex-col gap-4.5"
        onSubmit={(e) => {
          e.preventDefault();
          void salvar();
        }}
      >
        <div className="grid gap-4 medium:grid-cols-2">
          <Campo
            id="confirmar-valor"
            rotulo={mc.valor}
            erro={valor > 0 ? undefined : f.erros.valor}
          >
            {(aria) => (
              <CampoDeValor
                id="confirmar-valor"
                autoFocus
                valor={valor}
                aoMudar={setValor}
                {...aria}
              />
            )}
          </Campo>
          <Campo id="confirmar-data" rotulo={mc.data} erro={erroData}>
            {(aria) => (
              <Input
                id="confirmar-data"
                type="date"
                className="h-12"
                max={d.hoje}
                value={data}
                onChange={(e) => {
                  setData(e.target.value);
                }}
                {...aria}
              />
            )}
          </Campo>
        </div>
        {onde && valor > 0 && (
          <Nota rotulo={mc.previa}>
            <p>{mc.entra(formatarMoeda(valor), onde, fatura ? mesPorExtenso(fatura) : '')}</p>
            {diferenca !== 0 && (
              <p className="text-label-md font-normal text-on-surface-variant">
                {mc.diferenca(formatarMoeda(Math.abs(diferenca) as Centavos), diferenca > 0)}
              </p>
            )}
          </Nota>
        )}
        {erro && (
          <p role="alert" className="text-body-md text-error">
            {erro}
          </p>
        )}
        <Rodape
          salvando={salvando}
          rotulo={mc.titulo}
          desabilitado={!dia || !!erroData || valor <= 0}
          onFechar={onFechar}
        />
      </form>
    </Dialogo>
  );
}

function Historico({
  d,
  r,
  valores,
  aPartirDe,
}: {
  d: Derivado;
  r: Recorrencia;
  valores: ValoresDaRecorrencia;
  aPartirDe: Competencia;
}) {
  const contexto = useContexto();
  // A prévia monta o mesmo comando que vai ser gravado; recusado ou inválido, mostra o atual.
  const ok = esquemaDaRecorrencia.safeParse(valores).success;
  let comando: Comando | null = null;
  if (ok)
    try {
      comando = comandoDaRecorrencia(d.fatos, contexto(), r.natureza, valores, r);
    } catch (e) {
      if (!(e instanceof ErroDeDominio)) throw e;
    }
  const previa = previaDaEdicao(d.fatos, d.hoje, r, comando, aPartirDe);
  const mes = mesPorExtenso(aPartirDe);
  return (
    <>
      <Nota rotulo={f.aPartirDe}>
        <p>
          {f.vale(mes)}{' '}
          {previa.anterior &&
            f.continua(
              mesPorExtenso(previa.anterior.competencia),
              formatarMoeda(previa.anterior.valor),
            )}
        </p>
      </Nota>
      <section aria-labelledby={`${r.natureza}-historico`} className="flex flex-col gap-1">
        <h3 id={`${r.natureza}-historico`} className="pb-1 text-label-lg">
          {f.historico}
        </h3>
        <ul className="flex flex-col">
          {previa.historico.map((v, i) => (
            <li
              key={v.id}
              className="flex min-h-9 items-center justify-between gap-2 border-b border-surface-container-high text-body-md last:border-b-0"
            >
              <span className="flex items-center gap-1.5">
                {v.ate === null
                  ? f.desde(formatarMesCurto(v.de))
                  : f.intervalo(formatarMesCurto(v.de), formatarMesCurto(v.ate))}
                {v.id === previa.nova && <StatusChip estado="novo" rotulo={f.nova} />}
              </span>
              <span className={i === 0 ? 'font-semibold' : undefined}>
                {f.versao(formatarMoeda(v.valor), v.dia)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

/**
 * Nova ou editar renda ou gasto fixo (3.8, 6.7, 6.8). Editar pede "Aplicar a partir de" (padrão:
 * a primeira competência não confirmada) e mostra o histórico de versões com a que vai ser
 * gravada. Gasto escolhe a forma de pagamento; no cartão, diz em qual fatura o mês cai.
 */
export function FormularioRecorrencia({
  d,
  natureza,
  r,
  textos: t,
  onFechar,
}: {
  d: Derivado;
  natureza: NaturezaRecorrencia;
  r?: Recorrencia;
  textos: TextosDoFormulario;
  onFechar: () => void;
}) {
  const { executar, salvando } = useComando();
  const contexto = useContexto();
  const form = useForm<ValoresDaRecorrencia>({
    resolver: resolverZod(esquemaDaRecorrencia),
    defaultValues: valoresIniciais(
      d.fatos,
      d.hoje,
      { conta: lerUltimaConta(), cartao: lerUltimoCartao() },
      r,
    ),
  });
  const { control, register, handleSubmit, setError, formState } = form;
  const erros = formState.errors;
  const valores = useWatch({ control }) as ValoresDaRecorrencia;
  const id = (campo: string) => `${natureza}-${campo}`;
  const contas = contasAtivas(d.fatos);
  const cartoes = cartoesAtivos(d.fatos);
  const categorias = opcoesDeCategoria(d.fatos, natureza === 'renda' ? 'receita' : 'despesa');
  const opcoes = r ? opcoesAPartirDe(d.fatos, r) : [];
  const gasto = natureza === 'gasto';
  const noCartao = gasto && valores.formaPagamento === 'cartao';
  const fatura = noCartao ? faturaDoFormulario(d.fatos, valores) : null;

  async function salvar(v: ValoresDaRecorrencia) {
    let comando;
    try {
      comando = comandoDaRecorrencia(d.fatos, contexto(), natureza, v, r);
    } catch (e) {
      if (!(e instanceof ErroDeDominio)) throw e;
      setError('root', { message: e.message });
      return;
    }
    if (comando.mudancas.length === 0 || (await executar(comando))) onFechar();
  }

  const seletor = (
    nome: 'formaPagamento' | 'contaId' | 'cartaoId' | 'categoriaId' | 'aPartirDe',
    campo: string,
    rotulo: string,
    lista: { id: string; nome: string }[],
  ) => (
    <Campo id={id(campo)} rotulo={rotulo} erro={erros[nome]?.message}>
      {(aria) => (
        <Controller
          name={nome}
          control={control}
          render={({ field }) => (
            <Seletor
              id={id(campo)}
              valor={field.value}
              aoMudar={field.onChange}
              aria={aria}
              opcoes={lista}
            />
          )}
        />
      )}
    </Campo>
  );

  return (
    <Dialogo
      titulo={r ? t.tituloEditar(r.descricao) : t.tituloNova}
      explicacao={t.explicacao}
      onFechar={onFechar}
    >
      <form
        noValidate
        className="flex flex-col gap-4.5"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit(salvar)();
        }}
      >
        {r &&
          seletor(
            'aPartirDe',
            'a-partir-de',
            t.aPartirDe,
            opcoes.map((c, i) => ({ id: c, nome: t.opcao(mesPorExtenso(c), i === 0) })),
          )}
        <Campo id={id('descricao')} rotulo={t.descricao} erro={erros.descricao?.message}>
          {(aria) => (
            <Input
              id={id('descricao')}
              autoComplete="off"
              className="h-12"
              {...aria}
              {...register('descricao')}
            />
          )}
        </Campo>
        <div className="grid gap-4 medium:grid-cols-2">
          <Campo id={id('valor')} rotulo={t.valor} erro={erros.valor?.message}>
            {(aria) => (
              <Controller
                name="valor"
                control={control}
                render={({ field }) => (
                  <CampoDeValor
                    id={id('valor')}
                    valor={field.value}
                    aoMudar={field.onChange}
                    {...aria}
                  />
                )}
              />
            )}
          </Campo>
          <Campo id={id('dia')} rotulo={t.dia} erro={erros.dia?.message}>
            {(aria) => (
              <Input
                id={id('dia')}
                type="number"
                inputMode="numeric"
                min={1}
                max={31}
                className="h-12"
                {...aria}
                {...register('dia', { valueAsNumber: true })}
              />
            )}
          </Campo>
        </div>
        {gasto && (
          <div className="grid gap-4 medium:grid-cols-2">
            {seletor('formaPagamento', 'forma', t.forma, [
              { id: 'conta', nome: t.formas.conta },
              { id: 'cartao', nome: t.formas.cartao },
            ])}
            {noCartao
              ? seletor(
                  'cartaoId',
                  'cartao',
                  t.cartao,
                  cartoes.map((c) => ({ id: c.id, nome: c.nome })),
                )
              : seletor(
                  'contaId',
                  'conta',
                  t.conta,
                  contas.map((c) => ({ id: c.id, nome: c.nome })),
                )}
          </div>
        )}
        {fatura && (
          <Nota rotulo={t.notaFatura}>
            <p>{t.fatura(mesPorExtenso(fatura.mes), mesPorExtenso(fatura.fatura))}</p>
          </Nota>
        )}
        <div className="grid gap-4 medium:grid-cols-2">
          {!gasto &&
            seletor(
              'contaId',
              'conta',
              t.conta,
              contas.map((c) => ({ id: c.id, nome: c.nome })),
            )}
          {seletor('categoriaId', 'categoria', t.categoria, categorias)}
        </div>
        <div className="grid gap-4 medium:grid-cols-2">
          <Campo
            id={id('inicio')}
            rotulo={t.inicio}
            erro={erros.inicio?.message}
            dica={r ? t.dicaInicio : undefined}
          >
            {(aria) => (
              <Input
                id={id('inicio')}
                type="month"
                className="h-12"
                disabled={r !== undefined}
                {...aria}
                {...register('inicio')}
              />
            )}
          </Campo>
          <Campo id={id('fim')} rotulo={t.fim} erro={erros.fim?.message}>
            {(aria) => (
              <Input id={id('fim')} type="month" className="h-12" {...aria} {...register('fim')} />
            )}
          </Campo>
        </div>
        <Controller
          name="autoConfirmar"
          control={control}
          render={({ field }) => (
            <div className="flex items-center justify-between gap-4">
              <span className="flex flex-col gap-0.5">
                <label htmlFor={id('automatica')} className="text-body-lg">
                  {t.automatica}
                </label>
                <span
                  id={id('automatica-dica')}
                  className="text-label-md font-normal text-on-surface-variant"
                >
                  {t.dicaAutomatica}
                </span>
              </span>
              <Switch
                id={id('automatica')}
                checked={field.value}
                onCheckedChange={field.onChange}
                aria-describedby={id('automatica-dica')}
              />
            </div>
          )}
        />
        {r && valores.aPartirDe && (
          <Historico d={d} r={r} valores={valores} aPartirDe={valores.aPartirDe as Competencia} />
        )}
        {erros.root && (
          <p role="alert" className="text-body-md text-error">
            {erros.root.message}
          </p>
        )}
        <Rodape salvando={salvando} rotulo={r ? t.salvarNova : t.criar} onFechar={onFechar} />
      </form>
    </Dialogo>
  );
}
