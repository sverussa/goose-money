import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

// T04-08: ChartCard na página de componentes: exportação, resumo acessível e tooltip.

test.beforeEach(async ({ page }) => {
  await page.goto('/#/dev/componentes');
  await expect(page.getByRole('heading', { name: 'Gráficos' })).toBeVisible();
});

test('CSV com cabeçalho em português e uma linha por ponto', async ({ page }) => {
  await page.getByRole('button', { name: /^Opções do gráfico: Você gastou/ }).click();
  const baixou = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: 'Exportar CSV' }).click();
  const download = await baixou;
  expect(download.suggestedFilename()).toBe('receitas-despesas.csv');
  const linhas = (await readFile(await download.path(), 'utf8')).trimEnd().split('\n');
  expect(linhas).toEqual([
    'Mês;Receitas;Despesas;Resultado',
    'set/2026;6500,00;5123,45;1376,55',
    'out/2026;7000,00;4980,10;2019,90',
    'nov/2026;1200,00;899,90;300,10',
  ]);
});

test('o PNG exportado tem as cores do tema', async ({ page }) => {
  await page.getByRole('button', { name: /^Opções do gráfico: Você gastou/ }).click();
  const baixou = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: 'Exportar PNG' }).click();
  const download = await baixou;
  expect(download.suggestedFilename()).toBe('receitas-despesas.png');
  const base64 = (await readFile(await download.path())).toString('base64');
  // Conta os pixels perto de income (#14713A) e expense (#B3261E) no PNG.
  const cores = await page.evaluate(async (src) => {
    const img = new Image();
    img.src = `data:image/png;base64,${src}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d');
    if (!ctx) return { receita: 0, despesa: 0 };
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    const perto = (i: number, r: number, g: number, b: number) =>
      Math.abs((d[i] ?? 0) - r) + Math.abs((d[i + 1] ?? 0) - g) + Math.abs((d[i + 2] ?? 0) - b) <
      30;
    let receita = 0;
    let despesa = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (perto(i, 0x14, 0x71, 0x3a)) receita++;
      if (perto(i, 0xb3, 0x26, 0x1e)) despesa++;
    }
    return { receita, despesa };
  }, base64);
  expect(cores.receita).toBeGreaterThan(100);
  expect(cores.despesa).toBeGreaterThan(100);
});

test('todo gráfico tem aria-label com resumo, sem NaN nem Infinity', async ({ page }) => {
  const graficos = page.locator('[role="img"][aria-label]');
  await expect(graficos).toHaveCount(5);
  for (const g of await graficos.all()) {
    const rotulo = (await g.getAttribute('aria-label')) ?? '';
    expect(rotulo).toMatch(/total R\$/);
    expect(rotulo).not.toMatch(/NaN|Infinity/);
  }
  await expect(page.getByText('Sem despesas neste período')).toBeVisible();
  await expect(page.locator('main')).not.toContainText(/NaN|Infinity/);
});

test('tooltip em R$ com o percentual do total', async ({ page }) => {
  const grafico = page.getByRole('img', { name: /^Você gastou/ });
  await grafico.scrollIntoViewIfNeeded();
  const caixa = await grafico.boundingBox();
  if (!caixa) throw new Error('gráfico sem caixa');
  await page.mouse.move(caixa.x + caixa.width * 0.45, caixa.y + caixa.height * 0.5);
  const dica = grafico.locator('.recharts-tooltip-wrapper');
  await expect(dica).toContainText('Receitas');
  await expect(dica).toContainText(/R\$\s?7\.000,00/);
  await expect(dica).toContainText('47,6%');
  await expect(dica).not.toContainText(/NaN|Infinity/);
});

test('cada fatia da rosca tem a cor da sua categoria', async ({ page }) => {
  const fatias = page
    .getByRole('img', { name: /^Onde foi o dinheiro/ })
    .locator('.recharts-pie-sector path');
  await expect(fatias).toHaveCount(4);
  const cores = () => fatias.evaluateAll((ps) => ps.map((p) => getComputedStyle(p).fill));
  // A animação do Recharts é em JavaScript: espera as cores finais.
  await expect.poll(async () => new Set(await cores()).size).toBe(4);
  expect(await cores()).toContain('rgb(27, 107, 90)'); // cat-1, Moradia
});
