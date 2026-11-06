import AxeBuilder from '@axe-core/playwright';
import { dataCivil, deslocar, periodo, periodoAnterior, periodoPreset } from '@goose-money/core';
import { expect, type Page, test } from '@playwright/test';

import { criarUsuario } from '../../../../supabase/tests/apoio';

// T04-07: cabeçalho de contexto, seletor de mês e de período, na página de revisão da casca.

async function abrir(page: Page, busca = '') {
  const u = await criarUsuario();
  await page.goto(`/#/login?voltar=${encodeURIComponent(`/dev/casca${busca}`)}`);
  await page.getByLabel('E-mail').fill(u.email);
  await page.getByLabel('Senha', { exact: true }).fill(u.senha);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('group', { name: 'Período' })).toBeVisible();
}

/** "Hoje" do navegador, como o app calcula (fuso local). */
const hojeDoNavegador = async (page: Page) =>
  dataCivil(
    await page.evaluate(() => {
      const d = new Date();
      return `${String(d.getFullYear())}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }),
  );

test('o cabeçalho de contexto continua visível ao rolar uma lista longa (4.2)', async ({
  page,
}) => {
  await abrir(page);
  const entradas = page.getByText('Entradas', { exact: true });
  await page.getByText('Item 60').scrollIntoViewIfNeeded();
  await expect(entradas).toBeInViewport();
  await expect(page.getByRole('region', { name: 'Barra de Totais' })).toBeInViewport();
});

test('chips e setas mudam o período na URL, que sobrevive a recarregar', async ({ page }) => {
  await abrir(page);
  const hoje = await hojeDoNavegador(page);
  const grupo = page.getByRole('group', { name: 'Período' });
  await expect(grupo.getByRole('button', { name: 'Últimos 3 meses' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await grupo.getByRole('button', { name: 'Este mês' }).click();
  const esteMes = periodoPreset('este-mes', hoje);
  await expect(page).toHaveURL(new RegExp(`de=${esteMes.de}&ate=${esteMes.ate}`));

  await grupo.getByRole('button', { name: 'Período anterior' }).click();
  const anterior = deslocar(esteMes, -1);
  await expect(page).toHaveURL(new RegExp(`de=${anterior.de}&ate=${anterior.ate}`));
  await expect(grupo.getByRole('button', { name: 'Personalizado' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await page.reload();
  await expect(page).toHaveURL(new RegExp(`de=${anterior.de}&ate=${anterior.ate}`));
  const [a, m, d] = anterior.de.split('-');
  await expect(grupo).toContainText(`${d ?? ''}/${m ?? ''}/${a ?? ''} –`);
});

test('personalizado aplica as datas escolhidas e recusa fim antes do início', async ({ page }) => {
  await abrir(page);
  const grupo = page.getByRole('group', { name: 'Período' });
  await grupo.getByRole('button', { name: 'Personalizado' }).click();
  await page.getByLabel('De', { exact: true }).fill('2026-03-10');
  await page.getByLabel('Até', { exact: true }).fill('2026-03-01');
  await page.getByRole('button', { name: 'Aplicar' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toHaveText(
    'A data final precisa ser igual ou posterior à inicial.',
  );
  await page.getByLabel('Até', { exact: true }).fill('2026-04-20');
  await page.getByRole('button', { name: 'Aplicar' }).click();
  await expect(page).toHaveURL(/de=2026-03-10&ate=2026-04-20/);
  const ant = periodoAnterior(periodo(dataCivil('2026-03-10'), dataCivil('2026-04-20')));
  const dm = (d: string) => `${d.slice(8)}/${d.slice(5, 7)}`;
  await expect(grupo).toContainText(
    `10/03/2026 – 20/04/2026 · comparado a ${dm(ant.de)} – ${dm(ant.ate)}`,
  );
});

test('período inválido na URL volta ao padrão sem quebrar a tela', async ({ page }) => {
  await abrir(page, '?de=2026-02-30&ate=ontem');
  await expect(
    page.getByRole('group', { name: 'Período' }).getByRole('button', { name: 'Últimos 3 meses' }),
  ).toHaveAttribute('aria-pressed', 'true');
});

test('o seletor de mês muda ?mes= e o mês sobrevive a recarregar', async ({ page }) => {
  await abrir(page, '?mes=2026-11');
  const barra = page.getByRole('banner');
  await expect(barra.getByText('Novembro 2026')).toBeVisible();
  await barra.getByRole('button', { name: 'Próximo mês' }).click();
  await expect(page).toHaveURL(/mes=2026-12/);
  await expect(barra.getByText('Dezembro 2026')).toBeVisible();
  await page.reload();
  await expect(barra.getByText('Dezembro 2026')).toBeVisible();
  await barra.getByRole('button', { name: 'Mês anterior' }).click();
  await barra.getByRole('button', { name: 'Mês anterior' }).click();
  await expect(barra.getByText('Outubro 2026')).toBeVisible();
});

test('mês inválido na URL volta ao mês de hoje', async ({ page }) => {
  await abrir(page, '?mes=2026-13');
  await expect(page.getByRole('banner')).toContainText(
    /(Janeiro|Fevereiro|Março|Abril|Maio|Junho|Julho|Agosto|Setembro|Outubro|Novembro|Dezembro) \d{4}/,
  );
});

test('sem violações de acessibilidade', async ({ page }) => {
  await abrir(page);
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every((a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity),
  );
  const r = await new AxeBuilder({ page }).analyze();
  expect(
    r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
  ).toEqual([]);
});
