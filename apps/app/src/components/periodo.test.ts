import { dataCivil, periodo, periodoPreset } from '@goose-money/core';
import { describe, expect, it } from 'vitest';

import { mesDaUrl, periodoDaBusca } from './periodo';

const hoje = dataCivil('2026-11-04');
const busca = (s: string) => new URLSearchParams(s);

describe('mês na URL', () => {
  it('lê ?mes=AAAA-MM', () => {
    expect(mesDaUrl(busca('mes=2026-09'), hoje)).toBe('2026-09');
  });
  it.each(['', 'mes=', 'mes=2026-13', 'mes=nov', 'mes=2026-1', 'mes=0999-01'])(
    '"%s" volta ao mês de hoje',
    (s) => {
      expect(mesDaUrl(busca(s), hoje)).toBe('2026-11');
    },
  );
});

describe('período na URL (8.2)', () => {
  const padrao = () => periodoPreset('ultimos-3-meses', hoje);

  it('lê ?de=…&ate=…', () => {
    expect(periodoDaBusca(busca('de=2026-09-01&ate=2026-11-04'), padrao)).toEqual(
      periodo(dataCivil('2026-09-01'), dataCivil('2026-11-04')),
    );
  });

  it.each([
    '',
    'de=2026-09-01',
    'ate=2026-11-04',
    'de=2026-11-04&ate=2026-09-01',
    'de=2026-02-30&ate=2026-03-01',
    'de=ontem&ate=hoje',
  ])('"%s" volta ao padrão', (s) => {
    expect(periodoDaBusca(busca(s), padrao)).toEqual(padrao());
  });
});
