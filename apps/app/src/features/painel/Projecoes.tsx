import {
  type AlertaProjecao,
  centavos,
  type Competencia,
  competenciaDe,
  type DataCivil,
  type Derivado,
  type GrupoProjecao,
  projetarFluxo,
  somarMeses,
  ultimaData,
} from '@goose-money/core';
import { Check, TriangleAlert } from 'lucide-react';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router';

import { formatarData, formatarMes, formatarMesCurto, formatarMoeda } from '@/app/formatacao';
import { ChartCard } from '@/components/ChartCard';
import { corDoTema, type Serie } from '@/components/graficos/dados';
import { Linhas } from '@/components/graficos/Graficos';
import { MoneyText } from '@/components/MoneyText';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

import { mensagensPainel } from './mensagens';

const m = mensagensPainel.projecoes;
const HORIZONTES = [3, 6, 12, 24] as const;
type Horizonte = (typeof HORIZONTES)[number];
const GRUPOS: readonly GrupoProjecao[] = [
  'rendas',
  'receitasAvulsas',
  'gastosFixosConta',
  'faturas',
  'parcelasDividas',
  'despesasAvulsas',
];
const ENTRADA: readonly GrupoProjecao[] = ['rendas', 'receitasAvulsas'];
const ddmm = (d: DataCivil) => formatarData(d).slice(0, 5);
const SERIE: Serie[] = [{ chave: 'saldo', rotulo: m.grafico.saldo, cor: 'primary' }];

function frase(a: AlertaProjecao, limite: string): string {
  if (a.tipo === 'naoIncluido')
    return m.naoIncluido(a.item.texto, formatarMoeda(a.item.valor), ddmm(a.item.data));
  const mes = formatarMes(a.competencia);
  return a.tipo === 'negativo'
    ? m.negativo(mes, formatarMoeda(a.saldoFinal))
    : m.abaixo(mes, formatarMoeda(a.saldoFinal), limite);
}

/**
 * Aba Projeções (6.2, 3.9, PainelProjecoes.dc.html; também `#/projecoes`): horizonte, alertas,
 * gráfico com a faixa do limite de alerta (D48), tabela mês a mês e o detalhamento do mês.
 * Tudo de `projetarFluxo`. O simulador e a quitação são da T05-21.
 */
