import {
  amortizarDivida,
  type Amortizacao,
  type Centavos,
  centavos,
  type Comando,
  competenciaDe,
  type Contexto,
  type DataCivil,
  type Derivado,
  despesaDaParcela,
  ErroDeDominio,
  registrarPagamentoDeParcela,
  type TabelaDaDivida,
} from '@goose-money/core';
import { type ReactNode, useState } from 'react';

import { formatarData, formatarMesCurto, formatarMoeda } from '@/app/formatacao';
import { mensagens } from '@/app/mensagens';
import { BotaoSalvar } from '@/components/BotaoSalvar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { CampoDeValor } from '@/features/cartoes/CampoDeValor';
import { dataValida } from '@/features/cartoes/compra';
import { contasAtivas } from '@/features/lancar/padroes';
import { useComando, useContexto } from '@/queries/useComando';

import { mensagensDividas } from './mensagens';
import { Campo, Opcoes, Seletor } from './NovaDivida';
import { parcelaPadrao, parcelasEmAberto, previaDaAmortizacao } from './pagamentos';

const mp = mensagensDividas.pagamento;
const ma = mensagensDividas.amortizacao;
const erros = mensagensDividas.erros;

interface Props {
  d: Derivado;
  t: TabelaDaDivida;
  onFechar: () => void;
}

