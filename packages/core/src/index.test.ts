import { describe, expect, it } from 'vitest';
import { VERSAO_CORE } from './index';

describe('core', () => {
  it('exporta a versão', () => {
    expect(VERSAO_CORE).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
