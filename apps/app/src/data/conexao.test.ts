import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { criarConexao } from './conexao';

function montar(fetchBase: typeof fetch, sondar = vi.fn(() => Promise.resolve())) {
  const janela = new EventTarget();
  let navegador = true;
  const c = criarConexao({
    navegadorOnline: () => navegador,
    janela,
    fetchBase,
    sondar,
    intervalo: 1000,
  });
  const aviso = vi.fn();
  c.assinar(aviso);
  return { c, janela, aviso, sondar, offline: (v: boolean) => (navegador = !v) };
}

describe('conexão', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('segue os eventos online e offline do navegador', () => {
    const { c, janela, aviso, offline } = montar(vi.fn());
    offline(true);
    janela.dispatchEvent(new Event('offline'));
    expect(c.online()).toBe(false);
    expect(aviso).toHaveBeenCalledTimes(1);
    offline(false);
    janela.dispatchEvent(new Event('online'));
    expect(c.online()).toBe(true);
    expect(aviso).toHaveBeenCalledTimes(2);
  });

  it('falha de rede numa chamada conta como sem conexão, mesmo com o navegador online', async () => {
    const falha = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')));
    const { c, aviso } = montar(falha);
    await expect(c.fetch('/x')).rejects.toThrow(TypeError);
    expect(c.online()).toBe(false);
    expect(aviso).toHaveBeenCalledTimes(1);
  });

  it('a sonda tenta de novo até haver resposta', async () => {
    const sondar = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new TypeError('ainda sem rede'))
      .mockResolvedValue(undefined);
    const { c } = montar(() => Promise.reject(new TypeError('x')), sondar);
    await c.fetch('/x').catch(() => undefined);
    await vi.advanceTimersByTimeAsync(1000);
    expect(c.online()).toBe(false);
    await vi.advanceTimersByTimeAsync(1000);
    expect(c.online()).toBe(true);
    await vi.advanceTimersByTimeAsync(5000);
    expect(sondar).toHaveBeenCalledTimes(2); // parou de sondar
  });

  it('uma resposta qualquer volta ao normal; requisição cancelada não conta', async () => {
    let ok = false;
    const base = vi.fn(() =>
      ok ? Promise.resolve(new Response(null, { status: 401 })) : Promise.reject(new TypeError()),
    );
    const { c } = montar(base);
    await c.fetch('/x').catch(() => undefined);
    ok = true;
    await c.fetch('/x');
    expect(c.online()).toBe(true);

    const cancelada = montar(() => Promise.reject(new DOMException('parou', 'AbortError')));
    await cancelada.c.fetch('/x').catch(() => undefined);
    expect(cancelada.c.online()).toBe(true);
  });
});
