import {
  aplicar,
  competencia,
  type Contexto,
  dataCivil,
  editarRecorrencia,
  gerarSeed,
} from '@goose-money/core';
import { describe, expect, it } from 'vitest';

import { linhasDaConfirmacao } from './preferencias';

const HOJE = dataCivil('2026-11-04');
const USUARIO = '00000000-0000-4000-8000-000000000001';
const ctx: Contexto = {
  hoje: HOJE,
  agora: `${HOJE}T12:00:00Z`,
  usuario: USUARIO,
  novoId: () => crypto.randomUUID(),
};
const NOV = competencia('2026-11');

describe('linhasDaConfirmacao', () => {
  const seed = gerarSeed(HOJE, USUARIO);

  it('lista as recorrências ativas, rendas primeiro e por dia, com o dia da versão vigente', () => {
    const linhas = linhasDaConfirmacao(seed, NOV);
    expect(linhas.map((l) => `${l.descricao} ${String(l.dia)} ${String(l.autoConfirmar)}`)).toEqual(
      [
        'Salário 5 true',
        'Freelance 20 false',
        'Academia 5 false',
        'Aluguel 10 false',
        'Streaming 12 false',
        'Internet 15 false',
        'Energia 31 false',
      ],
    );
  });

  it('deixa de fora as inativas', () => {
    const aluguel = seed.recorrencias.find((r) => r.descricao === 'Aluguel');
    if (!aluguel) throw new Error('Aluguel não está no seed');
    const f = aplicar(seed, editarRecorrencia(seed, ctx, aluguel.id, { ativa: false }).mudancas);
    expect(linhasDaConfirmacao(f, NOV).map((l) => l.descricao)).not.toContain('Aluguel');
  });
});
