import AxeBuilder from '@axe-core/playwright';
import { gerarSeed } from '@goose-money/core';
import { expect, type Page, test } from '@playwright/test';

import {
  criarUsuario,
  gravarOk,
  hojeEmBrasilia,
  opsDosFatos,
  type Usuario,
} from '../../../../supabase/tests/apoio';

// T04-09: atalhos de teclado (4.1, item 9) e busca global (D45).

async function entrar(page: Page, u: Usuario, rota = '/') {
  await page.goto(`/#/login?voltar=${encodeURIComponent(rota)}`);
  await page.getByLabel('E-mail').fill(u.email);
  await page.getByLabel('Senha', { exact: true }).fill(u.senha);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('button', { name: /^Buscar/ })).toBeVisible();
}

const lancar = (page: Page) => page.getByRole('dialog', { name: 'Lançar' });
const busca = (page: Page) => page.getByRole('dialog', { name: 'Busca' });

test('N abre o formulário em qualquer tela e Esc fecha', async ({ page }) => {
  await entrar(page, await criarUsuario());
  for (const rota of ['/', '/contas', '/configuracoes']) {
    await page.goto(`/#${rota}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.keyboard.press('n');
    await expect(lancar(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(lancar(page)).toBeHidden();
  }
});

test('N não abre o formulário enquanto se digita num campo', async ({ page }) => {
  await entrar(page, await criarUsuario());
  await page.keyboard.press('Control+k');
  await page.getByRole('combobox', { name: 'Busca' }).pressSequentially('n');
  await expect(page.getByRole('combobox', { name: 'Busca' })).toHaveValue('n');
  await expect(lancar(page)).toBeHidden();
});

for (const atalho of ['Control+k', 'Meta+k']) {
  test(`${atalho} abre a busca`, async ({ page }) => {
    await entrar(page, await criarUsuario());
    await page.keyboard.press(atalho);
    await expect(busca(page)).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Busca' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(busca(page)).toBeHidden();
  });
}

test('a busca é navegável só pelo teclado: telas, ações e lançamentos', async ({ page }) => {
  const u = await criarUsuario();
  await gravarOk(u.cliente, opsDosFatos(gerarSeed(hojeEmBrasilia(), u.id)));
  await entrar(page, u);

  await page.keyboard.press('Control+k');
  await page.keyboard.type('contas');
  await expect(busca(page).getByRole('option', { name: 'Contas' })).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/contas$/);
  await expect(busca(page)).toBeHidden();

  await page.keyboard.press('Control+k');
  await page.keyboard.type('lanç');
  await page.keyboard.press('ArrowDown');
  await expect(busca(page).getByRole('option', { name: 'Lançar' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.keyboard.press('Enter');
  await expect(lancar(page)).toBeVisible();
  await page.keyboard.press('Escape');

  // Um lançamento do seed pela descrição abre Lançamentos com ele em destaque.
  await page.keyboard.press('Control+k');
  await page.keyboard.type('sal');
  const opcao = busca(page)
    .getByRole('option', { name: /salário/i })
    .first();
  await expect(opcao).toBeVisible();
  while ((await opcao.getAttribute('aria-selected')) !== 'true')
    await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/lancamentos\?destaque=[\w-]+$/);
});

test('← e → mudam o mês nas telas com seletor de mês, fora dos campos', async ({ page }) => {
  await entrar(page, await criarUsuario(), '/dev/casca?mes=2026-11');
  const barra = page.getByRole('banner');
  await expect(barra.getByText('Novembro 2026')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(/mes=2026-12/);
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(page).toHaveURL(/mes=2026-10/);
  // Com a busca aberta, as setas são da busca.
  await page.keyboard.press('Control+k');
  await page.keyboard.press('ArrowLeft');
  await expect(page).toHaveURL(/mes=2026-10/);
});

test('o menu do usuário lista os atalhos de teclado', async ({ page }) => {
  await entrar(page, await criarUsuario());
  await page.getByRole('button', { name: 'Menu do usuário' }).click();
  await page.getByRole('menuitem', { name: 'Atalhos de teclado' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Atalhos de teclado' });
  await expect(dialogo).toContainText('Novo lançamento');
  await expect(dialogo).toContainText(/(Ctrl|⌘) K/);
  await expect(dialogo).toContainText('Mês anterior e seguinte');
});

test('busca aberta sem violações de acessibilidade', async ({ page }) => {
  await entrar(page, await criarUsuario());
  await page.keyboard.press('Control+k');
  await expect(busca(page)).toBeVisible();
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every((a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity),
  );
  const r = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
  expect(
    r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
  ).toEqual([]);
});
