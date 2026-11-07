import {
  anteciparParcelas,
  anteciparParcelasDaCompra,
  cancelarCompra,
  cancelarCompraDoCartao,
  type Cartao,
  type Centavos,
  centavos,
  type Comando,
  type Compra,
  type Derivado,
  editarCompra,
  ErroDeDominio,
  excluirCompra,
  faturaAberta,
  lancarAjusteDeCompra,
  mais,
  negar,
  operacoesPermitidas,
  type ParcelaCompra,
  somar,
} from '@goose-money/core';
import { Check, EllipsisVertical } from 'lucide-react';
import { useRef, useState } from 'react';

import { formatarMesCurto, formatarMoeda } from '@/app/formatacao';
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
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { opcoesDeCategoria } from '@/features/lancar/padroes';
import { useComando, useContexto } from '@/queries/useComando';

import { type AcaoDaFatura, OPERACOES_DA_COMPRA, type OperacaoDaFatura } from './acoes';
import { CampoDeValor } from './CampoDeValor';
import { valorEfetivo } from './compra';
import { ItemDoMenu } from './menu';
import { mensagensCartoes } from './mensagens';
import { NovaCompra } from './NovaCompra';

const m = mensagensCartoes.operacoes;
const nomeDa = (c: Compra) => c.descricao ?? mensagensCartoes.fatura.compra;

/** A compra, as parcelas e a fatura aberta do cartão hoje (3.6). */
function daCompra(d: Derivado, cartao: Cartao, compra: Compra) {
  const parcelas = d.fatos.parcelas.filter((p) => p.compraId === compra.id);
  const aberta = faturaAberta(cartao, d.fatos.cartaoCiclos, d.hoje);
  return { parcelas, aberta, pode: operacoesPermitidas(compra, parcelas, aberta) };
}

/**
 * Menu de uma compra (3.6, 6.5): as operações da tabela, habilitadas ou com o motivo do core.
 * Aberto pela URL (`?acao=compra&compra=<id>`); cada item abre o diálogo dele depois que o menu
 * fecha e devolve o foco ao botão (como no menu do cartão, T05-11).
 */
