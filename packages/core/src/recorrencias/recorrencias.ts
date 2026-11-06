import { faturaDaCompra } from '../cartoes';
import { diaNoMes, somarMeses, type Competencia, type DataCivil, competenciaDe } from '../datas';
import { type Centavos, somar } from '../dinheiro';
import type {
  Compra,
  Fatos,
  Id,
  Lancamento,
  NaturezaRecorrencia,
  Ocorrencia,
  Recorrencia,
  RecorrenciaVersao,
} from '../modelo';

/** PROMPT 3.8, 3.11, 6.7 e 6.8. */

/** O que uma recorrência prevê, ou o retrato gravado, numa competência. */
export type Previsao = Pick<
  RecorrenciaVersao,
  'recorrenciaId' | 'valor' | 'formaPagamento' | 'contaId' | 'cartaoId' | 'categoriaId'
> & { competencia: Competencia; data: DataCivil };

export type StatusOcorrencia = 'confirmada' | 'ignorada' | 'prevista' | 'atrasada' | 'vencida';

export type OcorrenciaDoMes = Previsao & {
  recorrencia: Recorrencia;
  status: StatusOcorrencia;
  /** A ocorrência gravada (confirmada ou ignorada), ou `null` se derivada. */
  ocorrencia: Ocorrencia | null;
};

/** Campos de uma entidade sem as colunas de controle: o que o comando (T01-22) completa. */
type Dados<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'isDeleted'>;

/** Ocorrência a confirmar: exatamente um de `lancamento` (em conta) ou `compra` (no cartão). */
export interface Pendente {
  recorrenciaId: Id;
  competencia: Competencia;
  lancamento: Dados<Lancamento> | null;
  compra: Dados<Compra> | null;
}

/** Versão com maior `vigenteDesde` ≤ `c`; `null` antes da primeira. */
export const versaoVigente = <T extends Pick<RecorrenciaVersao, 'vigenteDesde'>>(
  versoes: readonly T[],
  c: Competencia,
): T | null =>
  versoes
    .filter((v) => v.vigenteDesde <= c)
    .reduce<T | null>((a, v) => (a && a.vigenteDesde > v.vigenteDesde ? a : v), null);

/** Previsão da competência `c` pela versão vigente; `null` fora de [início, fim]. */
export function previsao(
  recorrencia: Recorrencia,
  versoes: readonly RecorrenciaVersao[],
  c: Competencia,
): Previsao | null {
  const { id, competenciaInicio, competenciaFim } = recorrencia;
  if (c < competenciaInicio || (competenciaFim !== null && c > competenciaFim)) return null;
  const v = versaoVigente(
    versoes.filter((x) => x.recorrenciaId === id),
    c,
  );
  if (!v) return null;
  const { valor, formaPagamento, contaId, cartaoId, categoriaId } = v;
  return {
    recorrenciaId: id,
    competencia: c,
    valor,
    data: diaNoMes(c, v.dia),
    formaPagamento,
    contaId,
    cartaoId,
    categoriaId,
  };
}

/** Retrato de uma ocorrência confirmada (o schema garante os campos não nulos). */
const retrato = (o: Ocorrencia): Previsao => ({
  recorrenciaId: o.recorrenciaId,
  competencia: o.competencia,
  valor: o.valor as Centavos,
  data: o.data as DataCivil,
  formaPagamento: o.cartaoId === null ? 'conta' : 'cartao',
  contaId: o.contaId,
  cartaoId: o.cartaoId,
  categoriaId: o.categoriaId as Id,
});

const gravadaDe = (fatos: Fatos, r: Recorrencia, c: Competencia) =>
  fatos.ocorrencias.find((o) => o.recorrenciaId === r.id && o.competencia === c) ?? null;

const cronologica = (a: Previsao, b: Previsao) =>
  a.data < b.data ? -1 : a.data > b.data ? 1 : a.recorrenciaId < b.recorrenciaId ? -1 : 1;

/**
 * Cada recorrência ativa na competência `c`: o retrato gravado (nunca recalculado) ou a
 * previsão das versões. Ignorada mostra o que estava previsto. Em ordem de data.
 */
export function ocorrenciasDoMes(fatos: Fatos, c: Competencia, hoje: DataCivil): OcorrenciaDoMes[] {
  const lista: OcorrenciaDoMes[] = [];
  for (const recorrencia of fatos.recorrencias.filter((r) => r.ativa)) {
    const ocorrencia = gravadaDe(fatos, recorrencia, c);
    const item =
      ocorrencia?.situacao === 'confirmada'
        ? retrato(ocorrencia)
        : previsao(recorrencia, fatos.recorrenciaVersoes, c);
    if (!item) continue;
    const status: StatusOcorrencia = ocorrencia
      ? ocorrencia.situacao
      : item.data >= hoje
        ? 'prevista'
        : recorrencia.natureza === 'renda'
          ? 'atrasada'
          : 'vencida';
    lista.push({ ...item, recorrencia, status, ocorrencia });
  }
  return lista.sort(cronologica);
}

