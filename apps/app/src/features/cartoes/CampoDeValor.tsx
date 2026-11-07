import { type Centavos, centavos, deMascara } from '@goose-money/core';

import { formatarMoeda } from '@/app/formatacao';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/** Até R$ 999.999.999,99: 11 dígitos. */
const MAX_DIGITOS = 11;

/** Valor positivo com máscara da direita, vazio no zero, como o valor do lançamento. */
export function CampoDeValor({
  id,
  valor,
  aoMudar,
  className,
  ...resto
}: {
  id: string;
  ref?: React.Ref<HTMLInputElement>;
  autoFocus?: boolean;
  valor: number;
  aoMudar: (c: Centavos) => void;
  className?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}) {
  return (
    <Input
      id={id}
      inputMode="numeric"
      autoComplete="off"
      className={cn('h-12', className)}
      placeholder={formatarMoeda(centavos(0))}
      value={valor ? formatarMoeda(centavos(valor)) : ''}
      onChange={(e) => {
        const digitos = e.target.value.replace(/\D/g, '').replace(/^0+/, '');
        if (digitos.length <= MAX_DIGITOS) aoMudar(deMascara(digitos));
      }}
      {...resto}
    />
  );
}