export function MenuDaCompra({
  d,
  cartao,
  compra,
  rotulo,
  aberto,
  abrir,
  fechar,
}: {
  d: Derivado;
  cartao: Cartao;
  compra: Compra;
  rotulo: string;
  aberto: boolean;
  abrir: (acao: AcaoDaFatura, compraId?: string) => void;
  fechar: () => void;
}) {
  const proxima = useRef<OperacaoDaFatura | null>(null);
  // Escolhido um item, o menu fecha antes de a URL trocar para o diálogo (`onCloseAutoFocus`).
  const [fechando, setFechando] = useState(false);
  const { parcelas, aberta, pode } = daCompra(d, cartao, compra);
  const futuras = parcelas.filter((p) => p.competencia > aberta).length;
  const item = (
    acao: OperacaoDaFatura,
    rotuloItem: string,
    detalhe: string,
    op: keyof typeof pode,
  ) => (
    <ItemDoMenu
      rotulo={rotuloItem}
      detalhe={detalhe}
      permissao={pode[op]}
      aoEscolher={() => {
        proxima.current = acao;
      }}
    />
  );
  return (
    <DropdownMenu
      open={aberto && !fechando}
      onOpenChange={(a) => {
        if (a) {
          setFechando(false);
          abrir('compra', compra.id);
        } else if (proxima.current) setFechando(true);
        else fechar();
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button variant="icon" aria-label={rotulo}>
          <EllipsisVertical aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        aria-label={rotulo}
        onCloseAutoFocus={() => {
          const acao = proxima.current;
          proxima.current = null;
          if (acao) abrir(acao, compra.id);
        }}
      >
        {item(
          'editar-compra',
          m.menu.editarDescricao,
          m.menu.detalheEditarDescricao,
          'editarDescricao',
        )}
        {item('editar-valor', m.menu.editarValor, m.menu.detalheEditarValor, 'editarValor')}
        {item('ajuste', m.menu.ajuste, m.menu.detalheAjuste, 'lancarAjuste')}
        {item('antecipar', m.menu.antecipar, m.menu.detalheAntecipar(futuras), 'anteciparParcelas')}
        {item('cancelar-compra', m.menu.cancelar, m.menu.detalheCancelar, 'cancelar')}
        {item('excluir-compra', m.menu.excluir, m.menu.detalheExcluir, 'excluir')}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Grava o comando montado; a recusa do core aparece no diálogo, que só fecha se gravou. */
function useGravar(onFechar: () => void) {
  const { executar, salvando } = useComando();
  const contexto = useContexto();
  const [erro, setErro] = useState<string | null>(null);
  const gravar = async (montar: (ctx: ReturnType<typeof contexto>) => Comando) => {
    let comando;
    try {
      comando = montar(contexto());
    } catch (e) {
      if (!(e instanceof ErroDeDominio || e instanceof RangeError)) throw e;
      setErro(e.message);
      return;
    }
    if (await executar(comando)) onFechar();
  };
  return { gravar, salvando, erro };
}

function Rodape({
  salvando,
  rotulo,
  erro,
  onFechar,
  desabilitado,
  destrutivo,
}: {
  salvando: boolean;
  rotulo: string;
  erro: string | null;
  onFechar: () => void;
  desabilitado?: boolean;
  destrutivo?: boolean;
}) {
  return (
    <>
      {erro && (
        <p role="alert" className="text-body-md text-error">
          {erro}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="text" onClick={onFechar}>
          {destrutivo ? m.voltar : mensagens.acoes.cancelar}
        </Button>
        <BotaoSalvar
          salvando={salvando}
          disabled={desabilitado}
          className={destrutivo ? 'bg-error px-6 text-on-error' : 'px-6'}
        >
          {rotulo}
        </BotaoSalvar>
      </div>
    </>
  );
}

const enviar = (f: () => Promise<void>) => (e: React.SyntheticEvent) => {
  e.preventDefault();
  void f();
};

function EditarDescricao({ d, compra, onFechar }: Props) {
  const { gravar, salvando, erro } = useGravar(onFechar);
  const categorias = opcoesDeCategoria(d.fatos, 'despesa');
  const [descricao, setDescricao] = useState(compra.descricao ?? '');
  const [categoriaId, setCategoriaId] = useState(compra.categoriaId);
  const [observacao, setObservacao] = useState(compra.observacao ?? '');
  return (
    <form
      noValidate
      className="flex flex-col gap-4.5"
      onSubmit={enviar(() =>
        gravar((ctx) =>
          editarCompra(d.fatos, ctx, compra.id, {
            descricao: descricao.trim() || null,
            categoriaId,
            observacao: observacao.trim() || null,
          }),
        ),
      )}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="op-descricao">{mensagensCartoes.compra.descricao}</Label>
        <Input
          id="op-descricao"
          className="h-12"
          autoComplete="off"
          value={descricao}
          onChange={(e) => {
            setDescricao(e.target.value);
          }}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="op-categoria">{mensagensCartoes.compra.categoria}</Label>
        <Select value={categoriaId} onValueChange={setCategoriaId}>
          <SelectTrigger id="op-categoria" className="h-12">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categorias.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="op-observacao">{m.editar.observacao}</Label>
        <Textarea
          id="op-observacao"
          value={observacao}
          onChange={(e) => {
            setObservacao(e.target.value);
          }}
        />
      </div>
      <Rodape salvando={salvando} rotulo={mensagens.acoes.salvar} erro={erro} onFechar={onFechar} />
    </form>
  );
}

function LancarAjuste({ d, compra, onFechar }: Props) {
  const { gravar, salvando, erro } = useGravar(onFechar);
  const [tipo, setTipo] = useState<'encargo' | 'estorno'>('estorno');
  const [valor, setValor] = useState<Centavos>(centavos(0));
  const [descricao, setDescricao] = useState('');
  const comSinal = tipo === 'estorno' ? negar(valor) : valor;
  const atual = valorEfetivo(d.fatos, compra);
  return (
    <form
      noValidate
      className="flex flex-col gap-4.5"
      onSubmit={enviar(() =>
        gravar((ctx) =>
          lancarAjusteDeCompra(d.fatos, ctx, compra.id, comSinal, descricao.trim() || null),
        ),
      )}
    >
      <ToggleGroup
        type="single"
        aria-label={m.ajuste.tipo}
        value={tipo}
        onValueChange={(t) => {
          if (t) setTipo(t as typeof tipo);
        }}
      >
        {(['estorno', 'encargo'] as const).map((t) => (
          <ToggleGroupItem key={t} value={t}>
            {tipo === t && <Check aria-hidden />}
            {m.ajuste[t]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="grid gap-4 medium:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="op-valor">{m.ajuste.valor}</Label>
          <CampoDeValor id="op-valor" autoFocus valor={valor} aoMudar={setValor} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="op-descricao">{mensagensCartoes.compra.descricao}</Label>
          <Input
            id="op-descricao"
            className="h-12"
            autoComplete="off"
            value={descricao}
            onChange={(e) => {
              setDescricao(e.target.value);
            }}
          />
        </div>
      </div>
      <dl
        aria-label={m.ajuste.efetivo}
        className="grid grid-cols-2 gap-3 rounded-md bg-surface-container-low px-4 py-3"
      >
        <div className="flex flex-col">
          <dt className="text-label-md font-normal text-on-surface-variant">
            {m.ajuste.valorDaCompra}
          </dt>
          <dd className="text-title-md">
            <MoneyText valor={atual} />
          </dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-label-md font-normal text-on-surface-variant">{m.ajuste.efetivo}</dt>
          <dd className="text-title-md">
            <MoneyText valor={mais(atual, comSinal)} />
          </dd>
        </div>
      </dl>
      <Rodape
        salvando={salvando}
        rotulo={m.menu.ajuste}
        erro={erro}
        onFechar={onFechar}
        desabilitado={valor <= 0}
      />
    </form>
  );
}

function ListaDeParcelas({
  titulo,
  parcelas,
}: {
  titulo: string;
  parcelas: readonly ParcelaCompra[];
}) {
  const ordem = [...parcelas].sort((a, b) => a.numero - b.numero);
  return (
    <section aria-label={titulo} className="flex min-w-0 flex-1 flex-col gap-1">
      <h3 className="text-label-lg text-on-surface-variant">{titulo}</h3>
      <ul className="flex flex-col">
        {ordem.map((p) => (
          <li
            key={p.numero}
            className="flex min-h-8 items-center justify-between gap-2 border-t border-surface-container-high text-body-md first:border-t-0"
          >
            <span>{m.linha(p.numero, ordem.length, formatarMesCurto(p.competencia))}</span>
            <MoneyText valor={p.valor} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Antecipar({ d, cartao, compra, onFechar }: Props) {
  const { gravar, salvando, erro } = useGravar(onFechar);
  const { parcelas, aberta } = daCompra(d, cartao, compra);
  const futuras = parcelas.filter((p) => p.competencia > aberta).length;
  const [k, setK] = useState(Math.min(futuras, 1));
  const [desconto, setDesconto] = useState<Centavos>(centavos(0));
  // A prévia é a mesma função que grava (D78): antes e depois de mover as k últimas.
  // O desconto vai até a soma das k parcelas movidas (as k últimas em fatura futura).
  const movidas = parcelas
    .filter((p) => p.competencia > aberta)
    .sort((a, b) => a.numero - b.numero)
    .slice(-k);
  const maximo = movidas.length ? somar(movidas.map((p) => p.valor)) : null;
  const descontoInvalido = maximo !== null && desconto > maximo;
  let depois: ReturnType<typeof anteciparParcelas> | null = null;
  try {
    depois = anteciparParcelas(
      compra,
      parcelas,
      k,
      aberta,
      descontoInvalido ? centavos(0) : desconto,
    );
  } catch (e) {
    if (!(e instanceof RangeError)) throw e;
  }
  return (
    <form
      noValidate
      className="flex flex-col gap-4.5"
      onSubmit={enviar(() =>
        gravar((ctx) => anteciparParcelasDaCompra(d.fatos, ctx, compra.id, k, desconto)),
      )}
    >
      <div className="grid gap-4 medium:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="op-quantas">{m.antecipar.quantas}</Label>
          <Select
            value={String(k)}
            onValueChange={(x) => {
              setK(Number(x));
            }}
          >
            <SelectTrigger id="op-quantas" className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: futuras }, (_, i) => i + 1).map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {m.parcelas(n)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="op-desconto">{m.antecipar.desconto}</Label>
          <CampoDeValor
            id="op-desconto"
            valor={desconto}
            aoMudar={setDesconto}
            aria-invalid={descontoInvalido || undefined}
            aria-describedby="op-desconto-dica"
          />
          {maximo !== null && (
            <p
              id="op-desconto-dica"
              className={
                descontoInvalido
                  ? 'text-label-md text-error'
                  : 'text-label-md font-normal text-on-surface-variant'
              }
            >
              {descontoInvalido
                ? m.antecipar.erroDesconto(formatarMoeda(maximo))
                : m.antecipar.dicaDesconto(formatarMoeda(maximo))}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-4 rounded-md bg-surface-container-low px-4 py-3 medium:flex-row">
        <ListaDeParcelas titulo={m.antecipar.antes} parcelas={parcelas} />
        {depois && <ListaDeParcelas titulo={m.antecipar.depois} parcelas={depois.parcelas} />}
      </div>
      {depois?.estorno && (
        <p className="text-body-md text-on-surface-variant">
          {m.antecipar.estorno(formatarMoeda(depois.estorno))}
        </p>
      )}
      <Rodape
        salvando={salvando}
        rotulo={m.antecipar.salvar}
        erro={erro}
        onFechar={onFechar}
        desabilitado={!depois || descontoInvalido}
      />
    </form>
  );
}

function Cancelar({ d, cartao, compra, onFechar }: Props) {
  const { gravar, salvando, erro } = useGravar(onFechar);
  const { parcelas, aberta } = daCompra(d, cartao, compra);
  const [estornou, setEstornou] = useState(false);
  // O estorno possível: a soma das já faturadas (core), mostrada antes de confirmar (4.1 item 5).
  const r = compra.cancelada ? null : cancelarCompra(compra, parcelas, cartao, aberta, true);
  return (
    <form
      noValidate
      className="flex flex-col gap-4.5"
      onSubmit={enviar(() =>
        gravar((ctx) => cancelarCompraDoCartao(d.fatos, ctx, compra.id, estornou && !!r?.estorno)),
      )}
    >
      <p className="text-body-md">{m.cancelar.remove(r?.remover.length ?? 0)}</p>
      {r?.estorno && (
        <fieldset className="flex flex-col gap-1">
          <legend className="pb-1 text-label-lg">{m.cancelar.pergunta}</legend>
          {(
            [
              [true, m.cancelar.sim(formatarMoeda(negar(r.estorno)))],
              [false, m.cancelar.nao],
            ] as const
          ).map(([valor, rotulo]) => (
            <label key={rotulo} className="flex min-h-11 cursor-pointer items-center gap-3">
              <input
                type="radio"
                name="op-estornou"
                className="size-4.5 accent-primary"
                checked={estornou === valor}
                onChange={() => {
                  setEstornou(valor);
                }}
              />
              {rotulo}
            </label>
          ))}
        </fieldset>
      )}
      <p className="text-body-md text-on-surface-variant">{m.cancelar.irreversivel}</p>
      <Rodape
        salvando={salvando}
        rotulo={m.cancelar.confirmar}
        erro={erro}
        onFechar={onFechar}
        destrutivo
      />
    </form>
  );
}

function Excluir({ d, compra, onFechar }: Props) {
  const { gravar, salvando, erro } = useGravar(onFechar);
  const n = d.fatos.parcelas.filter((p) => p.compraId === compra.id).length;
  return (
    <form
      noValidate
      className="flex flex-col gap-4.5"
      onSubmit={enviar(() => gravar((ctx) => excluirCompra(d.fatos, ctx, compra.id)))}
    >
      <p className="text-body-md">{m.excluir.explicacao(n)}</p>
      <Rodape
        salvando={salvando}
        rotulo={m.excluir.confirmar}
        erro={erro}
        onFechar={onFechar}
        destrutivo
      />
    </form>
  );
}

interface Props {
  d: Derivado;
  cartao: Cartao;
  compra: Compra;
  onFechar: () => void;
}

const DIALOGOS: Record<
  Exclude<OperacaoDaFatura, 'editar-valor'>,
  {
    titulo: (c: Compra) => string;
    explicacao: (p: Props) => string;
    Corpo: (p: Props) => React.ReactNode;
  }
> = {
  'editar-compra': {
    titulo: () => m.editar.titulo,
    explicacao: () => m.editar.explicacao,
    Corpo: EditarDescricao,
  },
  ajuste: {
    titulo: () => m.menu.ajuste,
    explicacao: (p) =>
      m.ajuste.explicacao(
        formatarMesCurto(faturaAberta(p.cartao, p.d.fatos.cartaoCiclos, p.d.hoje)),
      ),
    Corpo: LancarAjuste,
  },
  antecipar: {
    titulo: () => m.menu.antecipar,
    explicacao: (p) =>
      m.antecipar.explicacao(
        formatarMesCurto(faturaAberta(p.cartao, p.d.fatos.cartaoCiclos, p.d.hoje)),
      ),
    Corpo: Antecipar,
  },
  'cancelar-compra': {
    titulo: (c) => m.cancelar.titulo(nomeDa(c)),
    explicacao: () => m.menu.detalheCancelar,
    Corpo: Cancelar,
  },
  'excluir-compra': {
    titulo: (c) => m.excluir.titulo(nomeDa(c)),
    explicacao: () => m.menu.detalheExcluir,
    Corpo: Excluir,
  },
};

/**
 * Os diálogos das operações da compra (3.6, T05-14), abertos pela URL. "Editar valor, parcelas,
 * data ou cartão" reabre a Nova compra preenchida. Tudo grava pelo comando do core, com Desfazer.
 */
export function OperacoesDaCompra({
  d,
  cartao,
  acao,
  compraId,
  onFechar,
}: {
  d: Derivado;
  cartao: Cartao;
  acao: AcaoDaFatura | null;
  compraId: string | null;
  onFechar: () => void;
}) {
  const compra = compraId ? d.porId.compras.get(compraId) : undefined;
  const operacao = (OPERACOES_DA_COMPRA as readonly string[]).includes(acao ?? '')
    ? (acao as OperacaoDaFatura)
    : null;
  if (!compra || !operacao) return null;
  if (operacao === 'editar-valor')
    return (
      <NovaCompra
        aberto
        d={d}
        cartao={d.fatos.cartoes.find((c) => c.id === compra.cartaoId) ?? cartao}
        compra={compra}
        onFechar={onFechar}
      />
    );
  const { titulo, explicacao, Corpo } = DIALOGOS[operacao];
  const props = { d, cartao, compra, onFechar };
  return (
    <Dialog
      open
      onOpenChange={(a) => {
        if (!a) onFechar();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo(compra)}</DialogTitle>
          <DialogDescription>{explicacao(props)}</DialogDescription>
        </DialogHeader>
        <Corpo {...props} />
      </DialogContent>
    </Dialog>
  );
}
