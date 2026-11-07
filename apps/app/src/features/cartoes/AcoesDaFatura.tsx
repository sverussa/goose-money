import {
  aplicar,
  type Cartao,
  type Categoria,
  type Comando,
  type Centavos,
  centavos,
  configurarCiclo,
  type Competencia,
  type Contexto,
  datasDaFatura,
  type Derivado,
  ErroDeDominio,
  faturaDaCompra,
  lancarEncargoOuEstorno,
  pagarFatura,
  previaDoPagamento,
  primeiraFaturaNaoFechada,
} from '@goose-money/core';
import { Check } from 'lucide-react';
import { useState } from 'react';

import { formatarData, formatarMesCurto, formatarMoeda } from '@/app/formatacao';
import { mensagens } from '@/app/mensagens';
import { BotaoSalvar } from '@/components/BotaoSalvar';
import { chipDaFatura, chips } from '@/components/estados';
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  aClassificar,
  contasAtivas,
  destinoPadrao,
  faturasParaPagar,
  opcoesDeCategoria,
} from '@/features/lancar/padroes';
import { useComando, useContexto } from '@/queries/useComando';

import type { AcaoDaFatura } from './acoes';
import { CampoDeValor } from './CampoDeValor';
import { dataValida } from './compra';
import { cicloAtual } from './formulario';
import { mensagensCartoes } from './mensagens';

const m = mensagensCartoes.acoesDaFatura;

interface Props {
  d: Derivado;
  cartao: Cartao;
  onFechar: () => void;
  /** "Lançar juros" do rotativo: a véspera do fechamento da fatura que recebeu o saldo. */
  dataSugerida?: string | null;
}

