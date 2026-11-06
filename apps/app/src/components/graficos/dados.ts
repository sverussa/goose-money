import { type Centavos, centavos, percentual, somar } from '@goose-money/core';

import { formatarMoeda, formatarPercentual } from '@/app/formatacao';
import { mensagens } from '@/app/mensagens';

/** Um ponto do gráfico: o rótulo da categoria (mês, dia, fatia) e os centavos de cada série. */
export type Linha = Record<string, string | number>;

export interface Serie {
  /** Campo da `Linha` com o valor, em centavos. */
  chave: string;
  rotulo: string;
  /** Chave de cor do tema (D77): `income`, `expense`, `categorica-3`, `cartao-a`… */
  cor: string;
  /** Previsto: tracejado nas linhas e hachura `forecast` nas barras (8.3). */
  prevista?: boolean;
}

/** Cor do tema para uma chave (D77); `null` é a cor neutra das categorias de sistema. */
export function corDoTema(chave: string | null): string {
  if (chave === null) return 'var(--color-cat-sistema)';
  const n = /^categorica-(\d+)$/.exec(chave)?.[1];
  return `var(--color-${n ? `cat-${n}` : chave})`;
}

/** Centavos de uma linha; texto, `NaN` ou `Infinity` contam como zero (nunca chegam à tela). */
export function valorDe(linha: Linha, chave: string): Centavos {
  const v = linha[chave];
  return typeof v === 'number' && Number.isFinite(v) ? centavos(Math.round(v)) : centavos(0);
}

export const totalDaSerie = (dados: readonly Linha[], chave: string): Centavos =>
  somar(dados.map((l) => valorDe(l, chave)));

/** Fatia do total da série, para o tooltip; "—" quando o total é zero (3.10). */
export function participacao(parte: Centavos, total: Centavos): string {
  const p = percentual(parte, total);
  return formatarPercentual(p === null ? { tipo: 'indisponivel' } : { tipo: 'valor', valor: p });
}

/** Sem pontos, ou todos os valores zerados: o card mostra o estado vazio. */
export const semDados = (dados: readonly Linha[], series: readonly Serie[]): boolean =>
  dados.every((l) => series.every((s) => valorDe(l, s.chave) === 0));

/** Resumo textual para o `aria-label` do gráfico (4.1, item 10; 8.3). */
export function resumirSeries(
  dados: readonly Linha[],
  categoria: string,
  series: readonly Serie[],
  oculto = false,
): string {
  if (semDados(dados, series)) return mensagens.graficos.semDados;
  if (oculto) return mensagens.graficos.resumoOculto(series.map((s) => s.rotulo).join(', '));
  return series
    .map((s) => {
      const maior = dados.reduce((a, b) => (valorDe(b, s.chave) > valorDe(a, s.chave) ? b : a));
      return mensagens.graficos.resumoDaSerie(
        s.rotulo,
        formatarMoeda(totalDaSerie(dados, s.chave)),
        formatarMoeda(valorDe(maior, s.chave)),
        String(maior[categoria] ?? ''),
      );
    })
    .join(' ');
}

const campo = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
/** Centavos como "1234,56", sem "R$" nem milhar, para a planilha ler como número. */
const decimal = (c: Centavos) => {
  const d = String(Math.abs(c)).padStart(3, '0');
  return `${c < 0 ? '-' : ''}${d.slice(0, -2)},${d.slice(-2)}`;
};

/** CSV com cabeçalho em português e uma linha por ponto; `;` e vírgula decimal (planilha pt-BR). */
export function gerarCsv(
  dados: readonly Linha[],
  categoria: { chave: string; rotulo: string },
  series: readonly Serie[],
): string {
  const cabecalho = [categoria.rotulo, ...series.map((s) => s.rotulo)].map(campo).join(';');
  const linhas = dados.map((l) =>
    [
      campo(String(l[categoria.chave] ?? '')),
      ...series.map((s) => decimal(valorDe(l, s.chave))),
    ].join(';'),
  );
  return `${[cabecalho, ...linhas].join('\n')}\n`;
}
