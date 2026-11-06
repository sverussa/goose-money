import { categoriasIniciais } from '@goose-money/core';
import { describe, expect, it } from 'vitest';

import { alterar, clienteAnonimo, criarUsuario, gravar, gravarOk, type Cliente } from './apoio';

// T02-08: inicialização de um usuário novo (D39, D40).
interface Linha {
  id: string;
  nome: string;
  tipo: string;
  icone: string;
  cor: string | null;
  sistema: string | null;
}
const categorias = async (cliente: Cliente) => {
  const { data } = await cliente
    .from('categorias')
    .select('id, nome, tipo, icone, cor, sistema, categoria_pai_id')
    .eq('is_deleted', false)
    .order('nome');
  return (data ?? []) as Linha[];
};
const iniciar = async (cliente: Cliente) => {
  const { error } = await cliente.rpc('inicializar_usuario');
  expect(error).toBeNull();
};

describe('inicializar_usuario()', () => {
  it('primeiro acesso cria as 4 categorias de sistema, as padrão do core e as preferências', async () => {
    const { id, cliente } = await criarUsuario();
    await iniciar(cliente);
    const esperadas = categoriasIniciais({ agora: '', usuario: id, novoId: () => '' })
      .map(({ nome, tipo, icone, cor, sistema }) => ({ nome, tipo, icone, cor, sistema }))
      .sort((x, y) => x.nome.localeCompare(y.nome));
    const gravadas = (await categorias(cliente))
      .map(({ nome, tipo, icone, cor, sistema }) => ({ nome, tipo, icone, cor, sistema }))
      .sort((x, y) => x.nome.localeCompare(y.nome));
    expect(gravadas).toEqual(esperadas);
    expect(gravadas.filter((c) => c.sistema !== null)).toHaveLength(4);
    const { data: prefs } = await cliente.from('preferencias').select('*');
    expect(prefs).toEqual([
      expect.objectContaining({
        limite_alerta: 50000,
        horizonte_padrao: 12,
        ocultar_valores_ao_abrir: false,
        is_deleted: false,
      }),
    ]);
  });

  it('chamar de novo não cria nada, nem recria categoria padrão excluída', async () => {
    const { cliente } = await criarUsuario();
    await iniciar(cliente);
    const antes = await categorias(cliente);
    const lazer = antes.find((c) => c.nome === 'Lazer');
    await gravarOk(cliente, [alterar('categorias', String(lazer?.id), { is_deleted: true })]);
    await iniciar(cliente);
    await iniciar(cliente);
    const depois = await categorias(cliente);
    expect(depois).toHaveLength(antes.length - 1);
    const { data: prefs } = await cliente.from('preferencias').select('id');
    expect(prefs).toHaveLength(1);
  });

  it('duas chamadas ao mesmo tempo não duplicam', async () => {
    const { cliente } = await criarUsuario();
    await Promise.all([iniciar(cliente), iniciar(cliente), iniciar(cliente)]);
    expect(await categorias(cliente)).toHaveLength(
      categoriasIniciais({ agora: '', usuario: '', novoId: () => '' }).length,
    );
  });

  it('as categorias de sistema não podem ser editadas nem excluídas (T02-03)', async () => {
    const { cliente } = await criarUsuario();
    await iniciar(cliente);
    const sistema = (await categorias(cliente)).filter((c) => c.sistema !== null);
    for (const c of sistema) {
      const { erro } = await gravar(cliente, [alterar('categorias', c.id, { is_deleted: true })]);
      expect(erro?.details).toContain('categorias_sistema_imutavel');
    }
  });

  it('sem usuário a função não roda', async () => {
    const { error } = await clienteAnonimo().rpc('inicializar_usuario');
    expect(error?.code).toBe('42501');
  });
});
