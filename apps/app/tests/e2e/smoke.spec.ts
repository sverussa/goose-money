import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('abre o app sem violações de acessibilidade', async ({ page }) => {
  await page.goto('/#/');
  await expect(page.getByRole('heading', { name: 'Goose Money' })).toBeVisible();

  const resultado = await new AxeBuilder({ page }).analyze();
  expect(resultado.violations).toEqual([]);
});
