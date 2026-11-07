import { centavos } from '@goose-money/core';
import { useId } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceArea,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';

import { formatarMoeda, formatarMoedaCurta } from '@/app/formatacao';
import { mensagens } from '@/app/mensagens';
import { usePrivacidade } from '@/app/providers/usePrivacidade';
import { MoneyText } from '@/components/MoneyText';
import { type ChartConfig, ChartContainer, ChartTooltip } from '@/components/ui/chart';

import { corDoTema, type Linha, participacao, type Serie, totalDaSerie, valorDe } from './dados';

// Base dos gráficos (8.1, 8.3): cores do tema, eixo Y abreviado, barras a partir de zero (o domínio
// padrão do Recharts, [0, 'auto'], inclui o zero e se estende para valores negativos), previstos
// tracejados ou com hachura `forecast`, tooltip em R$ com o percentual do total da série.

interface Cartesiano {
  dados: readonly Linha[];
  /** Campo da `Linha` com o rótulo do eixo X (mês, dia, cartão). */
  categoria: string;
  series: readonly Serie[];
  /** Destino do clique (8.1): o ponto clicado e, nas barras, a série da barra. */
  aoClicar?: (linha: Linha, serie?: string) => void;
}

/** O ponto `i` dos dados, para o clique; fora do intervalo, nada. */
const clicar = (
  dados: readonly Linha[],
  aoClicar: Cartesiano['aoClicar'],
  i: unknown,
  serie?: string,
) => {
  // Sem ponto ativo, o Recharts manda `null` ou `undefined`: nada a abrir (e não o 1º ponto).
  if (i === null || i === undefined || i === '') return;
  const linha = dados[Number(i)];
  if (aoClicar && linha) aoClicar(linha, serie);
};

const semAnimacao = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const configDe = (series: readonly Serie[]): ChartConfig =>
  Object.fromEntries(series.map((s) => [s.chave, { label: s.rotulo }]));

function useEixo() {
  const { oculto } = usePrivacidade();
  return (v: number) =>
    oculto ? '' : Number.isFinite(v) ? formatarMoedaCurta(centavos(Math.round(v))) : '';
}

