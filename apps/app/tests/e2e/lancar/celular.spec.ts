import { deMascara, menos } from '@goose-money/core';
import { expect, test } from '@playwright/test';

import { formatarMoeda } from '../../../src/app/formatacao';
import { barraNoBanco, campoValor, comSeed, dialogo, entrar, fab } from './apoio';

// T05-05: o formulário de lançamento em tela cheia no compact (4.2, 5.2, 7.1–7.3, 11.1).

test.use({ viewport: { width: 360, height: 800 } });

const indicador = (page: Parameters<typeof dialogo>[0], nome: string) =>
  page
    .getByRole('region', { name: 'Barra de Totais' })
    .getByRole('link', { name: new RegExp(`^${nome}`) });

test('em 360 dp, a despesa continua em 3 interações, em tela cheia (11.1)', async ({ page }) => {
  const u = await comSeed();
  await entrar(page, u);
  const antes = await barraNoBanco(u);

  await fab(page).click();
  await expect(dialogo(page)).toBeInViewport({ ratio: 1 });
  const caixa = await dialogo(page).boundingBox();
  expect(caixa).toMatchObject({ x: 0, y: 0, width: 360, height: 800 });
  await page.keyboard.type('2590');
  await page.keyboard.press('Enter');

  await expect(dialogo(page)).toBeHidden();
  const saldo = menos(antes.saldoEmContas, deMascara('2590'));
  await expect(indicador(page, 'Saldo em contas').locator('.text-title-lg')).toHaveText(
    formatarMoeda(saldo),
  );
  expect((await barraNoBanco(u)).saldoEmContas).toBe(saldo);
});

test('o teclado numérico abre no campo valor, que já vem com o foco', async ({ page }) => {
  await entrar(page, await comSeed());
  await fab(page).click();
  await expect(campoValor(page)).toBeFocused();
  await expect(campoValor(page)).toHaveAttribute('inputmode', 'numeric');
});

test('o botão Salvar fica visível com o teclado aberto', async ({ page }) => {
  await entrar(page, await comSeed());
  await fab(page).click();
  await page.keyboard.type('100');
  // O teclado do celular encolhe a área visível; aqui, a janela.
  await page.setViewportSize({ width: 360, height: 380 });
  const salvar = dialogo(page).getByRole('button', { name: 'Salvar', exact: true });
  await expect(salvar).toBeInViewport({ ratio: 1 });
  await expect(campoValor(page)).toBeInViewport();
});

test('depois de uma compra no cartão, A pagar aparece um tempo na Barra (4.2)', async ({
  page,
}) => {
  await entrar(page, await comSeed());
  const aPagar = indicador(page, 'A pagar nos cartões');
  await expect(aPagar).toBeHidden();
  await fab(page).click();
  await dialogo(page).getByRole('radio', { name: 'Compra no cartão' }).click();
  await campoValor(page).pressSequentially('4500');
  await campoValor(page).press('Enter');
  await expect(dialogo(page)).toBeHidden();
  await expect(aPagar).toBeVisible();
  await expect(aPagar).toContainText(`+${formatarMoeda(deMascara('4500'))}`);
  await expect(aPagar).toBeHidden({ timeout: 8000 });
});

test('o FAB fica acima da navigation bar', async ({ page }) => {
  await entrar(page, await comSeed());
  const barra = await page.getByRole('navigation').last().boundingBox();
  const botao = await fab(page).boundingBox();
  expect((botao?.y ?? 0) + (botao?.height ?? 0)).toBeLessThanOrEqual(barra?.y ?? 0);
});
