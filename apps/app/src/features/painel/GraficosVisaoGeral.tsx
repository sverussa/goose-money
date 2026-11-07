import {
  type Centavos,
  type Competencia,
  competenciaDe,
  comprometimentoDaRenda,
  conclusaoComprometimento,
  conclusaoDespesasPorCategoria,
  conclusaoFixosEVariaveis,
  conclusaoGastoAcumulado,
  conclusaoReceitasDespesas,
  type Derivado,
  despesasPorCategoria,
  fixosEVariaveis,
  gastoAcumulado,
  maioresDespesas,
  type Periodo,
  percentual,
  type Razao,
  receitasEDespesasPorMes,
} from '@goose-money/core';
import { Link, useNavigate } from 'react-router';

import {
  formatarData,
  formatarMes,
  formatarMesCurto,
  formatarMoeda,
  formatarPercentual,
} from '@/app/formatacao';
import { ChartCard } from '@/components/ChartCard';
import {
  corDoTema,
  type Linha,
  participacao,
  type Serie,
  totalDaSerie,
} from '@/components/graficos/dados';
import { BarrasAgrupadas, BarrasEmpilhadas, Linhas, Rosca } from '@/components/graficos/Graficos';
import { MoneyText } from '@/components/MoneyText';
import { Card } from '@/components/ui/card';

import { ateODia, detalheDoItem, lancamentosEm, mesNoPeriodo } from './destinos';
import { Legenda } from './Legenda';
import { mensagensPainel } from './mensagens';

const m = mensagensPainel.graficos;
const nomeDoMes = (c: Competencia) => formatarMes(c).split(' ')[0] ?? '';
const pct = (r: Razao) => formatarPercentual(r);
const ORIGENS_VARIAVEIS = ['manual', 'cartao', 'divida'];

/** Receitas × Despesas por mês (8.1): clique abre Lançamentos no mês e no tipo clicados. */
function ReceitasDespesas({ d, p }: { d: Derivado; p: Periodo }) {
  const navegar = useNavigate();
  const r = m.receitasDespesas;
  const serie = receitasEDespesasPorMes(d, p);
  const c = conclusaoReceitasDespesas(serie);
  const titulo =
    c.tipo === 'sobrouEmTodos'
      ? r.sobrouEmTodos(c.meses)
      : c.tipo === 'faltouEmTodos'
        ? r.faltouEmTodos(c.meses)
        : c.tipo === 'sobrouEmAlguns'
          ? r.sobrouEmAlguns(c.sobrou, c.meses)
          : r.semMovimento;
  const dados = serie.map((x) => ({ ...x, mes: formatarMesCurto(x.competencia) }));
  const series: Serie[] = [
    { chave: 'receitas', rotulo: r.receitas, cor: 'income' },
    { chave: 'despesas', rotulo: r.despesas, cor: 'expense' },
  ];
  const linha: Serie = { chave: 'resultado', rotulo: r.resultado, cor: 'on-surface' };
  return (
    <ChartCard
      titulo={titulo}
      subtitulo={r.subtitulo(m.periodo(formatarData(p.de), formatarData(p.ate)))}
      arquivo="receitas-x-despesas"
      dados={dados}
      categoria={{ chave: 'mes', rotulo: r.mes }}
      series={[...series, linha]}
      verItens={() => {
        void navegar(lancamentosEm(p));
      }}
      vazio={{ frase: r.vazio }}
    >
      <BarrasAgrupadas
        dados={dados}
        categoria="mes"
        series={series}
        linha={linha}
        aoClicar={(l, s) => {
          void navegar(
            lancamentosEm(mesNoPeriodo(l.competencia as Competencia, p), {
              tipo: s === 'receitas' ? 'receita' : 'despesa',
            }),
          );
        }}
      />
      <Legenda series={[...series, linha]} />
    </ChartCard>
  );
}