/** Grava o comando do core e só fecha se gravou (T03-04); a recusa do core vira alerta. */
function Formulario({
  rotulo,
  desabilitado,
  montar,
  onFechar,
  children,
}: {
  rotulo: string;
  desabilitado: boolean;
  montar: (ctx: Contexto) => Comando;
  onFechar: () => void;
  children: ReactNode;
}) {
  const { executar, salvando } = useComando();
  const contexto = useContexto();
  const [erro, setErro] = useState<string | null>(null);
  async function salvar() {
    let comando;
    try {
      comando = montar(contexto());
    } catch (e) {
      if (!(e instanceof ErroDeDominio)) throw e;
      setErro(e.message);
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
        void salvar();
      }}
    >
      {children}
      {erro && (
        <p role="alert" className="text-body-md text-error">
          {erro}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="text" onClick={onFechar}>
          {mensagens.acoes.cancelar}
        </Button>
        <BotaoSalvar salvando={salvando} disabled={desabilitado} className="px-6">
          {rotulo}
        </BotaoSalvar>
      </div>
    </form>
  );
}

/** Conta (padrão: a de débito da dívida), valor e data (padrão: hoje), com o erro de cada um. */
function useCamposComuns(d: Derivado, t: TabelaDaDivida, prefixo: string) {
  const contas = contasAtivas(d.fatos);
  const [contaId, setContaId] = useState(t.divida.contaDebitoId);
  const [data, setData] = useState<string>(d.hoje);
  const dia = dataValida(data);
  const erroDaData = !dia ? erros.data : dia > d.hoje ? erros.dataFutura : undefined;
  const conta = contas.find((c) => c.id === contaId);
  const campoConta = (
    <Campo id={`${prefixo}-conta`} rotulo={mp.conta} erro={undefined}>
      {(aria) => (
        <Seletor
          id={`${prefixo}-conta`}
          valor={contaId}
          aoMudar={setContaId}
          aria={aria}
          opcoes={contas.map((c) => ({
            id: c.id,
            nome: c.id === t.divida.contaDebitoId ? mp.padrao(c.nome) : c.nome,
          }))}
        />
      )}
    </Campo>
  );
  const campoData = (rotulo: string) => (
    <Campo id={`${prefixo}-data`} rotulo={rotulo} erro={erroDaData}>
      {(aria) => (
        <Input
          id={`${prefixo}-data`}
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
  );
  return { conta, contaId, dia: erroDaData ? null : dia, campoConta, campoData };
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

const categoriaDa = (d: Derivado, t: TabelaDaDivida) =>
  (t.divida.categoriaId && d.porId.categorias.get(t.divida.categoriaId)?.nome) ||
  mensagensDividas.detalhe.semCategoria;

/**
 * "Registrar pagamento" (3.7, 7.4; não desenhado): parcela (padrão: a escolhida na pendência,
 * senão a vencida mais antiga ou a próxima), conta, valor (o da parcela) e data (hoje).
 */
function RegistrarPagamento({ d, t, onFechar, escolhida }: Props & { escolhida: string | null }) {
  const abertas = parcelasEmAberto(t);
  const [parcelaId, setParcelaId] = useState(parcelaPadrao(t, escolhida)?.id ?? '');
  const [outro, setOutro] = useState<Centavos | null>(null);
  const { conta, contaId, dia, campoConta, campoData } = useCamposComuns(d, t, 'pagamento');
  const parcela = abertas.find((p) => p.id === parcelaId);
  const valor = outro ?? parcela?.valor ?? centavos(0);
  const mes = parcela ? formatarMesCurto(competenciaDe(parcela.vencimento)) : '';
  return (
    <Formulario
      rotulo={mensagens.acoes.registrarPagamento}
      desabilitado={!parcela || !conta || !dia || valor <= 0}
      onFechar={onFechar}
      montar={(ctx) =>
        registrarPagamentoDeParcela(d.fatos, ctx, parcelaId, {
          data: dia ?? d.hoje,
          valor,
          contaId,
        })
      }
    >
      <Campo id="pagamento-parcela" rotulo={mp.parcela} erro={undefined}>
        {(aria) => (
          <Seletor
            id="pagamento-parcela"
            valor={parcelaId}
            aoMudar={(id) => {
              setParcelaId(id);
              setOutro(null);
            }}
            aria={aria}
            opcoes={abertas.map((p) => ({
              id: p.id,
              nome: mp.opcao(
                p.numero,
                formatarData(p.vencimento),
                formatarMoeda(p.valor),
                p.status === 'vencida',
              ),
            }))}
          />
        )}
      </Campo>
      {campoConta}
      <div className="grid gap-4 medium:grid-cols-2">
        <Campo id="pagamento-valor" rotulo={mp.valor} erro={valor > 0 ? undefined : erros.valor}>
          {(aria) => (
            <CampoDeValor id="pagamento-valor" valor={valor} aoMudar={setOutro} {...aria} />
          )}
        </Campo>
        {campoData(mp.data)}
      </div>
      {parcela && conta && valor > 0 && (
        <Nota rotulo={mp.previa}>
          <p>{mp.sai(formatarMoeda(valor), conta.nome, parcela.numero)}</p>
          <p className="text-label-md font-normal text-on-surface-variant">
            {t.divida.destinoDoValor === 'creditado_em_conta'
              ? mp.naoEDespesa.creditado_em_conta(
                  formatarMoeda(despesaDaParcela(t.divida, parcela)),
                  mes,
                )
              : mp.naoEDespesa.pago_a_terceiro(
                  formatarMoeda(despesaDaParcela(t.divida, parcela)),
                  categoriaDa(d, t),
                  mes,
                )}
          </p>
        </Nota>
      )}
    </Formulario>
  );
}

/**
 * "Amortizar" (3.3, 3.7; não desenhado): valor, data, conta e modo, com a prévia do core
 * (`amortizarExtraordinario` pelo comando) antes de salvar.
 */
function Amortizar({ d, t, onFechar }: Props) {
  const contexto = useContexto();
  const [valor, setValor] = useState<Centavos>(centavos(0));
  const [modo, setModo] = useState<Amortizacao['modo']>('reduzirPrazo');
  const { conta, contaId, dia, campoConta, campoData } = useCamposComuns(d, t, 'amortizacao');
  const pedido = (data: NonNullable<typeof dia>) => ({ valor, data, modo, contaId });
  // A prévia monta o mesmo comando que vai ser gravado; a recusa do core é o valor alto demais.
  let previa = null;
  let recusado = false;
  if (dia && valor > 0)
    try {
      const comando = amortizarDivida(d.fatos, contexto(), t.divida.id, pedido(dia));
      previa = previaDaAmortizacao(d, t, comando, dia);
    } catch (e) {
      if (!(e instanceof ErroDeDominio)) throw e;
      recusado = true;
    }
  const quitacao = (x: DataCivil | null) => (x ? formatarMesCurto(competenciaDe(x)) : ma.nenhuma);
  const moeda = (x: { valor: Centavos } | null) => (x ? formatarMoeda(x.valor) : ma.nenhuma);
  return (
    <Formulario
      rotulo={ma.salvar}
      desabilitado={!previa || !conta}
      onFechar={onFechar}
      montar={(ctx) => amortizarDivida(d.fatos, ctx, t.divida.id, pedido(dia ?? d.hoje))}
    >
      <div className="grid gap-4 medium:grid-cols-2">
        <Campo id="amortizacao-valor" rotulo={ma.valor} erro={recusado ? ma.valorAlto : undefined}>
          {(aria) => (
            <CampoDeValor
              id="amortizacao-valor"
              autoFocus
              valor={valor}
              aoMudar={setValor}
              {...aria}
            />
          )}
        </Campo>
        {campoData(ma.data)}
      </div>
      {campoConta}
      <Opcoes rotulo={ma.modo} valor={modo} opcoes={ma.modos} aoMudar={setModo} />
      {previa && conta && dia && (
        <Nota rotulo={ma.previa}>
          <dl aria-label={ma.resumo} className="grid grid-cols-2 gap-3 py-1">
            {(
              [
                [ma.restantes, String(previa.antes.restantes), String(previa.depois.restantes)],
                [ma.parcela, moeda(previa.antes.parcela), moeda(previa.depois.parcela)],
                [
                  ma.saldo,
                  formatarMoeda(previa.antes.saldoDevedor),
                  formatarMoeda(previa.depois.saldoDevedor),
                ],
                [ma.quitacao, quitacao(previa.antes.quitacao), quitacao(previa.depois.quitacao)],
              ] as const
            ).map(([rotulo, antes, depois]) => (
              <div key={rotulo} className="flex flex-col gap-0.5">
                <dt className="text-label-md font-normal text-on-surface-variant">{rotulo}</dt>
                <dd className="font-semibold tabular-nums">{ma.dePara(antes, depois)}</dd>
              </div>
            ))}
          </dl>
          <p>{ma.sai(formatarMoeda(valor), conta.nome)}</p>
          <p className="text-label-md font-normal text-on-surface-variant">
            {t.divida.destinoDoValor === 'pago_a_terceiro'
              ? ma.comoConta.pago_a_terceiro(categoriaDa(d, t), formatarData(dia))
              : ma.comoConta.creditado_em_conta}
          </p>
        </Nota>
      )}
    </Formulario>
  );
}

/** Registrar pagamento e Amortizar (T05-24), abertos por `?acao=pagar` e `?acao=amortizar`. */
export function AcoesDaDivida({
  acao,
  escolhida,
  ...props
}: Props & { acao: 'pagar' | 'amortizar'; escolhida: string | null }) {
  const { titulo, explicacao } = acao === 'pagar' ? mp : ma;
  return (
    <Dialog
      open
      onOpenChange={(a) => {
        if (!a) props.onFechar();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{explicacao(props.t.divida.credor)}</DialogDescription>
        </DialogHeader>
        {acao === 'pagar' ? (
          <RegistrarPagamento {...props} escolhida={escolhida} />
        ) : (
          <Amortizar {...props} />
        )}
      </DialogContent>
    </Dialog>
  );
}
