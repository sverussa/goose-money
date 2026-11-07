import {
  type Cartao,
  type Compra,
  type DataCivil,
  type Derivado,
  type Fatura,
  itensPrevistosNaFatura,
  limiteDisponivelDoCartao,
  somarDias,
} from '@goose-money/core';
import { ArrowLeft, Clock, SearchX, TriangleAlert } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';

import { formatarData, formatarMes, formatarMesCurto, formatarMoeda } from '@/app/formatacao';
import { ContextHeader } from '@/components/ContextHeader';
import { chipDaFatura, chips } from '@/components/estados';
import { EmptyState, EstadoDaCarga } from '@/components/EstadosDaTela';
import { MoneyText } from '@/components/MoneyText';
import { StatusChip } from '@/components/StatusChip';
import { Button } from '@/components/ui/button';
import { toggleVariants } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';
import { useDerivado } from '@/queries/fatos';

import { useAcaoDaFatura } from './acoes';
import { AcoesDaFatura } from './AcoesDaFatura';
import { faturaEscolhida, linhasDaFatura } from './fatura';
import { cicloAtual } from './formulario';
import { mensagensCartoes } from './mensagens';
import { NovaCompra } from './NovaCompra';
import { MenuDaCompra, OperacoesDaCompra } from './OperacoesDaCompra';

const m = mensagensCartoes.fatura;
const ddmm = (d: DataCivil) => formatarData(d).slice(0, 5);

/** Chips dos cartões ativos, como o seletor de conta do extrato (6.5, DESIGN-HANDOFF 7). */
function SeletorDeCartao({ d, cartaoId }: { d: Derivado; cartaoId: string }) {
  return (
    <nav aria-label={m.cartoes} className="flex flex-1 flex-wrap gap-2">
      {d.fatos.cartoes
        .filter((c) => !c.arquivado)
        .map((c) => (
          // Outro cartão abre na fatura aberta dele: a competência da URL não vale lá.
          <Link
            key={c.id}
            to={`/cartoes/${c.id}`}
            aria-current={c.id === cartaoId ? 'page' : undefined}
            data-state={c.id === cartaoId ? 'on' : 'off'}
            className={toggleVariants()}
          >
            {c.nome}
          </Link>
        ))}
    </nav>
  );
}

