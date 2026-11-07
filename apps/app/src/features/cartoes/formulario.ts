import {
  type Cartao,
  type Centavos,
  cicloVigente,
  type Conta,
  type Derivado,
  faturaAberta,
  type Fatos,
  type NovoCartao,
} from '@goose-money/core';
import { z } from 'zod';

import { mensagensCartoes } from './mensagens';

// Formulário de cartão (6.5, D21): camada de formulário (9.1), separada do modelo do core.

/**
 * Cores da face do cartão (D77): as duas de cartão do tema e as categóricas em que o texto claro
 * da face passa de 4,5:1. As categóricas 3, 6 e 8 ficam de fora por contraste.
 */
export const CORES_DE_CARTAO = [
  'cartao-a',
  'cartao-b',
  'categorica-1',
  'categorica-2',
  'categorica-4',
  'categorica-5',
  'categorica-7',
];

const e = mensagensCartoes.formulario.erros;
const dia = z.number({ error: e.dia }).int(e.dia).min(1, e.dia).max(31, e.dia);

export const esquemaDoCartao = z.object({
  nome: z.string().trim().min(1, e.nome),
  instituicao: z.string(),
  cor: z.string(),
  limite: z.number().int().positive(e.limite),
  diaFechamento: dia,
  diaVencimento: dia,
  contaPagamentoId: z.string().min(1, e.conta),
  saldoFaturaFechada: z.number().int().nonnegative(),
});
export type ValoresDoCartao = z.infer<typeof esquemaDoCartao>;

/** Contas que podem pagar um cartão (6.5): ativas e incluídas no total. */
export const contasDePagamento = (fatos: Fatos): Conta[] =>
  fatos.contas.filter((c) => !c.arquivada && c.incluirNoTotal);

/** Os dias do ciclo que vale na fatura aberta de hoje (3.5). */
export function cicloAtual(d: Derivado, cartao: Cartao) {
  const aberta = faturaAberta(cartao, d.fatos.cartaoCiclos, d.hoje);
  return cicloVigente(d.ciclosPorCartao.get(cartao.id) ?? [], aberta);
}

/** Na edição, os dias são os do ciclo vigente na fatura aberta (só leitura). */
export function valoresIniciais(
  fatos: Fatos,
  cartao?: Cartao,
  dias?: { diaFechamento: number; diaVencimento: number },
): ValoresDoCartao {
  if (cartao)
    return {
      nome: cartao.nome,
      instituicao: cartao.instituicao ?? '',
      cor: cartao.cor,
      limite: cartao.limite,
      diaFechamento: dias?.diaFechamento ?? 1,
      diaVencimento: dias?.diaVencimento ?? 1,
      contaPagamentoId: cartao.contaPagamentoId,
      saldoFaturaFechada: 0,
    };
  // A primeira cor que nenhum cartão ativo usa.
  const usadas = new Set(fatos.cartoes.filter((c) => !c.arquivado).map((c) => c.cor));
  return {
    nome: '',
    instituicao: '',
    cor: CORES_DE_CARTAO.find((c) => !usadas.has(c)) ?? 'cartao-a',
    limite: 0,
    diaFechamento: Number.NaN,
    diaVencimento: Number.NaN,
    contaPagamentoId: contasDePagamento(fatos)[0]?.id ?? '',
    saldoFaturaFechada: 0,
  };
}

export const camposDoCartao = (v: ValoresDoCartao): NovoCartao => ({
  nome: v.nome.trim(),
  instituicao: v.instituicao.trim() || null,
  cor: v.cor,
  limite: v.limite as Centavos,
  contaPagamentoId: v.contaPagamentoId,
  diaFechamento: v.diaFechamento,
  diaVencimento: v.diaVencimento,
  saldoFaturaFechada: v.saldoFaturaFechada as Centavos,
});
