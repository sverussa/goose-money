import { ChartCard } from '@/components/ChartCard';
import type { Linha, Serie } from '@/components/graficos/dados';
import {
  BarrasAgrupadas,
  BarrasEmpilhadas,
  BarrasHorizontais,
  Linhas,
  Rosca,
  Sparkline,
} from '@/components/graficos/Graficos';
import { Button } from '@/components/ui/button';

// Dados de exemplo, só para revisão visual em desenvolvimento.
const meses: Linha[] = [
  { mes: 'set/2026', receitas: 650000, despesas: 512345, resultado: 137655, previsto: 0 },
  { mes: 'out/2026', receitas: 700000, despesas: 498010, resultado: 201990, previsto: 0 },
  { mes: 'nov/2026', receitas: 120000, despesas: 89990, resultado: 30010, previsto: 410000 },
];
const receitasDespesas: Serie[] = [
  { chave: 'receitas', rotulo: 'Receitas', cor: 'income' },
  { chave: 'despesas', rotulo: 'Despesas', cor: 'expense' },
];
const resultado: Serie = { chave: 'resultado', rotulo: 'Resultado', cor: 'transfer' };
const fixosVariaveis: Serie[] = [
  { chave: 'despesas', rotulo: 'Realizado', cor: 'categorica-2' },
  { chave: 'previsto', rotulo: 'Previsto', cor: 'forecast', prevista: true },
];
const categorias: Linha[] = [
  { categoria: 'Moradia', valor: 250000, cor: 'categorica-1' },
  { categoria: 'Transporte', valor: 80000, cor: 'categorica-2' },
  { categoria: 'Alimentação', valor: 120000, cor: 'categorica-3' },
  { categoria: 'Outras', valor: 30000, cor: 'categorica-8' },
];
const valor: Serie = { chave: 'valor', rotulo: 'Valor', cor: 'categorica-1' };
const contas: Linha[] = [
  { conta: 'Conta corrente', saldo: 332251 },
  { conta: 'Poupança', saldo: 1250000 },
  { conta: 'Carteira', saldo: 15000 },
];
const saldo: Serie = { chave: 'saldo', rotulo: 'Saldo', cor: 'categorica-2' };

/** Base dos gráficos (T04-08), na página de componentes. */
export function GraficosDev() {
  const mes = { chave: 'mes', rotulo: 'Mês' };
  return (
    <div className="grid w-full gap-4 expanded:grid-cols-2">
      <ChartCard
        titulo="Você gastou menos do que ganhou nos 3 meses"
        subtitulo="01/09/2026 – 06/11/2026"
        arquivo="receitas-despesas"
        dados={meses}
        categoria={mes}
        series={[...receitasDespesas, resultado]}
        verItens={() => undefined}
        vazio={{ frase: 'Sem lançamentos neste período', acao: <Button>Lançar</Button> }}
      >
        <BarrasAgrupadas
          dados={meses}
          categoria="mes"
          series={receitasDespesas}
          linha={resultado}
        />
      </ChartCard>
      <ChartCard
        titulo="Onde foi o dinheiro"
        subtitulo="Novembro 2026"
        arquivo="despesas-por-categoria"
        dados={categorias}
        categoria={{ chave: 'categoria', rotulo: 'Categoria' }}
        series={[valor]}
        vazio={{ frase: 'Sem despesas neste período' }}
      >
        <Rosca dados={categorias} categoria="categoria" serie={valor} />
      </ChartCard>
      <ChartCard
        titulo="Despesas realizadas e previstas"
        subtitulo="01/09/2026 – 30/11/2026"
        arquivo="realizado-previsto"
        dados={meses}
        categoria={mes}
        series={fixosVariaveis}
        vazio={{ frase: 'Sem despesas neste período' }}
      >
        <BarrasEmpilhadas dados={meses} categoria="mes" series={fixosVariaveis} />
      </ChartCard>
      <ChartCard
        titulo="Resultado mês a mês"
        subtitulo="01/09/2026 – 06/11/2026"
        arquivo="resultado"
        dados={meses}
        categoria={mes}
        series={[resultado]}
        vazio={{ frase: 'Sem lançamentos neste período' }}
      >
        <Linhas dados={meses} categoria="mes" series={[resultado]} />
      </ChartCard>
      <ChartCard
        titulo="A poupança guarda a maior parte"
        subtitulo="Hoje"
        arquivo="saldo-por-conta"
        dados={contas}
        categoria={{ chave: 'conta', rotulo: 'Conta' }}
        series={[saldo]}
        vazio={{ frase: 'Cadastre uma conta para ver os saldos' }}
      >
        <BarrasHorizontais dados={contas} categoria="conta" series={[saldo]} />
      </ChartCard>
      <ChartCard
        titulo="Sem despesas"
        subtitulo="Dezembro 2026"
        arquivo="vazio"
        dados={[]}
        categoria={mes}
        series={receitasDespesas}
        vazio={{
          frase: 'Sem despesas neste período',
          acao: <Button variant="tonal">Lançar despesa</Button>,
        }}
      >
        <BarrasAgrupadas dados={[]} categoria="mes" series={receitasDespesas} />
      </ChartCard>
      <div className="w-48">
        <Sparkline valores={[10, 14, 12, 18, 16, 22]} cor="categorica-1" />
      </div>
    </div>
  );
}
