import {
  type Centavos,
  centavos,
  competenciaDe,
  estadoDoPrevisto,
  type IndicadoresDaBarra,
  periodoParaUrl,
  periodoPreset,
  ultimaData,
} from '@goose-money/core';
import { ChevronDown, ChevronUp, Eye, EyeOff, Info } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { MoneyText } from '@/components/MoneyText';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useBarraDeTotais, useFatos } from '@/queries/fatos';
import { useHoje } from '@/queries/relogio';

import { formatarData, formatarMoeda } from '../formatacao';
import { mensagens } from '../mensagens';
import { usePrivacidade } from '../providers/usePrivacidade';
import { useValorAnimado, type Variacoes, useVariacoes } from './barra';

const m = mensagens.barra;
type Chave = keyof IndicadoresDaBarra;
/** Ordem de 5.3; os dois primeiros ficam sempre à vista no compact (4.2). */
const ordem: Chave[] = [
  'saldoEmContas',
  'previstoAteOFimDoMes',
  'aPagarNosCartoes',
  'resultadoDoMes',
  'patrimonioLiquido',
];
const FIXOS_NO_COMPACT = 2;

/** Botão de olho do modo privacidade (5.3); no compact fica na top app bar (D44). */
export function BotaoPrivacidade({ className }: { className?: string }) {
  const { oculto, alternar } = usePrivacidade();
  return (
    <Button
      variant="icon"
      aria-label={mensagens.privacidade.ocultar}
      aria-pressed={oculto}
      onClick={alternar}
      className={className}
    >
      {oculto ? <EyeOff /> : <Eye />}
    </Button>
  );
}

/**
 * Chip de variação (5.3): "+" em `income` e "−" em `expense`. Em "A pagar nos cartões", subir é
 * dívida a mais: a cor se inverte, como no design (MobilePainel); o sinal continua o do valor.
 */
function ChipDeVariacao({ valor, chave }: { valor: Centavos; chave: Chave }) {
  const bom = chave === 'aPagarNosCartoes' ? valor < 0 : valor > 0;
  return (
    <span
      className={cn(
        'rounded-sm px-2 py-0.5 text-label-md font-semibold whitespace-nowrap tabular-nums',
        bom
          ? 'bg-income-container text-on-income-container'
          : 'bg-expense-container text-on-expense-container',
      )}
    >
      {valor > 0 ? `+${formatarMoeda(valor)}` : formatarMoeda(valor)}
    </span>
  );
}

function Indicador({
  chave,
  valor,
  variacao,
  destino,
  dica,
  cor,
  className,
}: {
  chave: Chave;
  valor: Centavos;
  variacao: Centavos | undefined;
  destino: string;
  dica: string;
  cor: string | undefined;
  className?: string;
}) {
  const { oculto } = usePrivacidade();
  const mostrado = useValorAnimado(valor);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={destino}
          data-indicador={chave}
          className={cn(
            'flex min-h-alvo min-w-0 flex-col justify-center gap-0.5 rounded-md px-3 py-2 hover:bg-on-surface/8 medium:min-w-44 medium:flex-1',
            className,
          )}
        >
          <span className="flex items-center gap-1.5 text-label-md text-on-surface-variant">
            {m[chave].rotulo}
            <Info aria-hidden className="size-3.5" />
          </span>
          <span className="flex flex-wrap items-center gap-2">
            <MoneyText valor={mostrado} className={cn('text-title-lg', cor)} />
            {variacao !== undefined && !oculto && <ChipDeVariacao valor={variacao} chave={chave} />}
          </span>
        </Link>
      </TooltipTrigger>
      <TooltipContent>{dica}</TooltipContent>
    </Tooltip>
  );
}

/** Cor do valor: Previsto pelo `estadoDoPrevisto` do core (5.3); os outros, negativos em `expense`. */
function corDe(chave: Chave, valor: Centavos, limiteAlerta: Centavos): string | undefined {
  if (chave === 'previstoAteOFimDoMes') {
    const estado = estadoDoPrevisto(valor, limiteAlerta);
    return estado === 'error' ? 'text-error' : estado === 'warning' ? 'text-warning' : undefined;
  }
  return valor < 0 ? 'text-expense' : undefined;
}

