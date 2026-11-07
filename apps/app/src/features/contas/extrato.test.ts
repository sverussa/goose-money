import { competenciaDe, dataCivil, derivar, gerarSeed, somarMeses } from '@goose-money/core';
import { describe, expect, it } from 'vitest';

import { csvDoExtrato, extratoDaTela, nomeDoCsv } from './extrato';

const HOJE = dataCivil('2026-11-04');
const d = derivar(gerarSeed(HOJE, '00000000-0000-4000-8000-000000000001'), HOJE);
const corrente = d.fatos.contas.find((c) => c.nome === 'Conta corrente');
const destino = d.fatos.contas.find((c) =>
  d.fatos.lancamentos.some((l) => l.tipo === 'transferencia' && l.contaDestinoId === c.id),
);

describe('extrato da conta (6.4)', () => {
  it('fechamento do mês corrente até hoje = saldo atual (11.2)', () => {
    if (!corrente) throw new Error('sem conta');
    const e = extratoDaTela(d, corrente, competenciaDe(HOJE));
    expect(e.fechamento).toBe(d.saldos.get(corrente.id)?.atual);
    expect(e.linhas.every((l) => l.texto !== '' && l.categoriaOuTipo !== '')).toBe(true);
  });

  it('a transferência que chega diz de onde veio', () => {
    if (!destino) throw new Error('o seed não tem transferência');
    const meses = Array.from({ length: 5 }, (_, i) => somarMeses(competenciaDe(HOJE), -i));
    const linhas = meses.flatMap((mes) => extratoDaTela(d, destino, mes).linhas);
    const chegou = linhas.filter((l) => l.movimento.lancamento.contaDestinoId === destino.id);
    expect(chegou.length).toBeGreaterThan(0);
    expect(chegou.every((l) => l.texto.startsWith('Transferência · de '))).toBe(true);
  });

  it('o CSV tem uma linha por movimento, a abertura, os totais e o fechamento', () => {
    if (!corrente) throw new Error('sem conta');
    const mes = somarMeses(competenciaDe(HOJE), -1);
    const e = extratoDaTela(d, corrente, mes);
    const linhas = csvDoExtrato(e).trimEnd().split('\n');
    expect(linhas).toHaveLength(1 + 1 + e.linhas.length + 3);
    expect(linhas[0]).toBe('Data;Descrição;Categoria ou tipo;Valor;Saldo');
    expect(linhas.at(-1)?.endsWith(String(e.fechamento).replace(/(\d\d)$/, ',$1'))).toBe(true);
    expect(nomeDoCsv(corrente, mes)).toBe(`extrato-conta-corrente-${mes}.csv`);
  });
});