export function Projecoes({ d }: { d: Derivado }) {
  const [busca, setBusca] = useSearchParams();
  const padrao = d.fatos.preferencias?.horizontePadrao ?? 12;
  const pedido = Number(busca.get('horizonte'));
  const horizonte: Horizonte = HORIZONTES.includes(pedido as Horizonte)
    ? (pedido as Horizonte)
    : padrao;
  const atual = competenciaDe(d.hoje);
  const projecao = useMemo(
    () => projetarFluxo(d, ultimaData(somarMeses(atual, horizonte - 1))),
    [d, atual, horizonte],
  );
  const limite = d.fatos.preferencias?.limiteAlerta ?? centavos(0);
  const meses = projecao.meses;
  const pedidoMes = busca.get('mes');
  const escolhido = meses.find((x) => x.competencia === pedidoMes) ?? meses[0];
  const mudar = (chave: string, valor: string) => {
    setBusca(
      (b) => {
        const x = new URLSearchParams(b);
        x.set(chave, valor);
        return x;
      },
      { replace: true },
    );
  };
  const detalhar = (c: Competencia) => {
    mudar('mes', c);
  };

  const dados = meses.map((x) => ({
    mes: formatarMesCurto(x.competencia),
    competencia: x.competencia,
    saldo: x.saldoFinal,
  }));
  const avisos = projecao.alertas.filter((a) => a.tipo !== 'naoIncluido');
  const fora = projecao.alertas.filter((a) => a.tipo === 'naoIncluido');
  const limiteTexto = formatarMoeda(limite);
  const [primeiro, ultimo] = [meses[0], meses.at(-1)];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-body-md text-on-surface-variant">{m.horizonte}</span>
        <ToggleGroup
          type="single"
          aria-label={m.horizonteDaProjecao}
          value={String(horizonte)}
          onValueChange={(h) => {
            if (h) mudar('horizonte', h);
          }}
        >
          {HORIZONTES.map((h) => (
            <ToggleGroupItem key={h} value={String(h)}>
              {h === horizonte && <Check aria-hidden />}
              {m.meses(h)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div
        role="note"
        className={cn(
          'flex gap-3 rounded-md px-4 py-3 text-body-md',
          avisos.length || fora.length
            ? 'bg-warning-container text-on-warning-container'
            : 'bg-surface-container text-on-surface',
        )}
      >
        {(avisos.length > 0 || fora.length > 0) && (
          <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0" />
        )}
        <div className="flex flex-col gap-1">
          {avisos.length === 0 && <p>{m.nenhumAbaixo(limiteTexto)}</p>}
          {[...avisos, ...fora].map((a, i) => (
            <p key={i}>{frase(a, limiteTexto)}</p>
          ))}
          <p className="text-on-surface-variant">{m.conservadora}</p>
        </div>
      </div>

      <ChartCard
        titulo={m.grafico.titulo}
        subtitulo={m.grafico.subtitulo(
          primeiro ? formatarMesCurto(primeiro.competencia) : '',
          ultimo ? formatarMesCurto(ultimo.competencia) : '',
          limiteTexto,
        )}
        arquivo="saldo-projetado"
        dados={dados}
        categoria={{ chave: 'mes', rotulo: m.grafico.mes }}
        series={SERIE}
        vazio={{ frase: m.grafico.vazio }}
      >
        <Linhas
          dados={dados}
          categoria="mes"
          series={SERIE}
          faixa={{ de: 0, ate: limite, rotulo: m.grafico.faixa, cor: 'warning' }}
          aoClicar={(l) => {
            detalhar(String(l.competencia) as Competencia);
          }}
        />
        <ul aria-hidden className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-label-md font-normal">
          <li className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full" style={{ background: corDoTema('primary') }} />
            {m.grafico.saldo}
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-xs bg-warning/16" />
            {m.grafico.faixaLegenda(limiteTexto)}
          </li>
        </ul>
      </ChartCard>

      <section
        aria-labelledby="projecoes-tabela"
        className="flex flex-col gap-2 rounded-lg border border-surface-container-highest bg-surface-container-lowest px-5 py-4"
      >
        <h2 id="projecoes-tabela" className="text-title-md">
          {m.tabela.titulo}
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{m.tabela.mes}</TableHead>
              <TableHead className="text-right">{m.tabela.saldoInicial}</TableHead>
              {GRUPOS.map((g) => (
                <TableHead key={g} className="text-right">
                  {m.grupos[g]}
                </TableHead>
              ))}
              <TableHead className="text-right">{m.tabela.saldoFinal}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {meses.map((x) => {
              const ativo = x.competencia === escolhido?.competencia;
              return (
                <TableRow key={x.competencia} data-state={ativo ? 'selected' : undefined}>
                  <TableCell>
                    <button
                      type="button"
                      aria-pressed={ativo}
                      className={cn(
                        'alvo cursor-pointer rounded-sm px-2 py-1 text-left font-medium hover:bg-on-surface/8',
                        ativo && 'bg-secondary-container text-on-secondary-container',
                      )}
                      onClick={() => {
                        detalhar(x.competencia);
                      }}
                    >
                      {formatarMesCurto(x.competencia)}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <MoneyText valor={x.saldoInicial} />
                  </TableCell>
                  {GRUPOS.map((g) => (
                    <TableCell key={g} className="text-right">
                      <MoneyText
                        valor={x.grupos[g]}
                        tipo={
                          x.grupos[g] === 0
                            ? undefined
                            : ENTRADA.includes(g)
                              ? 'receita'
                              : 'despesa'
                        }
                      />
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-semibold">
                    <MoneyText
                      valor={x.saldoFinal}
                      className={x.saldoFinal < 0 ? 'text-expense' : undefined}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {primeiro && (
          <p className="text-label-md font-normal text-on-surface-variant">
            {m.tabela.nota(ddmm(d.hoje), ddmm(primeiro.ate))}
          </p>
        )}
      </section>

      {escolhido && (
        <section
          aria-labelledby="projecoes-detalhe"
          className="flex flex-col gap-3 rounded-lg border border-surface-container-highest bg-surface-container-lowest px-5 py-4"
        >
          <h2 id="projecoes-detalhe" className="text-title-md">
            {m.detalhamento(formatarMes(escolhido.competencia))}
          </h2>
          {escolhido.itens.length === 0 && (
            <p className="text-body-md text-on-surface-variant">{m.semItens}</p>
          )}
          {GRUPOS.filter((g) => escolhido.itens.some((i) => i.grupo === g)).map((g) => (
            <section key={g} aria-label={m.grupos[g]} className="flex flex-col gap-1">
              <h3 className="flex justify-between gap-2 text-label-lg">
                <span>{m.grupos[g]}</span>
                <MoneyText
                  valor={escolhido.grupos[g]}
                  tipo={ENTRADA.includes(g) ? 'receita' : 'despesa'}
                />
              </h3>
              <ul>
                {escolhido.itens
                  .filter((i) => i.grupo === g)
                  .map((i, k) => (
                    <li
                      key={`${i.texto}-${String(k)}`}
                      className="flex items-center gap-3 border-t border-surface-container-high py-1.5 text-body-md first:border-t-0"
                    >
                      <span className="w-12 text-on-surface-variant">{ddmm(i.data)}</span>
                      <span className="flex-1">{i.texto}</span>
                      <MoneyText valor={i.valor} />
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </section>
      )}
    </div>
  );
}
