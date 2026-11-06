/// <reference types="node" />
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  cardColors,
  categorical,
  layout,
  lightRoles,
  semantic,
  shape,
  systemCategoryColor,
  typography,
} from '../../../../design/theme-tokens';

const css = readFileSync(new URL('./tema.css', import.meta.url), 'utf8');

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const rem = (px: number) => `${String(px / 16)}rem`;

/** Valor da variável no bloco `@theme static` (o primeiro onde ela aparece). */
function valor(nome: string): string | undefined {
  return new RegExp(`${nome}:\\s*([^;]+);`).exec(css)?.[1]?.trim().toLowerCase();
}

// Nome da variável no tema → valor esperado vindo de design/theme-tokens.ts.
const esperado: Record<string, string> = {
  ...Object.fromEntries(Object.entries(lightRoles).map(([k, v]) => [`--color-${kebab(k)}`, v])),
  ...Object.fromEntries(
    Object.entries(semantic).flatMap(([k, v]) => [
      [`--color-${k}`, v.main],
      [`--color-${k}-container`, v.container],
      [`--color-on-${k}-container`, v.onContainer],
    ]),
  ),
  ...Object.fromEntries(categorical.map((v, i) => [`--color-cat-${String(i + 1)}`, v])),
  '--color-cat-sistema': systemCategoryColor,
  '--color-cartao-a': cardColors.cartaoA.face,
  '--color-cartao-a-grafico': cardColors.cartaoA.chart,
  '--color-cartao-b': cardColors.cartaoB.face,
  '--color-cartao-b-grafico': cardColors.cartaoB.chart,
  '--radius-xs': `${String(shape.extraSmall)}px`,
  '--radius-sm': `${String(shape.small)}px`,
  '--radius-md': `${String(shape.medium)}px`,
  '--radius-lg': `${String(shape.large)}px`,
  '--radius-xl': `${String(shape.extraLarge)}px`,
  '--radius-full': `${String(shape.full)}px`,
  ...Object.fromEntries(
    Object.entries(typography.scale).flatMap(([k, v]) => {
      const nome = `--text-${kebab(k)
        .replace(/-large$/, '-lg')
        .replace(/-medium$/, '-md')}`;
      return [
        [nome, rem(v.size)],
        [`${nome}--line-height`, rem(v.lineHeight)],
        [`${nome}--font-weight`, String(v.weight)],
      ];
    }),
  ),
  '--spacing-drawer': `${String(layout.navDrawerWidth)}px`,
  '--spacing-app-bar': `${String(layout.topAppBarHeight)}px`,
  '--spacing-tab': `${String(layout.tabHeight)}px`,
  '--spacing-item': `${String(layout.listItemMinHeight)}px`,
  '--spacing-alvo': `${String(layout.minTouchTarget)}px`,
  '--spacing-pagina': `${String(layout.pagePadding)}px`,
  '--spacing-card': `${String(layout.cardPadding)}px`,
  '--spacing-padrao': `${String(layout.gap)}px`,
  '--container-conteudo': `${String(layout.contentMaxWidth)}px`,
  '--breakpoint-medium': `${String(layout.breakpoints.medium)}px`,
  '--breakpoint-expanded': `${String(layout.breakpoints.expanded)}px`,
};

describe('tema.css corresponde a design/theme-tokens.ts', () => {
  it.each(Object.entries(esperado))('%s = %s', (nome, v) => {
    expect(valor(nome)).toBe(v.toLowerCase());
  });

  it('a fonte é a Roboto Flex', () => {
    expect(valor('--font-sans')).toContain('roboto flex');
  });

  it('nenhum hex fora do bloco de tokens', () => {
    const fora = css.slice(css.indexOf('@theme inline'));
    expect(fora.match(/#[0-9a-f]{3,8}\b/gi)).toBeNull();
  });
});
