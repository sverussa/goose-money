import {
  type Centavos,
  centavos,
  competencia,
  type ConclusaoSimulacao,
  competenciaDe,
  type DataCivil,
  type Hipotetico,
  type Id,
} from '@goose-money/core';

import { formatarMes, formatarMoeda } from '@/app/formatacao';
import { dataValida, MAX_PARCELAS } from '@/features/cartoes/compra';

import { mensagensPainel } from './mensagens';

// Simulador "E se?" (6.2, T05-21): camada de formulário; nada é gravado.

export interface ValoresDaSimulacao {
  tipo: Hipotetico['tipo'];
  valor: Centavos;
  /** Compra parcelada. */
  parcelas: number;
  cartaoId: Id;
  data: string;
  /** Gasto fixo: `pagamento` é `conta` ou o id do cartão. */
  dia: number;
  desde: string;
  pagamento: Id;
}

export const EM_CONTA = 'conta';
const m = mensagensPainel.projecoes.simulador;

export const valoresIniciaisDaSimulacao = (
  hoje: DataCivil,
  cartaoId: Id | undefined,
): ValoresDaSimulacao => ({
  tipo: cartaoId ? 'compra' : 'gastoFixo',
  valor: centavos(0),
  parcelas: 10,
  cartaoId: cartaoId ?? '',
  data: hoje,
  dia: Number(hoje.slice(8)),
  desde: competenciaDe(hoje),
  pagamento: EM_CONTA,
});

const inteiroEntre = (n: number, de: number, ate: number) =>
  Number.isInteger(n) && n >= de && n <= ate;

function competenciaValida(s: string) {
  try {
    return competencia(s);
  } catch {
    return null;
  }
}

/** O hipotético de `projetarFluxo`, ou `null` enquanto falta algum campo. */
export function hipoteticoDe(v: ValoresDaSimulacao): Hipotetico | null {
  if (v.valor <= 0) return null;
  if (v.tipo === 'compra') {
    const data = dataValida(v.data);
    if (!data || !v.cartaoId || !inteiroEntre(v.parcelas, 1, MAX_PARCELAS)) return null;
    return {
      tipo: 'compra',
      descricao: m.compraSimulada,
      cartaoId: v.cartaoId,
      data,
      valorTotal: v.valor,
      numeroParcelas: v.parcelas,
    };
  }
  const desde = competenciaValida(v.desde);
  if (!desde || !inteiroEntre(v.dia, 1, 31)) return null;
  return {
    tipo: 'gastoFixo',
    descricao: m.gastoSimulado,
    valor: v.valor,
    dia: v.dia,
    desde,
    cartaoId: v.pagamento === EM_CONTA ? null : v.pagamento,
  };
}

/** A frase-conclusão: os números do core (`conclusaoSimulacao`), o texto daqui. */
export function frasesDaSimulacao(
  c: ConclusaoSimulacao,
  tipo: Hipotetico['tipo'],
  limite: Centavos,
): string {
  const com = m.com[tipo];
  const ultimo = formatarMes(c.ultimo);
  const lista = [
    c.tipo === 'semAlerta'
      ? m.semAlerta(com, formatarMoeda(limite))
      : (c.tipo === 'negativo' ? m.negativo : m.abaixo)(
          com,
          formatarMes(c.competencia),
          formatarMoeda(c.saldoFinal),
        ),
  ];
  if (c.tipo !== 'semAlerta' && c.jaSemSimulacao) lista.push(m.jaSem);
  lista.push(
    c.diferenca === 0 ? m.semDiferenca(ultimo) : m.diferenca(ultimo, formatarMoeda(c.diferenca)),
  );
  return lista.join(' ');
}
