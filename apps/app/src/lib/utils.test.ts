import { describe, expect, it } from 'vitest';

import { cn } from './utils';

describe('cn com o tema', () => {
  it('mantém o tamanho do tema ao lado de uma cor de texto', () => {
    expect(cn('text-label-md', 'text-on-surface')).toBe('text-label-md text-on-surface');
  });
  it('um tamanho do tema substitui outro', () => {
    expect(cn('text-label-md', 'text-title-lg')).toBe('text-title-lg');
  });
});
