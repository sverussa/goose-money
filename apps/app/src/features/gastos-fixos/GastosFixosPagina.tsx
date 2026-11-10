import {
  type Competencia,
  comprometimentoDaRenda,
  type Derivado,
  faturaDoGastoNoCartao,
  type OcorrenciaDoMes,
  resumoGastos,
} from '@goose-money/core';
import { CalendarDays, Info, Plus } from 'lucide-react';

import { formatarPercentual } from '@/app/formatacao';
import { ContextHeader } from '@/components/ContextHeader';
import { EmptyState, EstadoDaCarga } from '@/components/EstadosDaTela';
import { MoneyText } from '@/components/MoneyText';
import { MonthSelector } from '@/components/MonthSelector';
import { useMesDaUrl } from '@/components/periodo';
import { StatusChip } from '@/components/StatusChip';
import { Button } from '@/components/ui/button';
import { type AbrirAcao, useAcaoDaRecorrencia } from '@/features/recorrencias/acao';
import {
  ConfirmarOcorrencia,
  FormularioRecorrencia,
} from '@/features/recorrencias/AcoesDaRecorrencia';
import { MenuDaRecorrencia } from '@/features/recorrencias/MenuDaRecorrencia';
import { mesPorExtenso } from '@/features/recorrencias/recorrencias';
import { useDerivado } from '@/queries/fatos';

import { aVencerLogo, chipDoGasto, detalheDoGasto, gastosDoMes } from './gastos';
import { mensagensGastos as m } from './mensagens';

/** "Pagar" em conta; "Confirmar no cartão" no cartão (6.8). */
const textosDaAcao = (o: OcorrenciaDoMes) => (o.cartaoId ? m.noCartao : m.pagar);

