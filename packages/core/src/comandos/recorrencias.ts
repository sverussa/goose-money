import type { Competencia, DataCivil } from '../datas';
import type { Centavos } from '../dinheiro';
import {
  ocorrenciaSchema,
  recorrenciaSchema,
  recorrenciaVersaoSchema,
  type Fatos,
  type Id,
  type Ocorrencia,
  type Recorrencia,
  type RecorrenciaVersao,
} from '../modelo';
import { type Pendente, pendentesParaConfirmar, previsao } from '../recorrencias';
import { novaCompraMudancas } from './compras';
import {
  achar,
  alterarCampos,
  type CamposDe,
  cartaoAtivo,
  categoriaPara,
  type Comando,
  comando,
  contaAtiva,
  type Contexto,
  excluir,
  excluirTodos,
  exigir,
  inserir,
  type Mudanca,
  novo,
  novoLancamento,
  semVinculos,
  validar,
} from './mudancas';

/** Rendas e gastos fixos (PROMPT 3.8, 6.7, 6.8). */

export type NovaRecorrencia = Omit<CamposDe<Recorrencia>, 'ativa'>;
export type NovaVersao = Omit<CamposDe<RecorrenciaVersao>, 'recorrenciaId' | 'vigenteDesde'>;

function validarVersao(fatos: Fatos, r: Recorrencia, v: RecorrenciaVersao): RecorrenciaVersao {
  validar(recorrenciaVersaoSchema, v);
  if (v.contaId !== null) contaAtiva(fatos, v.contaId);
  if (v.cartaoId !== null) {
    exigir(r.natureza === 'gasto', 'Renda fixa é recebida em conta');
    cartaoAtivo(fatos, v.cartaoId);
  }
  categoriaPara(fatos, v.categoriaId, r.natureza === 'renda' ? 'receita' : 'despesa');
  return v;
}

/** A recorrência e a primeira versão, vigente desde o início. */
export function criarRecorrencia(
  fatos: Fatos,
  ctx: Contexto,
  campos: NovaRecorrencia,
  versao: NovaVersao,
): Comando {
  const r = validar(recorrenciaSchema, novo<Recorrencia>(ctx, { ...campos, ativa: true }));
  const v = novo<RecorrenciaVersao>(ctx, {
    ...versao,
    recorrenciaId: r.id,
    vigenteDesde: r.competenciaInicio,
  });
  return comando(fatos, r.natureza === 'renda' ? 'Renda fixa criada' : 'Gasto fixo criado', [
    inserir('recorrencias', r),
    inserir('recorrenciaVersoes', validarVersao(fatos, r, v)),
  ]);
}

/** Descrição, fim, confirmação automática e ativa; valor, dia e forma vão por nova versão. */
export function editarRecorrencia(
  fatos: Fatos,
  _ctx: Contexto,
  id: Id,
  alteracoes: Partial<
    Pick<Recorrencia, 'descricao' | 'competenciaFim' | 'autoConfirmar' | 'ativa'>
  >,
): Comando {
  const atual = achar(fatos.recorrencias, id, 'Recorrência não encontrada');
  const r = validar(recorrenciaSchema, { ...atual, ...alteracoes });
  return comando(fatos, 'Recorrência alterada', alterarCampos('recorrencias', atual, r));
}

/** Leva as versões e as ocorrências; os lançamentos e as compras ficam, com origem manual (D68). */
export function excluirRecorrencia(fatos: Fatos, _ctx: Contexto, id: Id): Comando {
  const r = achar(fatos.recorrencias, id, 'Recorrência não encontrada');
  const daRecorrencia = (x: { recorrenciaId: Id }) => x.recorrenciaId === id;
  return comando(fatos, r.natureza === 'renda' ? 'Renda fixa excluída' : 'Gasto fixo excluído', [
    ...excluirTodos('ocorrencias', fatos.ocorrencias.filter(daRecorrencia)),
    ...excluirTodos('recorrenciaVersoes', fatos.recorrenciaVersoes.filter(daRecorrencia)),
    excluir('recorrencias', id),
  ]);
}

/** "Aplicar a partir de" (3.8): nunca altera ocorrências gravadas; mesma competência regrava a versão. */
export function novaVersaoDaRecorrencia(
  fatos: Fatos,
  ctx: Contexto,
  recorrenciaId: Id,
  aPartirDe: Competencia,
  versao: NovaVersao,
): Comando {
  const r = achar(fatos.recorrencias, recorrenciaId, 'Recorrência não encontrada');
  exigir(aPartirDe >= r.competenciaInicio, 'A versão não pode começar antes da recorrência');
  const atual = fatos.recorrenciaVersoes.find(
    (v) => v.recorrenciaId === recorrenciaId && v.vigenteDesde === aPartirDe,
  );
  const v = validarVersao(fatos, r, {
    ...(atual ??
      novo<RecorrenciaVersao>(ctx, { ...versao, recorrenciaId, vigenteDesde: aPartirDe })),
    ...versao,
  });
  return comando(
    fatos,
    'Recorrência alterada',
    atual ? alterarCampos('recorrenciaVersoes', atual, v) : [inserir('recorrenciaVersoes', v)],
  );
}

