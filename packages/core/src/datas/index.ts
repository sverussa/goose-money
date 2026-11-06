/**
 * Datas civis sem fuso (D6). `AAAA-MM-DD` e `AAAA-MM` com ano de 4 dígitos
 * ordenam como texto, então comparar strings é comparar datas.
 * O core nunca lê o relógio: "hoje" chega como parâmetro (D12).
 */

/** Data civil `AAAA-MM-DD`. */
export type DataCivil = string & { readonly __dataCivil: true };
/** Mês de competência `AAAA-MM`. */
export type Competencia = string & { readonly __competencia: true };

const doisDigitos = (n: number) => String(n).padStart(2, '0');
const partes = (s: string) => s.split('-').map(Number) as [number, number, number];

export function competencia(s: string): Competencia {
  if (!/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(s)) throw new RangeError(`Competência inválida: ${s}`);
  return s as Competencia;
}

export function ultimoDiaDoMes(c: Competencia): number {
  const [ano, mes] = partes(c);
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate(); // dia 0 do mês seguinte
}

export function dataCivil(s: string): DataCivil {
  const [ano, mes, dia] = partes(s);
  if (
    !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(s) ||
    dia < 1 ||
    dia > ultimoDiaDoMes(competencia(`${String(ano)}-${doisDigitos(mes)}`))
  )
    throw new RangeError(`Data inválida: ${s}`);
  return s as DataCivil;
}

export const competenciaDe = (d: DataCivil): Competencia => d.slice(0, 7) as Competencia;

export const compararDatas = (a: DataCivil, b: DataCivil): -1 | 0 | 1 =>
  a < b ? -1 : a > b ? 1 : 0;
export const maxData = (a: DataCivil, b: DataCivil): DataCivil => (a > b ? a : b);
export const minData = (a: DataCivil, b: DataCivil): DataCivil => (a < b ? a : b);

/** Soma `n` dias (negativo subtrai), em UTC para não sofrer com horário de verão. */
export function somarDias(d: DataCivil, n: number): DataCivil {
  const [ano, mes, dia] = partes(d);
  return new Date(Date.UTC(ano, mes - 1, dia + n)).toISOString().slice(0, 10) as DataCivil;
}

const indice = (c: Competencia) => {
  const [ano, mes] = partes(c);
  return ano * 12 + mes - 1;
};

export function somarMeses(c: Competencia, n: number): Competencia {
  const i = indice(c) + n;
  return competencia(`${String(Math.floor(i / 12))}-${doisDigitos((i % 12) + 1)}`);
}

/** Quantos meses de `de` até `ate` (negativo se `ate` vem antes). */
export const mesesEntre = (de: Competencia, ate: Competencia): number => indice(ate) - indice(de);

/** O dia `dia` do mês; dia inexistente (29 a 31) vira o último dia do mês (3.11). */
export function diaNoMes(c: Competencia, dia: number): DataCivil {
  if (!Number.isInteger(dia) || dia < 1 || dia > 31)
    throw new RangeError(`Dia inválido: ${String(dia)}`);
  return `${c}-${doisDigitos(Math.min(dia, ultimoDiaDoMes(c)))}` as DataCivil;
}

export const primeiroDia = (c: Competencia): DataCivil => `${c}-01` as DataCivil;
export const ultimaData = (c: Competencia): DataCivil => diaNoMes(c, 31);