/** Despesas por categoria (rosca + ranking): clique abre a categoria; "Outras" = as agrupadas. */
function PorCategoria({ d, p }: { d: Derivado; p: Periodo }) {
  const navegar = useNavigate();
  const t = m.categorias;
  const serie = despesasPorCategoria(d, p);
  const c = conclusaoDespesasPorCategoria(serie);
  const nome = (id: string) => d.porId.categorias.get(id)?.nome ?? '';
  const titulo = c.tipo === 'maior' ? t.maior(nome(c.categoriaId), pct(c.fatia)) : t.semDespesas;
  const dados = [
    ...serie.fatias.map((f) => ({
      categoria: nome(f.categoriaId),
      valor: f.valor,
      cor: d.porId.categorias.get(f.categoriaId)?.cor ?? 'cat-sistema',
      ids: f.categoriaId,
    })),
    ...(serie.outras
      ? [
          {
            categoria: t.outras,
            valor: serie.outras.valor,
            cor: 'categorica-8',
            ids: serie.outras.categorias.join(','),
          },
        ]
      : []),
  ];
  const s: Serie = { chave: 'valor', rotulo: t.valor, cor: 'expense' };
  const abrir = (l: Linha) => {
    void navegar(lancamentosEm(p, { tipo: 'despesa', categorias: String(l.ids).split(',') }));
  };
  const total = totalDaSerie(dados, 'valor');
  return (
    <ChartCard
      titulo={titulo}
      subtitulo={t.subtitulo(m.periodo(formatarData(p.de), formatarData(p.ate)))}
      arquivo="despesas-por-categoria"
      dados={dados}
      categoria={{ chave: 'categoria', rotulo: t.categoria }}
      series={[s]}
      verItens={() => {
        void navegar(lancamentosEm(p, { tipo: 'despesa' }));
      }}
      vazio={{ frase: t.vazio }}
      rodape={
        // O ranking (8.1): cada categoria abre a lista dela; "Outras", as agrupadas.
        <ol aria-label={t.ranking} className="flex flex-col">
          {dados.map((l) => (
            <li key={l.categoria}>
              <button
                type="button"
                className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-sm px-2 text-left text-body-md hover:bg-on-surface/8"
                onClick={() => {
                  abrir(l);
                }}
              >
                <span
                  aria-hidden
                  className="size-3 shrink-0 rounded-full"
                  style={{ background: corDoTema(l.cor) }}
                />
                <span className="flex-1 truncate">{l.categoria}</span>
                <MoneyText valor={l.valor} className="font-semibold" />
                <span className="w-14 text-right text-on-surface-variant tabular-nums">
                  {participacao(l.valor, total)}
                </span>
              </button>
            </li>
          ))}
        </ol>
      }
    >
      <Rosca dados={dados} categoria="categoria" serie={s} aoClicar={abrir} semRanking />
    </ChartCard>
  );
}

/** Gasto acumulado do último mês do período × o anterior: clique abre do dia 1 ao dia clicado. */
function Acumulado({ d, p }: { d: Derivado; p: Periodo }) {
  const navegar = useNavigate();
  const t = m.acumulado;
  const serie = gastoAcumulado(d, p);
  const c = conclusaoGastoAcumulado(serie);
  const mes = nomeDoMes(serie.mes);
  const anterior = nomeDoMes(serie.anterior).toLocaleLowerCase('pt-BR');
  let titulo: string;
  if (c.tipo === 'semGastos') titulo = t.semGastos(mes.toLocaleLowerCase('pt-BR'), anterior);
  else {
    const frase =
      c.variacao.tipo === 'novo'
        ? t.novo(mes, formatarMoeda(c.atual), anterior)
        : c.tipo === 'igual'
          ? t.igual(mes, anterior)
          : t[c.tipo](mes, formatarPercentual(absoluta(c.variacao)), anterior);
    titulo = c.mesCompleto ? frase : t.ateODia(c.dia, primeiraMinuscula(frase));
  }
  const dados = serie.dias.map((x) => ({
    dia: String(x.dia),
    atual: x.atual ?? Number.NaN,
    anterior: x.anterior ?? Number.NaN,
  }));
  const series: Serie[] = [
    { chave: 'atual', rotulo: formatarMesCurto(serie.mes), cor: 'expense' },
    { chave: 'anterior', rotulo: formatarMesCurto(serie.anterior), cor: 'outline' },
  ];
  return (
    <ChartCard
      titulo={titulo}
      subtitulo={t.subtitulo(formatarMesCurto(serie.mes), formatarMesCurto(serie.anterior))}
      arquivo="gasto-acumulado"
      dados={dados}
      categoria={{ chave: 'dia', rotulo: t.dia }}
      series={series}
      verItens={() => {
        void navegar(lancamentosEm(mesNoPeriodo(serie.mes, p), { tipo: 'despesa' }));
      }}
      vazio={{ frase: t.vazio }}
    >
      <Linhas
        dados={dados}
        categoria="dia"
        series={series}
        aoClicar={(l) => {
          void navegar(lancamentosEm(ateODia(serie.mes, Number(l.dia), p), { tipo: 'despesa' }));
        }}
      />
      <Legenda series={series} linha />
    </ChartCard>
  );
}

