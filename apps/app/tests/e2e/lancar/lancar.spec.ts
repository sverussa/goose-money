import { centavos, deMascara, mais, menos, somarDias } from '@goose-money/core';
import { expect, test } from '@playwright/test';

import { formatarMoeda } from '../../../src/app/formatacao';
import { criarUsuario, hojeEmBrasilia } from '../../../../../supabase/tests/apoio';
import { barraNoBanco, campoValor, comSeed, conferirBarra, dialogo, entrar, fab } from './apoio';

// T05-02: formulário de lançamento, despesa e receita (7.1–7.3, 11.1).

test.use({ viewport: { width: 1440, height: 900 } });

test('despesa em 3 interações: FAB, valor, Enter (11.1)', async ({ page }) => {
  const u = await comSeed();
  await entrar(page, u);
  const antes = await barraNoBanco(u);

  await fab(page).click();
  await expect(campoValor(page)).toBeFocused();
  await page.keyboard.type('1590');
  await page.keyboard.press('Enter');

  await expect(dialogo(page)).toBeHidden();
  await expect(page.getByText('Lançado')).toBeVisible();
  const v = deMascara('1590');
  await conferirBarra(page, {
    ...antes,
    saldoEmContas: menos(antes.saldoEmContas, v),
    previstoAteOFimDoMes: menos(antes.previstoAteOFimDoMes, v),
    resultadoDoMes: menos(antes.resultadoDoMes, v),
    patrimonioLiquido: menos(antes.patrimonioLiquido, v),
  });
});

test('receita em 4 interações: FAB, chip, valor, Enter (11.1)', async ({ page }) => {
  const u = await comSeed();
  await entrar(page, u);
  const antes = await barraNoBanco(u);

  await fab(page).click();
  await dialogo(page).getByRole('radio', { name: 'Receita' }).click();
  await campoValor(page).pressSequentially('25000');
  await page.keyboard.press('Enter');

  await expect(dialogo(page)).toBeHidden();
  const v = deMascara('25000');
  await conferirBarra(page, {
    ...antes,
    saldoEmContas: mais(antes.saldoEmContas, v),
    previstoAteOFimDoMes: mais(antes.previstoAteOFimDoMes, v),
    resultadoDoMes: mais(antes.resultadoDoMes, v),
    patrimonioLiquido: mais(antes.patrimonioLiquido, v),
  });
});

test('digitar 1590 mostra R$ 15,90; apagar volta da direita', async ({ page }) => {
  await entrar(page, await comSeed());
  await page.keyboard.press('n');
  const valor = campoValor(page);
  await expect(valor).toHaveAttribute('inputmode', 'numeric');
  await page.keyboard.type('1590');
  await expect(valor).toHaveValue(formatarMoeda(centavos(1590)));
  await page.keyboard.press('Backspace');
  await expect(valor).toHaveValue(formatarMoeda(centavos(159)));
});

test('sem valor, o erro aparece no campo e o diálogo não fecha', async ({ page }) => {
  await entrar(page, await comSeed());
  await fab(page).click();
  await page.keyboard.press('Enter');
  await expect(dialogo(page)).toBeVisible();
  await expect(campoValor(page)).toHaveAccessibleDescription('Informe um valor maior que zero');
});

test('"Salvar e lançar outro" mantém tipo, conta e data e volta ao valor', async ({ page }) => {
  await entrar(page, await comSeed());
  const anteontem = somarDias(hojeEmBrasilia(), -2);
  await fab(page).click();
  const d = dialogo(page);
  await d.getByRole('radio', { name: 'Receita' }).click();
  await d.getByRole('combobox', { name: 'Conta' }).click();
  await page.getByRole('option', { name: 'Poupança' }).click();
  await d.getByLabel('Data').fill(anteontem);
  await campoValor(page).pressSequentially('1000');
  await d.getByRole('button', { name: 'Salvar e lançar outro' }).click();

  await expect(page.getByText('Lançado')).toBeVisible();
  await expect(campoValor(page)).toHaveValue('');
  await expect(campoValor(page)).toBeFocused();
  await expect(d.getByRole('radio', { name: 'Receita' })).toBeChecked();
  await expect(d.getByRole('combobox', { name: 'Conta' })).toHaveText('Poupança');
  await expect(d.getByLabel('Data')).toHaveValue(anteontem);
});

test('Desfazer devolve todos os indicadores da Barra (7.1)', async ({ page }) => {
  const u = await comSeed();
  await entrar(page, u);
  const antes = await barraNoBanco(u);
  await fab(page).click();
  await page.keyboard.type('4321');
  await page.keyboard.press('Enter');
  await expect(dialogo(page)).toBeHidden();
  await page.getByRole('button', { name: 'Desfazer' }).click();
  await expect(page.getByText('Desfeito')).toBeVisible();
  await conferirBarra(page, antes);
  expect(await barraNoBanco(u)).toEqual(antes);
});

test('sem nenhuma conta, o formulário leva ao cadastro de conta (7.2)', async ({ page }) => {
  await entrar(page, await criarUsuario());
  await fab(page).click();
  await dialogo(page).getByRole('button', { name: 'Cadastrar conta' }).click();
  await expect(page).toHaveURL(/#\/contas\?nova=1$/);
});
