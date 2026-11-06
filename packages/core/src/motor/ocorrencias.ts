import { competenciaDe, somarMeses, type DataCivil } from '../datas';
import { type OcorrenciaDoMes, ocorrenciasDoMes } from '../recorrencias';
import type { Derivado } from './derivar';

/**
 * Interno ao Motor (fora do index). Ocorrências de recorrências ativas desde o início da mais
 * antiga até o mês de `ate` (3.9, 6.2): o mês de hoje vem do `Derivado`; os outros, de
 * `ocorrenciasDoMes`.
 */
export function ocorrenciasAte(derivado: Derivado, ate: DataCivil): OcorrenciaDoMes[] {
  const { fatos, hoje } = derivado;
  const atual = competenciaDe(hoje);
  const inicio = fatos.recorrencias
    .filter((r) => r.ativa)
    .reduce((a, r) => (r.competenciaInicio < a ? r.competenciaInicio : a), atual);
  const lista: OcorrenciaDoMes[] = [];
  for (let m = inicio; m <= competenciaDe(ate); m = somarMeses(m, 1))
    lista.push(...(m === atual ? derivado.ocorrenciasDoMes : ocorrenciasDoMes(fatos, m, hoje)));
  return lista;
}
