import Decimal from 'decimal.js';

/** Valor monetário em centavos inteiros (PROMPT 2.2). */
export type Centavos = number & { readonly __centavos: true };

/** Converte um inteiro seguro em `Centavos`; qualquer outro número é erro. */
export function centavos(n: number): Centavos {
  if (!Number.isSafeInteger(n))
    throw new RangeError(`Centavos precisa ser inteiro seguro: ${String(n)}`);
  return (n === 0 ? 0 : n) as Centavos; // sem -0
}

export const mais = (a: Centavos, b: Centavos): Centavos => centavos(a + b);
export const menos = (a: Centavos, b: Centavos): Centavos => centavos(a - b);
export const negar = (a: Centavos): Centavos => centavos(0 - a);
export const comparar = (a: Centavos, b: Centavos): -1 | 0 | 1 => (a < b ? -1 : a > b ? 1 : 0);
export const somar = (lista: readonly Centavos[]): Centavos => lista.reduce(mais, centavos(0));

/** `Decimal` do domínio: 34 dígitos, meio para cima (PROMPT 2.2). */
export const D = Decimal.clone({ precision: 34, rounding: Decimal.ROUND_HALF_UP });

/** Único ponto de conversão de `Decimal` para centavos: meio para cima, longe do zero. */
export function paraCentavos(d: Decimal): Centavos {
  return centavos(d.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber());
}

/**
 * Divide `total` em `n` parcelas iguais; o resto de centavos vai para a 1ª
 * (cartão, PROMPT 3.6) ou para a última (dívida com taxa zero, 3.7).
 */
export function ratear(total: Centavos, n: number, resto: 'primeira' | 'ultima'): Centavos[] {
  if (!Number.isSafeInteger(n) || n < 1)
    throw new RangeError(`Número de parcelas inválido: ${String(n)}`);
  if (total < 0) throw new RangeError(`Total negativo: ${String(total)}`);
  const sobra = total % n;
  const base = centavos((total - sobra) / n); // divisão exata, sem fração
  const parcelas = Array<Centavos>(n).fill(base);
  parcelas[resto === 'primeira' ? 0 : n - 1] = mais(base, centavos(sobra));
  return parcelas;
}

/** `parte ÷ todo` como fração (0,25 = 25%); `null` quando `todo = 0`, exibido como "—" (3.10). */
export function percentual(parte: Centavos, todo: Centavos): Decimal | null {
  return todo === 0 ? null : new D(parte).div(todo);
}

/** Máscara que preenche da direita: `"1590"` → 1590 centavos (R$ 15,90, PROMPT 7.3). */
export function deMascara(digitos: string): Centavos {
  return centavos(Number(digitos.replace(/\D/g, '') || '0'));
}
