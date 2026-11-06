import type { DataCivil } from '../datas';
import { D, type Centavos } from '../dinheiro';
import {
  amortizarExtraordinario,
  parcelasPagasPor,
  type LinhaTabela,
  tabelaParcelaInformada,
  tabelaPrice,
  tabelaSac,
} from '../dividas';
import { dividaSchema, type Divida, type Fatos, type Id, type ParcelaDivida } from '../modelo';
import {
  achar,
  type CamposDe,
  categoriaPara,
  type Comando,
  comando,
  contaAtiva,
  type Contexto,
  excluir,
  excluirTodos,
  exigir,
  inserir,
  novo,
  novoLancamento,
  regra,
  semVinculos,
  validar,
} from './mudancas';

/** Empréstimos e financiamentos (PROMPT 3.7, 6.6; D3, D70). */

/** Parcelas gravadas da dívida; paga = antes do cadastro ou com `pagamento_divida` (MODELO-DADOS 3.10). */
export function parcelasDaDivida(
  fatos: Fatos,
  dividaId: Id,
): (ParcelaDivida & { paga: boolean })[] {
  const pagas = parcelasPagasPor(fatos.lancamentos);
  return fatos.parcelasDivida
    .filter((p) => p.dividaId === dividaId)
    .map((p) => ({ ...p, paga: pagas.has(p.id) }));
}

function tabela(d: Divida): LinhaTabela[] {
  const { valorContratado: pv, numeroParcelas: n, dataPrimeiraParcela: primeira } = d;
  if (d.valorParcelaInformada !== null)
    return tabelaParcelaInformada(pv, d.valorParcelaInformada, n, primeira).linhas;
  const i = new D(d.taxaMensal as string);
  return (d.sistemaAmortizacao === 'sac' ? tabelaSac : tabelaPrice)(pv, i, n, primeira);
}

export interface Contratacao {
  /** Passo 4 do cadastro: as `parcelasPagas` primeiras ficam "Paga antes do cadastro". */
  parcelasPagas: number;
  /** "Registrar a entrada do valor na conta" (só `creditado_em_conta`); `null` em dívida antiga. */
  contaCaptacaoId: Id | null;
}

/** Dívida, a tabela inteira de parcelas e, se pedida, a `captacao` (3.7, D3). */
export function contratarDivida(
  fatos: Fatos,
  ctx: Contexto,
  campos: CamposDe<Divida>,
  { parcelasPagas, contaCaptacaoId }: Contratacao,
): Comando {
  const divida = validar(dividaSchema, novo<Divida>(ctx, campos));
  contaAtiva(fatos, divida.contaDebitoId);
  if (divida.categoriaId !== null) categoriaPara(fatos, divida.categoriaId, 'despesa');
  exigir(
    Number.isSafeInteger(parcelasPagas) &&
      parcelasPagas >= 0 &&
      parcelasPagas <= divida.numeroParcelas,
    'Parcelas pagas antes do cadastro fora do número de parcelas',
  );
  exigir(
    contaCaptacaoId === null || divida.destinoDoValor === 'creditado_em_conta',
    'Só a dívida creditada em conta registra a entrada do valor',
  );
  const parcelas = regra(() => tabela(divida)).map((l) =>
    novo<ParcelaDivida>(ctx, {
      dividaId: divida.id,
      numero: l.numero,
      vencimento: l.vencimento,
      valor: l.valor,
      juros: l.juros,
      amortizacao: l.amortizacao,
      pagaAntesDoCadastro: l.numero <= parcelasPagas,
    }),
  );
  const captacao =
    contaCaptacaoId === null
      ? []
      : [
          novoLancamento(fatos, ctx, {
            ...semVinculos,
            tipo: 'captacao',
            status: 'efetivado',
            data: divida.dataContratacao,
            valor: divida.valorContratado,
            descricao: divida.credor,
            contaId: contaCaptacaoId,
            dividaId: divida.id,
          }),
        ];
  return comando(fatos, 'Dívida cadastrada', [
    inserir('dividas', divida),
    ...parcelas.map((p) => inserir('parcelasDivida', p)),
    ...captacao.map((l) => inserir('lancamentos', l)),
  ]);
}

