import {
  type Competencia,
  competenciaDe,
  type Derivado,
  editarRecorrencia,
  ignorarOcorrencia,
  type OcorrenciaDoMes,
  resumoRendas,
} from '@goose-money/core';
import { ArrowUp, EllipsisVertical, Plus } from 'lucide-react';
import { useRef } from 'react';
import { useSearchParams } from 'react-router';

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ItemDoMenu } from '@/features/cartoes/menu';
import { useRodar } from '@/features/cartoes/rodar';
import { permissaoDe } from '@/features/dividas/tabela';
import { useDerivado } from '@/queries/fatos';
import { useContexto } from '@/queries/useComando';

import { ConfirmarRecebimento, FormularioRenda } from './AcoesDaRenda';
import { mensagensRendas as m } from './mensagens';
import { CHIP_DA_RENDA, composicaoDaRenda, mesPorExtenso, rendasDoMes } from './rendas';

const ddmm = (o: OcorrenciaDoMes) => formatarData(o.data).slice(0, 5);

/**
 * Ações da tela na URL (`?acao=`): Nova renda fixa, Editar e Confirmar recebimento, com
 * `?recorrencia=`. A pendência "Confirmar" do Painel chega com `?mes=&acao=confirmar&recorrencia=`.
 */
type AcaoDaRenda = 'nova' | 'editar' | 'confirmar';
function useAcaoDaRenda() {
  const [busca, setBusca] = useSearchParams();
  const abrir = (acao: AcaoDaRenda, recorrenciaId?: string) => {
    setBusca((b) => {
      const x = new URLSearchParams(b);
      x.set('acao', acao);
      if (recorrenciaId) x.set('recorrencia', recorrenciaId);
      else x.delete('recorrencia');
      return x;
    });
  };
  const fechar = () => {
    setBusca(
      (b) => {
        const x = new URLSearchParams(b);
        x.delete('acao');
        x.delete('recorrencia');
        return x;
      },
      { replace: true },
    );
  };
  return {
    acao: busca.get('acao') as AcaoDaRenda | null,
    recorrenciaId: busca.get('recorrencia'),
    abrir,
    fechar,
  };
}

function rotuloDoChip(o: OcorrenciaDoMes): string {
  const data = ddmm(o);
  if (o.status === 'confirmada') return m.chip.confirmada(data);
  if (o.status === 'ignorada') return m.chip.ignorada;
  return o.status === 'prevista' ? m.chip.prevista(data) : m.chip.atrasada(data);
}

function MenuDaRenda({ d, o, editar }: { d: Derivado; o: OcorrenciaDoMes; editar: () => void }) {
  const rodar = useRodar();
  const contexto = useContexto();
  // O diálogo só abre depois que o menu fecha e devolve o foco ao botão (como em Cartões).
  const editarAoFechar = useRef(false);
  const { recorrenciaId, competencia, recorrencia } = o;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="icon" aria-label={m.menu.rotulo(recorrencia.descricao)}>
          <EllipsisVertical aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onCloseAutoFocus={() => {
          if (!editarAoFechar.current) return;
          editarAoFechar.current = false;
          editar();
        }}
      >
        <ItemDoMenu
          rotulo={m.menu.ignorar}
          detalhe={m.menu.detalheIgnorar}
          permissao={permissaoDe(() =>
            ignorarOcorrencia(d.fatos, contexto(), recorrenciaId, competencia),
          )}
          aoEscolher={() => {
            rodar((ctx) => ignorarOcorrencia(d.fatos, ctx, recorrenciaId, competencia));
          }}
        />
        <ItemDoMenu
          rotulo={m.menu.editar}
          aoEscolher={() => {
            editarAoFechar.current = true;
          }}
        />
        <ItemDoMenu
          rotulo={m.menu.excluir}
          detalhe={m.menu.detalheExcluir}
          aoEscolher={() => {
            // Sem comando de exclusão no core: a renda deixa de ser ativa (fora da lista e da
            // projeção); os lançamentos dos meses recebidos continuam. Desfazer volta.
            rodar((ctx) => ({
              ...editarRecorrencia(d.fatos, ctx, recorrenciaId, { ativa: false }),
              descricao: m.excluida,
            }));
          }}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
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
  abrir: ReturnType<typeof useAcaoDaRenda>['abrir'];
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
                  <MenuDaRenda
                    d={d}
                    o={o}
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
function Composicao({
  d,
  abrir,
}: {
  d: Derivado;
  abrir: ReturnType<typeof useAcaoDaRenda>['abrir'];
}) {
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
  const { acao, recorrenciaId, abrir, fechar } = useAcaoDaRenda();
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
      {acao === 'nova' && <FormularioRenda d={d} onFechar={fechar} />}
      {acao === 'editar' && recorrencia && (
        <FormularioRenda key={recorrencia.id} d={d} r={recorrencia} onFechar={fechar} />
      )}
      {acao === 'confirmar' && aConfirmar && (
        <ConfirmarRecebimento d={d} o={aConfirmar} onFechar={fechar} />
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
