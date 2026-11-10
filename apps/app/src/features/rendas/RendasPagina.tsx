import {
  type Competencia,
  competenciaDe,
  type Derivado,
  type OcorrenciaDoMes,
  resumoRendas,
} from '@goose-money/core';
import { ArrowUp, Plus } from 'lucide-react';

import { formatarData, formatarMes, formatarPercentual } from '@/app/formatacao';
import { ChartCard } from '@/components/ChartCard';
import { ContextHeader } from '@/components/ContextHeader';
import { EmptyState, EstadoDaCarga } from '@/components/EstadosDaTela';
import { corDoTema, participacao, type Serie } from '@/components/graficos/dados';
import { Rosca } from '@/components/graficos/Graficos';
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
import { useDerivado } from '@/queries/fatos';

import { mensagensRendas as m } from './mensagens';
import { CHIP_DA_RENDA, composicaoDaRenda, mesPorExtenso, rendasDoMes } from './rendas';

const ddmm = (o: OcorrenciaDoMes) => formatarData(o.data).slice(0, 5);

function rotuloDoChip(o: OcorrenciaDoMes): string {
  const data = ddmm(o);
  if (o.status === 'confirmada') return m.chip.confirmada(data);
  if (o.status === 'ignorada') return m.chip.ignorada;
  return o.status === 'prevista' ? m.chip.prevista(data) : m.chip.atrasada(data);
}