function Indicadores({
  dados,
  variacoes,
  limiteAlerta,
}: {
  dados: IndicadoresDaBarra;
  variacoes: Variacoes;
  limiteAlerta: Centavos;
}) {
  const hoje = useHoje();
  const [expandida, setExpandida] = useState(false);
  const mes = competenciaDe(hoje);
  const destinos: Record<Chave, string> = {
    saldoEmContas: '/contas',
    previstoAteOFimDoMes: `/?aba=projecoes&mes=${mes}`,
    aPagarNosCartoes: '/cartoes',
    resultadoDoMes: `/?${periodoParaUrl(periodoPreset('este-mes', hoje))}`,
    patrimonioLiquido: '/?aba=saldos',
  };
  const dicas: Record<Chave, string> = {
    saldoEmContas: m.saldoEmContas.dica,
    previstoAteOFimDoMes: m.previstoAteOFimDoMes.dica(formatarData(ultimaData(mes)).slice(0, 5)),
    aPagarNosCartoes: m.aPagarNosCartoes.dica,
    resultadoDoMes: m.resultadoDoMes.dica(
      (mensagens.meses[Number(mes.slice(5)) - 1] ?? '').toLowerCase(),
    ),
    patrimonioLiquido: m.patrimonioLiquido.dica,
  };

  return (
    <>
      <div className="grid flex-1 grid-cols-2 gap-x-3 gap-y-1 medium:flex medium:flex-wrap medium:gap-1">
        {ordem.map((chave, i) => {
          const fixo = i < FIXOS_NO_COMPACT;
          // No compact, um indicador recolhido que mudou aparece com o chip enquanto ele dura (4.2).
          const temporario = !fixo && !expandida && variacoes[chave] !== undefined;
          return (
            <Indicador
              key={chave}
              chave={chave}
              valor={dados[chave]}
              variacao={variacoes[chave]}
              destino={destinos[chave]}
              dica={dicas[chave]}
              cor={corDe(chave, dados[chave], limiteAlerta)}
              className={cn(
                !fixo && 'col-span-2 medium:col-span-1',
                !fixo && !expandida && !temporario && 'hidden medium:flex',
                temporario && 'bg-surface-container-low medium:bg-transparent',
              )}
            />
          );
        })}
      </div>
      <Button
        variant="text"
        aria-expanded={expandida}
        onClick={() => {
          setExpandida((e) => !e);
        }}
        className="col-span-2 h-8 self-center medium:hidden"
      >
        {expandida ? m.menos : m.mais}
        {expandida ? <ChevronUp /> : <ChevronDown />}
      </Button>
    </>
  );
}

/**
 * Barra de Totais (5.3): os 5 indicadores sobre hoje e o mês corrente, do core, fixa abaixo da
 * top app bar (4.2). Anima o valor e mostra o chip de variação depois de cada gravação.
 */
export function TotalsBar() {
  const barra = useBarraDeTotais();
  const fatos = useFatos();
  const hoje = useHoje();
  const variacoes = useVariacoes(barra.estado === 'pronto' ? barra.dados : null);
  // Sem preferências (antes da carga), limite zero, como o core na projeção.
  const limiteAlerta =
    (fatos.estado === 'pronto' ? fatos.dados.preferencias?.limiteAlerta : undefined) ?? centavos(0);

  return (
    <section
      aria-label={m.rotulo}
      data-hoje={hoje}
      className="flex flex-col gap-1 border-b border-surface-container-highest bg-surface-container-lowest px-4 py-2 medium:flex-row medium:flex-wrap medium:items-center medium:gap-2 medium:px-5 medium:py-2.5"
    >
      {barra.estado === 'carregando' && (
        <div role="status" className="grid flex-1 grid-cols-2 gap-3 medium:flex">
          <span className="sr-only">{mensagens.carregando}</span>
          {ordem.map((c, i) => (
            <Skeleton
              key={c}
              aria-hidden
              className={cn('h-12 medium:flex-1', i >= FIXOS_NO_COMPACT && 'hidden medium:block')}
            />
          ))}
        </div>
      )}
      {barra.estado === 'erro' && (
        <div role="alert" className="flex flex-1 items-center gap-3">
          <p className="text-body-md">{barra.mensagem}</p>
          <Button variant="text" onClick={barra.tentarDeNovo}>
            {mensagens.tentarDeNovo}
          </Button>
        </div>
      )}
      {barra.estado === 'pronto' && (
        <Indicadores dados={barra.dados} variacoes={variacoes} limiteAlerta={limiteAlerta} />
      )}
      <BotaoPrivacidade className="hidden size-12 shrink-0 bg-surface-container medium:inline-flex" />
    </section>
  );
}