function pendente(r: Recorrencia, p: Previsao): Pendente {
  const comum = {
    data: p.data,
    descricao: r.descricao,
    categoriaId: p.categoriaId,
    observacao: null,
  };
  return {
    recorrenciaId: r.id,
    competencia: p.competencia,
    lancamento:
      p.contaId === null
        ? null
        : {
            ...comum,
            tipo: r.natureza === 'renda' ? 'receita' : 'despesa',
            status: 'efetivado',
            valor: p.valor,
            contaId: p.contaId,
            contaDestinoId: null,
            cartaoId: null,
            faturaCompetencia: null,
            dividaId: null,
            parcelaDividaId: null,
          },
    compra:
      p.cartaoId === null
        ? null
        : {
            ...comum,
            cartaoId: p.cartaoId,
            valorTotal: p.valor,
            numeroParcelas: 1,
            cancelada: false,
          },
  };
}

/**
 * Confirmação automática (3.8): toda ocorrência de recorrência ativa com `autoConfirmar`,
 * data ≤ hoje e sem ocorrência gravada, desde o início, em ordem cronológica, com o
 * lançamento ou a compra à vista a criar na data prevista original.
 */
export function pendentesParaConfirmar(fatos: Fatos, hoje: DataCivil): Pendente[] {
  const lista: [Previsao, Pendente][] = [];
  for (const r of fatos.recorrencias.filter((x) => x.ativa && x.autoConfirmar))
    for (let c = r.competenciaInicio; c <= competenciaDe(hoje); c = somarMeses(c, 1)) {
      const p = previsao(r, fatos.recorrenciaVersoes, c);
      if (p && p.data <= hoje && !gravadaDe(fatos, r, c)) lista.push([p, pendente(r, p)]);
    }
  return lista.sort(([a], [b]) => cronologica(a, b)).map(([, p]) => p);
}

/** Fatura em que um gasto fixo no cartão vai cair (3.5); `null` se for em conta. */
export function faturaDoGastoNoCartao(
  fatos: Pick<Fatos, 'cartoes' | 'cartaoCiclos'>,
  gasto: Pick<Previsao, 'cartaoId' | 'data'>,
): Competencia | null {
  if (gasto.cartaoId === null) return null;
  const cartao = fatos.cartoes.find((x) => x.id === gasto.cartaoId);
  if (!cartao) throw new RangeError('Cartão inexistente');
  return faturaDaCompra(cartao, fatos.cartaoCiclos, gasto.data);
}

/** Padrão de "Aplicar a partir de": a primeira competência, desde o início, sem ocorrência gravada. */
export function primeiraCompetenciaNaoConfirmada(fatos: Fatos, r: Recorrencia): Competencia {
  let c = r.competenciaInicio;
  while (gravadaDe(fatos, r, c)) c = somarMeses(c, 1);
  return c;
}

function resumo(fatos: Fatos, natureza: NaturezaRecorrencia, c: Competencia, hoje: DataCivil) {
  const doMes = ocorrenciasDoMes(fatos, c, hoje).filter(
    (o) => o.recorrencia.natureza === natureza && o.status !== 'ignorada',
  );
  const total = (...status: StatusOcorrencia[]): Centavos =>
    somar(doMes.filter((o) => status.includes(o.status)).map((o) => o.valor));
  return {
    previsto: total('confirmada', 'prevista', 'atrasada', 'vencida'),
    realizado: total('confirmada'),
    futuro: total('prevista'),
    passado: total('atrasada', 'vencida'),
  };
}

/** Cabeçalho de 6.7. `previsto` = recebido + a receber + atrasado; ignoradas ficam de fora. */
export function resumoRendas(fatos: Fatos, c: Competencia, hoje: DataCivil) {
  const r = resumo(fatos, 'renda', c, hoje);
  return { previsto: r.previsto, recebido: r.realizado, aReceber: r.futuro, atrasado: r.passado };
}

/** Cabeçalho de 6.8 (sem o Comprometimento da renda, T01-17). `previsto` = pago + a pagar + vencido. */
export function resumoGastos(fatos: Fatos, c: Competencia, hoje: DataCivil) {
  const r = resumo(fatos, 'gasto', c, hoje);
  return { previsto: r.previsto, pago: r.realizado, aPagar: r.futuro, vencido: r.passado };
}