/** A variação sem o sinal: o sentido já está na frase ("mais"/"menos"). */
const absoluta = (r: Razao): Razao => (r.tipo === 'valor' ? { ...r, valor: r.valor.abs() } : r);
const primeiraMinuscula = (s: string) => s.charAt(0).toLocaleLowerCase('pt-BR') + s.slice(1);

/** Fixos × variáveis por mês: clique abre o mês e a origem (recorrência ou não). */
function FixosVariaveis({ d, p }: { d: Derivado; p: Periodo }) {
  const navegar = useNavigate();
  const t = m.fixos;
  const serie = fixosEVariaveis(d, p);
  const c = conclusaoFixosEVariaveis(serie);
  const titulo = c.tipo === 'semDespesas' ? t.semDespesas : t[c.tipo](pct(c.fatiaDosFixos));
  const dados = serie.map((x) => ({ ...x, mes: formatarMesCurto(x.competencia) }));
  const series: Serie[] = [
    { chave: 'fixos', rotulo: t.serieFixos, cor: 'primary' },
    { chave: 'variaveis', rotulo: t.serieVariaveis, cor: 'categorica-8' },
  ];
  return (
    <ChartCard
      titulo={titulo}
      subtitulo={t.subtitulo(m.periodo(formatarData(p.de), formatarData(p.ate)))}
      arquivo="fixos-x-variaveis"
      dados={dados}
      categoria={{ chave: 'mes', rotulo: t.mes }}
      series={series}
      verItens={() => {
        void navegar(lancamentosEm(p, { tipo: 'despesa' }));
      }}
      vazio={{ frase: t.vazio }}
    >
      <BarrasEmpilhadas
        dados={dados}
        categoria="mes"
        series={series}
        aoClicar={(l, s) => {
          void navegar(
            lancamentosEm(mesNoPeriodo(l.competencia as Competencia, p), {
              tipo: 'despesa',
              origens: s === 'fixos' ? ['recorrencia'] : ORIGENS_VARIAVEIS,
            }),
          );
        }}
      />
      <Legenda series={series} />
    </ChartCard>
  );
}

