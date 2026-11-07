import {
  type Cartao,
  type DataCivil,
  comprasParceladasAtivas,
  type Derivado,
  gastoPorCartao,
  limiteDisponivelDoCartao,
  obrigacoesDoCartao,
  parcelasComprometidas,
  periodoParaUrl,
} from '@goose-money/core';
import { CreditCard } from 'lucide-react';
import { Link, useNavigate } from 'react-router';

import { formatarData, formatarMesCurto, formatarMoeda } from '@/app/formatacao';
import { ChartCard } from '@/components/ChartCard';
import { chipDaFatura } from '@/components/estados';
import { EmptyState } from '@/components/EstadosDaTela';
import { corDoTema, type Serie } from '@/components/graficos/dados';
import { BarrasEmpilhadas, BarrasHorizontais } from '@/components/graficos/Graficos';
import { MoneyText } from '@/components/MoneyText';
import { usePeriodoDaUrl } from '@/components/periodo';
import { StatusChip } from '@/components/StatusChip';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cicloAtual } from '@/features/cartoes/formulario';
import { mensagensCartoes } from '@/features/cartoes/mensagens';

import { Legenda } from './Legenda';
import { mensagensPainel } from './mensagens';

const m = mensagensPainel.cartoes;
const ddmm = (d: DataCivil) => formatarData(d).slice(0, 5);

/** Cor do cartão nos gráficos: as cores de face têm uma variante clara para gráfico (D77). */
const corNoGrafico = (cor: string) => (cor.startsWith('cartao-') ? `${cor}-grafico` : cor);

