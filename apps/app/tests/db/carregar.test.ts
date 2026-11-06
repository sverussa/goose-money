import { type Entidade, type Fatos, fatosSchema, gerarSeed } from '@goose-money/core';
import { beforeAll, describe, expect, it } from 'vitest';

import { lerFatos, type Linha, paraBanco, tabelaDe } from '../../src/data/mapeamento';
import {
  criarUsuario,
  gravarOk,
  hojeEmBrasilia,
  inserir,
  type Usuario,
} from '../../../../supabase/tests/apoio';

// T03-02: ida e volta pelo banco local com o mapeamento do app.
const listas = (f: Fatos) =>
  Object.entries(f).map(
    ([e, v]) => [e as Entidade, (Array.isArray(v) ? v : [v]) as Linha[]] as const,
  );

/** O banco regrava `created_at` e `updated_at`; o resto volta igual. */
const semInstantes = (f: Fatos) =>
  Object.fromEntries(
    listas(f).map(([e, l]) => [
      e,
      l
        .map((r): Linha => ({ ...r, createdAt: null, updatedAt: null }))
        .sort((a, b) => String(a.id).localeCompare(String(b.id))),
    ]),
  );

let a: Usuario;
let seed: Fatos;
beforeAll(async () => {
  a = await criarUsuario();
  seed = gerarSeed(hojeEmBrasilia(), a.id);
  // Grava com o mapeamento do app (paraBanco), não com o dos testes de banco.
  const ops = listas(seed).flatMap(([e, l]) =>
    l.map((r) => inserir(tabelaDe(e), paraBanco(r), String(r.id))),
  );
  await gravarOk(a.cliente, ops);
});

describe('carregarTudo com o seed', () => {
  it('devolve fatos que passam nos schemas, iguais aos gravados', async () => {
    const r = await a.cliente.rpc('carregar_tudo');
    expect(r.error).toBeNull();
    const fatos = lerFatos(r.data);
    expect(fatosSchema.safeParse(fatos).success).toBe(true);
    expect(semInstantes(fatos)).toEqual(semInstantes(seed));
  });
});
