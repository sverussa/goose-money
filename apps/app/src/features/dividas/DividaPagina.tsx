import {
  conclusaoJurosAmortizacao,
  conclusaoSaldoDevedor,
  type Derivado,
  excluirDivida,
  type TabelaDaDivida,
} from '@goose-money/core';
import { EllipsisVertical, Info, SearchX } from 'lucide-react';
import { type ReactNode, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';

import {
  formatarMesCurto,
  formatarMoeda,
  formatarMoedaCurta,
  formatarPercentual,
  formatarTaxa,
} from '@/app/formatacao';
import { BotaoSalvar } from '@/components/BotaoSalvar';
import { ChartCard } from '@/components/ChartCard';
import { EmptyState, EstadoDaCarga } from '@/components/EstadosDaTela';
import type { Linha, Serie } from '@/components/graficos/dados';
import { BarrasEmpilhadas, Linhas } from '@/components/graficos/Graficos';
import { MoneyText } from '@/components/MoneyText';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ItemDoMenu } from '@/features/cartoes/menu';
import { useDerivado } from '@/queries/fatos';
import { useComando, useContexto } from '@/queries/useComando';

import { AcoesDaDivida } from './AcoesDaDivida';
import { CardsDasDividas, TotaisDasDividas } from './Comum';
import { mensagensDividas } from './mensagens';
import { NovaDivida } from './NovaDivida';
import { TabelaDeAmortizacao } from './TabelaDeAmortizacao';
import {
  type LinhaDaAmortizacao,
  linhasDaTabela,
  permissaoDe,
  pontosDoSaldo,
  pontosDosJuros,
} from './tabela';

const m = mensagensDividas.detalhe;
const g = mensagensDividas.graficos;

/**
 * Ações do detalhe na URL (`?acao=`): Registrar pagamento (com `?parcela=` vindo da pendência do
 * Painel) e Amortizar abrem os diálogos da T05-24; Excluir, a confirmação desta tela.
 */
type AcaoDaDivida = 'pagar' | 'amortizar' | 'excluir';
function useAcaoDaDivida() {
  const [busca, setBusca] = useSearchParams();
  const abrir = (acao: AcaoDaDivida) => {
    setBusca((b) => {
      const x = new URLSearchParams(b);
      x.set('acao', acao);
      return x;
    });
  };
  const fechar = () => {
    setBusca(
      (b) => {
        const x = new URLSearchParams(b);
        x.delete('acao');
        x.delete('parcela');
        return x;
      },
      { replace: true },
    );
  };
  return {
    acao: busca.get('acao') as AcaoDaDivida | null,
    parcela: busca.get('parcela'),
    abrir,
    fechar,
  };
}

/** Termo com tooltip explicativo (1.2), pelo mouse ou pelo teclado. */
function ComDica({ termo, dica, children }: { termo: string; dica: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1">
      {children}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={m.oQueE(termo)}
            className="inline-flex rounded-full text-on-surface-variant"
          >
            <Info aria-hidden className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-72">{dica}</TooltipContent>
      </Tooltip>
    </span>
  );
}