function Lista({
  d,
  mes,
  rendas,
  abrir,
}: {
  d: Derivado;
  mes: Competencia;
  rendas: OcorrenciaDoMes[];
  abrir: AbrirAcao;
}) {
  const primeiraPendente = rendas.find((o) => o.ocorrencia === null);
  return (
    <section
      aria-label={m.lista(mesPorExtenso(mes))}
      className="overflow-hidden rounded-lg border border-surface-container-highest bg-surface-container-lowest"
    >
      {rendas.length === 0 ? (
        <p className="px-5 py-8 text-center text-body-lg text-on-surface-variant">{m.semNoMes}</p>
      ) : (
        <ul>
          {rendas.map((o) => {
            const conta = o.contaId ? d.porId.contas.get(o.contaId)?.nome : undefined;
            return (
              <li
                key={o.recorrenciaId}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-surface-container-high px-5 py-4 first:border-t-0"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-income-container text-on-income-container">
                  <ArrowUp aria-hidden className="size-5.5" />
                </span>
                <span className="flex min-w-40 flex-1 flex-col gap-0.5">
                  <span className="text-body-lg font-medium">{o.recorrencia.descricao}</span>
                  <span className="text-body-md text-on-surface-variant">
                    {m.detalhe(Number(o.data.slice(8)), conta ?? '', o.recorrencia.autoConfirmar)}
                  </span>
                </span>
                <StatusChip estado={CHIP_DA_RENDA[o.status]} rotulo={rotuloDoChip(o)} />
                <MoneyText
                  valor={o.valor}
                  tipo="receita"
                  className="min-w-28 justify-end text-body-lg font-semibold"
                />
                <span className="ml-auto flex items-center gap-1">
                  {o.ocorrencia === null && (
                    <Button
                      variant={o === primeiraPendente ? 'filled' : 'outlined'}
                      aria-label={m.confirmar.acao(o.recorrencia.descricao)}
                      onClick={() => {
                        abrir('confirmar', o.recorrenciaId);
                      }}
                    >
                      {m.confirmar.titulo}
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

/** Composição da renda (8.1): rosca do mês corrente; o clique abre a recorrência (Editar). */
function Composicao({ d, abrir }: { d: Derivado; abrir: AbrirAcao }) {
  const mes = competenciaDe(d.hoje);
  const { fatias, total, conclusao } = composicaoDaRenda(d.fatos, mes, d.hoje);
  const titulo =
    conclusao.tipo === 'maior'
      ? m.composicao.titulo(
          conclusao.fonte,
          formatarPercentual({ tipo: 'valor', valor: conclusao.fatia }),
        )
      : conclusao.tipo === 'unica'
        ? m.composicao.unica(conclusao.fonte)
        : m.composicao.vazio;
  const dados = fatias.map((x) => ({ ...x }));
  const serie: Serie = { chave: 'valor', rotulo: m.composicao.valor, cor: 'income' };
  return (
    <ChartCard
      titulo={titulo}
      subtitulo={m.composicao.subtitulo(formatarMes(mes).toLocaleLowerCase('pt-BR'))}
      arquivo={`composicao-da-renda-${mes}`}
      dados={dados}
      categoria={{ chave: 'fonte', rotulo: m.composicao.fonte }}
      series={[serie]}
      vazio={{ frase: m.composicao.vazio }}
      rodape={
        <ul className="flex flex-col">
          {fatias.map((x) => {
            const fatia = participacao(x.valor, total);
            return (
              <li key={x.recorrenciaId}>
                <button
                  type="button"
                  onClick={() => {
                    abrir('editar', x.recorrenciaId);
                  }}
                  className="flex min-h-10 w-full cursor-pointer items-center gap-2.5 rounded-sm px-1 text-left text-body-md hover:bg-on-surface/4"
                >
                  <span
                    aria-hidden
                    className="size-3 shrink-0 rounded-full"
                    style={{ background: corDoTema(x.cor) }}
                  />
                  <span className="flex-1">{x.fonte}</span>
                  <span className="font-semibold tabular-nums">{fatia}</span>
                  <span className="sr-only">{m.composicao.abrir}</span>
                </button>
              </li>
            );
          })}
        </ul>
      }
    >
      <Rosca
        dados={dados}
        categoria="fonte"
        serie={serie}
        semRanking
        aoClicar={(l) => {
          abrir('editar', String(l.recorrenciaId));
        }}
      />
    </ChartCard>
  );
}

function Rendas({ d }: { d: Derivado }) {
  const [mes] = useMesDaUrl();
  const { acao, recorrenciaId, abrir, fechar } = useAcaoDaRecorrencia();
  const rendas = rendasDoMes(d.fatos, mes, d.hoje);
  const resumo = resumoRendas(d.fatos, mes, d.hoje);
  const temRendas = d.fatos.recorrencias.some((r) => r.ativa && r.natureza === 'renda');
  const recorrencia = d.fatos.recorrencias.find(
    (r) => r.id === recorrenciaId && r.ativa && r.natureza === 'renda',
  );
  const aConfirmar = rendas.find((o) => o.recorrenciaId === recorrenciaId && !o.ocorrencia);
  const botaoNova = (
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
          {
            rotulo: m.recebido,
            valor: resumo.recebido,
            tipo: resumo.recebido ? 'receita' : undefined,
          },
          { rotulo: m.aReceber, valor: resumo.aReceber },
          { rotulo: m.atrasado, valor: resumo.atrasado },
        ]}
        acoes={botaoNova}
      />
      {temRendas ? (
        <div className="flex flex-col gap-4 expanded:flex-row expanded:items-start">
          <div className="min-w-0 flex-1">
            <Lista d={d} mes={mes} rendas={rendas} abrir={abrir} />
          </div>
          <div className="min-w-0 expanded:w-80 expanded:shrink-0">
            <Composicao d={d} abrir={abrir} />
          </div>
        </div>
      ) : (
        <EmptyState Icone={ArrowUp} frase={m.vazio} acao={botaoNova} />
      )}
      {acao === 'nova' && (
        <FormularioRecorrencia d={d} natureza="renda" textos={m.formulario} onFechar={fechar} />
      )}
      {acao === 'editar' && recorrencia && (
        <FormularioRecorrencia
          key={recorrencia.id}
          d={d}
          natureza="renda"
          r={recorrencia}
          textos={m.formulario}
          onFechar={fechar}
        />
      )}
      {acao === 'confirmar' && aConfirmar && (
        <ConfirmarOcorrencia d={d} o={aConfirmar} textos={m.confirmar} onFechar={fechar} />
      )}
    </>
  );
}

/** `#/rendas` (6.7, Rendas.dc.html): totais do mês, fontes, formulário e composição (T05-25). */
export function RendasPagina() {
  const derivado = useDerivado();
  if (derivado.estado !== 'pronto') return <EstadoDaCarga carga={derivado} />;
  return (
    <div className="flex flex-col gap-4">
      <Rendas d={derivado.dados} />
    </div>
  );
}
