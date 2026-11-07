import {
  type Cartao,
  type Compra,
  type Centavos,
  datasDaFatura,
  type Derivado,
  editarCompra,
  ErroDeDominio,
  faturaAberta,
  limiteDisponivelDoCartao,
  type NovaCompra,
  novaCompra,
  obrigacoesDoCartao,
  pagaAntesDoCadastro,
  previaDaCompra,
} from '@goose-money/core';
import { Check } from 'lucide-react';
import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui';
import { useMemo, useRef, useState } from 'react';

import { formatarData, formatarMesCurto, formatarMoeda } from '@/app/formatacao';
import { mensagens } from '@/app/mensagens';
import { BotaoSalvar } from '@/components/BotaoSalvar';
import { MoneyText } from '@/components/MoneyText';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toggleVariants } from '@/components/ui/toggle';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { aClassificar, cartoesAtivos, opcoesDeCategoria } from '@/features/lancar/padroes';
import { cn } from '@/lib/utils';
import { useComando, useContexto } from '@/queries/useComando';

import { CampoDeValor } from './CampoDeValor';
import {
  camposDaCompra,
  type ErrosDaCompra,
  errosDaCompra,
  MAX_PARCELAS,
  numeroDeParcelas,
  PARCELAS_RAPIDAS,
  totalDaCompra,
  type ValoresDaCompra,
  valoresDaCompraGravada,
  valoresIniciaisDaCompra,
} from './compra';
import { efeitosDoComando } from './efeitos';
import { cicloAtual } from './formulario';
import { mensagensCartoes } from './mensagens';

const m = mensagensCartoes.compra;
const b = mensagens.barra;

function Erro({ id, texto }: { id: string; texto: string | undefined }) {
  return texto ? (
    <p id={id} className="text-label-md text-error">
      {texto}
    </p>
  ) : null;
}

/** Cor da diferença (4.1 item 7, com o sinal no texto): `true` quando o indicador piora. */
const ruim = (diferenca: Centavos, sobeEBom = true) =>
  diferenca === 0 ? null : diferenca > 0 !== sobeEBom;

/** Diferença com sinal, como o chip de variação da Barra; zero é "sem mudança". */
const mudanca = (c: Centavos) =>
  c === 0 ? m.semMudanca : c > 0 ? `+${formatarMoeda(c)}` : formatarMoeda(c);