/** Comprometimento da renda (barra segmentada) no último mês do período; cada parte abre o módulo. */
function Comprometimento({ d, p }: { d: Derivado; p: Periodo }) {
  const t = m.comprometimento;
  const mes = competenciaDe(p.ate);
  const r = comprometimentoDaRenda(d, mes);
  const c = conclusaoComprometimento(r);
  const titulo =
    c.tipo === 'semRenda'
      ? t.semRenda(formatarMes(mes).toLocaleLowerCase('pt-BR'))
      : t[c.tipo](pct(c.razao));
  const partes = [
    { chave: 'fixos', rotulo: t.fixos, valor: r.fixos, cor: 'primary', destino: '/gastos-fixos' },
    {
      chave: 'parcelasCartao',
      rotulo: t.parcelasCartao,
      valor: r.parcelasCartao,
      cor: 'categorica-2',
      destino: '/?aba=cartoes',
    },
    {
      chave: 'dividas',
      rotulo: t.dividas,
      valor: r.dividas,
      cor: 'categorica-3',
      destino: '/dividas',
    },
    {
      chave: 'livre',
      rotulo: t.livre,
      valor: r.livre,
      cor: 'surface-container-highest',
      destino: null,
    },
  ];
  const dados = partes.map((x) => ({ segmento: x.rotulo, valor: x.valor }));
  // Largura de cada parte: a fatia dela na renda (core); a livre negativa não aparece.
  const largura = (v: Centavos) => {
    const f = percentual(v, r.rendas);
    return f === null || f.isNegative() ? 0 : Math.min(100, f.toNumber() * 100);
  };
  return (
    <ChartCard
      titulo={titulo}
      subtitulo={t.subtitulo(formatarMes(mes).toLocaleLowerCase('pt-BR'), formatarMoeda(r.rendas))}
      arquivo="comprometimento-da-renda"
      dados={dados}
      categoria={{ chave: 'segmento', rotulo: t.segmento }}
      series={[{ chave: 'valor', rotulo: t.valor, cor: 'primary' }]}
      vazio={{ frase: t.vazio }}
      rodape={
        // Cada parte abre o módulo dela (8.1); "Livre" não tem destino.
        <ul className="grid gap-2 medium:grid-cols-2">
          {partes.map((x) => {
            const conteudo = (
              <>
                <span className="flex items-center gap-1.5 text-on-surface-variant">
                  <span
                    aria-hidden
                    className="size-2.5 rounded-xs"
                    style={{ background: corDoTema(x.cor) }}
                  />
                  {x.rotulo}
                </span>
                <span className="font-semibold">
                  <MoneyText valor={x.valor} /> · {participacao(x.valor, r.rendas)}
                </span>
              </>
            );
            return (
              <li key={x.chave} className="flex text-body-md">
                {x.destino ? (
                  <Link
                    to={x.destino}
                    className="flex min-h-11 flex-1 flex-col rounded-sm px-2 py-1 hover:bg-on-surface/8"
                  >
                    {conteudo}
                  </Link>
                ) : (
                  <span className="flex flex-1 flex-col px-2 py-1">{conteudo}</span>
                )}
              </li>
            );
          })}
        </ul>
      }
    >
      <div className="flex h-8 w-full overflow-hidden rounded-sm bg-surface-container-high">
        {partes.map((x) => (
          <span
            key={x.chave}
            className="h-full"
            style={{ width: `${String(largura(x.valor))}%`, background: corDoTema(x.cor) }}
          />
        ))}
      </div>
    </ChartCard>
  );
}

/** Maiores despesas do período (top 5): cada item abre o detalhe dele. */
function Maiores({ d, p }: { d: Derivado; p: Periodo }) {
  const itens = maioresDespesas(d, p);
  return (
    <Card variant="outlined" className="gap-2 px-5 py-4">
      <section aria-labelledby="painel-maiores">
        <h2 id="painel-maiores" className="pb-2 text-title-md">
          {m.maiores.titulo}
        </h2>
        {itens.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">{m.maiores.vazio}</p>
        ) : (
          <ol>
            {itens.map((i, k) => (
              <li
                key={`${i.registro.entidade}-${i.registro.id}`}
                className="border-t border-surface-container-high first:border-t-0"
              >
                <Link
                  to={detalheDoItem(d, i)}
                  className="flex min-h-14 items-center gap-3 rounded-sm px-1 py-2 hover:bg-on-surface/8"
                >
                  <span className="w-6 text-center text-label-lg text-on-surface-variant">
                    {k + 1}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-body-lg font-medium">{i.texto}</span>
                    <span className="text-body-md text-on-surface-variant">
                      {[formatarData(i.data), d.porId.categorias.get(i.categoriaId)?.nome]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  <MoneyText valor={i.valor} tipo="despesa" className="font-semibold" />
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </Card>
  );
}

/** Os gráficos da Visão geral (8.1, T05-17), todos sobre o período do seletor. */
export function GraficosVisaoGeral({ d, p }: { d: Derivado; p: Periodo }) {
  return (
    <>
      <div className="grid gap-4 expanded:grid-cols-2">
        <ReceitasDespesas d={d} p={p} />
        <PorCategoria d={d} p={p} />
        <Acumulado d={d} p={p} />
        <Comprometimento d={d} p={p} />
        <FixosVariaveis d={d} p={p} />
        <Maiores d={d} p={p} />
      </div>
    </>
  );
}
