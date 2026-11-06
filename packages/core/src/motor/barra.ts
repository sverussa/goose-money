import { competenciaDe, primeiroDia, ultimaData } from '../datas';
import type { Centavos } from '../dinheiro';
import { periodo } from '../periodos';
import type { Derivado } from './derivar';
import { aPagarNosCartoes, patrimonioLiquido, resultado, saldoEmContas } from './indicadores';
import { previstoAteOFimDoMes } from './projecao';

export interface IndicadoresDaBarra {
  saldoEmContas: Centavos;
  previstoAteOFimDoMes: Centavos;
  aPagarNosCartoes: Centavos;
  resultadoDoMes: Centavos;
  patrimonioLiquido: Centavos;
}

/**
 * Barra de Totais (5.3), sempre sobre hoje e o mês corrente. O **Resultado** é o do mês
 * inteiro: fatura e parcela de dívida que vencem depois de hoje, no mês, já contam (7.4).
 */
export function indicadoresDaBarra(d: Derivado): IndicadoresDaBarra {
  const mes = competenciaDe(d.hoje);
  return {
    saldoEmContas: saldoEmContas(d),
    previstoAteOFimDoMes: previstoAteOFimDoMes(d),
    aPagarNosCartoes: aPagarNosCartoes(d),
    resultadoDoMes: resultado(d, periodo(primeiroDia(mes), ultimaData(mes))),
    patrimonioLiquido: patrimonioLiquido(d),
  };
}
