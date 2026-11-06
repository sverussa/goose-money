import { describe, expect, it } from 'vitest';

import { mensagemDoErroDaSenha, validarNovaSenha } from './senha';

describe('validarNovaSenha', () => {
  it('mínimo de 8 caracteres', () => {
    expect(validarNovaSenha('1234567', '1234567')).toBe(
      'A senha precisa ter pelo menos 8 caracteres',
    );
    expect(validarNovaSenha('12345678', '12345678')).toBeNull();
  });

  it('as duas precisam ser iguais', () => {
    expect(validarNovaSenha('12345678', '12345679')).toBe('As senhas não são iguais');
  });
});

describe('mensagemDoErroDaSenha', () => {
  it.each([
    ['same_password', 'A nova senha precisa ser diferente da atual'],
    ['weak_password', 'Senha fraca: escolha outra'],
    ['sem_conexao', 'Sem conexão para salvar a senha'],
    ['session_not_found', 'Não foi possível salvar a senha. Tente de novo.'],
  ])('%s', (codigo, texto) => {
    expect(mensagemDoErroDaSenha(codigo)).toBe(texto);
  });
});
