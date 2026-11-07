import { type Derivado, periodoAnterior, type Razao, variacao } from '@goose-money/core';

import { formatarData, formatarPercentual } from '@/app/formatacao';
import { MoneyText } from '@/components/MoneyText';
import { PeriodPicker } from '@/components/PeriodPicker';
import { usePeriodoDaUrl } from '@/components/periodo';
import { Card } from '@/components/ui/card';
import { useIndicadoresDoPeriodo } from '@/queries/fatos';

import { GraficosVisaoGeral } from './GraficosVisaoGeral';
import { mensagensPainel } from './mensagens';
import { Pendencias } from './Pendencias';

const m = mensagensPainel.kpis;

/** "+12,3%", "—" ou "Novo" (3.10), com a explicação no `title`. */
function ChipDaVariacao({ r, explicacao }: { r: Razao; explicacao?: string }) {
  const texto =
    r.tipo === 'valor' && r.valor.gt(0) ? `+${formatarPercentual(r)}` : formatarPercentual(r);
  return (
    <span
      title={explicacao}
      aria-label={`${m.variacao}: ${texto}${explicacao ? `. ${explicacao}` : ''}`}
      className="w-fit rounded-sm bg-surface-container-high px-2 py-0.5 text-label-md font-semibold text-on-surface-variant"
    >
      {texto}
    </span>
  );
}

function Kpi({
  rotulo,
  children,
  rodape,
}: {
  rotulo: string;
  children: React.ReactNode;
  rodape: React.ReactNode;
}) {
  return (
    <Card variant="outlined" className="gap-2 px-5 py-4">
      <h2 className="text-body-md text-on-surface-variant">{rotulo}</h2>
      <p className="text-headline-md">{children}</p>
      {rodape}
    </Card>
  );
}

/** Aba Visão geral (6.2): Pendências, período e os KPIs com Variação (T05-16). */
export function VisaoGeral({ d }: { d: Derivado }) {
  const [periodo, setPeriodo] = usePeriodoDaUrl('painel-visao-geral', 'ultimos-3-meses');
  const anterior = periodoAnterior(periodo);
  const atual = useIndicadoresDoPeriodo(periodo);
  const antes = useIndicadoresDoPeriodo(anterior);
  const novo = m.novo(formatarData(anterior.de), formatarData(anterior.ate));
  const explicar = (r: Razao) =>
    r.tipo === 'novo' ? novo : r.tipo === 'indisponivel' ? m.semBase : undefined;
  return (
    <div className="flex flex-col gap-4">
      <Pendencias d={d} />
      <PeriodPicker periodo={periodo} onChange={setPeriodo} />
      {atual.estado === 'pronto' && antes.estado === 'pronto' && (
        <section
          aria-label={m.rotulo}
          className="grid gap-4 medium:grid-cols-2 expanded:grid-cols-4"
        >
          {(
            [
              ['receitas', m.receitas, 'receita'],
              ['despesas', m.despesas, 'despesa'],
              ['resultado', m.resultado, undefined],
            ] as const
          ).map(([chave, rotulo, tipo]) => {
            const r = variacao(atual.dados[chave], antes.dados[chave]);
            return (
              <Kpi
                key={chave}
                rotulo={rotulo}
                rodape={<ChipDaVariacao r={r} explicacao={explicar(r)} />}
              >
                <MoneyText valor={atual.dados[chave]} tipo={tipo} />
              </Kpi>
            );
          })}
          <Kpi
            rotulo={m.taxa}
            rodape={
              // A taxa já é uma razão: o anterior aparece como referência, sem variação da variação.
              <span
                title={
                  antes.dados.taxaDePoupanca.tipo === 'valor' ? undefined : m.periodoSemReceitas
                }
                className="w-fit rounded-sm bg-surface-container-high px-2 py-0.5 text-label-md font-semibold text-on-surface-variant"
              >
                {antes.dados.taxaDePoupanca.tipo === 'valor'
                  ? m.taxaAnterior(formatarPercentual(antes.dados.taxaDePoupanca))
                  : m.taxaSemAnterior}
              </span>
            }
          >
            {formatarPercentual(atual.dados.taxaDePoupanca)}
          </Kpi>
        </section>
      )}
      <GraficosVisaoGeral d={d} p={periodo} />
    </div>
  );
}
