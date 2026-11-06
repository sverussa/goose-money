import { describe, expect, it } from 'vitest';

import { lerLinkDeRetorno, retornoComErro } from './deepLink';

describe('lerLinkDeRetorno', () => {
  it('rota e código do PKCE', () => {
    expect(lerLinkDeRetorno('goosemoney://redefinir-senha?code=abc-123')).toEqual({
      rota: 'redefinir-senha',
      codigo: 'abc-123',
      erro: false,
    });
  });

  it('formato que o Auth local devolve, com barra no fim', () => {
    expect(lerLinkDeRetorno('goosemoney://redefinir-senha/?code=c0a91fae')).toEqual({
      rota: 'redefinir-senha',
      codigo: 'c0a91fae',
      erro: false,
    });
  });

  it('erro do Auth na busca ou depois do #', () => {
    expect(
      lerLinkDeRetorno('goosemoney://redefinir-senha?error=access_denied&error_code=otp_expired')
        ?.erro,
    ).toBe(true);
    expect(lerLinkDeRetorno('goosemoney://redefinir-senha#error_code=otp_expired')?.erro).toBe(
      true,
    );
  });

  it('ignora outros esquemas e texto inválido', () => {
    expect(lerLinkDeRetorno('https://evil.com/redefinir-senha?code=x')).toBeNull();
    expect(lerLinkDeRetorno('não é url')).toBeNull();
  });
});

describe('retornoComErro', () => {
  it('link expirado ou já usado no navegador', () => {
    expect(
      retornoComErro('?error=access_denied&error_code=otp_expired&retorno=redefinir-senha'),
    ).toBe('redefinir-senha');
  });
  it('link válido ou sem retorno', () => {
    expect(retornoComErro('?code=abc&retorno=redefinir-senha')).toBeNull();
    expect(retornoComErro('?error=access_denied')).toBeNull();
    expect(retornoComErro('')).toBeNull();
  });
});