/** Card por cartão (6.2, PainelCartoes.dc.html): face, próxima a vencer, limite e obrigações. */
function CardDoCartao({ d, cartao }: { d: Derivado; cartao: Cartao }) {
  const faturas = d.faturas.get(cartao.id) ?? [];
  const aberta = faturas.find((f) => f.status === 'aberta');
  // A que vence primeiro entre as que pedem pagamento: vencida ou fechada; sem elas, a aberta.
  const proxima = faturas.find((f) => f.status === 'vencida' || f.status === 'fechada') ?? aberta;
  const ciclo = cicloAtual(d, cartao);
  const disponivel = limiteDisponivelDoCartao(d, cartao.id);
  const usado = Math.min(100, Math.max(0, 100 - (disponivel / cartao.limite) * 100));
  return (
    <li className="flex flex-col overflow-hidden rounded-lg border border-surface-container-highest bg-surface-container-lowest">
      <Link
        to={`/cartoes/${cartao.id}`}
        className="flex min-h-35 flex-col justify-between gap-6 p-5 text-on-primary dark:text-on-surface"
        style={{ background: corDoTema(cartao.cor) }}
      >
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex-1 text-title-lg font-semibold">{cartao.nome}</span>
          <span className="text-body-md">{m.ciclo(ciclo.diaFechamento, ciclo.diaVencimento)}</span>
        </span>
        {aberta && (
          <span className="flex flex-col gap-0.5">
            <span className="text-body-md">{m.faturaAberta(ddmm(aberta.vencimento))}</span>
            <MoneyText valor={aberta.saldo} className="text-headline-md font-medium" />
          </span>
        )}
      </Link>
      <div className="flex flex-col gap-4 px-5 pt-4 pb-5">
        {proxima && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex flex-1 flex-col">
              <span className="text-body-md text-on-surface-variant">
                {m.proxima(ddmm(proxima.vencimento))}
              </span>
              <MoneyText valor={proxima.saldo} className="text-title-lg" />
            </span>
            <StatusChip estado={chipDaFatura[proxima.status]} />
            {proxima.saldo > 0 && (
              <Button asChild variant="outlined">
                <Link to={`/cartoes/${cartao.id}?acao=pagar`} aria-label={m.pagarDo(cartao.nome)}>
                  {m.pagar}
                </Link>
              </Button>
            )}
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between gap-2 text-body-md">
            <span className="text-on-surface-variant">{m.limite}</span>
            <span className="font-semibold">
              {m.limiteDe(formatarMoeda(disponivel), formatarMoeda(cartao.limite))}
            </span>
          </div>
          <Progress value={usado} aria-label={m.limiteUsado(cartao.nome)} className="h-2" />
        </div>
        <div className="flex justify-between gap-2 text-body-md">
          <span className="text-on-surface-variant">{m.obrigacoes}</span>
          <MoneyText valor={obrigacoesDoCartao(faturas)} className="font-semibold" />
        </div>
      </div>
    </li>
  );
}

/** Tabela de compras parceladas ativas (`comprasParceladasAtivas`), com o total do core. */
function Parceladas({ d }: { d: Derivado }) {
  const p = m.parceladas;
  const { linhas, total } = comprasParceladasAtivas(d.fatos, d.hoje);
  return (
    <section
      aria-labelledby="painel-parceladas"
      className="flex flex-col gap-3 rounded-lg border border-surface-container-highest bg-surface-container-lowest px-5 py-4"
    >
      <div>
        <h2 id="painel-parceladas" className="text-title-md">
          {p.titulo}
        </h2>
        <p className="text-body-md text-on-surface-variant">{p.subtitulo}</p>
      </div>
      {linhas.length === 0 ? (
        <p className="py-4 text-body-md text-on-surface-variant">{p.vazio}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{p.descricao}</TableHead>
              <TableHead>{p.cartao}</TableHead>
              <TableHead>{p.atual}</TableHead>
              <TableHead className="text-right">{p.valor}</TableHead>
              <TableHead className="text-right">{p.restantes}</TableHead>
              <TableHead className="text-right">{p.valorRestante}</TableHead>
              <TableHead className="text-right">{p.ultima}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((l) => (
              <TableRow key={l.compra.id}>
                <TableCell>
                  <span className="flex flex-col">
                    <span className="font-medium">
                      {l.compra.descricao ?? mensagensCartoes.fatura.compra}
                    </span>
                    <span className="text-label-md font-normal text-on-surface-variant">
                      {p.comprada(ddmm(l.compra.data), formatarMoeda(l.compra.valorTotal))}
                    </span>
                  </span>
                </TableCell>
                <TableCell>{l.cartao.nome}</TableCell>
                <TableCell>{p.parcela(l.atual, l.de)}</TableCell>
                <TableCell className="text-right">
                  <MoneyText valor={l.valorParcela} />
                </TableCell>
                <TableCell className="text-right tabular-nums">{l.restantes}</TableCell>
                <TableCell className="text-right">
                  <MoneyText valor={l.valorRestante} />
                </TableCell>
                <TableCell className="text-right">{formatarMesCurto(l.ultima)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3} className="font-semibold">
                {p.total}
              </TableCell>
              <TableCell className="text-right font-semibold">
                <MoneyText valor={total.valorParcela} />
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {total.restantes}
              </TableCell>
              <TableCell className="text-right font-semibold">
                <MoneyText valor={total.valorRestante} />
              </TableCell>
              <TableCell className="text-right font-semibold">
                {total.ultima ? formatarMesCurto(total.ultima) : ''}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      )}
    </section>
  );
}

/** Aba Cartões do Painel (6.2, PainelCartoes.dc.html): hoje e os próximos 12 meses (T05-19). */
export function Cartoes({ d }: { d: Derivado }) {
  const navegar = useNavigate();
  // O gasto por cartão segue o seletor de período do Painel (8.2: o seletor fica na Visão geral).
  const [periodo] = usePeriodoDaUrl('painel-visao-geral', 'ultimos-3-meses');
  const ativos = d.fatos.cartoes.filter((c) => !c.arquivado);
  const porId = d.porId.cartoes;

  const comprometidas = parcelasComprometidas(d.fatos, d.hoje);
  const cartoesDoGrafico = comprometidas[0]?.cartoes.map((x) => x.cartaoId) ?? [];
  const seriesComprometidas: Serie[] = cartoesDoGrafico.map((id) => ({
    chave: id,
    rotulo: porId.get(id)?.nome ?? '',
    cor: corNoGrafico(porId.get(id)?.cor ?? 'primary'),
  }));
  const dadosComprometidas = comprometidas.map((x) => ({
    mes: formatarMesCurto(x.competencia),
    competencia: x.competencia,
    ...Object.fromEntries(x.cartoes.map((c) => [c.cartaoId, c.valor])),
  }));

  const gasto = gastoPorCartao(d, periodo).map((x) => ({
    cartao: porId.get(x.cartaoId)?.nome ?? '',
    cartaoId: x.cartaoId,
    gasto: x.valor,
  }));
  const serieGasto: Serie[] = [{ chave: 'gasto', rotulo: m.gasto.gasto, cor: 'expense' }];
  const lancamentosDo = (cartaoId: string) => {
    void navegar(
      `/lancamentos?visao=competencia&${periodoParaUrl(periodo)}&tipo=despesa&cartao=${cartaoId}`,
    );
  };

  if (ativos.length === 0)
    return (
      <EmptyState
        Icone={CreditCard}
        frase={m.semCartoes}
        acao={
          <Button asChild>
            <Link to="/cartoes?novo=1">{m.cadastrar}</Link>
          </Button>
        }
      />
    );
  return (
    <div className="flex flex-col gap-4">
      <section aria-label={m.lista}>
        <ul className="grid gap-4 expanded:grid-cols-2">
          {ativos.map((c) => (
            <CardDoCartao key={c.id} d={d} cartao={c} />
          ))}
        </ul>
      </section>
      <Parceladas d={d} />
      <div className="grid gap-4 expanded:grid-cols-2">
        <ChartCard
          titulo={m.comprometidas.titulo}
          subtitulo={m.comprometidas.subtitulo}
          arquivo="parcelas-comprometidas"
          dados={dadosComprometidas}
          categoria={{ chave: 'mes', rotulo: m.comprometidas.mes }}
          series={seriesComprometidas}
          vazio={{ frase: m.comprometidas.vazio }}
        >
          <BarrasEmpilhadas
            dados={dadosComprometidas}
            categoria="mes"
            series={seriesComprometidas}
            aoClicar={(l, serie) => {
              if (serie) void navegar(`/cartoes/${serie}?fatura=${String(l.competencia)}`);
            }}
          />
          <Legenda series={seriesComprometidas} />
        </ChartCard>
        <ChartCard
          titulo={m.gasto.titulo}
          subtitulo={m.gasto.subtitulo(formatarData(periodo.de), formatarData(periodo.ate))}
          arquivo="gasto-por-cartao"
          dados={gasto}
          categoria={{ chave: 'cartao', rotulo: m.gasto.cartao }}
          series={serieGasto}
          vazio={{ frase: m.gasto.vazio }}
        >
          <BarrasHorizontais
            dados={gasto}
            categoria="cartao"
            series={serieGasto}
            aoClicar={(l) => {
              lancamentosDo(String(l.cartaoId));
            }}
          />
        </ChartCard>
      </div>
    </div>
  );
}
