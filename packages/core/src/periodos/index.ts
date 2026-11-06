/**
 * Períodos do seletor (8.2) e período anterior da **Variação** (3.10).
 * "Hoje" chega como parâmetro (D12); "Últimos N meses" incluem o mês corrente até hoje (D37).
 */
import {
  competenciaDe,
  dataCivil,
  diaNoMes,
  mesesEntre,
  primeiroDia,
  somarDias,
  somarMeses,
  ultimaData,
  type DataCivil,
} from '../datas';

export interface Periodo {
  readonly de: DataCivil;
  readonly ate: DataCivil;
}

export function periodo(de: DataCivil, ate: DataCivil): Periodo {
  if (de > ate) throw new RangeError(`Período inválido: ${de} a ${ate}`);
  return { de, ate };
}

export type Preset =
  | 'este-mes'
  | 'mes-passado'
  | 'ultimos-3-meses'
  | 'ultimos-6-meses'
  | 'ultimos-12-meses'
  | 'este-ano';

const MESES = { 'este-mes': 1, 'ultimos-3-meses': 3, 'ultimos-6-meses': 6, 'ultimos-12-meses': 12 };

export function periodoPreset(preset: Preset, hoje: DataCivil): Periodo {
  if (preset === 'este-ano') return periodo(dataCivil(`${hoje.slice(0, 4)}-01-01`), hoje);
  if (preset === 'mes-passado') {
    const c = somarMeses(competenciaDe(hoje), -1);
    return periodo(primeiroDia(c), ultimaData(c));
  }
  return periodo(primeiroDia(somarMeses(competenciaDe(hoje), 1 - MESES[preset])), hoje);
}

const dia = (d: DataCivil) => Number(d.slice(8));
/** Dias do período, contando as duas pontas. `Date.parse` de `AAAA-MM-DD` é UTC. */
const dias = (p: Periodo) => (Date.parse(p.ate) - Date.parse(p.de)) / 86_400_000 + 1;

/**
 * Setas ◀ ▶: move o período inteiro. Começando no dia 1, move em meses e mantém o corte
 * (último dia do mês ou o mesmo dia); senão, move a mesma quantidade de dias.
 */
export function deslocar(p: Periodo, sentido: -1 | 1): Periodo {
  const inicio = competenciaDe(p.de);
  const fim = competenciaDe(p.ate);
  if (p.de !== primeiroDia(inicio)) {
    const n = sentido * dias(p);
    return periodo(somarDias(p.de, n), somarDias(p.ate, n));
  }
  const n = sentido * (mesesEntre(inicio, fim) + 1);
  const novoFim = somarMeses(fim, n);
  return periodo(
    primeiroDia(somarMeses(inicio, n)),
    p.ate === ultimaData(fim) ? ultimaData(novoFim) : diaNoMes(novoFim, dia(p.ate)),
  );
}

/** Mesma duração, imediatamente antes (base da **Variação**, 3.10). */
export const periodoAnterior = (p: Periodo): Periodo => deslocar(p, -1);

export interface Granularidade {
  readonly padrao: 'dia' | 'mes';
  /** Oferece a opção trimestral (períodos acima de 12 meses). */
  readonly trimestral: boolean;
}

export function granularidade(p: Periodo): Granularidade {
  if (dias(p) <= 31) return { padrao: 'dia', trimestral: false };
  const dozeMeses = diaNoMes(somarMeses(competenciaDe(p.de), 12), dia(p.de));
  return { padrao: 'mes', trimestral: p.ate >= dozeMeses };
}

/** Lê `de` e `ate` (`AAAA-MM-DD`); lança `RangeError` se faltar ou for inválido. */
export const periodoDaUrl = (params: { get(nome: string): string | null }): Periodo =>
  periodo(dataCivil(params.get('de') ?? ''), dataCivil(params.get('ate') ?? ''));

export const periodoParaUrl = (p: Periodo): string => `de=${p.de}&ate=${p.ate}`;