/** O lançamento ou a compra à vista e a ocorrência com o retrato (3.8). */
function confirmar(fatos: Fatos, ctx: Contexto, p: Pendente): Mudanca[] {
  const ocorrencia = (
    campos: Pick<
      Ocorrencia,
      'valor' | 'data' | 'categoriaId' | 'contaId' | 'lancamentoId' | 'cartaoId' | 'compraId'
    >,
  ) =>
    inserir(
      'ocorrencias',
      validar(
        ocorrenciaSchema,
        novo<Ocorrencia>(ctx, {
          recorrenciaId: p.recorrenciaId,
          competencia: p.competencia,
          situacao: 'confirmada',
          ...campos,
        }),
      ),
    );
  if (p.lancamento) {
    const l = novoLancamento(fatos, ctx, p.lancamento);
    return [
      inserir('lancamentos', l),
      ocorrencia({
        valor: l.valor,
        data: l.data,
        categoriaId: l.categoriaId,
        contaId: l.contaId,
        lancamentoId: l.id,
        cartaoId: null,
        compraId: null,
      }),
    ];
  }
  const { compra, mudancas } = novaCompraMudancas(
    fatos,
    ctx,
    p.compra as NonNullable<Pendente['compra']>,
  );
  return [
    ...mudancas,
    ocorrencia({
      valor: compra.valorTotal,
      data: compra.data,
      categoriaId: compra.categoriaId,
      contaId: null,
      lancamentoId: null,
      cartaoId: compra.cartaoId,
      compraId: compra.id,
    }),
  ];
}

/** Recorrência ativa, sem ocorrência gravada e com previsão na competência. */
function aGravar(fatos: Fatos, recorrenciaId: Id, competencia: Competencia) {
  const r = achar(fatos.recorrencias, recorrenciaId, 'Recorrência não encontrada');
  exigir(r.ativa, 'Recorrência inativa');
  exigir(
    !fatos.ocorrencias.some((o) => o.recorrenciaId === r.id && o.competencia === competencia),
    'Este mês já foi confirmado ou ignorado',
  );
  const p = previsao(r, fatos.recorrenciaVersoes, competencia);
  exigir(p !== null, 'Nada previsto nesta competência');
  return { r, p };
}

/** "Confirmar recebimento", "Pagar" ou "Confirmar no cartão", com valor e data editáveis. */
export function confirmarOcorrencia(
  fatos: Fatos,
  ctx: Contexto,
  recorrenciaId: Id,
  competencia: Competencia,
  ajustes: { valor?: Centavos; data?: DataCivil } = {},
): Comando {
  const { r, p } = aGravar(fatos, recorrenciaId, competencia);
  const valor = ajustes.valor ?? p.valor;
  const comum = {
    data: ajustes.data ?? p.data,
    descricao: r.descricao,
    categoriaId: p.categoriaId,
    observacao: null,
  };
  const pendente: Pendente = {
    recorrenciaId,
    competencia,
    lancamento:
      p.contaId === null
        ? null
        : {
            ...semVinculos,
            ...comum,
            tipo: r.natureza === 'renda' ? 'receita' : 'despesa',
            status: 'efetivado',
            valor,
            contaId: p.contaId,
          },
    compra:
      p.cartaoId === null
        ? null
        : {
            ...comum,
            cartaoId: p.cartaoId,
            valorTotal: valor,
            numeroParcelas: 1,
            cancelada: false,
          },
  };
  return comando(
    fatos,
    r.natureza === 'renda' ? 'Recebimento confirmado' : 'Pagamento confirmado',
    confirmar(fatos, ctx, pendente),
  );
}

/** "Ignorar este mês": a ocorrência ignorada, sem retrato. */
export function ignorarOcorrencia(
  fatos: Fatos,
  ctx: Contexto,
  recorrenciaId: Id,
  competencia: Competencia,
): Comando {
  aGravar(fatos, recorrenciaId, competencia);
  const o = novo<Ocorrencia>(ctx, {
    recorrenciaId,
    competencia,
    situacao: 'ignorada',
    valor: null,
    data: null,
    contaId: null,
    cartaoId: null,
    categoriaId: null,
    lancamentoId: null,
    compraId: null,
  });
  return comando(fatos, 'Ignorado este mês', [inserir('ocorrencias', o)]);
}

/** Confirmação automática (3.8): todas as pendentes até hoje, numa gravação só. */
export function confirmarEmLote(fatos: Fatos, ctx: Contexto): Comando {
  const pendentes = pendentesParaConfirmar(fatos, ctx.hoje);
  const n = pendentes.length;
  return comando(
    fatos,
    n === 1
      ? '1 lançamento automático registrado'
      : `${String(n)} lançamentos automáticos registrados`,
    pendentes.flatMap((p) => confirmar(fatos, ctx, p)),
  );
}
