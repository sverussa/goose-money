import { expect, test } from '@playwright/test';

// T04-04: MoneyText e StatusChip na página de componentes.

test('todo estado tem chip com ícone e texto', async ({ page }) => {
  await page.goto('/#/dev/componentes');
  const chips = page.locator('[data-estado]');
  await expect(chips).toHaveCount(16);
  for (const chip of await chips.all()) {
    await expect(chip.locator('svg')).toHaveCount(1);
    await expect(chip).not.toHaveText('');
  }
});

test('valores com sinal de menos tipográfico e o modo privacidade oculta todos', async ({
  page,
}) => {
  await page.goto('/#/dev/componentes');
  const secao = page.locator('section', { hasText: 'MoneyText' });
  await expect(secao.getByText('−R$ 89,90').first()).toBeVisible();
  await expect(secao.getByText('+R$ 6.500,00')).toBeVisible();
  await expect(secao).not.toContainText('NaN');
  await expect(secao).not.toContainText('(R$');

  await secao.getByRole('button', { name: 'Ocultar valores' }).click();
  await expect(secao).not.toContainText('R$ 89,90');
  await expect(secao.getByLabel('Valor oculto')).toHaveCount(5);

  // A escolha vale para a sessão: recarregar mantém oculto.
  await page.reload();
  await expect(
    page.locator('section', { hasText: 'MoneyText' }).getByLabel('Valor oculto'),
  ).toHaveCount(5);
});