function Campos({
  d,
  cartao,
  compra,
  onFechar,
}: {
  d: Derivado;
  cartao: Cartao;
  compra: Compra | undefined;
  onFechar: () => void;
}) {
  const { executar, salvando } = useComando();
  const contexto = useContexto();
  const categorias = opcoesDeCategoria(d.fatos, 'despesa');
  const semCategoria = aClassificar(d.fatos) ?? categorias[0]?.id ?? '';
  const cartoes = cartoesAtivos(d.fatos);
  const [v, setV] = useState<ValoresDaCompra>(() =>
    compra
      ? valoresDaCompraGravada(compra)
      : valoresIniciaisDaCompra(cartao.id, d.hoje, semCategoria),
  );
  const escolhido = cartoes.find((c) => c.id === v.cartaoId) ?? cartao;
  // Editar valor, parcelas, data ou cartão (T05-14) regenera as parcelas; a observação fica.
  const comandoDe = (campos: NovaCompra) =>
    compra
      ? editarCompra(d.fatos, contexto(), compra.id, { ...campos, observacao: compra.observacao })
      : novaCompra(d.fatos, contexto(), campos);
  const [erros, setErros] = useState<ErrosDaCompra>({});
  const [erroDoCore, setErroDoCore] = useState<string | null>(null);
  const valorRef = useRef<HTMLInputElement>(null);
  const outro = useRef(false);
  const mudar = (x: Partial<ValoresDaCompra>) => {
    setV((atual) => ({ ...atual, ...x }));
  };

  // Prévia (6.5) e "O que muda ao salvar" (4.1 item 5): tudo do core, sobre o comando que vai gravar.
  const previa = useMemo(() => {
    const campos = camposDaCompra(v);
    if (!campos) return null;
    try {
      const efeitos = efeitosDoComando(d, comandoDe(campos));
      const obrigacoes = obrigacoesDoCartao(d.faturas.get(escolhido.id) ?? []);
      return {
        parcelas: previaDaCompra(campos, escolhido, d.fatos.cartaoCiclos, obrigacoes).parcelas,
        efeitos,
        limite: limiteDisponivelDoCartao(efeitos.depois, escolhido.id),
      };
    } catch (e) {
      if (e instanceof ErroDeDominio) return null;
      throw e;
    }
    // `comandoDe` só usa `d`, `compra` e `contexto`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, escolhido, compra, contexto, v]);

  async function salvar() {
    const novos = errosDaCompra(v);
    setErros(novos);
    const campos = camposDaCompra(v);
    if (!campos) return;
    let comando;
    try {
      comando = comandoDe(campos);
    } catch (e) {
      if (!(e instanceof ErroDeDominio)) throw e;
      setErroDoCore(e.message);
      return;
    }
    if (!(await executar(comando))) return;
    if (!outro.current) {
      onFechar();
      return;
    }
    // "Salvar e lançar outro": volta ao valor mantendo a data (7.1).
    setV({ ...valoresIniciaisDaCompra(cartao.id, d.hoje, semCategoria), data: v.data });
    setErros({});
    valorRef.current?.focus();
  }
  const enviar = (lancarOutro: boolean) => {
    outro.current = lancarOutro;
    void salvar();
  };

  const n = numeroDeParcelas(v);
  const rapida = (PARCELAS_RAPIDAS as readonly number[]).includes(v.parcelas);
  const parcelas = previa?.parcelas ?? [];
  const [primeira] = parcelas;
  const iguais = parcelas.every((p) => p.valor === primeira?.valor);
  const e = previa?.efeitos;
  const efeitos: [string, string, boolean | null][] =
    previa && e
      ? [
          [
            m.limiteDo(escolhido.nome),
            m.deAte(
              formatarMoeda(limiteDisponivelDoCartao(d, escolhido.id)),
              formatarMoeda(previa.limite),
            ),
            null,
          ],
          [
            b.aPagarNosCartoes.rotulo,
            mudanca(e.barra.aPagarNosCartoes),
            ruim(e.barra.aPagarNosCartoes, false),
          ],
          [m.obrigacoes, mudanca(e.obrigacoes), ruim(e.obrigacoes, false)],
          [b.resultadoDoMes.rotulo, mudanca(e.barra.resultadoDoMes), ruim(e.barra.resultadoDoMes)],
          [
            b.previstoAteOFimDoMes.rotulo,
            e.barra.previstoAteOFimDoMes === 0 && primeira
              ? m.primeiraVence(
                  formatarData(
                    datasDaFatura(escolhido, d.fatos.cartaoCiclos, primeira.competencia).vencimento,
                  ).slice(0, 5),
                )
              : mudanca(e.barra.previstoAteOFimDoMes),
            ruim(e.barra.previstoAteOFimDoMes),
          ],
          [
            b.patrimonioLiquido.rotulo,
            mudanca(e.barra.patrimonioLiquido),
            ruim(e.barra.patrimonioLiquido),
          ],
        ]
      : [];

  return (
    <form
      noValidate
      className="flex flex-col gap-4.5"
      onSubmit={(ev) => {
        ev.preventDefault();
        enviar(false);
      }}
    >
      <div className="grid gap-6 expanded:grid-cols-2">
        <div className="flex flex-col gap-4.5">
          {v.parcelado && (
            <ToggleGroup
              type="single"
              aria-label={m.informar}
              value={v.modo}
              onValueChange={(modo) => {
                if (modo) mudar({ modo: modo as ValoresDaCompra['modo'] });
              }}
            >
              {(['total', 'parcela'] as const).map((modo) => (
                <ToggleGroupItem key={modo} value={modo}>
                  {v.modo === modo && <Check aria-hidden />}
                  {modo === 'total' ? m.valorTotal : m.valorDaParcela}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="compra-valor" data-erro={!!erros.valor}>
              {v.parcelado && v.modo === 'parcela' ? m.valorDaParcela : m.valorTotal}
            </Label>
            <CampoDeValor
              id="compra-valor"
              ref={valorRef}
              autoFocus
              valor={v.valor}
              aoMudar={(valor) => {
                mudar({ valor });
              }}
              className="h-16 border-2 border-primary text-headline-md text-expense"
              aria-invalid={!!erros.valor || undefined}
              aria-describedby={erros.valor ? 'compra-valor-erro' : undefined}
            />
            <Erro id="compra-valor-erro" texto={erros.valor} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="compra-descricao">{m.descricao}</Label>
            <Input
              id="compra-descricao"
              autoComplete="off"
              className="h-12"
              value={v.descricao}
              onChange={(ev) => {
                mudar({ descricao: ev.target.value });
              }}
            />
          </div>
          <div className="grid gap-4 medium:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor="compra-categoria">{m.categoria}</Label>
              <Select
                value={v.categoriaId}
                onValueChange={(categoriaId) => {
                  mudar({ categoriaId });
                }}
              >
                <SelectTrigger id="compra-categoria" className="h-12">
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
              <Label htmlFor="compra-data" data-erro={!!erros.data}>
                {m.data}
              </Label>
              <Input
                id="compra-data"
                type="date"
                className="h-12"
                value={v.data}
                aria-invalid={!!erros.data || undefined}
                aria-describedby={erros.data ? 'compra-data-erro' : undefined}
                onChange={(ev) => {
                  mudar({ data: ev.target.value });
                }}
              />
              <Erro id="compra-data-erro" texto={erros.data} />
            </div>
          </div>
          {compra && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="compra-cartao">{m.cartao}</Label>
              <Select
                value={v.cartaoId}
                onValueChange={(cartaoId) => {
                  mudar({ cartaoId });
                }}
              >
                <SelectTrigger id="compra-cartao" className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cartoes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex min-h-14 items-center justify-between gap-3 rounded-md bg-surface-container-low px-4">
            <Label htmlFor="compra-parcelado" className="text-body-lg text-on-surface">
              {m.parcelado}
            </Label>
            <Switch
              id="compra-parcelado"
              checked={v.parcelado}
              onCheckedChange={(parcelado) => {
                mudar({ parcelado, modo: 'total' });
              }}
            />
          </div>
          {v.parcelado && (
            <fieldset className="flex flex-col gap-2">
              <legend className="pb-2 text-label-md text-on-surface-variant">
                {m.numeroDeParcelas}
              </legend>
              <div className="flex flex-wrap items-center gap-2">
                <ToggleGroupPrimitive.Root
                  type="single"
                  aria-label={m.numeroDeParcelas}
                  value={rapida ? String(v.parcelas) : ''}
                  onValueChange={(x) => {
                    if (x) mudar({ parcelas: Number(x) });
                  }}
                  className="flex flex-wrap gap-2"
                >
                  {PARCELAS_RAPIDAS.map((p) => (
                    <ToggleGroupPrimitive.Item
                      key={p}
                      value={String(p)}
                      aria-label={m.nParcelas(p)}
                      className={cn(toggleVariants(), 'h-12 min-w-12 justify-center')}
                    >
                      {p}
                    </ToggleGroupPrimitive.Item>
                  ))}
                </ToggleGroupPrimitive.Root>
                <Input
                  aria-label={m.outroNumero}
                  placeholder={m.outro}
                  inputMode="numeric"
                  maxLength={String(MAX_PARCELAS).length}
                  className="h-12 w-24 rounded-sm"
                  value={rapida ? '' : String(v.parcelas || '')}
                  aria-invalid={!!erros.parcelas || undefined}
                  aria-describedby={erros.parcelas ? 'compra-parcelas-erro' : undefined}
                  onChange={(ev) => {
                    mudar({ parcelas: Number(ev.target.value.replace(/\D/g, '')) });
                  }}
                />
              </div>
              <Erro id="compra-parcelas-erro" texto={erros.parcelas} />
            </fieldset>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <section
            aria-labelledby="compra-previa"
            className="flex flex-col gap-2 rounded-lg border border-surface-container-highest bg-surface-container-lowest px-5 py-4"
          >
            <h3 id="compra-previa" className="text-title-md">
              {m.previa}
            </h3>
            {parcelas.length > 0 && (
              <>
                <ul className="flex max-h-72 flex-col overflow-y-auto">
                  {parcelas.map((p) => (
                    <li
                      key={p.numero}
                      className="flex min-h-9 items-center gap-2 border-t border-surface-container-high py-1 text-body-md first:border-t-0"
                    >
                      <span className="flex-1">
                        {m.parcela(p.numero, p.de, formatarMesCurto(p.competencia))}
                      </span>
                      {pagaAntesDoCadastro(escolhido, p) && (
                        <StatusChip estado="pagaAntesDoCadastro" />
                      )}
                      <MoneyText valor={p.valor} className="font-medium" />
                    </li>
                  ))}
                </ul>
                {n > 1 && primeira && (
                  <p className="text-label-md font-normal text-on-surface-variant">
                    {iguais &&
                      `${m.conta(n, formatarMoeda(primeira.valor), formatarMoeda(totalDaCompra(v)))} `}
                    {m.resto}
                  </p>
                )}
              </>
            )}
          </section>
          {efeitos.length > 0 && (
            <section
              aria-labelledby="compra-efeitos"
              className="flex flex-col gap-2 rounded-lg bg-surface-container px-5 py-4"
            >
              <h3 id="compra-efeitos" className="text-title-md">
                {m.efeitos}
              </h3>
              <dl className="flex flex-col gap-1.5 text-body-md">
                {efeitos.map(([rotulo, valor, ruim]) => (
                  <div key={rotulo} className="flex justify-between gap-4">
                    <dt className="min-w-0 flex-1">{rotulo}</dt>
                    <dd
                      className={cn(
                        'max-w-1/2 text-right font-semibold tabular-nums',
                        ruim !== null && (ruim ? 'text-expense' : 'text-income'),
                      )}
                    >
                      {valor}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>
      </div>

      {erroDoCore && (
        <p role="alert" className="text-body-md text-error">
          {erroDoCore}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="text" onClick={onFechar}>
          {mensagens.acoes.cancelar}
        </Button>
        {!compra && (
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
        )}
        <BotaoSalvar salvando={salvando} className="px-6">
          {mensagens.acoes.salvar}
        </BotaoSalvar>
      </div>
    </form>
  );
}

/** Nova compra no cartão, à vista ou parcelada (6.5, 3.6, NovaCompra.dc.html). */
export function NovaCompra({
  aberto,
  d,
  cartao,
  compra,
  onFechar,
}: {
  aberto: boolean;
  d: Derivado;
  cartao: Cartao;
  /** "Editar valor, parcelas, data ou cartão" (T05-14): a compra gravada, preenchida. */
  compra?: Compra;
  onFechar: () => void;
}) {
  const ciclo = cicloAtual(d, cartao);
  const aberta = faturaAberta(cartao, d.fatos.cartaoCiclos, d.hoje);
  return (
    <Dialog
      open={aberto}
      onOpenChange={(a) => {
        if (!a) onFechar();
      }}
    >
      <DialogContent className="max-w-240">
        <DialogHeader>
          <DialogTitle>{compra ? m.tituloEditar(cartao.nome) : m.titulo(cartao.nome)}</DialogTitle>
          <DialogDescription>
            {m.subtitulo(ciclo.diaFechamento, ciclo.diaVencimento, formatarMesCurto(aberta))}
          </DialogDescription>
        </DialogHeader>
        <Campos d={d} cartao={cartao} compra={compra} onFechar={onFechar} />
      </DialogContent>
    </Dialog>
  );
}
