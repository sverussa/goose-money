import { describe, expect, it } from 'vitest';
import { cenario, CONTA_A, id } from './cenario';
import { aplicar, comando, ErroDeDominio, excluir, inserir, regra } from './mudancas';

describe('aplicar', () => {
  it('excluir tira dos fatos; a inversa devolve o registro inteiro (9.4)', () => {
    const f = cenario();
    const cmd = comando(f, 'Teste', [excluir('preferencias', f.preferencias?.id as string)]);
    expect(cmd.inversas).toEqual([
      { entidade: 'preferencias', acao: 'alterar', id: f.preferencias?.id, dados: f.preferencias },
    ]);
    const sem = aplicar(f, cmd.mudancas);
    expect(sem.preferencias).toBeNull();
    expect(aplicar(sem, cmd.inversas)).toEqual(f);
  });

  it('não insere id repetido nem altera o que não existe', () => {
    const f = cenario();
    expect(() => aplicar(f, [inserir('contas', f.contas[0] as { id: string })])).toThrow(
      'já existe',
    );
    expect(() => aplicar(f, [excluir('contas', id(777))])).toThrow('inexistente');
    expect(aplicar(f, [])).toBe(f);
    expect(f.contas[0]?.id).toBe(CONTA_A);
  });
});

describe('regra', () => {
  it('erro de faixa vira erro de domínio; os outros passam', () => {
    expect(() =>
      regra(() => {
        throw new RangeError('fora');
      }),
    ).toThrow(ErroDeDominio);
    expect(() =>
      regra(() => {
        throw new TypeError('bug');
      }),
    ).toThrow(TypeError);
  });
});
