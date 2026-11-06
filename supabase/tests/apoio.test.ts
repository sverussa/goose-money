import { describe, expect, it } from 'vitest';

import { clienteAnonimo, criarUsuario, sqlComoPostgres } from './apoio';

describe('base dos testes de banco', () => {
  it('usuário criado entra pela API e o banco responde', async () => {
    const { id, cliente } = await criarUsuario();
    const { data } = await cliente.auth.getUser();
    expect(data.user?.id).toBe(id);
    const [linha] = await sqlComoPostgres`select 1 as um`;
    expect(linha?.um).toBe(1);
  });

  it('cliente anônimo não tem usuário', async () => {
    const { data } = await clienteAnonimo().auth.getUser();
    expect(data.user).toBeNull();
  });
});
