import { diferencaDeAjuste } from '../contas';
import type { DataCivil } from '../datas';
import type { Centavos } from '../dinheiro';
import type { Fatos, Id, Lancamento } from '../modelo';
import { editarCompraMudancas } from './compras';
import {
  achar,
  alterarCampos,
  type CamposDe,
  categoriaDoSistema,
  type Comando,
  comando,
  contaAtiva,
  type Contexto,
  excluir,
  excluirTodos,
  exigir,
  inserir,
  type Mudanca,
  novoLancamento,
  semVinculos,
  sincronizarRetrato,
  validarLancamento,
} from './mudancas';

/** Lançamentos avulsos (PROMPT 3.4, 7.1). Os demais tipos têm o comando da sua tela. */

/** Receita, despesa (efetivada ou prevista) ou transferência. */
export function lancar(fatos: Fatos, ctx: Contexto, campos: CamposDe<Lancamento>): Comando {
  exigir(
    campos.tipo === 'receita' || campos.tipo === 'despesa' || campos.tipo === 'transferencia',
    'Tipo de lançamento não permitido aqui',
  );
  return comando(fatos, 'Lançado', [inserir('lancamentos', novoLancamento(fatos, ctx, campos))]);
}

const vinculos = ['tipo', 'cartaoId', 'dividaId', 'parcelaDividaId'] as const;

function editarLancamentoMudancas(
  fatos: Fatos,
  hoje: DataCivil,
  id: Id,
  alteracoes: Partial<CamposDe<Lancamento>>,
): Mudanca[] {
  const atual = achar(fatos.lancamentos, id, 'Lançamento não encontrado');
  exigir(atual.tipo !== 'amortizacao', 'Amortização não pode ser editada');
  const l = validarLancamento(fatos, hoje, { ...atual, ...alteracoes });
  exigir(
    vinculos.every((k) => l[k] === atual[k]),
    'O tipo e o vínculo do lançamento não mudam; exclua e lance de novo',
  );
  return [
    ...alterarCampos('lancamentos', atual, l),
    ...sincronizarRetrato(fatos.ocorrencias, (o) => o.lancamentoId === id, {
      valor: l.valor,
      data: l.data,
      contaId: l.contaId,
      categoriaId: l.categoriaId,
    }),
  ];
}

export const editarLancamento = (
  fatos: Fatos,
  ctx: Contexto,
  id: Id,
  alteracoes: Partial<CamposDe<Lancamento>>,
): Comando =>
  comando(fatos, 'Lançamento alterado', editarLancamentoMudancas(fatos, ctx.hoje, id, alteracoes));

/** Exclui também a ocorrência do lançamento, que volta a ser prevista (D68). */
export function excluirLancamento(fatos: Fatos, _ctx: Contexto, id: Id): Comando {
  const l = achar(fatos.lancamentos, id, 'Lançamento não encontrado');
  exigir(l.tipo !== 'amortizacao', 'Amortização não pode ser excluída');
  contaAtiva(fatos, l.contaId);
  if (l.contaDestinoId !== null) contaAtiva(fatos, l.contaDestinoId);
  return comando(fatos, 'Lançamento excluído', [
    excluir('lancamentos', id),
    ...excluirTodos(
      'ocorrencias',
      fatos.ocorrencias.filter((o) => o.lancamentoId === id),
    ),
  ]);
}

/** Grava a diferença entre o saldo real e o calculado em `data` (3.4). */
export function ajustarSaldo(
  fatos: Fatos,
  ctx: Contexto,
  contaId: Id,
  saldoReal: Centavos,
  data: DataCivil,
): Comando {
  contaAtiva(fatos, contaId);
  const valor = diferencaDeAjuste(fatos, contaId, saldoReal, data);
  exigir(valor !== null, 'O ajuste precisa ser depois da data do saldo inicial');
  exigir(valor !== 0, 'O saldo já é esse');
  const l = novoLancamento(fatos, ctx, {
    ...semVinculos,
    tipo: 'ajuste',
    status: 'efetivado',
    data,
    valor,
    contaId,
    categoriaId: categoriaDoSistema(fatos, 'ajuste_saldo').id,
  });
  return comando(fatos, 'Saldo ajustado', [inserir('lancamentos', l)]);
}

/** Dá a mesma categoria a receitas, despesas e compras (por exemplo, as "A classificar"). */
export function classificar(
  fatos: Fatos,
  ctx: Contexto,
  ids: readonly Id[],
  categoriaId: Id,
): Comando {
  const mudancas = ids.flatMap((id) => {
    const l = fatos.lancamentos.find((x) => x.id === id);
    if (!l) return editarCompraMudancas(fatos, ctx, id, { categoriaId });
    exigir(l.tipo === 'receita' || l.tipo === 'despesa', 'Só receitas e despesas têm categoria');
    return editarLancamentoMudancas(fatos, ctx.hoje, id, { categoriaId });
  });
  return comando(fatos, 'Classificado', mudancas);
}