/** Tabs roláveis, uma por fatura, com o status de cada uma (CartaoFatura.dc.html). */
function TabsDeFaturas({ faturas, atual }: { faturas: readonly Fatura[]; atual: Fatura }) {
  const [busca] = useSearchParams();
  const escolhida = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    escolhida.current?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [atual.competencia]);
  return (
    <nav
      aria-label={m.faturas}
      className="flex overflow-x-auto border-b border-surface-container-highest"
    >
      {faturas.map((f) => {
        const x = new URLSearchParams(busca);
        x.set('fatura', f.competencia);
        const ativa = f.competencia === atual.competencia;
        return (
          <Link
            key={f.competencia}
            ref={ativa ? escolhida : undefined}
            to={{ search: x.toString() }}
            replace
            aria-current={ativa ? 'page' : undefined}
            className={cn(
              'flex h-14 min-w-24 shrink-0 flex-col items-center justify-center gap-0.5 border-b-3 px-4 text-body-md',
              ativa
                ? 'border-primary font-semibold text-primary'
                : 'border-transparent font-medium text-on-surface-variant hover:bg-on-surface/8',
            )}
          >
            <span>{formatarMesCurto(f.competencia)}</span>
            <span className="text-label-sm font-medium">
              {chips[chipDaFatura[f.status]].rotulo}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function Detalhe({ d, cartao }: { d: Derivado; cartao: Cartao }) {
  const [busca] = useSearchParams();
  const { acao, compraId, data, abrir, fechar } = useAcaoDaFatura();
  const faturas = d.faturas.get(cartao.id) ?? [];
  const f = faturaEscolhida(faturas, busca.get('fatura'));
  const ciclo = cicloAtual(d, cartao);
  const leitura = cartao.arquivado;
  const voltar = (
    <Button asChild variant="icon" aria-label={m.voltar}>
      <Link to="/cartoes">
        <ArrowLeft aria-hidden />
      </Link>
    </Button>
  );
  if (!f)
    return (
      <div className="flex items-center gap-2">
        {voltar}
        <h2 className="text-title-lg">{cartao.nome}</h2>
      </div>
    );
  const linhas = linhasDaFatura(d, cartao, f);
  const compraDa = (l: (typeof linhas)[number]) =>
    l.compraId ? d.porId.compras.get(l.compraId) : undefined;
  const primeiraDa = (l: (typeof linhas)[number]) =>
    linhas.find((x) => x.compraId === l.compraId) === l;
  // Sem encargo na fatura que recebeu o saldo, sugere lançar os juros do rotativo (3.5).
  const transporte = f.itens.find((i) => i.tipo === 'saldo_anterior_nao_pago');
  const rotativo =
    transporte && 'de' in transporte && !f.itens.some((i) => i.tipo === 'encargo')
      ? transporte
      : null;
  const previstos = itensPrevistosNaFatura(d.fatos, cartao.id, f.competencia, d.hoje);

  return (
    <>
      <ContextHeader
        rotulo={m.totais}
        indicadores={[
          { rotulo: m.saldo, valor: f.saldo },
          { rotulo: m.pagamentos, valor: f.totalPago },
          {
            rotulo: m.limite(formatarMoeda(cartao.limite)),
            valor: limiteDisponivelDoCartao(d, cartao.id),
          },
        ]}
        acoes={
          <>
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip estado={chipDaFatura[f.status]} />
              {f.pagaParcialmente && <StatusChip estado="pagaParcialmente" />}
            </div>
            <dl className="flex gap-4 text-body-md">
              <div>
                <dt className="text-label-md font-normal text-on-surface-variant">
                  {m.fechamento}
                </dt>
                <dd className="font-medium">{formatarData(f.fechamento)}</dd>
              </div>
              <div>
                <dt className="text-label-md font-normal text-on-surface-variant">
                  {m.vencimento}
                </dt>
                <dd className="font-medium">{formatarData(f.vencimento)}</dd>
              </div>
            </dl>
            {!leitura && (
              <Button
                onClick={() => {
                  abrir('pagar');
                }}
              >
                {m.pagar}
              </Button>
            )}
          </>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        {voltar}
        <h2 className="flex-1 text-title-lg">{cartao.nome}</h2>
        {leitura ? (
          <span className="text-body-md text-on-surface-variant">{m.somenteLeitura}</span>
        ) : (
          <>
            <Button
              onClick={() => {
                abrir('nova-compra');
              }}
            >
              {m.novaCompra}
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                abrir('encargo');
              }}
            >
              {m.encargo}
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                abrir('ciclo');
              }}
            >
              {m.ciclo}
            </Button>
          </>
        )}
      </div>
      <SeletorDeCartao d={d} cartaoId={cartao.id} />
      <TabsDeFaturas faturas={faturas} atual={f} />

      {rotativo && !leitura && (
        // Saldo transportado (3.5): sugere lançar os juros do rotativo nesta fatura.
        <div
          role="note"
          className="flex flex-wrap items-center gap-3 rounded-md bg-warning-container px-4 py-3 text-body-md text-on-warning-container"
        >
          <TriangleAlert aria-hidden className="size-5 shrink-0" />
          <p className="min-w-0 flex-1">
            {mensagensCartoes.acoesDaFatura.rotativo.aviso(formatarMesCurto(rotativo.de))}
          </p>
          <Button
            variant="outlined"
            onClick={() => {
              abrir('encargo', undefined, somarDias(f.fechamento, -1));
            }}
          >
            {mensagensCartoes.acoesDaFatura.rotativo.acao}
          </Button>
        </div>
      )}
      <div className="flex flex-col items-start gap-4 expanded:flex-row">
        <section
          aria-label={m.itens(formatarMes(f.competencia))}
          className="w-full min-w-0 flex-1 overflow-hidden rounded-lg border border-surface-container-highest bg-surface-container-lowest"
        >
          {linhas.length === 0 && (
            <p className="px-5 py-6 text-center text-body-md text-on-surface-variant">
              {m.semItens}
            </p>
          )}
          <ul>
            {linhas.map((l) => (
              <li
                key={l.chave}
                className="flex min-h-16 items-center gap-3 border-t border-surface-container-low py-2.5 pr-1 pl-4 first:border-t-0 medium:gap-4 medium:pr-3 medium:pl-5"
              >
                <span className="w-11 text-body-md text-on-surface-variant">
                  {l.data ? ddmm(l.data) : '—'}
                </span>
                <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                  <span className="text-body-lg font-medium">{l.texto}</span>
                  {l.detalhe && (
                    <span className="text-body-md text-on-surface-variant">{l.detalhe}</span>
                  )}
                  {/* No compact, o chip desce para baixo do texto. */}
                  {l.chip && (
                    <span className="rounded-sm bg-surface-container px-2 py-0.5 text-label-md font-semibold text-on-surface-variant medium:hidden">
                      {l.chip}
                    </span>
                  )}
                </span>
                {l.chip && (
                  <span className="hidden rounded-sm bg-surface-container px-2 py-0.5 text-label-md font-semibold text-on-surface-variant medium:inline">
                    {l.chip}
                  </span>
                )}
                <MoneyText
                  valor={l.valor}
                  className={cn(
                    'text-right text-body-lg font-semibold medium:min-w-28',
                    l.valor < 0 && 'text-income',
                  )}
                />
                {compraDa(l) && !leitura ? (
                  // O menu da compra (T05-14) abre por `?acao=compra&compra=<id>`, na 1ª linha dela.
                  <MenuDaCompra
                    d={d}
                    cartao={cartao}
                    compra={compraDa(l) as Compra}
                    rotulo={m.operacoes(l.texto)}
                    aberto={acao === 'compra' && compraId === l.compraId && primeiraDa(l)}
                    abrir={abrir}
                    fechar={fechar}
                  />
                ) : (
                  <span aria-hidden className="size-12" />
                )}
              </li>
            ))}
          </ul>
          {previstos.length > 0 && (
            <ul aria-label={m.previstos} className="border-t border-dashed border-outline-variant">
              {previstos.map((p) => (
                <li
                  key={`${p.recorrenciaId}-${p.competencia}`}
                  className="flex items-center gap-3 bg-surface py-3 pr-4 pl-4 medium:gap-4 medium:pr-18 medium:pl-5"
                >
                  <Clock aria-hidden className="size-5 text-forecast" />
                  <span className="flex min-w-0 flex-1 flex-col text-on-surface-variant">
                    <span className="text-body-lg font-medium">
                      {m.previsto(p.recorrencia.descricao)}
                    </span>
                    <span className="text-body-md">{m.previstoDetalhe(ddmm(p.data))}</span>
                  </span>
                  <StatusChip estado="previsto" />
                  <MoneyText
                    valor={p.valor}
                    className="text-right text-body-lg text-on-surface-variant medium:min-w-28"
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
        <aside className="flex w-full shrink-0 flex-col gap-1.5 rounded-lg expanded:w-75 bg-surface-container px-5 py-4 text-body-md text-on-surface-variant">
          <span className="font-semibold text-on-surface">{m.cicloAtual}</span>
          <span>{m.cicloTexto(ciclo.diaFechamento, ciclo.diaVencimento)}</span>
        </aside>
      </div>
      {!leitura && (
        <>
          <NovaCompra aberto={acao === 'nova-compra'} d={d} cartao={cartao} onFechar={fechar} />
          <OperacoesDaCompra
            d={d}
            cartao={cartao}
            acao={acao}
            compraId={compraId}
            onFechar={fechar}
          />
          <AcoesDaFatura d={d} cartao={cartao} acao={acao} dataSugerida={data} onFechar={fechar} />
        </>
      )}
    </>
  );
}

/** `#/cartoes/:id` (6.5, CartaoFatura.dc.html): as faturas do cartão (T05-12). */
export function FaturaPagina() {
  const { id } = useParams();
  const derivado = useDerivado();
  if (derivado.estado !== 'pronto') return <EstadoDaCarga carga={derivado} />;
  const cartao = derivado.dados.fatos.cartoes.find((c) => c.id === id);
  return (
    <div className="flex flex-col gap-4">
      {cartao ? (
        <Detalhe d={derivado.dados} cartao={cartao} />
      ) : (
        <EmptyState
          Icone={SearchX}
          frase={m.naoEncontrado}
          acao={
            <Button asChild variant="outlined">
              <Link to="/cartoes">{m.voltar}</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
