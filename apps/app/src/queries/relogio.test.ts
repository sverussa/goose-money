import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { assinarHoje, hojeLocal } from './relogio';

describe('hoje', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 4, 23, 59, 58)); // 04/11, hora local
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('é a data local do dispositivo', () => {
    expect(hojeLocal()).toBe('2026-11-04');
  });

  it('muda à meia-noite e avisa, sem recarregar', () => {
    const aviso = vi.fn();
    const parar = assinarHoje(aviso, new EventTarget());
    vi.advanceTimersByTime(1000);
    expect(aviso).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(aviso).toHaveBeenCalledTimes(1);
    expect(hojeLocal()).toBe('2026-11-05');

    // E de novo na meia-noite seguinte.
    vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    expect(aviso).toHaveBeenCalledTimes(2);
    expect(hojeLocal()).toBe('2026-11-06');
    parar();
    vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    expect(aviso).toHaveBeenCalledTimes(2);
  });

  it('avisa quando a janela volta ao foco', () => {
    const janela = new EventTarget();
    const aviso = vi.fn();
    const parar = assinarHoje(aviso, janela);
    janela.dispatchEvent(new Event('focus'));
    expect(aviso).toHaveBeenCalledTimes(1);
    parar();
    janela.dispatchEvent(new Event('focus'));
    expect(aviso).toHaveBeenCalledTimes(1);
  });
});
