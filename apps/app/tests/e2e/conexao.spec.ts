import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

import { criarUsuario } from '../../../../supabase/tests/apoio';

// T03-05: banner "Sem conexão" e recarga ao voltar a rede.

async function entrar(page: Page) {
  const u = await criarUsuario();
  await page.goto('/#/login');
  await page.getByLabel('E-mail').fill(u.email);
  await page.getByLabel('Senha', { exact: true }).fill(u.senha);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('link', { name: /^Saldo em contas/ })).toBeVisible();
}

const banner = (page: Page) => page.getByRole('status').filter({ hasText: 'Sem conexão' });

test('offline mostra o banner; ao voltar, o banner some e os fatos recarregam', async ({
  page,
  context,
}) => {
  await entrar(page);
  await expect(banner(page)).toHaveCount(0);

  await context.setOffline(true);
  await expect(banner(page)).toBeVisible();
  await expect(banner(page)).toContainText('nada pode ser salvo');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  const recarga = page.waitForResponse('**/rest/v1/rpc/carregar_tudo');
  await context.setOffline(false);
  await expect(banner(page)).toHaveCount(0);
  expect((await recarga).ok()).toBe(true);
});

test('falha de rede numa chamada mostra o banner mesmo com o navegador online', async ({
  page,
  context,
}) => {
  await page.clock.install();
  await entrar(page);

  // O navegador volta a dizer "online", mas o Supabase não responde.
  await page.route('**/rest/v1/rpc/carregar_tudo', (r) => r.abort('internetdisconnected'));
  await context.setOffline(true);
  await context.setOffline(false);
  await expect(banner(page)).toBeVisible();

  // Com o Supabase de volta, a sonda (a cada 15 s) tira o banner.
  await page.unroute('**/rest/v1/rpc/carregar_tudo');
  await page.clock.fastForward(16_000);
  await expect(banner(page)).toHaveCount(0);
});
