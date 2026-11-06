import { type Centavos, centavos } from '@goose-money/core';
import { ArrowDown, ArrowLeftRight, ArrowUp } from 'lucide-react';

import { formatarMoeda, MENOS } from '@/app/formatacao';
import { mensagens } from '@/app/mensagens';
import { usePrivacidade } from '@/app/providers/usePrivacidade';
import { cn } from '@/lib/utils';

export type TipoDeValor = 'receita' | 'despesa' | 'neutro';

const estilo = {
  receita: { cor: 'text-income', Icone: ArrowUp },
  despesa: { cor: 'text-expense', Icone: ArrowDown },
  neutro: { cor: 'text-transfer', Icone: ArrowLeftRight },
} as const;

/**
 * Todo valor em dinheiro do app (4.1, itens 6 e 7). Receita: "+", seta para cima, `income`.
 * Despesa: "−", seta para baixo, `expense` (o sinal vem do tipo, o valor pode vir positivo).
 * Neutro (transferência, pagamento de fatura, ajuste): ícone próprio, `transfer`, sinal do valor.
 * Sem tipo: só o valor, com o sinal dele. No modo privacidade, "R$ ••••••".
 */
export function MoneyText({
  valor,
  tipo,
  className,
}: {
  valor: Centavos;
  tipo?: TipoDeValor;
  className?: string;
}) {
  const { oculto } = usePrivacidade();
  const classe = cn('whitespace-nowrap tabular-nums', tipo && estilo[tipo].cor, className);

  if (oculto)
    return (
      <span className={classe} aria-label={mensagens.privacidade.valorOculto}>
        {mensagens.privacidade.oculto}
      </span>
    );

  if (!tipo) return <span className={classe}>{formatarMoeda(valor)}</span>;

  const { Icone } = estilo[tipo];
  const absoluto = formatarMoeda(centavos(Math.abs(valor)));
  const texto =
    tipo === 'receita'
      ? `+${absoluto}`
      : tipo === 'despesa'
        ? `${MENOS}${absoluto}`
        : formatarMoeda(valor);
  return (
    <span className={cn('inline-flex items-center gap-0.5', classe)}>
      <Icone aria-hidden size="1em" className="shrink-0" />
      {texto}
    </span>
  );
}