/** Tooltip: valor de cada série em R$ e a fatia do total da série no gráfico. */
function Dica({
  active,
  payload,
  label,
  dados,
  series,
}: {
  active?: boolean;
  payload?: readonly { dataKey?: unknown; name?: unknown; payload?: unknown }[];
  label?: unknown;
  dados: readonly Linha[];
  series: readonly Serie[];
}) {
  const { oculto } = usePrivacidade();
  if (!active || !payload?.length) return null;
  // Na rosca não há rótulo de eixo: o título é o nome da fatia.
  const titulo = typeof label === 'string' ? label : payload[0]?.name;
  return (
    <div className="grid min-w-40 gap-1 rounded-sm border border-outline-variant bg-surface-container px-3 py-2 text-label-md font-normal text-on-surface">
      {typeof titulo === 'string' && <span className="font-semibold">{titulo}</span>}
      {payload.map((item) => {
        const serie = series.find((s) => s.chave === item.dataKey);
        if (!serie) return null;
        const valor = valorDe((item.payload ?? {}) as Linha, serie.chave);
        return (
          <span key={serie.chave} className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-xs"
              style={{ background: corDoTema(serie.cor) }}
            />
            <span className="flex-1">{serie.rotulo}</span>
            <span className="font-semibold tabular-nums">
              {oculto ? mensagens.privacidade.oculto : formatarMoeda(valor)}
            </span>
            {!oculto && (
              <span className="text-on-surface-variant tabular-nums">
                {participacao(valor, totalDaSerie(dados, serie.chave))}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

/** Padrão de hachura dos previstos nas barras (8.3). */
function Hachura({ id }: { id: string }) {
  return (
    <defs>
      <pattern
        id={id}
        width="6"
        height="6"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <rect width="6" height="6" fill="var(--color-forecast-container)" />
        <line x1="0" y1="0" x2="0" y2="6" stroke="var(--color-forecast)" strokeWidth="2" />
      </pattern>
    </defs>
  );
}

function Eixos({ categoria, vertical = false }: { categoria: string; vertical?: boolean }) {
  const eixo = useEixo();
  return vertical ? (
    <>
      <XAxis
        type="number"
        tickFormatter={eixo}

        tickLine={false}
        axisLine={false}
      />
      <YAxis type="category" dataKey={categoria} width={120} tickLine={false} axisLine={false} />
    </>
  ) : (
    <>
      <XAxis dataKey={categoria} tickLine={false} axisLine={false} tickMargin={8} />
      <YAxis tickFormatter={eixo} width={72} tickLine={false} axisLine={false} />
    </>
  );
}

const area = 'aspect-auto h-64 w-full';

/** Barras agrupadas por categoria, com uma linha opcional (Receitas × Despesas e Resultado). */
export function BarrasAgrupadas({
  dados,
  categoria,
  series,
  linha,
  aoClicar,
}: Cartesiano & { linha?: Serie }) {
  const hachura = useId();
  const todas = linha ? [...series, linha] : series;
  return (
    <ChartContainer config={configDe(todas)} className={area}>
      <ComposedChart data={dados} accessibilityLayer={false}>
        <Hachura id={hachura} />
        <CartesianGrid vertical={false} />
        <Eixos categoria={categoria} />
        <ChartTooltip
          content={(p) => (
            <Dica
              active={p.active}
              payload={p.payload}
              label={p.label}
              dados={dados}
              series={todas}
            />
          )}
        />
        {series.map((s) => (
          <Bar
            key={s.chave}
            dataKey={s.chave}
            fill={s.prevista ? `url(#${hachura})` : corDoTema(s.cor)}
            radius={[4, 4, 0, 0]}
            isAnimationActive={!semAnimacao()}
            cursor={aoClicar ? 'pointer' : undefined}
            onClick={(_, i) => {
              clicar(dados, aoClicar, i, s.chave);
            }}
          />
        ))}
        {linha && (
          <Line
            dataKey={linha.chave}
            stroke={corDoTema(linha.cor)}
            strokeWidth={2}
            strokeDasharray={linha.prevista ? '6 4' : undefined}
            dot={false}
            isAnimationActive={!semAnimacao()}
          />
        )}
      </ComposedChart>
    </ChartContainer>
  );
}

/** Barras empilhadas por categoria (fixos × variáveis, parcelas por cartão, juros × amortização). */
export function BarrasEmpilhadas({ dados, categoria, series, aoClicar }: Cartesiano) {
  const hachura = useId();
  return (
    <ChartContainer config={configDe(series)} className={area}>
      <BarChart data={dados} accessibilityLayer={false}>
        <Hachura id={hachura} />
        <CartesianGrid vertical={false} />
        <Eixos categoria={categoria} />
        <ChartTooltip
          content={(p) => (
            <Dica
              active={p.active}
              payload={p.payload}
              label={p.label}
              dados={dados}
              series={series}
            />
          )}
        />
        {series.map((s) => (
          <Bar
            key={s.chave}
            dataKey={s.chave}
            stackId="pilha"
            fill={s.prevista ? `url(#${hachura})` : corDoTema(s.cor)}
            isAnimationActive={!semAnimacao()}
            cursor={aoClicar ? 'pointer' : undefined}
            onClick={(_, i) => {
              clicar(dados, aoClicar, i, s.chave);
            }}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}

/** Faixa horizontal entre dois valores do eixo Y (limite de alerta da projeção, D48). */
export interface Faixa {
  de: number;
  ate: number;
  /** Escrito dentro da faixa; a tela também o põe no subtítulo ou na legenda (texto acessível). */
  rotulo: string;
  /** Chave de cor do tema (D77). */
  cor: string;
}

/** Linhas por categoria (gasto acumulado, evolução, saldo projetado, saldo devedor). */
export function Linhas({
  dados,
  categoria,
  series,
  aoClicar,
  faixa,
}: Cartesiano & { faixa?: Faixa }) {
  return (
    <ChartContainer config={configDe(series)} className={area}>
      <LineChart
        data={dados}
        accessibilityLayer={false}
        className={aoClicar ? 'cursor-pointer' : undefined}
        onClick={(estado) => {
          clicar(dados, aoClicar, estado.activeTooltipIndex);
        }}
      >
        {faixa && (
          <ReferenceArea
            y1={faixa.de}
            y2={faixa.ate}
            fill={corDoTema(faixa.cor)}
            fillOpacity={0.16}
            stroke="none"
            ifOverflow="extendDomain"
            label={{ value: faixa.rotulo, position: 'insideBottomLeft', fontSize: 11 }}
          />
        )}
        <CartesianGrid vertical={false} />
        <Eixos categoria={categoria} />
        <ChartTooltip
          content={(p) => (
            <Dica
              active={p.active}
              payload={p.payload}
              label={p.label}
              dados={dados}
              series={series}
            />
          )}
        />
        {series.map((s) => (
          <Line
            key={s.chave}
            dataKey={s.chave}
            stroke={corDoTema(s.prevista ? 'forecast' : s.cor)}
            strokeWidth={2}
            strokeDasharray={s.prevista ? '6 4' : undefined}
            dot={false}
            isAnimationActive={!semAnimacao()}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}

/** Barras horizontais (composição do saldo por conta). */
export function BarrasHorizontais({ dados, categoria, series, aoClicar }: Cartesiano) {
  return (
    <ChartContainer config={configDe(series)} className={area}>
      <BarChart data={dados} layout="vertical" accessibilityLayer={false}>
        <CartesianGrid horizontal={false} />
        <Eixos categoria={categoria} vertical />
        <ChartTooltip
          content={(p) => (
            <Dica
              active={p.active}
              payload={p.payload}
              label={p.label}
              dados={dados}
              series={series}
            />
          )}
        />
        {series.map((s) => (
          <Bar
            key={s.chave}
            dataKey={s.chave}
            fill={corDoTema(s.cor)}
            radius={[0, 4, 4, 0]}
            isAnimationActive={!semAnimacao()}
            cursor={aoClicar ? 'pointer' : undefined}
            onClick={(_, i) => {
              clicar(dados, aoClicar, i, s.chave);
            }}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}

/**
 * Rosca com ranking ao lado (despesas por categoria, composição da renda). Cada `Linha` é uma
 * fatia e traz a chave de cor em `cor`.
 */
export function Rosca({
  dados,
  categoria,
  serie,
  aoClicar,
}: Omit<Cartesiano, 'series'> & { serie: Serie }) {
  const total = totalDaSerie(dados, serie.chave);
  const corDe = (l: Linha) => corDoTema(typeof l.cor === 'string' ? l.cor : null);
  // A cor de cada fatia vai no próprio ponto (`fill`), como o Recharts 3 lê.
  const fatias = dados.map((l) => ({ ...l, fill: corDe(l) }));
  const ranking = [...dados].sort((a, b) => valorDe(b, serie.chave) - valorDe(a, serie.chave));
  return (
    <div className="flex flex-wrap items-center gap-6">
      <ChartContainer config={configDe([serie])} className="aspect-square h-48 w-48 shrink-0">
        <PieChart accessibilityLayer={false}>
          <ChartTooltip
            content={(p) => (
              <Dica
                active={p.active}
                payload={p.payload}
                label={p.label}
                dados={dados}
                series={[serie]}
              />
            )}
          />
          <Pie
            data={fatias}
            dataKey={serie.chave}
            nameKey={categoria}
            innerRadius="60%"
            outerRadius="95%"
            strokeWidth={2}
            isAnimationActive={!semAnimacao()}
            cursor={aoClicar ? 'pointer' : undefined}
            onClick={(_, i) => {
              clicar(dados, aoClicar, i);
            }}
          />
        </PieChart>
      </ChartContainer>
      <ol className="flex min-w-48 flex-1 flex-col gap-2">
        {ranking.map((l) => {
          const conteudo = (
            <>
              <span
                aria-hidden
                className="size-3 shrink-0 rounded-full"
                style={{ background: corDe(l) }}
              />
              <span className="flex-1 truncate text-left">{String(l[categoria])}</span>
              <MoneyText valor={valorDe(l, serie.chave)} className="font-semibold" />
              <span className="w-14 text-right text-on-surface-variant tabular-nums">
                {participacao(valorDe(l, serie.chave), total)}
              </span>
            </>
          );
          return (
            <li key={String(l[categoria])} className="flex text-body-md">
              {aoClicar ? (
                // A fatia clicável também pelo teclado: o item do ranking é o mesmo destino.
                <button
                  type="button"
                  className="-mx-2 flex min-h-11 flex-1 cursor-pointer items-center gap-2 rounded-sm px-2 hover:bg-on-surface/8"
                  onClick={() => {
                    aoClicar(l);
                  }}
                >
                  {conteudo}
                </button>
              ) : (
                <span className="flex flex-1 items-center gap-2">{conteudo}</span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Sparkline sem eixos (cards de conta); decorativa: o card mostra o valor em texto. */
export function Sparkline({ valores, cor }: { valores: readonly number[]; cor: string }) {
  return (
    <div aria-hidden className="h-10 w-full">
      <ResponsiveContainer>
        <LineChart data={valores.map((v) => ({ v }))} accessibilityLayer={false}>
          <Line
            dataKey="v"
            stroke={corDoTema(cor)}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
