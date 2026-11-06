import { AuthApiError, AuthRetryableFetchError, AuthUnknownError } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import { mensagemDoErroAoEntrar } from './errosAuth';

describe('mensagemDoErroAoEntrar', () => {
  it('credencial inválida', () => {
    const e = new AuthApiError('Invalid login credentials', 400, 'invalid_credentials');
    expect(mensagemDoErroAoEntrar(e)).toBe('E-mail ou senha inválidos');
  });

  it('e-mail não confirmado', () => {
    const e = new AuthApiError('Email not confirmed', 400, 'email_not_confirmed');
    expect(mensagemDoErroAoEntrar(e)).toBe('Confirme o e-mail antes de entrar');
  });

  it('sem rede: falha do fetch, navegador offline ou erro de rede do Supabase', () => {
    expect(mensagemDoErroAoEntrar(new TypeError('Failed to fetch'))).toBe(
      'Sem conexão para entrar',
    );
    expect(mensagemDoErroAoEntrar(new AuthRetryableFetchError('Failed to fetch', 0))).toBe(
      'Sem conexão para entrar',
    );
    const credencial = new AuthApiError('x', 400, 'invalid_credentials');
    expect(mensagemDoErroAoEntrar(credencial, false)).toBe('Sem conexão para entrar');
  });

  it('demais erros', () => {
    expect(mensagemDoErroAoEntrar(new AuthUnknownError('?', null))).toBe(
      'Não foi possível entrar. Tente de novo.',
    );
  });
});
