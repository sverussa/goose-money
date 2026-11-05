import { describe, expect, it } from 'vitest';
import { CHAVE_MANTER_CONECTADO, criarArmazenamentoSessao } from './armazenamento';

function memoria() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}

describe('criarArmazenamentoSessao', () => {
  it('usa sessionStorage sem "Manter conectado"', () => {
    const local = memoria();
    const sessao = memoria();
    criarArmazenamentoSessao(local, sessao).setItem('token', 'a');
    expect(sessao.getItem('token')).toBe('a');
    expect(local.getItem('token')).toBeNull();
  });

  it('usa localStorage com "Manter conectado"', () => {
    const local = memoria();
    const sessao = memoria();
    local.setItem(CHAVE_MANTER_CONECTADO, 'true');
    const s = criarArmazenamentoSessao(local, sessao);
    s.setItem('token', 'b');
    expect(local.getItem('token')).toBe('b');
    expect(s.getItem('token')).toBe('b');
    expect(sessao.getItem('token')).toBeNull();
  });

  it('remove dos dois', () => {
    const local = memoria();
    const sessao = memoria();
    local.setItem('token', 'x');
    sessao.setItem('token', 'y');
    criarArmazenamentoSessao(local, sessao).removeItem('token');
    expect(local.getItem('token')).toBeNull();
    expect(sessao.getItem('token')).toBeNull();
  });
});
