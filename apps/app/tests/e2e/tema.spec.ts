import { expect, type Page, test } from '@playwright/test';

// T04-02: contraste AA (11.1) dos pares de texto usados, nos dois temas, lendo as variáveis
// aplicadas na página; e a troca de tema sem recarregar e sem piscar.

const pares: [texto: string, fundo: string][] = [
  ...[
    'surface',
    'surface-container-lowest',
    'surface-container-low',
    'surface-container',
    'surface-container-high',
    'surface-container-highest',
  ].flatMap((f): [string, string][] => [
    ['on-surface', f],
    ['on-surface-variant', f],
  ]),
  ['primary', 'surface'],
  ['primary', 'surface-container-lowest'],
  ['on-primary', 'primary'],
  ['on-primary-container', 'primary-container'],
  ['on-secondary-container', 'secondary-container'],
  ['error', 'surface'],
  ['on-error', 'error'],
  ['on-error-container', 'error-container'],
  ['inverse-on-surface', 'inverse-surface'],
  ['inverse-primary', 'inverse-surface'],
  ...['income', 'expense', 'transfer', 'forecast', 'warning'].flatMap((s): [string, string][] => [
    [s, 'surface'],
    [s, 'surface-container-lowest'],
    [s, 'surface-container-low'],
    [`on-${s}-container`, `${s}-container`],
  ]),
];

function luminancia(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

function contraste(a: string, b: string): number {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return ((l1 ?? 0) + 0.05) / ((l2 ?? 0) + 0.05);
}

async function variaveis(page: Page, nomes: string[]): Promise<Record<string, string>> {
  return page.evaluate((ns) => {
    const estilo = getComputedStyle(document.documentElement);
    return Object.fromEntries(
      ns.map((n) => [n, estilo.getPropertyValue(`--color-${n}`).trim().toLowerCase()]),
    );
  }, nomes);
}

const nomes = [...new Set(pares.flat())];

for (const tema of ['claro', 'escuro'] as const) {
  test(`contraste ≥ 4,5:1 no tema ${tema}`, async ({ page }) => {
    await page.addInitScript((t) => {
      localStorage.setItem('goose-money:tema', t);
    }, tema);
    await page.goto('/#/login');
    if (tema === 'escuro') await expect(page.locator('html')).toHaveClass(/dark/);
    else await expect(page.locator('html')).not.toHaveClass(/dark/);
    const v = await variaveis(page, nomes);
    const abaixo = pares
      .map(([t, f]) => ({ par: `${t} / ${f}`, razao: contraste(v[t] ?? '', v[f] ?? '') }))
      .filter(({ razao }) => !(razao >= 4.5));
    expect(abaixo).toEqual([]);
  });
}

test('alternar o tema muda a tela sem recarregar', async ({ page }) => {
  await page.goto('/#/dev/tema');
  const fundo = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const claro = await fundo();
  await page.getByRole('button', { name: 'escuro' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  expect(await fundo()).not.toBe(claro);
  await page.getByRole('button', { name: 'claro' }).click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  expect(await fundo()).toBe(claro);
});

test('em "sistema", trocar o tema do SO troca o app', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/#/dev/tema');
  await page.getByRole('button', { name: 'sistema' }).click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).not.toHaveClass(/dark/);
});

test('recarregar no tema escuro não pisca o claro', async ({ page }) => {
  await page.goto('/#/dev/tema');
  await page.getByRole('button', { name: 'escuro' }).click();
  const escuro = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  // Sem o app: só o tema-inicial.js roda, como antes da primeira pintura.
  await page.route('**/src/main.tsx', (rota) => rota.abort());
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(escuro);
});
