import {
  competenciaDe,
  type Derivado,
  type MesProjetado,
  projetarFluxo,
  saldoDevedorDeDividas,
  type TabelaDaDivida,
  ultimaData,
} from '@goose-money/core';
import { Plus } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';

import { formatarData, formatarMes, formatarMesCurto, formatarMoeda } from '@/app/formatacao';
import { ContextHeader } from '@/components/ContextHeader';
import { MoneyText } from '@/components/MoneyText';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

import { mensagensDividas as m } from './mensagens';

/** "Nova dívida": o stepper da T05-23 abre por `?nova=1`, nesta tela e no detalhe. */
export function BotaoNovaDivida() {
  const [, setBusca] = useSearchParams();
  return (
    <Button
      onClick={() => {
        setBusca((b) => {
          const x = new URLSearchParams(b);
          x.set('nova', '1');
          return x;
        });
      }}
    >
      <Plus aria-hidden />
      {m.nova}
    </Button>
  );
}

/**
 * Totais das dívidas (6.6): Saldo devedor de dívidas e as parcelas a pagar no mês corrente, do
 * grupo Parcelas de dívidas da projeção (3.9; inclui as vencidas e ainda não pagas).
 */
export function TotaisDasDividas({ d }: { d: Derivado }) {
  const mes = competenciaDe(d.hoje);
  const doMes = projetarFluxo(d, ultimaData(mes)).meses[0] as MesProjetado;
  return (
    <ContextHeader
      rotulo={m.totais}
      indicadores={[
        { rotulo: m.saldoDevedor, valor: saldoDevedorDeDividas(d) },
        {
          rotulo: m.aVencerNoMes(formatarMes(mes).split(' ')[0]?.toLocaleLowerCase('pt-BR') ?? ''),
          valor: doMes.grupos.parcelasDividas,
        },
      ]}
      acoes={<BotaoNovaDivida />}
    />
  );
}

function CardDaDivida({ t, atual }: { t: TabelaDaDivida; atual: boolean }) {
  const { divida, resumo } = t;
  const { pagas, total, proximaParcela, quitacaoPrevista } = resumo;
  return (
    <li>
      <Link
        to={`/dividas/${divida.id}`}
        aria-current={atual ? 'page' : undefined}
        className={cn(
          'flex h-full flex-col gap-2 rounded-lg border bg-surface-container-lowest px-5 py-4 hover:bg-on-surface/4',
          atual ? 'border-2 border-primary' : 'border-surface-container-highest',
        )}
      >
        <span className="flex flex-wrap justify-between gap-2">
          <span className="font-semibold">{divida.credor}</span>
          <span className="text-body-md text-on-surface-variant">
            {m.tipo[divida.tipo]} · {m.sistema[divida.sistemaAmortizacao]}
          </span>
        </span>
        <span className="flex flex-wrap items-baseline justify-between gap-2">
          <MoneyText valor={resumo.saldoDevedor} className="text-headline-md font-medium" />
          <span className="text-body-md text-on-surface-variant">
            {m.progresso(pagas, total)} ·{' '}
            {quitacaoPrevista
              ? m.quita(formatarMesCurto(competenciaDe(quitacaoPrevista)))
              : m.quitada}
          </span>
        </span>
        <Progress
          value={total ? (pagas / total) * 100 : 0}
          aria-label={m.parcelasPagas(pagas, total)}
          className="h-1.5"
        />
        <span className="text-body-md text-on-surface-variant">
          {proximaParcela
            ? m.proxima(
                formatarData(proximaParcela.vencimento).slice(0, 5),
                formatarMoeda(proximaParcela.valor),
              )
            : m.semProxima}
        </span>
      </Link>
    </li>
  );
}

/** Um card por dívida, com o da dívida aberta no detalhe em destaque (DividaDetalhe.dc.html). */
export function CardsDasDividas({ d, atual }: { d: Derivado; atual?: string }) {
  return (
    <nav aria-label={m.lista}>
      <ul className="grid gap-3 medium:grid-cols-2">
        {[...d.dividas.values()].map((t) => (
          <CardDaDivida key={t.divida.id} t={t} atual={t.divida.id === atual} />
        ))}
      </ul>
    </nav>
  );
}
