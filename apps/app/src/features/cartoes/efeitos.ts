import {
  aplicar,
  type Centavos,
  type Comando,
  type Derivado,
  derivar,
  indicadoresDaBarra,
  type IndicadoresDaBarra,
  menos,
  obrigacoesDeCartao,
} from '@goose-money/core';

/** Diferença de cada indicador da Barra e das Obrigações de cartão. */
export interface EfeitosDoComando {
  barra: Record<keyof IndicadoresDaBarra, Centavos>;
  obrigacoes: Centavos;
  /** A derivação com o comando aplicado, para o Limite disponível depois. */
  depois: Derivado;
}

/**
 * "O que muda ao salvar" (4.1 item 5, 6.5): o core deriva os fatos com o comando aplicado e
 * calcula os indicadores; aqui só se compara antes e depois, como o chip de variação da Barra.
 */
export function efeitosDoComando(d: Derivado, comando: Comando): EfeitosDoComando {
  const depois = derivar(aplicar(d.fatos, comando.mudancas), d.hoje);
  const a = indicadoresDaBarra(d);
  const b = indicadoresDaBarra(depois);
  const barra = Object.fromEntries(
    (Object.keys(a) as (keyof IndicadoresDaBarra)[]).map((k) => [k, menos(b[k], a[k])]),
  ) as EfeitosDoComando['barra'];
  return {
    barra,
    obrigacoes: menos(obrigacoesDeCartao(depois), obrigacoesDeCartao(d)),
    depois,
  };
}