/** O formulário de cada diálogo: grava o comando do core e só fecha se gravou (T03-04). */
function Formulario({
  rotulo,
  desabilitado,
  montar,
  onFechar,
  children,
}: {
  rotulo: string;
  desabilitado?: boolean;
  montar: (ctx: Contexto) => Comando;
  onFechar: () => void;
  children: React.ReactNode;
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

function Campo({
  id,
  rotulo,
  children,
}: {
  id: string;
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id}>{rotulo}</Label>
      {children}
    </div>
  );
}

function Lista({
  id,
  valor,
  aoMudar,
  opcoes,
}: {
  id: string;
  valor: string;
  aoMudar: (v: string) => void;
  opcoes: readonly { valor: string; rotulo: string }[];
}) {
  return (
    <Select value={valor} onValueChange={aoMudar}>
      <SelectTrigger id={id} className="h-12">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {opcoes.map((o) => (
          <SelectItem key={o.valor} value={o.valor}>
            {o.rotulo}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Data({ id, valor, aoMudar }: { id: string; valor: string; aoMudar: (d: string) => void }) {
  return (
    <Input
      id={id}
      type="date"
      className="h-12"
      value={valor}
      onChange={(e) => {
        aoMudar(e.target.value);
      }}
    />
  );
}

/** "Pagar fatura" (3.5, 6.5, painel do CartaoFatura.dc.html), com o que acontece antes de salvar. */
function PagarFatura({ d, cartao, onFechar }: Props) {
  const contas = contasAtivas(d.fatos);
  const faturas = faturasParaPagar(d, cartao.id);
  const [contaId, setContaId] = useState(cartao.contaPagamentoId);
  const [destino, setDestino] = useState<string>(destinoPadrao(d, cartao.id) ?? '');
  const [modo, setModo] = useState<'total' | 'outro'>('total');
  const [outro, setOutro] = useState<Centavos>(centavos(0));
  const [data, setData] = useState<string>(d.hoje);
  const fatura = faturas.find((f) => f.competencia === destino);
  const temSaldo = !!fatura && fatura.saldo > 0;
  const total = modo === 'total' && temSaldo;
  const valor = total ? fatura.saldo : outro;
  const previa = fatura && valor > 0 ? previaDoPagamento(faturas, fatura.competencia, valor) : null;
  const conta = contas.find((c) => c.id === contaId);
  const dia = dataValida(data);
  const mes = fatura ? formatarMesCurto(fatura.competencia) : '';
  return (
    <Formulario
      rotulo={mensagens.acoes.registrarPagamento}
      desabilitado={!previa || !dia || !conta}
      onFechar={onFechar}
      montar={(ctx) =>
        pagarFatura(d.fatos, ctx, {
          cartaoId: cartao.id,
          valor,
          data: dia ?? d.hoje,
          contaId,
          faturaCompetencia: destino as Competencia,
        })
      }
    >
      <Campo id="pagar-conta" rotulo={m.pagar.conta}>
        <Lista
          id="pagar-conta"
          valor={contaId}
          aoMudar={setContaId}
          opcoes={contas.map((c) => ({
            valor: c.id,
            rotulo: c.id === cartao.contaPagamentoId ? m.pagar.padrao(c.nome) : c.nome,
          }))}
        />
      </Campo>
      <Campo id="pagar-destino" rotulo={m.pagar.destino}>
        <Lista
          id="pagar-destino"
          valor={destino}
          aoMudar={setDestino}
          opcoes={faturas.map((f) => ({
            valor: f.competencia,
            rotulo:
              f.status === 'aberta'
                ? m.pagar.opcaoAberta(formatarMesCurto(f.competencia), formatarMoeda(f.saldo))
                : m.pagar.opcao(
                    formatarMesCurto(f.competencia),
                    chips[chipDaFatura[f.status]].rotulo.toLocaleLowerCase('pt-BR'),
                    formatarMoeda(f.saldo),
                  ),
          }))}
        />
      </Campo>
      <ToggleGroup
        type="single"
        aria-label={m.pagar.valor}
        value={total ? 'total' : 'outro'}
        onValueChange={(x) => {
          if (x) setModo(x as typeof modo);
        }}
      >
        <ToggleGroupItem value="total" disabled={!temSaldo}>
          {total && <Check aria-hidden />}
          {m.pagar.saldoTotal}
        </ToggleGroupItem>
        <ToggleGroupItem value="outro">
          {!total && <Check aria-hidden />}
          {m.pagar.outroValor}
        </ToggleGroupItem>
      </ToggleGroup>
      <div className="grid gap-4 medium:grid-cols-2">
        {!total && (
          <Campo id="pagar-valor" rotulo={m.pagar.valor}>
            <CampoDeValor id="pagar-valor" autoFocus valor={outro} aoMudar={setOutro} />
          </Campo>
        )}
        <Campo id="pagar-data" rotulo={m.pagar.data}>
          <Data id="pagar-data" valor={data} aoMudar={setData} />
        </Campo>
      </div>
      {previa && conta && (
        <div
          role="note"
          aria-label={m.pagar.previa}
          className="flex flex-col gap-1 rounded-md bg-surface-container-low px-4 py-3 text-body-md"
        >
          <p>
            {m.pagar.sai(formatarMoeda(valor), conta.nome)}{' '}
            {previa.credito > 0
              ? m.pagar.credito(mes, formatarMoeda(previa.credito))
              : previa.saldoRestante > 0
                ? m.pagar.resta(formatarMoeda(previa.saldoRestante), mes)
                : m.pagar.quita(mes)}
          </p>
          <p className="text-label-md font-normal text-on-surface-variant">{m.pagar.naoEDespesa}</p>
        </div>
      )}
    </Formulario>
  );
}

const TIPOS_DE_ENCARGO = ['juros', 'multa', 'anuidade', 'estorno'] as const;
type TipoDeEncargo = (typeof TIPOS_DE_ENCARGO)[number];

const doSistema = (cs: readonly Categoria[], s: Categoria['sistema']) =>
  cs.find((c) => c.sistema === s)?.id ?? '';

/** "Lançar encargo ou estorno" (3.5, 6.5; não desenhado): item na fatura da data. */
function EncargoOuEstorno({ d, cartao, onFechar, dataSugerida }: Props) {
  const juros = doSistema(d.fatos.categorias, 'juros_encargos');
  const tarifas = doSistema(d.fatos.categorias, 'tarifas');
  const [tipo, setTipo] = useState<TipoDeEncargo>('juros');
  const [valor, setValor] = useState<Centavos>(centavos(0));
  const [data, setData] = useState<string>(dataValida(dataSugerida ?? '') ?? d.hoje);
  const [descricao, setDescricao] = useState('');
  const [categoriaEncargo, setCategoriaEncargo] = useState<string | null>(null);
  const [compraId, setCompraId] = useState('');
  const [categoriaEstornada, setCategoriaEstornada] = useState(aClassificar(d.fatos) ?? '');
  const estorno = tipo === 'estorno';
  // Juros e multa caem em "Juros e encargos"; anuidade, em "Tarifas" (a pessoa pode trocar).
  const categoria = categoriaEncargo ?? (tipo === 'anuidade' ? tarifas : juros);
  const dia = dataValida(data);
  const compras = d.fatos.compras
    .filter((c) => c.cartaoId === cartao.id)
    .sort((a, b) => (a.data < b.data ? 1 : -1));
  return (
    <Formulario
      rotulo={m.encargo.salvar}
      desabilitado={valor <= 0 || !dia}
      onFechar={onFechar}
      montar={(ctx) =>
        lancarEncargoOuEstorno(d.fatos, ctx, {
          tipo: estorno ? 'estorno' : 'encargo',
          cartaoId: cartao.id,
          valor,
          data: dia ?? d.hoje,
          descricao: descricao.trim() || (estorno ? null : m.encargo.tipos[tipo]),
          compraId: estorno && compraId ? compraId : null,
          categoriaId: estorno ? (compraId ? null : categoriaEstornada || null) : categoria,
        })
      }
    >
      <ToggleGroup
        type="single"
        aria-label={m.encargo.tipo}
        value={tipo}
        onValueChange={(t) => {
          if (!t) return;
          setTipo(t as TipoDeEncargo);
          setCategoriaEncargo(null);
        }}
      >
        {TIPOS_DE_ENCARGO.map((t) => (
          <ToggleGroupItem key={t} value={t}>
            {tipo === t && <Check aria-hidden />}
            {m.encargo.tipos[t]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="grid gap-4 medium:grid-cols-2">
        <Campo id="encargo-valor" rotulo={m.encargo.valor}>
          <CampoDeValor id="encargo-valor" autoFocus valor={valor} aoMudar={setValor} />
        </Campo>
        <Campo id="encargo-data" rotulo={m.encargo.data}>
          <Data id="encargo-data" valor={data} aoMudar={setData} />
        </Campo>
      </div>
      <Campo id="encargo-descricao" rotulo={m.encargo.descricao}>
        <Input
          id="encargo-descricao"
          className="h-12"
          autoComplete="off"
          placeholder={estorno ? undefined : m.encargo.tipos[tipo]}
          value={descricao}
          onChange={(e) => {
            setDescricao(e.target.value);
          }}
        />
      </Campo>
      {estorno ? (
        <div className="grid gap-4 medium:grid-cols-2">
          <Campo id="encargo-compra" rotulo={m.encargo.compra}>
            <Lista
              id="encargo-compra"
              valor={compraId || 'nenhuma'}
              aoMudar={(x) => {
                setCompraId(x === 'nenhuma' ? '' : x);
              }}
              opcoes={[
                { valor: 'nenhuma', rotulo: m.encargo.semCompra },
                ...compras.map((c) => ({
                  valor: c.id,
                  rotulo: m.encargo.opcaoCompra(
                    c.descricao ?? mensagensCartoes.fatura.compra,
                    formatarData(c.data),
                    formatarMoeda(c.valorTotal),
                  ),
                })),
              ]}
            />
          </Campo>
          {!compraId && (
            <Campo id="encargo-categoria" rotulo={m.encargo.categoriaEstornada}>
              <Lista
                id="encargo-categoria"
                valor={categoriaEstornada}
                aoMudar={setCategoriaEstornada}
                opcoes={opcoesDeCategoria(d.fatos, 'despesa').map((c) => ({
                  valor: c.id,
                  rotulo: c.nome,
                }))}
              />
            </Campo>
          )}
        </div>
      ) : (
        <Campo id="encargo-categoria" rotulo={m.encargo.categoria}>
          <Lista
            id="encargo-categoria"
            valor={categoria}
            aoMudar={setCategoriaEncargo}
            opcoes={d.fatos.categorias
              .filter((c) => c.id === juros || c.id === tarifas)
              .map((c) => ({ valor: c.id, rotulo: c.nome }))}
          />
        </Campo>
      )}
      {dia && (
        <p className="text-body-md text-on-surface-variant">
          {m.encargo.caiNa(formatarMesCurto(faturaDaCompra(cartao, d.fatos.cartaoCiclos, dia)))}
        </p>
      )}
    </Formulario>
  );
}

const diaOk = (n: number) => Number.isInteger(n) && n >= 1 && n <= 31;

/** "Configurar ciclo" (3.5, 6.5; não desenhado): a partir de qual fatura os novos dias valem. */
function ConfigurarCiclo({ d, cartao, onFechar }: Props) {
  const contexto = useContexto();
  const atual = cicloAtual(d, cartao);
  const [fecha, setFecha] = useState(String(atual.diaFechamento));
  const [vence, setVence] = useState(String(atual.diaVencimento));
  const f = Number(fecha);
  const v = Number(vence);
  const ok = diaOk(f) && diaOk(v);
  const mudou = f !== atual.diaFechamento || v !== atual.diaVencimento;
  const primeira = primeiraFaturaNaoFechada(cartao, d.fatos.cartaoCiclos, d.hoje);
  // As datas da primeira fatura com os dias novos: o core aplica o comando sobre os fatos.
  let datas = null;
  if (ok && mudou)
    try {
      const ciclos = aplicar(
        d.fatos,
        configurarCiclo(d.fatos, contexto(), cartao.id, f, v).mudancas,
      ).cartaoCiclos;
      datas = datasDaFatura(cartao, ciclos, primeira);
    } catch (e) {
      if (!(e instanceof ErroDeDominio)) throw e;
    }
  const dia = (id: string, rotulo: string, valor: string, aoMudar: (s: string) => void) => (
    <Campo id={id} rotulo={rotulo}>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={1}
        max={31}
        className="h-12"
        aria-invalid={!diaOk(Number(valor)) || undefined}
        value={valor}
        onChange={(e) => {
          aoMudar(e.target.value);
        }}
      />
    </Campo>
  );
  return (
    <Formulario
      rotulo={mensagens.acoes.salvar}
      desabilitado={!ok || !mudou}
      onFechar={onFechar}
      montar={(ctx) => configurarCiclo(d.fatos, ctx, cartao.id, f, v)}
    >
      <div className="grid gap-4 medium:grid-cols-2">
        {dia('ciclo-fechamento', m.ciclo.fechamento, fecha, setFecha)}
        {dia('ciclo-vencimento', m.ciclo.vencimento, vence, setVence)}
      </div>
      {!ok && <p className="text-label-md text-error">{mensagensCartoes.formulario.erros.dia}</p>}
      <div
        role="note"
        aria-label={m.ciclo.previa}
        className="flex flex-col gap-1 rounded-md bg-surface-container-low px-4 py-3 text-body-md"
      >
        <p>
          {datas
            ? m.ciclo.valeA(
                formatarMesCurto(primeira),
                formatarData(datas.fechamento),
                formatarData(datas.vencimento),
              )
            : m.ciclo.aPartir(formatarMesCurto(primeira))}
        </p>
        <p className="text-label-md font-normal text-on-surface-variant">{m.ciclo.aviso}</p>
      </div>
    </Formulario>
  );
}

const DIALOGOS = {
  pagar: { titulo: m.pagar.titulo, explicacao: m.pagar.explicacao, Corpo: PagarFatura },
  encargo: { titulo: m.encargo.titulo, explicacao: m.encargo.explicacao, Corpo: EncargoOuEstorno },
  ciclo: { titulo: m.ciclo.titulo, explicacao: m.ciclo.explicacao, Corpo: ConfigurarCiclo },
} as const;

/** Pagar fatura, Lançar encargo ou estorno e Configurar ciclo (T05-15), abertos pela URL. */
export function AcoesDaFatura({
  d,
  cartao,
  acao,
  onFechar,
  dataSugerida,
}: Props & { acao: AcaoDaFatura | null }) {
  if (acao !== 'pagar' && acao !== 'encargo' && acao !== 'ciclo') return null;
  const { titulo, explicacao, Corpo } = DIALOGOS[acao];
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
          <DialogDescription>{explicacao(cartao.nome)}</DialogDescription>
        </DialogHeader>
        <Corpo d={d} cartao={cartao} onFechar={onFechar} dataSugerida={dataSugerida} />
      </DialogContent>
    </Dialog>
  );
}
