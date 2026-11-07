import {
  type Centavos,
  type Conta,
  dataCivil,
  type DataCivil,
  type Fatos,
  type NovaConta,
  type TipoConta,
} from '@goose-money/core';
import { z } from 'zod';

import { mensagensContas } from './mensagens';

// Formulário de conta (6.4): camada de formulário (9.1), separada do modelo do core.

export const TIPOS_DE_CONTA: readonly TipoConta[] = [
  'corrente',
  'poupanca',
  'investimento',
  'dinheiro',
  'outra',
];
/** Paleta categórica (D77): a conta escolhe uma das 8 cores. */
export const CORES = Array.from({ length: 8 }, (_, i) => `categorica-${String(i + 1)}`);

const e = mensagensContas.formulario.erros;
const dataValida = (s: string) => {
  try {
    dataCivil(s);
    return true;
  } catch {
    return false;
  }
};

export const esquemaDaConta = z.object({
  nome: z.string().trim().min(1, e.nome),
  instituicao: z.string(),
  tipo: z.enum(['corrente', 'poupanca', 'investimento', 'dinheiro', 'outra']),
  saldoInicial: z.number().int(),
  dataSaldoInicial: z.string().refine(dataValida, e.data),
  cor: z.string(),
  incluirNoTotal: z.boolean(),
});
export type ValoresDaConta = z.infer<typeof esquemaDaConta>;

export function valoresIniciais(fatos: Fatos, hoje: DataCivil, conta?: Conta): ValoresDaConta {
  if (conta)
    return {
      nome: conta.nome,
      instituicao: conta.instituicao ?? '',
      tipo: conta.tipo,
      saldoInicial: conta.saldoInicial,
      dataSaldoInicial: conta.dataSaldoInicial,
      cor: conta.cor,
      incluirNoTotal: conta.incluirNoTotal,
    };
  // A primeira cor que nenhuma conta ativa usa.
  const usadas = new Set(fatos.contas.filter((c) => !c.arquivada).map((c) => c.cor));
  return {
    nome: '',
    instituicao: '',
    tipo: 'corrente',
    saldoInicial: 0,
    dataSaldoInicial: hoje,
    cor: CORES.find((c) => !usadas.has(c)) ?? 'categorica-1',
    incluirNoTotal: true,
  };
}

export const camposDaConta = (v: ValoresDaConta): NovaConta => ({
  nome: v.nome.trim(),
  instituicao: v.instituicao.trim() || null,
  tipo: v.tipo,
  saldoInicial: v.saldoInicial as Centavos,
  dataSaldoInicial: dataCivil(v.dataSaldoInicial),
  cor: v.cor,
  incluirNoTotal: v.incluirNoTotal,
});

/** A conta paga algum cartão ativo: "Incluir no total" fica travado (6.4). */
export const pagaCartaoAtivo = (fatos: Fatos, contaId: string): boolean =>
  fatos.cartoes.some((c) => !c.arquivado && c.contaPagamentoId === contaId);
