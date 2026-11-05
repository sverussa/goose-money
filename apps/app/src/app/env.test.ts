import { describe, expect, it } from 'vitest';
import { lerEnv } from './env';

describe('lerEnv', () => {
  it('aceita URL e chave preenchidas', () => {
    const r = lerEnv({ VITE_SUPABASE_URL: 'http://127.0.0.1:54321', VITE_SUPABASE_ANON_KEY: 'x' });
    expect(r.ok).toBe(true);
  });

  it('aponta as variáveis vazias ou inválidas', () => {
    const r = lerEnv({ VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: ' ' });
    expect(r).toEqual({ ok: false, invalidas: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] });
  });
});
