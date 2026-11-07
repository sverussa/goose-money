import { type Centavos, centavos } from '@goose-money/core';
import { Check } from 'lucide-react';
import { useState } from 'react';

import { formatarMoeda } from '@/app/formatacao';
import { Input } from '@/components/ui/input';
import { Toggle } from '@/components/ui/toggle';

import { mensagensContas } from './mensagens';

/** Até R$ 999.999.999,99: 11 dígitos. */
const MAX_DIGITOS = 11;

/**
 * Saldo com máscara da direita e sinal (6.4): só dígitos no campo e o chip "Negativo" ao lado
 * (cheque especial). Vazio no zero, como o valor do lançamento: o primeiro dígito já vale.
 */
export function CampoDeSaldo({
  id,
  valor,
  aoMudar,
  descricao,
}: {
  id: string;
  valor: number;
  aoMudar: (c: Centavos) => void;
  /** Id do texto de ajuda (`aria-describedby`). */
  descricao?: string;
}) {
  // Com saldo zero, o sinal escolhido fica guardado até o primeiro dígito.
  const [sinalNegativo, setSinalNegativo] = useState(valor < 0);
  const absoluto = Math.abs(valor);
  const negativo = valor < 0 || (valor === 0 && sinalNegativo);
  const com = (n: number, neg: boolean) => centavos(neg ? -n : n);
  return (
    <div className="flex items-center gap-2">
      <Input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        className="h-12 flex-1"
        aria-describedby={descricao}
        placeholder={formatarMoeda(centavos(0))}
        value={absoluto === 0 ? '' : formatarMoeda(com(absoluto, negativo))}
        onChange={(e) => {
          const digitos = e.target.value.replace(/\D/g, '').replace(/^0+/, '');
          if (digitos.length <= MAX_DIGITOS) aoMudar(com(Number(digitos || '0'), negativo));
        }}
      />
      <Toggle
        className="h-12"
        pressed={negativo}
        onPressedChange={(p) => {
          setSinalNegativo(p);
          aoMudar(com(absoluto, p));
        }}
      >
        {negativo && <Check aria-hidden />}
        {mensagensContas.formulario.negativo}
      </Toggle>
    </div>
  );
}
