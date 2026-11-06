import { type Comando, dataCivil, type Fatos, gerarSeed } from '@goose-money/core';
import { MutationObserver, QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { ErroDeGravacao, type Gravadas } from '@/data/gravacao';

import { opcoesDaGravacao } from './gravacao';

// A mutação de useComando sem React: o MutationObserver é o que o useMutation usa por dentro.
const seed = gerarSeed(dataCivil('2026-11-04'), '00000000-0000-4000-8000-000000000001');
const [l] = seed.lancamentos;
if (!l) throw new Error('seed sem lançamentos');
const chave = ['fatos', 'u'];
const comando: Comando = {
  mudancas: [{ entidade: 'lancamentos', acao: 'alterar', id: l.id, dados: { valor: 1 } }],
  inversas: [{ entidade: 'lancamentos', acao: 'alterar', id: l.id, dados: { valor: l.valor } }],
  descricao: 'Lançamento alterado',
};

function montar(executar: () => Promise<Gravadas>, online = true) {
  const consultas = new QueryClient();
  consultas.setQueryData<Fatos>(chave, seed);
  const avisos = { gravado: vi.fn(), desfeito: vi.fn(), erro: vi.fn() };
  const observador = new MutationObserver(
    consultas,
    opcoesDaGravacao({ consultas, chave, executar, avisos, online: () => online }),
  );
  return { consultas, avisos, observador };
}

describe('gravação do useComando', () => {
  it('fica "salvando" até o banco responder; depois aplica as linhas e oferece Desfazer', async () => {
    let responder: (g: Gravadas) => void = () => undefined;
    const { consultas, avisos, observador } = montar(() => new Promise((r) => (responder = r)));
    const feito = observador.mutate({ mudancas: comando.mudancas, comando });
    await Promise.resolve();
    expect(observador.getCurrentResult().isPending).toBe(true);
    expect(consultas.getQueryData(chave)).toBe(seed); // nada muda antes de gravar

    responder({ lancamentos: [{ ...l, valor: 1 as never }] });
    await feito;
    expect(observador.getCurrentResult().isPending).toBe(false);
    expect(consultas.getQueryData<Fatos>(chave)?.lancamentos[0]?.valor).toBe(1);
    expect(avisos.gravado).toHaveBeenCalledWith(comando);
  });

  it('erro de gravação não altera o cache e mostra a mensagem', async () => {
    const { consultas, avisos, observador } = montar(() =>
      Promise.reject(new ErroDeGravacao('dup', '23505', 409)),
    );
    await expect(observador.mutate({ mudancas: comando.mudancas, comando })).rejects.toThrow();
    expect(consultas.getQueryData(chave)).toBe(seed);
    expect(avisos.erro).toHaveBeenCalledWith('Já existe um registro com esses dados.');
    expect(avisos.gravado).not.toHaveBeenCalled();
  });

  it('o Desfazer grava as inversas e avisa "Desfeito"', async () => {
    const executar = vi.fn(() => Promise.resolve({}));
    const { avisos, observador } = montar(executar);
    await observador.mutate({ mudancas: comando.inversas, comando: null });
    expect(executar).toHaveBeenCalledWith(comando.inversas);
    expect(avisos.desfeito).toHaveBeenCalled();
  });

  it('sem conexão, nem tenta gravar e mostra a mensagem (T03-05)', async () => {
    const executar = vi.fn(() => Promise.resolve({}));
    const { consultas, avisos, observador } = montar(executar, false);
    await expect(observador.mutate({ mudancas: comando.mudancas, comando })).rejects.toThrow();
    expect(executar).not.toHaveBeenCalled();
    expect(consultas.getQueryData(chave)).toBe(seed);
    expect(avisos.erro).toHaveBeenCalledWith('Sem conexão: tente de novo quando a internet voltar');
  });
});
