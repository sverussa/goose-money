import { type Fatura, montarFaturas } from '../cartoes';
import { anteriorAoSaldoInicial, movimentosDeCaixa, saldo } from '../contas';
import { competenciaDe, somarMeses, ultimaData, type Competencia, type DataCivil } from '../datas';
import { type Centavos, mais } from '../dinheiro';
import { resumoDaDivida, statusParcela, type StatusParcela } from '../dividas';
import type {
  Cartao,
  CartaoCiclo,
  Categoria,
  Compra,
  Conta,
  Divida,
  Fatos,
  Id,
  Parcela,
  ParcelaDivida,
  Recorrencia,
  RecorrenciaVersao,
} from '../modelo';
import {
  type OcorrenciaDoMes,
  ocorrenciasDoMes,
  type Pendente,
  pendentesParaConfirmar,
} from '../recorrencias';
import { type ItemReconhecido, itensReconhecidos } from './reconhecimento';

/**
 * D13: uma passada sobre os fatos com o que os indicadores compartilham. Pura e sem cache
 * (quem memoriza é o app, T03-03). Indicadores e projeção recebem `Derivado`, nunca `Fatos`.
 */

export interface ParcelaDaTabela extends ParcelaDivida {
  /** Tem `pagamento_divida`. */
  paga: boolean;
  status: StatusParcela;
}

export interface TabelaDaDivida {
  divida: Divida;
  /** Em ordem de número. */
  parcelas: ParcelaDaTabela[];
  resumo: ReturnType<typeof resumoDaDivida>;
}

export interface SaldosDaConta {
  /** Saldo hoje; `null` antes do saldo inicial (3.4). */
  atual: Centavos | null;
  /** Saldo no último dia de cada mês, do mês do saldo inicial mais antigo ao mês de hoje. */
  fimDoMes: Map<Competencia, Centavos | null>;
}

export interface Derivado {
  fatos: Fatos;
  hoje: DataCivil;
  porId: {
    categorias: Map<Id, Categoria>;
    contas: Map<Id, Conta>;
    cartoes: Map<Id, Cartao>;
    compras: Map<Id, Compra>;
    dividas: Map<Id, Divida>;
    recorrencias: Map<Id, Recorrencia>;
  };
  parcelasPorCompra: Map<Id, Parcela[]>;
  versoesPorRecorrencia: Map<Id, RecorrenciaVersao[]>;
  ciclosPorCartao: Map<Id, CartaoCiclo[]>;
  /** `montarFaturas` de cada cartão. */
  faturas: Map<Id, Fatura[]>;
  saldos: Map<Id, SaldosDaConta>;
  dividas: Map<Id, TabelaDaDivida>;
  /** Ocorrências do mês de hoje (T01-13). */
  ocorrenciasDoMes: OcorrenciaDoMes[];
  pendentes: Pendente[];
  /** Todos os itens de 3.3, de qualquer data; filtrados por `receitasReconhecidas` e `despesasReconhecidas`. */
  reconhecidos: ItemReconhecido[];
}

const porId = <T extends { id: Id }>(lista: readonly T[]) => new Map(lista.map((x) => [x.id, x]));

function agrupar<T>(lista: readonly T[], chave: (x: T) => Id): Map<Id, T[]> {
  const mapa = new Map<Id, T[]>();
  for (const x of lista) {
    const grupo = mapa.get(chave(x));
    if (grupo) grupo.push(x);
    else mapa.set(chave(x), [x]);
  }
  return mapa;
}

/** Soma corrente dos movimentos (3.4) em vez de `saldo` por mês, que reordenaria tudo a cada mês. */
function saldosDa(fatos: Fatos, conta: Conta, inicio: Competencia, hoje: DataCivil): SaldosDaConta {
  const movs = movimentosDeCaixa(fatos, conta.id).filter((m) => !anteriorAoSaldoInicial(m, conta));
  const fimDoMes = new Map<Competencia, Centavos | null>();
  let k = 0;
  let corrente = conta.saldoInicial;
  for (let m = inicio; m <= competenciaDe(hoje); m = somarMeses(m, 1)) {
    const fim = ultimaData(m);
    if (fim < conta.dataSaldoInicial) {
      fimDoMes.set(m, null);
      continue;
    }
    for (let mov = movs[k]; mov && mov.lancamento.data <= fim; mov = movs[++k])
      corrente = mais(corrente, mov.valor);
    fimDoMes.set(m, corrente);
  }
  return { atual: saldo(fatos, conta.id, hoje), fimDoMes };
}

export function derivar(fatos: Fatos, hoje: DataCivil): Derivado {
  const inicio = fatos.contas
    .map((c) => competenciaDe(c.dataSaldoInicial))
    .reduce<Competencia>((a, m) => (m < a ? m : a), competenciaDe(hoje));
  const pagas = new Set(fatos.lancamentos.map((l) => l.parcelaDividaId));
  const amortizacoes = agrupar(
    fatos.lancamentos.filter((l) => l.tipo === 'amortizacao'),
    (l) => l.dividaId as Id,
  );
  const parcelasPorDivida = agrupar(fatos.parcelasDivida, (p) => p.dividaId);
  const dividas = new Map(
    fatos.dividas.map((divida): [Id, TabelaDaDivida] => {
      const parcelas = (parcelasPorDivida.get(divida.id) ?? [])
        .map((p) => {
          const comPagamento = { ...p, paga: pagas.has(p.id) };
          return { ...comPagamento, status: statusParcela(comPagamento, hoje) };
        })
        .sort((a, b) => a.numero - b.numero);
      const amortizado = (amortizacoes.get(divida.id) ?? []).map((l) => l.valor);
      return [
        divida.id,
        { divida, parcelas, resumo: resumoDaDivida(divida, parcelas, amortizado) },
      ];
    }),
  );
  const base = {
    fatos,
    hoje,
    porId: {
      categorias: porId(fatos.categorias),
      contas: porId(fatos.contas),
      cartoes: porId(fatos.cartoes),
      compras: porId(fatos.compras),
      dividas: porId(fatos.dividas),
      recorrencias: porId(fatos.recorrencias),
    },
    parcelasPorCompra: agrupar(fatos.parcelas, (p) => p.compraId),
    versoesPorRecorrencia: agrupar(fatos.recorrenciaVersoes, (v) => v.recorrenciaId),
    ciclosPorCartao: agrupar(fatos.cartaoCiclos, (v) => v.cartaoId),
    faturas: new Map(fatos.cartoes.map((c) => [c.id, montarFaturas(fatos, c.id, hoje)])),
    saldos: new Map(fatos.contas.map((c) => [c.id, saldosDa(fatos, c, inicio, hoje)])),
    dividas,
    ocorrenciasDoMes: ocorrenciasDoMes(fatos, competenciaDe(hoje), hoje),
    pendentes: pendentesParaConfirmar(fatos, hoje),
  };
  return { ...base, reconhecidos: itensReconhecidos(base) };
}
