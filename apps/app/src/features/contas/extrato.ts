import {
  type Centavos,
  type Competencia,
  type Conta,
  type Derivado,
  type Extrato,
  extratoMensal,
  type Id,
  type LinhaExtrato,
  movimentacoes,
  primeiroDia,
  somarMeses,
  ultimaData,
  periodo,
} from '@goose-money/core';

import { formatarData } from '@/app/formatacao';
import { mensagensLancamentos } from '@/features/lancamentos/mensagens';

import { mensagensContas } from './mensagens';

// Extrato mensal da conta (3.4, 6.4): o `extratoMensal` do core e os textos de cada linha.

export interface LinhaDoExtrato extends LinhaExtrato {
  texto: string;
  /** Nome da categoria ou, sem categoria, o tipo do lançamento. */
  categoriaOuTipo: string;
}

export interface ExtratoDaTela extends Extrato {
  linhas: LinhaDoExtrato[];
  /** Dia da abertura (último do mês anterior, ou o do saldo inicial) e do fechamento. */
  diaDaAbertura: string;
  diaDoFechamento: string;
}

export function extratoDaTela(d: Derivado, conta: Conta, mes: Competencia): ExtratoDaTela {
  const extrato = extratoMensal(d.fatos, conta.id, mes);
  // Os textos da visão Movimentações, para o extrato falar a mesma língua (6.3).
  const textos = new Map<Id, string>(
    movimentacoes(d.fatos, d.hoje, periodo(primeiroDia(mes), ultimaData(mes)), {
      contaId: conta.id,
    }).map((i) => [i.registro.id, i.texto]),
  );
  const nomeDaConta = (id: Id) => d.porId.contas.get(id)?.nome ?? '';
  const linhas = extrato.linhas.map((l): LinhaDoExtrato => {
    const { lancamento } = l.movimento;
    const chegou = lancamento.tipo === 'transferencia' && lancamento.contaDestinoId === conta.id;
    const categoria = lancamento.categoriaId
      ? d.porId.categorias.get(lancamento.categoriaId)?.nome
      : undefined;
    return {
      ...l,
      texto: chegou
        ? `${mensagensContas.extrato.transferenciaDe} ${nomeDaConta(lancamento.contaId)}`
        : (textos.get(lancamento.id) ?? ''),
      categoriaOuTipo: categoria ?? mensagensLancamentos.tipos[lancamento.tipo],
    };
  });
  const anterior = ultimaData(somarMeses(mes, -1));
  return {
    ...extrato,
    linhas,
    diaDaAbertura: formatarData(
      anterior > conta.dataSaldoInicial ? anterior : conta.dataSaldoInicial,
    ).slice(0, 5),
    diaDoFechamento: formatarData(ultimaData(mes)).slice(0, 5),
  };
}

/** Centavos como "1234,56" (planilha pt-BR), sem símbolo. */
const decimal = (c: Centavos) => {
  const s = String(Math.abs(c)).padStart(3, '0');
  return `${c < 0 ? '-' : ''}${s.slice(0, -2)},${s.slice(-2)}`;
};
const campo = (t: string) => (/[;"\n]/.test(t) ? `"${t.replaceAll('"', '""')}"` : t);

/**
 * O CSV do extrato (6.4): as mesmas linhas e totais da tela. `;` e vírgula decimal, como os
 * CSV dos gráficos (T04-08).
 */
export function csvDoExtrato(e: ExtratoDaTela): string {
  const c = mensagensContas.extrato.csv;
  const linha = (...campos: string[]) => campos.map(campo).join(';');
  const saldo = (s: Centavos | null) => (s === null ? '' : decimal(s));
  return `${[
    linha(c.data, c.descricao, c.categoria, c.valor, c.saldo),
    ...(e.abertura === null ? [] : [linha(e.diaDaAbertura, c.abertura, '', '', saldo(e.abertura))]),
    ...e.linhas.map((l) =>
      linha(
        formatarData(l.movimento.lancamento.data),
        l.texto,
        l.categoriaOuTipo,
        decimal(l.movimento.valor),
        saldo(l.saldo),
      ),
    ),
    ...(e.fechamento === null
      ? []
      : [
          linha('', c.entradas, '', decimal(e.entradas), ''),
          linha('', c.saidas, '', decimal(e.saidas), ''),
          linha(e.diaDoFechamento, c.fechamento, '', '', saldo(e.fechamento)),
        ]),
  ].join('\n')}\n`;
}

/** Nome do arquivo: "extrato-conta-corrente-2026-11.csv". */
export const nomeDoCsv = (conta: Conta, mes: Competencia) =>
  `extrato-${conta.nome
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}-${mes}.csv`;
