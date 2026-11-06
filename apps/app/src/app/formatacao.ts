import type { Centavos, Competencia, DataCivil, Razao } from '@goose-money/core';

import { mensagens } from './mensagens';

/** O `Decimal` do core, sem o app depender do decimal.js. */
type Decimal = Extract<Razao, { tipo: 'valor' }>['valor'];

/** Sinal de menos tipográfico (U+2212): negativos nunca com hífen nem entre parênteses (4.3). */
export const MENOS = '−';

const moeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  signDisplay: 'negative',
});
const moedaCurta = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
  signDisplay: 'negative',
});
const porcento = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: 'negative',
});
const taxa = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

const comMenos = (s: string) => s.replace('-', MENOS);

/** Centavos como decimal exato em texto (`-8990` → `"-89.90"`), sem passar por ponto flutuante. */
function decimal(c: Centavos): `${number}` {
  const digitos = String(Math.abs(c)).padStart(3, '0');
  return `${c < 0 ? '-' : ''}${digitos.slice(0, -2)}.${digitos.slice(-2)}` as `${number}`;
}

/** `−8990` → "−R$ 89,90" (2.2). */
export const formatarMoeda = (c: Centavos): string => comMenos(moeda.format(decimal(c)));

/** Para eixos de gráfico: "R$ 1,2 mil", "R$ 3,4 mi". */
export const formatarMoedaCurta = (c: Centavos): string => comMenos(moedaCurta.format(decimal(c)));

/** Percentual com 1 casa (2.2); "—" quando indisponível e "Novo" quando não havia base (3.10). */
export function formatarPercentual(r: Razao): string {
  if (r.tipo === 'indisponivel') return mensagens.indisponivel;
  if (r.tipo === 'novo') return mensagens.estados.novo;
  return comMenos(porcento.format(r.valor.toNumber()));
}

/** Taxa de juros como fração (`"0.0149"`) → "1,49%", com 2 a 4 casas (2.2). */
export const formatarTaxa = (i: string | Decimal): string =>
  taxa.format(typeof i === 'string' ? Number(i) : i.toNumber());

/** `2026-11-04` → "04/11/2026" (1.2). */
export function formatarData(d: DataCivil): string {
  const [a, m, dia] = d.split('-');
  return `${dia ?? ''}/${m ?? ''}/${a ?? ''}`;
}

const mesDe = (c: Competencia) => Number(c.slice(5, 7)) - 1;

/** `2026-11` → "Novembro 2026". */
export const formatarMes = (c: Competencia): string =>
  `${mensagens.meses[mesDe(c)] ?? ''} ${c.slice(0, 4)}`;

/** `2026-11` → "nov/2026". */
export const formatarMesCurto = (c: Competencia): string =>
  `${mensagens.mesesCurtos[mesDe(c)] ?? ''}/${c.slice(0, 4)}`;
