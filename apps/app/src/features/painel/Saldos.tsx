import {
  causaDoPatrimonioNegativo,
  competenciaDe,
  composicaoDoSaldo,
  type Derivado,
  evolucaoDoPatrimonio,
  obrigacoesDeCartao,
  patrimonioLiquido,
  saldoDevedorDeDividas,
  saldoEmTodasAsContas,
} from '@goose-money/core';
import { Link, useNavigate } from 'react-router';

import { formatarData, formatarMes, formatarMesCurto, formatarMoeda } from '@/app/formatacao';
import { mensagens } from '@/app/mensagens';
import { ChartCard } from '@/components/ChartCard';
import { corDoTema } from '@/components/graficos/dados';
import { BarrasHorizontais, Linhas, Sparkline } from '@/components/graficos/Graficos';
import { MoneyText } from '@/components/MoneyText';
import { PeriodPicker } from '@/components/PeriodPicker';
import { usePeriodoDaUrl } from '@/components/periodo';

import { mensagensPainel } from './mensagens';
import { sparklineDe30Dias, variacaoNoMes } from './contas';

const m = mensagensPainel.saldos;
const b = mensagens.barra;

/** Destaque do Patrimônio líquido com a decomposição e, se negativo, a causa (D47). */
function Patrimonio({ d }: { d: Derivado }) {
  const ativas = d.fatos.contas.filter((c) => !c.arquivada);
  const fora = ativas.filter((c) => !c.incluirNoTotal).map((c) => c.nome);
  const dividas = [...d.dividas.values()]
    .filter((t) => t.resumo.saldoDevedor > 0)
    .map((t) => t.divida.credor);
  const causa = causaDoPatrimonioNegativo(d);
  const partes = [
    {
      rotulo: m.saldoTodas,
      valor: saldoEmTodasAsContas(d),
      detalhe: fora.length
        ? m.incluindo(m.nContas(ativas.length), fora.join(', '))
        : m.nContas(ativas.length),
      destino: '/contas',
    },
    {
      rotulo: m.obrigacoes,
      valor: obrigacoesDeCartao(d),
      detalhe: m.comParcelasFuturas,
      destino: '/?aba=cartoes',
    },
    {
      rotulo: m.devedor,
      valor: saldoDevedorDeDividas(d),
      detalhe: dividas.length ? dividas.join(' + ') : m.semDividas,
      destino: '/dividas',
    },
  ];
  return (
    <section
      aria-labelledby="saldos-patrimonio"
      className="flex flex-col gap-4 rounded-lg bg-surface-container-high px-6 py-5"
    >
      <div className="flex flex-col gap-1">
        <h2 id="saldos-patrimonio" className="text-title-md">
          {m.patrimonio(formatarData(d.hoje))}
        </h2>
        <MoneyText
          valor={patrimonioLiquido(d)}
          className={
            patrimonioLiquido(d) < 0 ? 'text-headline-lg text-expense' : 'text-headline-lg'
          }
        />
        {causa && (
          <p className="text-body-md text-on-surface-variant">
            {m.causa.inicio(
              formatarMoeda(causa.compromissos),
              formatarMoeda(causa.saldoEmTodasAsContas),
            )}{' '}
            {m.causa[causa.maior](formatarMoeda(causa.valorDoMaior))}
          </p>
        )}
      </div>
      <ul aria-label={m.decomposicao} className="flex flex-col gap-3 medium:flex-row">
        {partes.map((p, i) => (
          <li key={p.rotulo} className="flex flex-1 items-center gap-3">
            {i > 0 && (
              <span
                aria-hidden
                className="hidden text-title-lg text-on-surface-variant medium:block"
              >
                −
              </span>
            )}
            <Link
              to={p.destino}
              className="flex h-full flex-1 flex-col gap-0.5 rounded-md bg-surface-container-lowest px-4 py-3 hover:bg-surface-container-low"
            >
              <span className="text-body-md text-on-surface-variant">{p.rotulo}</span>
              <MoneyText valor={p.valor} className="text-title-lg" />
              <span className="text-label-md font-normal text-on-surface-variant">{p.detalhe}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Cards por conta (6.2): saldo atual, variação no mês, sparkline de 30 dias, "Fora do total". */
function CardsDeConta({ d }: { d: Derivado }) {
  const mes = formatarMes(competenciaDe(d.hoje)).split(' ')[0]?.toLocaleLowerCase('pt-BR') ?? '';
  return (
    <section aria-label={m.contas}>
      <ul className="grid gap-4 medium:grid-cols-2 expanded:grid-cols-4">
        {d.fatos.contas
          .filter((c) => !c.arquivada)
          .map((c) => {
            const atual = d.saldos.get(c.id)?.atual ?? null;
            const variacao = variacaoNoMes(d, c);
            return (
              <li key={c.id}>
                <Link
                  to={`/contas/${c.id}`}
                  className="flex h-full flex-col gap-1 rounded-lg border border-surface-container-highest bg-surface-container-lowest px-5 py-4 hover:bg-surface-container-low"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="flex-1 text-body-lg font-medium">{c.nome}</span>
                    {!c.incluirNoTotal && (
                      <span className="rounded-sm bg-surface-container-high px-2 py-0.5 text-label-md font-semibold text-on-surface-variant">
                        {m.foraDoTotal}
                      </span>
                    )}
                  </span>
                  {atual === null ? (
                    <span className="text-title-lg text-on-surface-variant">{m.semSaldo}</span>
                  ) : (
                    <MoneyText valor={atual} className="text-title-lg" />
                  )}
                  {variacao !== null && (
                    <span className="text-label-md font-normal text-on-surface-variant">
                      {m.variacaoNoMes(
                        variacao > 0 ? `+${formatarMoeda(variacao)}` : formatarMoeda(variacao),
                        mes,
                      )}
                    </span>
                  )}
                  <Sparkline valores={sparklineDe30Dias(d, c)} cor={c.cor} />
                </Link>
              </li>
            );
          })}
      </ul>
    </section>
  );
}

/** Aba Saldos (6.2, PainelSaldos.dc.html), sobre hoje; o período vale só para a evolução. */
export function Saldos({ d }: { d: Derivado }) {
  const navegar = useNavigate();
  const [periodo, setPeriodo] = usePeriodoDaUrl('painel-saldos', 'ultimos-3-meses');
  const nomes = new Map(d.fatos.contas.map((c) => [c.id, c.nome]));
  const composicao = composicaoDoSaldo(d).flatMap((x) =>
    x.saldo === null
      ? []
      : [{ conta: nomes.get(x.contaId) ?? '', contaId: x.contaId, saldo: x.saldo }],
  );
  const evolucao = evolucaoDoPatrimonio(d, periodo).map((p) => ({
    mes: formatarMesCurto(p.competencia),
    saldoEmTodasAsContas: p.saldoEmTodasAsContas,
    obrigacoesDeCartao: p.obrigacoesDeCartao,
    saldoDevedor: p.saldoDevedor,
    patrimonio: p.patrimonio,
  }));
  const extrato = (contaId: string) => {
    void navegar(`/contas/${contaId}?mes=${competenciaDe(d.hoje)}`);
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-body-md text-on-surface-variant">{m.periodo}</span>
        <PeriodPicker periodo={periodo} onChange={setPeriodo} />
      </div>
      <Patrimonio d={d} />
      <CardsDeConta d={d} />
      <div className="grid gap-4 expanded:grid-cols-2">
        <ChartCard
          titulo={m.composicao.titulo}
          subtitulo={m.composicao.subtitulo}
          arquivo="composicao-do-saldo"
          dados={composicao}
          categoria={{ chave: 'conta', rotulo: m.composicao.conta }}
          series={[{ chave: 'saldo', rotulo: m.composicao.saldo, cor: 'primary' }]}
          vazio={{ frase: m.composicao.vazio }}
        >
          <BarrasHorizontais
            dados={composicao}
            categoria="conta"
            series={[{ chave: 'saldo', rotulo: m.composicao.saldo, cor: 'primary' }]}
            aoClicar={(l) => {
              extrato(String(l.contaId));
            }}
          />
        </ChartCard>
        <ChartCard
          titulo={m.evolucao.titulo}
          subtitulo={m.evolucao.subtitulo(formatarData(periodo.de), formatarData(periodo.ate))}
          arquivo="evolucao-do-patrimonio"
          dados={evolucao}
          categoria={{ chave: 'mes', rotulo: m.evolucao.mes }}
          series={SERIES_DA_EVOLUCAO}
          vazio={{ frase: m.evolucao.vazio }}
        >
          <Linhas dados={evolucao} categoria="mes" series={SERIES_DA_EVOLUCAO} />
          <ul aria-hidden className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-label-md font-normal">
            {SERIES_DA_EVOLUCAO.map((x) => (
              <li key={x.chave} className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded-full" style={{ background: corDoTema(x.cor) }} />
                {x.rotulo}
              </li>
            ))}
          </ul>
        </ChartCard>
      </div>
    </div>
  );
}

/** As quatro partes do patrimônio: o tooltip de cada ponto mostra a composição (8.1). */
const SERIES_DA_EVOLUCAO = [
  { chave: 'saldoEmTodasAsContas', rotulo: m.saldoTodas, cor: 'primary' },
  { chave: 'obrigacoesDeCartao', rotulo: m.obrigacoes, cor: 'cartao-b-grafico' },
  { chave: 'saldoDevedor', rotulo: m.devedor, cor: 'expense' },
  { chave: 'patrimonio', rotulo: b.patrimonioLiquido.rotulo, cor: 'on-surface' },
];