function MenuDaDivida({ t, d, excluir }: { t: TabelaDaDivida; d: Derivado; excluir: () => void }) {
  const contexto = useContexto();
  // O diálogo só abre depois que o menu fecha e devolve o foco ao botão (como em Cartões).
  const excluirAoFechar = useRef(false);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="icon" aria-label={m.menu(t.divida.credor)}>
          <EllipsisVertical aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onCloseAutoFocus={() => {
          if (!excluirAoFechar.current) return;
          excluirAoFechar.current = false;
          excluir();
        }}
      >
        <ItemDoMenu
          rotulo={m.excluir}
          detalhe={m.detalheExcluir}
          permissao={permissaoDe(() => excluirDivida(d.fatos, contexto(), t.divida.id))}
          aoEscolher={() => {
            excluirAoFechar.current = true;
          }}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Confirmação de "Excluir dívida": exclusão lógica da dívida e das parcelas, com Desfazer. */
function ExcluirDivida({
  t,
  d,
  onFechar,
}: {
  t: TabelaDaDivida;
  d: Derivado;
  onFechar: () => void;
}) {
  const { executar, salvando } = useComando();
  const contexto = useContexto();
  const navegar = useNavigate();
  const x = mensagensDividas.excluir;
  return (
    <Dialog
      open
      onOpenChange={(a) => {
        if (!a) onFechar();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{x.titulo(t.divida.credor)}</DialogTitle>
          <DialogDescription>{x.explicacao(t.parcelas.length)}</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="flex flex-wrap items-center justify-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            // O menu só habilita o item quando o core aceita o comando.
            void executar(excluirDivida(d.fatos, contexto(), t.divida.id)).then((ok) => {
              if (ok) void navegar('/dividas', { replace: true });
            });
          }}
        >
          <Button type="button" variant="text" onClick={onFechar}>
            {x.voltar}
          </Button>
          <BotaoSalvar salvando={salvando} variant="destructive">
            {x.confirmar}
          </BotaoSalvar>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Resumo({ t, d }: { t: TabelaDaDivida; d: Derivado }) {
  const { divida, resumo, parcelas } = t;
  const sistema = mensagensDividas.sistema[divida.sistemaAmortizacao];
  const primeira = parcelas[0];
  const antes = parcelas.filter((p) => p.status === 'paga_antes_do_cadastro').length;
  const categoria = divida.categoriaId ? d.porId.categorias.get(divida.categoriaId)?.nome : null;
  const itens: { rotulo: ReactNode; valor: ReactNode }[] = [
    { rotulo: m.valorContratado, valor: <MoneyText valor={resumo.valorContratado} /> },
    {
      rotulo: resumo.taxaImplicita ? (
        <ComDica termo={m.taxaImplicita} dica={m.dicaTaxaImplicita}>
          {m.taxaImplicita}
        </ComDica>
      ) : (
        m.taxaInformada
      ),
      valor: m.taxa(formatarTaxa(resumo.taxa)),
    },
    {
      rotulo: (
        <ComDica termo={sistema} dica={m.dicaSistema[divida.sistemaAmortizacao]}>
          {m.sistema(sistema)}
        </ComDica>
      ),
      valor:
        divida.sistemaAmortizacao === 'sac' || !primeira
          ? m.nParcelas(resumo.total)
          : m.parcelas(resumo.total, formatarMoeda(primeira.valor)),
    },
    { rotulo: m.destino, valor: mensagensDividas.destino[divida.destinoDoValor] },
    { rotulo: m.totalPago, valor: <MoneyText valor={resumo.totalPago} /> },
    {
      rotulo: m.juros,
      valor: m.jurosValores(formatarMoeda(resumo.jurosPagos), formatarMoeda(resumo.jurosAPagar)),
    },
  ];
  return (
    <>
      <dl
        aria-label={m.resumo}
        className="grid grid-cols-2 gap-4 medium:grid-cols-3 expanded:grid-cols-6"
      >
        {itens.map((i, k) => (
          <div key={k} className="flex flex-col gap-0.5">
            <dt className="text-label-md font-normal text-on-surface-variant">{i.rotulo}</dt>
            <dd className="text-body-lg font-semibold">{i.valor}</dd>
          </div>
        ))}
      </dl>
      <p role="note" className="rounded-md bg-surface-container px-4 py-3 text-body-md">
        {divida.destinoDoValor === 'pago_a_terceiro'
          ? m.comoConta.pago_a_terceiro(categoria ?? m.semCategoria)
          : m.comoConta.creditado_em_conta}
        {antes > 0 && ` ${m.antesDoCadastro(antes)}`}
      </p>
    </>
  );
}

const SERIES_DO_SALDO: Serie[] = [
  { chave: 'pago', rotulo: g.saldo.pago, cor: 'primary' },
  { chave: 'previsto', rotulo: g.saldo.previsto, cor: 'primary', prevista: true },
];
const SERIES_DOS_JUROS: Serie[] = [
  { chave: 'amortizacao', rotulo: g.juros.amortizacao, cor: 'primary' },
  { chave: 'juros', rotulo: g.juros.juros, cor: 'categorica-3' },
];

function Graficos({
  t,
  linhas,
  destacar,
}: {
  t: TabelaDaDivida;
  linhas: readonly LinhaDaAmortizacao[];
  destacar: (numero: number) => void;
}) {
  const saldo = conclusaoSaldoDevedor(t.resumo);
  const juros = conclusaoJurosAmortizacao(t.parcelas);
  const pontosSaldo = pontosDoSaldo(t, linhas);
  const pontosJuros = pontosDosJuros(t);
  const aoClicar = (l: Linha) => {
    destacar(Number(l.numero));
  };
  const categoria = { chave: 'numero', rotulo: g.numero };
  return (
    <div className="grid gap-4 expanded:grid-cols-2">
      <ChartCard
        titulo={
          saldo.tipo === 'emAberto'
            ? g.saldo.emAberto(
                formatarMoedaCurta(saldo.saldoDevedor),
                formatarMesCurto(saldo.quitacao),
              )
            : g.saldo.quitada
        }
        subtitulo={g.saldo.subtitulo(t.resumo.total, t.resumo.pagas)}
        arquivo="saldo-devedor"
        dados={pontosSaldo}
        categoria={categoria}
        series={SERIES_DO_SALDO}
        vazio={{ frase: g.saldo.vazio }}
        rodape={
          <p className="text-label-md font-normal text-on-surface-variant">{g.dicaDoClique}</p>
        }
      >
        <Linhas
          dados={pontosSaldo}
          categoria="numero"
          series={SERIES_DO_SALDO}
          aoClicar={aoClicar}
        />
      </ChartCard>
      <ChartCard
        titulo={
          juros.tipo === 'semJuros'
            ? g.juros.semJuros
            : juros.tipo === 'outra'
              ? g.juros.outra(formatarPercentual(juros.fatiaDosJuros))
              : g.juros[juros.tipo]
        }
        subtitulo={g.juros.subtitulo}
        arquivo="juros-amortizacao"
        dados={pontosJuros}
        categoria={categoria}
        series={SERIES_DOS_JUROS}
        vazio={{ frase: g.juros.vazio }}
        rodape={
          <p className="text-label-md font-normal text-on-surface-variant">{g.dicaDoClique}</p>
        }
      >
        <BarrasEmpilhadas
          dados={pontosJuros}
          categoria="numero"
          series={SERIES_DOS_JUROS}
          aoClicar={aoClicar}
        />
      </ChartCard>
    </div>
  );
}

function Detalhe({ t, d }: { t: TabelaDaDivida; d: Derivado }) {
  const { acao, parcela, abrir, fechar } = useAcaoDaDivida();
  const [destacada, setDestacada] = useState<{ numero: number; vez: number } | null>(null);
  const linhas = linhasDaTabela(t);
  const emAberto = t.resumo.proximaParcela !== null;
  return (
    <>
      <Card className="gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="flex-1 text-title-lg">{t.divida.credor}</h2>
          {emAberto && (
            <>
              <Button
                variant="outlined"
                onClick={() => {
                  abrir('amortizar');
                }}
              >
                {m.amortizar}
              </Button>
              <Button
                onClick={() => {
                  abrir('pagar');
                }}
              >
                {m.registrarPagamento}
              </Button>
            </>
          )}
          <MenuDaDivida
            t={t}
            d={d}
            excluir={() => {
              abrir('excluir');
            }}
          />
        </div>
        <Resumo t={t} d={d} />
      </Card>
      <Graficos
        t={t}
        linhas={linhas}
        destacar={(numero) => {
          setDestacada((x) => ({ numero, vez: (x?.vez ?? 0) + 1 }));
        }}
      />
      <TabelaDeAmortizacao t={t} linhas={linhas} destacada={destacada} />
      {acao === 'excluir' && <ExcluirDivida t={t} d={d} onFechar={fechar} />}
      {emAberto && (acao === 'pagar' || acao === 'amortizar') && (
        <AcoesDaDivida acao={acao} escolhida={parcela} t={t} d={d} onFechar={fechar} />
      )}
    </>
  );
}

/** `#/dividas/:id` (6.6, DividaDetalhe.dc.html): resumo, gráficos e tabela de amortização (T05-22). */
export function DividaPagina() {
  const { id } = useParams();
  const derivado = useDerivado();
  if (derivado.estado !== 'pronto') return <EstadoDaCarga carga={derivado} />;
  const d = derivado.dados;
  const t = id ? d.dividas.get(id) : undefined;
  return (
    <div className="flex flex-col gap-4">
      <TotaisDasDividas d={d} />
      <NovaDivida d={d} />
      {t ? (
        <>
          <CardsDasDividas d={d} atual={t.divida.id} />
          <Detalhe t={t} d={d} />
        </>
      ) : (
        <EmptyState
          Icone={SearchX}
          frase={mensagensDividas.naoEncontrada}
          acao={
            <Button asChild variant="outlined">
              <Link to="/dividas">{mensagensDividas.voltar}</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
