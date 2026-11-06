import { describe, expect, it } from 'vitest';

import { rotaDeVolta, urlDoLogin } from './rotas';

describe('rota de volta do login', () => {
  it('guarda a rota pedida, com a busca', () => {
    const url = urlDoLogin('/contas?mes=2026-11');
    expect(url).toBe('/login?voltar=%2Fcontas%3Fmes%3D2026-11');
    expect(rotaDeVolta(url.slice('/login'.length))).toBe('/contas?mes=2026-11');
  });

  it('a raiz vai para o login sem parâmetro e volta para a raiz', () => {
    expect(urlDoLogin('/')).toBe('/login');
    expect(rotaDeVolta('')).toBe('/');
  });

  it.each(['//evil.com', 'https://evil.com', 'contas', '/login?voltar=/x', ''])(
    'recusa %s e volta para a raiz',
    (voltar) => {
      expect(rotaDeVolta(`?voltar=${encodeURIComponent(voltar)}`)).toBe('/');
    },
  );
});
