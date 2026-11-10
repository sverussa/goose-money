import { describe, expect, it } from 'vitest';

import { mensagemDoErroDoCadastro, validarCadastro } from './cadastro';
import { mensagensAcesso, SENHA_MINIMA } from './mensagens';

const c = mensagensAcesso.criar;
const r = mensagensAcesso.redefinir;
const senha = 'x'.repeat(SENHA_MINIMA);

describe('validarCadastro', () => {
  it('aceita e-mail válido e duas senhas iguais com o mínimo', () => {
    expect(validarCadastro({ email: 'a@b.com', senha, confirmar: senha })).toBeNull();
  });

  it('recusa senha curta, confirmação diferente e e-mail inválido, todos juntos', () => {
    expect(validarCadastro({ email: 'a@', senha: senha.slice(1), confirmar: 'y' })).toEqual({
      email: c.emailInvalido,
      senha: r.curta,
      confirmar: r.diferentes,
    });
  });

  it('recusa só a confirmação diferente', () => {
    expect(validarCadastro({ email: 'a@b.com', senha, confirmar: `${senha}y` })).toEqual({
      email: undefined,
      senha: undefined,
      confirmar: r.diferentes,
    });
  });
});

describe('mensagemDoErroDoCadastro', () => {
  it('sem rede, senha fraca e o resto', () => {
    expect(mensagemDoErroDoCadastro('sem_conexao')).toBe(c.semConexao);
    expect(mensagemDoErroDoCadastro('weak_password')).toBe(r.fraca);
    expect(mensagemDoErroDoCadastro('over_email_send_rate_limit')).toBe(c.erro);
  });
});
