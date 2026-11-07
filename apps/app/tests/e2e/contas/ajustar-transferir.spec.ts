import { centavos, deMascara, mais } from '@goose-money/core';
import { expect, type Page, test } from '@playwright/test';

import { formatarMoeda } from '../../../src/app/formatacao';
import { barraNoBanco, comSeed, conferirBarra, derivadoNoBanco, entrar } from '../lancar/apoio';

// T05-10: diálogos Transferir e Ajustar saldo (3.4, 3.10, 4.1, 7.4).

test.use({ viewport: { width: 1440, height: 900 } });

const ajuste = (page: Page) => page.getByRole('dialog', { name: 'Ajustar saldo' });
const previa = (page: Page, rotulo: string) =>
  ajuste(page)
    .getByRole('region', { name: 'Antes de salvar' })
    .locator('div')
    .filter({ has: page.getByText(rotulo, { exact: true }) })
    .getByRole('definition');

test('ajuste de diferença d: Saldo, Previsto e Patrimônio ±d, Resultado igual; a diferença mostrada é a gravada (7.4)', async ({
  page,
}) => {
  const u = await comSeed();
  const d = await derivadoNoBanco(u);
  const conta = d.fatos.contas.find((c) => c.nome === 'Poupança');
  const atual = d.saldos.get(conta?.id ?? '')?.atual ?? centavos(0);
  await entrar(page, u, `/contas/${conta?.id ?? ''}`);
  const antes = await barraNoBanco(u);

  await page.getByRole('button', { name: 'Ajustar saldo' }).click();
  // Começa no saldo calculado: diferença zero, botão desabilitado.
  await expect(previa(page, 'Diferença')).toHaveText(formatarMoeda(centavos(0)));
  await expect(ajuste(page).getByText('O saldo já confere')).toBeVisible();
  await expect(ajuste(page).getByRole('button', { name: 'Ajustar' })).toBeDisabled();

  const real = mais(atual, deMascara('12345'));
  const campo = ajuste(page).getByRole('textbox', { name: 'Saldo real' });
  await campo.fill('');
  await campo.pressSequentially(String(real));
  const dif = deMascara('12345');
  await expect(previa(page, 'Saldo calculado')).toHaveText(formatarMoeda(atual));
  await expect(previa(page, 'Saldo informado')).toHaveText(formatarMoeda(real));
  await expect(previa(page, 'Diferença')).toContainText(formatarMoeda(dif));
  await ajuste(page).getByRole('button', { name: 'Ajustar' }).click();
  await expect(ajuste(page)).toBeHidden();

  await conferirBarra(page, {
    ...antes,
    saldoEmContas: mais(antes.saldoEmContas, dif),
    previstoAteOFimDoMes: mais(antes.previstoAteOFimDoMes, dif),
    patrimonioLiquido: mais(antes.patrimonioLiquido, dif),
  });
  const gravado = (await derivadoNoBanco(u)).fatos.lancamentos.find(
    (l) => l.tipo === 'ajuste' && l.contaId === conta?.id && l.valor === dif,
  );
  expect(gravado).toBeDefined();
});

test('o ajuste aparece no extrato e em Movimentações, nunca em Receitas e despesas (3.3)', async ({
  page,
}) => {
  const u = await comSeed();
  const conta = (await derivadoNoBanco(u)).fatos.contas.find((c) => c.nome === 'Carteira');
  await entrar(page, u, `/contas/${conta?.id ?? ''}`);
  await page.getByRole('button', { name: 'Ajustar saldo' }).click();
  await ajuste(page).getByRole('button', { name: 'Negativo' }).click();
  await ajuste(page).getByRole('textbox', { name: 'Saldo real' }).fill('');
  await ajuste(page).getByRole('textbox', { name: 'Saldo real' }).pressSequentially('100');
  await ajuste(page).getByRole('button', { name: 'Ajustar' }).click();
  await expect(ajuste(page)).toBeHidden();
  await expect(page.getByRole('table').getByRole('row', { name: /Ajuste de saldo/ })).toHaveCount(
    1,
  );

  await page.goto('/#/lancamentos?visao=competencia&q=Ajuste');
  await page.getByRole('button', { name: 'Este mês' }).click();
  await expect(page.getByText('Sem lançamentos neste período')).toBeVisible();
  await page.getByRole('radio', { name: 'Movimentações' }).click();
  await expect(
    page.getByRole('list', { name: 'Lançamentos' }).getByText('Ajuste de saldo', { exact: true }),
  ).toBeVisible();
});

test('Transferir abre o tipo Transferência com a conta da tela como origem', async ({ page }) => {
  const u = await comSeed();
  const conta = (await derivadoNoBanco(u)).fatos.contas.find((c) => c.nome === 'Poupança');
  await entrar(page, u, `/contas/${conta?.id ?? ''}`);
  await page.getByRole('button', { name: 'Transferir' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Transferir' });
  await expect(dialogo.getByRole('radio', { name: 'Transferência' })).toBeChecked();
  await expect(dialogo.getByRole('combobox', { name: 'De', exact: true })).toHaveText('Poupança');
  await expect(dialogo.getByRole('textbox', { name: 'Valor', exact: true })).toBeFocused();
  await page.keyboard.type('7000');
  await dialogo.getByRole('combobox', { name: 'Para', exact: true }).click();
  await page.getByRole('option', { name: 'Carteira', exact: true }).click();
  await dialogo.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialogo).toBeHidden();
  await expect(
    page.getByRole('table').getByRole('row', { name: /Transferência · para Carteira/ }),
  ).toContainText(formatarMoeda(deMascara('7000')));
});
