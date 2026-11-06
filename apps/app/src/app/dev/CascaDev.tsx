import { centavos } from '@goose-money/core';
import { Landmark } from 'lucide-react';

import { ContextHeader } from '@/components/ContextHeader';
import { EmptyState, EstadoCarregando, EstadoErro } from '@/components/EstadosDaTela';
import { MonthSelector } from '@/components/MonthSelector';
import { usePeriodoDaUrl } from '@/components/periodo';
import { PeriodPicker } from '@/components/PeriodPicker';
import { Button } from '@/components/ui/button';

// Valores de exemplo, só para revisão visual em desenvolvimento (`#/dev/casca`, dentro da casca).
export function CascaDev() {
  const [periodo, setPeriodo] = usePeriodoDaUrl('dev', 'ultimos-3-meses');
  return (
    <div className="flex flex-col gap-6">
      <MonthSelector />
      <ContextHeader
        rotulo="Totais do mês"
        indicadores={[
          { rotulo: 'Saldo de abertura', valor: centavos(290410) },
          { rotulo: 'Entradas', valor: centavos(770000), tipo: 'receita' },
          { rotulo: 'Saídas', valor: centavos(728159), tipo: 'despesa' },
          { rotulo: 'Saldo de fechamento', valor: centavos(332251) },
        ]}
        acoes={<Button variant="outlined">Exportar CSV</Button>}
      />
      <PeriodPicker periodo={periodo} onChange={setPeriodo} />
      <EmptyState
        Icone={Landmark}
        frase="Cadastre uma conta para começar a lançar."
        acao={<Button>Nova conta</Button>}
      />
      <EstadoCarregando linhas={2} />
      <EstadoErro
        mensagem="Não foi possível carregar os seus dados."
        tentarDeNovo={() => undefined}
      />
      <ul className="flex flex-col">
        {Array.from({ length: 60 }, (_, i) => (
          <li
            key={i}
            className="min-h-item border-b border-surface-container-high py-4 text-body-md"
          >
            Item {i + 1}
          </li>
        ))}
      </ul>
    </div>
  );
}
