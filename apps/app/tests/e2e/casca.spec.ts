import AxeBuilder from '@axe-core/playwright';
import { badges, derivar, gerarSeed } from '@goose-money/core';
import { expect, type Page, test } from '@playwright/test';

import {
  criarUsuario,
  fatosDe,
  gravarOk,
  hojeEmBrasilia,
  opsDosFatos,
  type Usuario,
} from '../../../../supabase/tests/apoio';

// T04-05: AppShell e navegação nas três larguras (5.1).

const larguras = [
  { nome: 'compact', width: 360, height: 800 },
  { nome: 'medium', width: 768, height: 1024 },
  { nome: 'expanded', width: 1440, height: 900 },
] as const;

const itens = [
  ['Painel', /#\/$/],
  ['Lançamentos', /#\/lancamentos$/],
  ['Contas', /#\/contas$/],
  ['Cartões', /#\/cartoes$/],
  ['Dívidas', /#\/dividas$/],
  ['Rendas fixas', /#\/rendas$/],
  ['Gastos fixos', /#\/gastos-fixos$/],
  ['Projeções', /#\/\?aba=projecoes$/],
  ['Configurações', /#\/configuracoes$/],
] as const;

async function entrar(page: Page, u: Usuario) {
  await page.goto('/#/login');
  await page.getByLabel('E-mail').fill(u.email);
  await page.getByLabel('Senha', { exact: true }).fill(u.senha);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Painel' })).toBeVisible();
}

async function semAnimacoes(page: Page) {
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every((a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity),
  );
}

for (const l of larguras) {
  test.describe(`${l.nome} (${String(l.width)} dp)`, () => {
    test.use({ viewport: { width: l.width, height: l.height } });

    test('os 9 itens levam às rotas certas, com título e item ativo', async ({ page }) => {
      await entrar(page, await criarUsuario());
      for (const [rotulo, url] of itens) {
        if (
          l.nome === 'compact' &&
          !['Painel', 'Lançamentos', 'Contas', 'Cartões'].includes(rotulo)
        ) {
          await page.getByRole('button', { name: /^Mais/ }).click();
          await page.getByRole('dialog').getByRole('link', { name: rotulo }).click();
        } else {
          await page
            .getByRole('navigation')
            .getByRole('link', { name: rotulo, exact: true })
            .click();
        }
        await expect(page).toHaveURL(url);
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(rotulo);
        await expect(page).toHaveTitle(`${rotulo} · Goose Money`);
        if (l.nome !== 'compact' || ['Painel', 'Lançamentos', 'Contas', 'Cartões'].includes(rotulo))
          await expect(page.getByRole('link', { name: rotulo, exact: true })).toHaveAttribute(
            'aria-current',
            'page',
          );
      }
    });

    test('sem violações de acessibilidade', async ({ page }) => {
      await entrar(page, await criarUsuario());
      await semAnimacoes(page);
      const r = await new AxeBuilder({ page }).analyze();
      expect(
        r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
      ).toEqual([]);
    });
  });
}

test.describe('compact', () => {
  test.use({ viewport: { width: 360, height: 800 } });

  test('a navigation bar tem exatamente 5 itens, incluindo "Mais"', async ({ page }) => {
    await entrar(page, await criarUsuario());
    const barra = page.getByRole('navigation', { name: 'Navegação principal' });
    await expect(barra.locator(':scope > a, :scope > button')).toHaveCount(5);
    await expect(barra.getByRole('button', { name: /^Mais/ })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Menu principal' })).toBeHidden();
  });
});

test('os badges mostram os números do core', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const u = await criarUsuario();
  await gravarOk(u.cliente, opsDosFatos(gerarSeed(hojeEmBrasilia(), u.id)));
  await entrar(page, u);
  // A confirmação automática (T03-06) pode gravar ao abrir: os números valem depois dela.
  await page.waitForLoadState('networkidle');
  const tudo = await u.cliente.rpc('carregar_tudo');
  const b = badges(
    derivar(fatosDe(tudo.data as Record<string, Record<string, unknown>[]>), hojeEmBrasilia()),
  );
  expect(b.gastosFixos + b.rendasFixas + b.cartoes + b.lancamentos).toBeGreaterThan(0);

  const menu = page.getByRole('navigation', { name: 'Menu principal' });
  for (const [rotulo, n] of [
    ['Lançamentos', b.lancamentos],
    ['Cartões', b.cartoes],
    ['Rendas fixas', b.rendasFixas],
    ['Gastos fixos', b.gastosFixos],
  ] as const) {
    const link = menu.getByRole('link', { name: new RegExp(`^${rotulo}`) });
    if (n === 0) await expect(link).not.toContainText(/\d/);
    else await expect(link).toContainText(String(n));
  }
});