/** `pagamento_divida` da parcela; valor e conta padrão: os da parcela e da dívida. */
export function registrarPagamentoDeParcela(
  fatos: Fatos,
  ctx: Contexto,
  parcelaDividaId: Id,
  pagamento: { data: DataCivil; valor?: Centavos; contaId?: Id },
): Comando {
  const parcela = achar(fatos.parcelasDivida, parcelaDividaId, 'Parcela não encontrada');
  const divida = achar(fatos.dividas, parcela.dividaId, 'Dívida não encontrada');
  const paga = parcelasDaDivida(fatos, divida.id).some((p) => p.id === parcela.id && p.paga);
  exigir(!paga && !parcela.pagaAntesDoCadastro, 'Parcela já paga');
  const l = novoLancamento(fatos, ctx, {
    ...semVinculos,
    tipo: 'pagamento_divida',
    status: 'efetivado',
    data: pagamento.data,
    valor: pagamento.valor ?? parcela.valor,
    contaId: pagamento.contaId ?? divida.contaDebitoId,
    dividaId: divida.id,
    parcelaDividaId: parcela.id,
  });
  return comando(fatos, 'Pagamento registrado', [inserir('lancamentos', l)]);
}

export interface Amortizacao {
  valor: Centavos;
  data: DataCivil;
  modo: 'reduzirPrazo' | 'reduzirValor';
  /** Padrão: a conta de débito da dívida. */
  contaId?: Id;
}

/**
 * Amortização extraordinária ou antecipação (D70): grava a `amortizacao` e troca as parcelas
 * não pagas que vencem depois de `data` pelas regeneradas, excluindo e reinserindo por causa
 * da chave única (dívida, número), como em D78.
 */
export function amortizarDivida(
  fatos: Fatos,
  ctx: Contexto,
  dividaId: Id,
  a: Amortizacao,
): Comando {
  const divida = achar(fatos.dividas, dividaId, 'Dívida não encontrada');
  const parcelas = parcelasDaDivida(fatos, dividaId);
  const novas = regra(() => amortizarExtraordinario(divida, parcelas, a.valor, a.data, a.modo));
  const l = novoLancamento(fatos, ctx, {
    ...semVinculos,
    tipo: 'amortizacao',
    status: 'efetivado',
    data: a.data,
    valor: a.valor,
    contaId: a.contaId ?? divida.contaDebitoId,
    dividaId,
  });
  const depois = (p: { vencimento: DataCivil }) => p.vencimento > a.data;
  return comando(fatos, 'Amortização registrada', [
    inserir('lancamentos', l),
    ...excluirTodos(
      'parcelasDivida',
      parcelas.filter((p) => !p.paga && !p.pagaAntesDoCadastro && depois(p)),
    ),
    ...novas.filter(depois).map((p) =>
      inserir(
        'parcelasDivida',
        novo<ParcelaDivida>(ctx, {
          dividaId,
          numero: p.numero,
          vencimento: p.vencimento,
          valor: p.valor,
          juros: p.juros,
          amortizacao: p.amortizacao,
          pagaAntesDoCadastro: false,
        }),
      ),
    ),
  ]);
}

/** Dívida, parcelas e a captação; com pagamentos ou amortizações, recusa (Decisão do T01-22). */
export function excluirDivida(fatos: Fatos, _ctx: Contexto, dividaId: Id): Comando {
  achar(fatos.dividas, dividaId, 'Dívida não encontrada');
  const lancamentos = fatos.lancamentos.filter((l) => l.dividaId === dividaId);
  exigir(
    lancamentos.every((l) => l.tipo === 'captacao'),
    'A dívida tem pagamentos registrados. Exclua os pagamentos antes.',
  );
  return comando(fatos, 'Dívida excluída', [
    excluir('dividas', dividaId),
    ...excluirTodos(
      'parcelasDivida',
      fatos.parcelasDivida.filter((p) => p.dividaId === dividaId),
    ),
    ...excluirTodos('lancamentos', lancamentos),
  ]);
}
