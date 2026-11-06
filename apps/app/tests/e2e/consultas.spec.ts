import { expect, test } from '@playwright/test';

import { criarUsuario } from '../../../../supabase/tests/apoio';

// T03-03: "hoje" e recarga dos fatos, com o relógio falso do Playwright.

const rotaCarregar = '**/rest/v1/rpc/carregar_tudo';

test('à meia-noite o "hoje" muda sem recarregar a página', async ({ page }) => {
  const u = await criarUsuario();
  await page.clock.install({ time: new Date(2026, 10, 4, 23, 59, 50) });
  await page.goto('/#/login');
  await page.getByLabel('E-mail').fill(u.email);
  await page.getByLabel('Senha', { exact: true }).fill(u.senha);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByText('Hoje: 2026-11-04')).toBeVisible();
  await expect(page.getByLabel('Barra de Totais (centavos)')).toBeVisible();

  await page.clock.fastForward(15_000);
  await expect(page.getByText('Hoje: 2026-11-05')).toBeVisible();
});

test('voltar o foco à janela recarrega os fatos', async ({ page }) => {
  const u = await criarUsuario();
  await page.clock.install();
  await page.goto('/#/login');
  await page.getByLabel('E-mail').fill(u.email);
  await page.getByLabel('Senha', { exact: true }).fill(u.senha);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByLabel('Barra de Totais (centavos)')).toBeVisible();

  // Depois do staleTime (30 s), a volta do foco busca os fatos de novo.
  await page.clock.fastForward(31_000);
  const recarga = page.waitForRequest(rotaCarregar);
  await page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')));
  await recarga;
});
