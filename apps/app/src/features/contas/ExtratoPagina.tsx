import { type Conta, type Derivado } from '@goose-money/core';
import { ArrowLeft, Download, SearchX } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router';

import { useLancar } from '@/app/casca/useLancar';
import { formatarData, formatarMes, formatarMoeda } from '@/app/formatacao';
import { ContextHeader, type IndicadorDoCabecalho } from '@/components/ContextHeader';
import { EmptyState, EstadoDaCarga } from '@/components/EstadosDaTela';
import { MoneyText } from '@/components/MoneyText';
import { MonthSelector } from '@/components/MonthSelector';
import { useMesDaUrl } from '@/components/periodo';
import { StatusChip } from '@/components/StatusChip';
import { Button } from '@/components/ui/button';
import { toggleVariants } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';
import { salvarArquivo } from '@/plataforma/arquivos';
import { useDerivado } from '@/queries/fatos';

import { csvDoExtrato, extratoDaTela, nomeDoCsv } from './extrato';
import { mensagensContas } from './mensagens';

const m = mensagensContas.extrato;

/** Chips das contas ativas, na ordem da lista (6.4); a escolhida marcada. */
function SeletorDeConta({ d, contaId }: { d: Derivado; contaId: string }) {
  const [busca] = useSearchParams();
  const ativas = d.fatos.contas.filter((c) => !c.arquivada);
  return (
    <nav aria-label={m.contas} className="flex flex-1 flex-wrap gap-2">
      {ativas.map((c) => (
        <Link
          key={c.id}
          to={{ pathname: `/contas/${c.id}`, search: busca.toString() }}
          aria-current={c.id === contaId ? 'page' : undefined}
          data-state={c.id === contaId ? 'on' : 'off'}
          className={toggleVariants()}
        >
          {c.nome}
          {!c.incluirNoTotal && (
            <span className="rounded-xs bg-surface-container px-1.5 text-label-md font-normal">
              {mensagensContas.foraDoTotal}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}

function Extrato({ d, conta }: { d: Derivado; conta: Conta }) {
  const [mes] = useMesDaUrl();
  const lancar = useLancar();
  const e = extratoDaTela(d, conta, mes);
  const saldoAtual = d.saldos.get(conta.id)?.atual ?? null;
  const comSaldo = e.abertura !== null;
  const c = m.colunas;

  const indicadores: IndicadorDoCabecalho[] = [
    ...(e.abertura === null || e.fechamento === null
      ? []
      : [
          { rotulo: m.abertura(e.diaDaAbertura), valor: e.abertura },
          { rotulo: m.entradas, valor: e.entradas, tipo: 'receita' as const },
          { rotulo: m.saidas, valor: e.saidas, tipo: 'despesa' as const },
          { rotulo: m.fechamento(e.diaDoFechamento), valor: e.fechamento },
        ]),
    ...(saldoAtual === null ? [] : [{ rotulo: m.atual, valor: saldoAtual }]),
  ];

  return (
    <>
      <MonthSelector />
      <ContextHeader rotulo={m.totais} indicadores={indicadores} />
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="icon" aria-label={m.voltar}>
          <Link to="/contas">
            <ArrowLeft aria-hidden />
          </Link>
        </Button>
        <h2 className="text-title-lg">{conta.nome}</h2>
        {conta.arquivada && (
          <span className="text-body-md text-on-surface-variant">{m.somenteLeitura}</span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SeletorDeConta d={d} contaId={conta.id} />
        {/* Conta arquivada: só leitura, sem ações que gravam (6.4). */}
        {!conta.arquivada && <Button onClick={lancar}>{m.lancar}</Button>}
        <Button
          variant="icon"
          aria-label={m.exportarCsv}
          onClick={() => {
            void salvarArquivo({
              nomeSugerido: nomeDoCsv(conta, mes),
              tipo: 'text/csv',
              conteudo: csvDoExtrato(e),
            });
          }}
        >
          <Download aria-hidden />
        </Button>
      </div>

      <section className="overflow-hidden rounded-lg border border-surface-container-highest bg-surface-container-lowest">
        <div className="overflow-x-auto">
          <table className="w-full min-w-180 border-collapse text-body-md">
            <caption className="sr-only">{m.tabela(conta.nome, formatarMes(mes))}</caption>
            <thead>
              <tr className="bg-surface-container-low text-left text-label-md text-on-surface-variant">
                <th scope="col" className="w-16 px-4 py-3 font-medium">
                  {c.data}
                </th>
                <th scope="col" className="px-2 py-3 font-medium">
                  {c.descricao}
                </th>
                <th scope="col" className="px-2 py-3 font-medium">
                  {c.categoria}
                </th>
                <th scope="col" className="px-2 py-3 text-right font-medium">
                  {c.valor}
                </th>
                {comSaldo && (
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    {c.saldo}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {e.abertura !== null && (
                <tr className="bg-surface text-on-surface-variant">
                  <td className="px-4 py-3">{e.diaDaAbertura}</td>
                  <th scope="row" colSpan={3} className="px-2 py-3 text-left font-medium">
                    {m.linhaAbertura}
                  </th>
                  <td className="px-4 py-3 text-right font-semibold text-on-surface">
                    <MoneyText valor={e.abertura} />
                  </td>
                </tr>
              )}
              {e.linhas.length === 0 && (
                <tr className="border-t border-surface-container-low">
                  <td
                    colSpan={comSaldo ? 5 : 4}
                    className="px-4 py-6 text-center text-on-surface-variant"
                  >
                    {m.semMovimentos}
                  </td>
                </tr>
              )}
              {e.linhas.map((l) => {
                const { lancamento, valor } = l.movimento;
                const neutro = !(lancamento.tipo === 'receita' || lancamento.tipo === 'despesa');
                return (
                  <tr key={lancamento.id} className="border-t border-surface-container-low">
                    <td className="px-4 py-3.5 text-on-surface-variant">
                      {formatarData(lancamento.data).slice(0, 5)}
                    </td>
                    <td className="px-2 py-3.5">
                      <span className="flex flex-wrap items-center gap-2.5">
                        <span className="font-medium">{l.texto}</span>
                        {l.anteriorAoSaldoInicial && <StatusChip estado="anteriorAoSaldoInicial" />}
                      </span>
                    </td>
                    <td className="px-2 py-3.5 text-on-surface-variant">{l.categoriaOuTipo}</td>
                    <td className="px-2 py-3.5 text-right font-semibold">
                      <MoneyText
                        valor={valor}
                        tipo={neutro ? 'neutro' : valor > 0 ? 'receita' : 'despesa'}
                        className={cn(l.anteriorAoSaldoInicial && 'text-on-surface-variant')}
                      />
                    </td>
                    {comSaldo && (
                      <td className="px-4 py-3.5 text-right">
                        {l.saldo === null ? (
                          <span title={m.antesDoSaldo} aria-label={m.antesDoSaldo}>
                            —
                          </span>
                        ) : (
                          <MoneyText valor={l.saldo} />
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
              {e.fechamento !== null && (
                <tr className="border-t-2 border-surface-container-highest bg-surface">
                  <td className="px-4 py-3.5 text-on-surface-variant">{e.diaDoFechamento}</td>
                  <th scope="row" colSpan={3} className="px-2 py-3.5 text-left font-semibold">
                    {m.linhaFechamento}
                  </th>
                  <td className="px-4 py-3.5 text-right font-bold">
                    <MoneyText valor={e.fechamento} />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <p className="text-body-md text-on-surface-variant">
        {m.nota(formatarMoeda(conta.saldoInicial), formatarData(conta.dataSaldoInicial))}
      </p>
    </>
  );
}

/** `#/contas/:id` (6.4, ContaExtrato.dc.html): o extrato do mês da conta (T05-09). */
export function ExtratoPagina() {
  const { id } = useParams();
  const derivado = useDerivado();
  if (derivado.estado !== 'pronto') return <EstadoDaCarga carga={derivado} />;
  const conta = derivado.dados.fatos.contas.find((c) => c.id === id);
  return (
    <div className="flex flex-col gap-4">
      {conta ? (
        <Extrato d={derivado.dados} conta={conta} />
      ) : (
        <EmptyState
          Icone={SearchX}
          frase={m.naoEncontrada}
          acao={
            <Button asChild variant="outlined">
              <Link to="/contas">{m.voltar}</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