function Lista({
  d,
  mes,
  gastos,
  abrir,
}: {
  d: Derivado;
  mes: Competencia;
  gastos: OcorrenciaDoMes[];
  abrir: AbrirAcao;
}) {
  const primeiraPendente = gastos.find((o) => o.ocorrencia === null);
  const logo = aVencerLogo(d);
  return (
    <section
      aria-label={m.lista(mesPorExtenso(mes))}
      className="overflow-hidden rounded-lg border border-surface-container-highest bg-surface-container-lowest"
    >
      {gastos.length === 0 ? (
        <p className="px-5 py-8 text-center text-body-lg text-on-surface-variant">{m.semNoMes}</p>
      ) : (
        <ul>
          {gastos.map((o) => {
            const chip = chipDoGasto(o, d.hoje, logo);
            const acao = textosDaAcao(o);
            const dia = Number(o.data.slice(8));
            return (
              <li
                key={o.recorrenciaId}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-surface-container-high px-5 py-4 first:border-t-0"
              >
                <span className="flex size-11 shrink-0 flex-col items-center justify-center rounded-md bg-surface-container-high text-on-surface-variant">
                  <span className="sr-only">{m.diaDoMes(dia)}</span>
                  <span aria-hidden className="text-label-md font-normal">
                    {m.dia}
                  </span>
                  <span aria-hidden className="text-title-md text-on-surface">
                    {dia}
                  </span>
                </span>
                <span className="flex min-w-40 flex-1 flex-col gap-0.5">
                  <span className="text-body-lg font-medium">{o.recorrencia.descricao}</span>
                  <span className="text-body-md text-on-surface-variant">
                    {detalheDoGasto(d, o)}
                  </span>
                </span>
                <StatusChip estado={chip.estado} rotulo={chip.rotulo} />
                <MoneyText
                  valor={o.valor}
                  tipo="despesa"
                  className="min-w-28 justify-end text-body-lg font-semibold"
                />
                <span className="ml-auto flex items-center gap-1">
                  {o.ocorrencia === null && (
                    <Button
                      variant={o === primeiraPendente ? 'filled' : 'outlined'}
                      aria-label={acao.acao(o.recorrencia.descricao)}
                      onClick={() => {
                        abrir('confirmar', o.recorrenciaId);
                      }}
                    >
                      {acao.titulo}
                    </Button>
                  )}
                  <MenuDaRecorrencia
                    d={d}
                    o={o}
                    textos={m.menu}
                    editar={() => {
                      abrir('editar', o.recorrenciaId);
                    }}
                  />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** A nota do design: o gasto no cartão pendente vira compra à vista e não conta duas vezes. */
function NotasDoCartao({ d, gastos }: { d: Derivado; gastos: OcorrenciaDoMes[] }) {
  const noCartao = gastos.filter((o) => o.cartaoId && o.ocorrencia === null);
  return noCartao.map((o) => {
    const fatura = faturaDoGastoNoCartao(d.fatos, o);
    const cartao = o.cartaoId ? d.porId.cartoes.get(o.cartaoId)?.nome : undefined;
    if (!fatura || !cartao) return null;
    return (
      <p
        key={o.recorrenciaId}
        role="note"
        className="flex items-start gap-3 rounded-md bg-surface-container-low px-4 py-3 text-body-md"
      >
        <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
        {m.nota(o.recorrencia.descricao, cartao, mesPorExtenso(fatura))}
      </p>
    );
  });
}

function GastosFixos({ d }: { d: Derivado }) {
  const [mes] = useMesDaUrl();
  const { acao, recorrenciaId, abrir, fechar } = useAcaoDaRecorrencia();
  const gastos = gastosDoMes(d.fatos, mes, d.hoje);
  const resumo = resumoGastos(d.fatos, mes, d.hoje);
  const comprometimento = comprometimentoDaRenda(d, mes);
  const temGastos = d.fatos.recorrencias.some((r) => r.ativa && r.natureza === 'gasto');
  const recorrencia = d.fatos.recorrencias.find(
    (r) => r.id === recorrenciaId && r.ativa && r.natureza === 'gasto',
  );
  const aConfirmar = gastos.find((o) => o.recorrenciaId === recorrenciaId && !o.ocorrencia);
  const botaoNovo = (
    <Button
      variant="outlined"
      onClick={() => {
        abrir('nova');
      }}
    >
      <Plus aria-hidden />
      {m.nova}
    </Button>
  );
  return (
    <>
      <MonthSelector />
      <ContextHeader
        rotulo={m.totais}
        indicadores={[
          { rotulo: m.previsto, valor: resumo.previsto },
          { rotulo: m.pago, valor: resumo.pago, tipo: resumo.pago ? 'despesa' : undefined },
          { rotulo: m.aPagar, valor: resumo.aPagar },
          { rotulo: m.vencido, valor: resumo.vencido },
        ]}
        acoes={
          <>
            <dl title={m.dicaComprometimento} className="flex min-w-36 flex-col">
              <dt className="text-label-md font-normal text-on-surface-variant">
                {m.comprometimento}
              </dt>
              <dd className="text-lg font-semibold tabular-nums">
                {formatarPercentual(comprometimento.razao)}
              </dd>
            </dl>
            {botaoNovo}
          </>
        }
      />
      {temGastos ? (
        <div className="flex flex-col gap-4">
          <Lista d={d} mes={mes} gastos={gastos} abrir={abrir} />
          <NotasDoCartao d={d} gastos={gastos} />
        </div>
      ) : (
        <EmptyState Icone={CalendarDays} frase={m.vazio} acao={botaoNovo} />
      )}
      {acao === 'nova' && (
        <FormularioRecorrencia d={d} natureza="gasto" textos={m.formulario} onFechar={fechar} />
      )}
      {acao === 'editar' && recorrencia && (
        <FormularioRecorrencia
          key={recorrencia.id}
          d={d}
          natureza="gasto"
          r={recorrencia}
          textos={m.formulario}
          onFechar={fechar}
        />
      )}
      {acao === 'confirmar' && aConfirmar && (
        <ConfirmarOcorrencia
          d={d}
          o={aConfirmar}
          textos={textosDaAcao(aConfirmar)}
          onFechar={fechar}
        />
      )}
    </>
  );
}

/** `#/gastos-fixos` (6.8, GastosFixos.dc.html): totais do mês, comprometimento, lista e ações. */
export function GastosFixosPagina() {
  const derivado = useDerivado();
  if (derivado.estado !== 'pronto') return <EstadoDaCarga carga={derivado} />;
  return (
    <div className="flex flex-col gap-4">
      <GastosFixos d={derivado.dados} />
    </div>
  );
}
