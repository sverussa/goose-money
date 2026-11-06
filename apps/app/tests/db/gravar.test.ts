import { centavos, excluirLancamento, type Fatos, gerarSeed, lancar } from '@goose-money/core';
import { beforeAll, describe, expect, it } from 'vitest';

import { aplicarGravadas, ErroDeGravacao, mensagemDoErroAoGravar } from '../../src/data/gravacao';
import {
  criarUsuario,
  gravarOk,
  hojeEmBrasilia,
  opsDosFatos,
  type Usuario,
} from '../../../../supabase/tests/apoio';
import { barra, carregarCom, contexto, executarCom, ordenados } from './apoio-app';

// T03-04: comando do core → gravar → cache, e o Desfazer, contra o banco local.
const hoje = hojeEmBrasilia();
let a: Usuario;
let antes: Fatos;
beforeAll(async () => {
  a = await criarUsuario();
  await gravarOk(a.cliente, opsDosFatos(gerarSeed(hoje, a.id)));
  antes = await carregarCom(a.cliente);
});

describe('executar e Desfazer', () => {
  it('criar e desfazer uma despesa devolve os fatos e os indicadores (11.7)', async () => {
    const conta = antes.contas.find((c) => !c.arquivada && c.incluirNoTotal);
    const categoria = antes.categorias.find((c) => c.tipo === 'despesa');
    if (!conta || !categoria) throw new Error('seed sem conta ou categoria de despesa');
    const cmd = lancar(antes, contexto(a.id, hoje), {
      tipo: 'despesa',
      status: 'efetivado',
      data: hoje,
      valor: centavos(8990),
      descricao: 'Teste T03-04',
      observacao: null,
      contaId: conta.id,
      contaDestinoId: null,
      categoriaId: categoria.id,
      cartaoId: null,
      faturaCompetencia: null,
      dividaId: null,
      parcelaDividaId: null,
    });

    const depois = aplicarGravadas(antes, await executarCom(a.cliente, cmd.mudancas));
    // O cache atualizado pelas linhas devolvidas é igual ao que o banco tem.
    expect(ordenados(depois)).toEqual(ordenados(await carregarCom(a.cliente)));
    expect(depois.lancamentos).toHaveLength(antes.lancamentos.length + 1);
    expect(barra(depois, hoje).saldoEmContas).toBe(barra(antes, hoje).saldoEmContas - 8990);

    const desfeito = aplicarGravadas(depois, await executarCom(a.cliente, cmd.inversas));
    expect(desfeito).toEqual(antes);
    expect(barra(desfeito, hoje)).toEqual(barra(antes, hoje));
    expect(ordenados(await carregarCom(a.cliente))).toEqual(ordenados(antes));
  });

  it('desfazer uma exclusão restaura o registro com os mesmos valores', async () => {
    const alvo = antes.lancamentos.find((l) => l.tipo === 'despesa');
    if (!alvo) throw new Error('seed sem despesa');
    const cmd = excluirLancamento(antes, contexto(a.id, hoje), alvo.id);
    const depois = aplicarGravadas(antes, await executarCom(a.cliente, cmd.mudancas));
    expect(depois.lancamentos.some((l) => l.id === alvo.id)).toBe(false);

    const desfeito = aplicarGravadas(depois, await executarCom(a.cliente, cmd.inversas));
    // Só o `updatedAt` muda (a exclusão e a volta são updates).
    expect(ordenados(desfeito, ['updatedAt'])).toEqual(ordenados(antes, ['updatedAt']));
    expect(barra(desfeito, hoje)).toEqual(barra(antes, hoje));
    expect(ordenados(await carregarCom(a.cliente), ['updatedAt'])).toEqual(
      ordenados(antes, ['updatedAt']),
    );
  });

  it('erro de gravação não devolve linhas e tem mensagem', async () => {
    const [l] = antes.lancamentos;
    if (!l) throw new Error('seed sem lançamento');
    const repetido = { entidade: 'lancamentos', acao: 'inserir', id: l.id, dados: l } as const;
    const erro: unknown = await executarCom(a.cliente, [repetido]).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroDeGravacao);
    expect(mensagemDoErroAoGravar(erro)).toBe('Já existe um registro com esses dados.');
    expect(ordenados(await carregarCom(a.cliente), ['updatedAt'])).toEqual(
      ordenados(antes, ['updatedAt']),
    );
  });
});
