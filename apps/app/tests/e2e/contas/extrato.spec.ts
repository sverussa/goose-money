import { readFile } from 'node:fs/promises';

import { centavos, competenciaDe, somarMeses } from '@goose-money/core';
import { expect, type Page, test } from '@playwright/test';

import { formatarMoeda } from '../../../src/app/formatacao';
import { csvDoExtrato, extratoDaTela, nomeDoCsv } from '../../../src/features/contas/extrato';
import { hojeEmBrasilia } from '../../../../../supabase/tests/apoio';
import { campoValor, comSeed, derivadoNoBanco, dialogo, entrar, fab } from '../lancar/apoio';
import { formConta, preencherConta } from './apoio';

// T05-09: extrato mensal da conta (3.4, 6.4, 7.2, 11.2).

test.use({ viewport: { width: 1440, height: 900 } });

const totais = (page: Page) => page.getByRole('region', { name: 'Totais do extrato' });
const indicador = (page: Page, rotulo: RegExp) =>
  totais(page)
    .locator('div')
    .filter({ has: page.getByText(rotulo) })
    .getByRole('definition');

test('o fechamento do mês corrente até hoje é igual ao saldo atual (11.2)', async ({ page }) => {
  const u = await comSeed();
  const d = await derivadoNoBanco(u);
  const conta = d.fatos.contas.find((c) => c.nome === 'Conta corrente');
  await entrar(page, u, `/contas/${conta?.id ?? ''}`);
  const atual = formatarMoeda(d.saldos.get(conta?.id ?? '')?.atual ?? centavos(0));
  await expect(indicador(page, /^Saldo atual/)).toHaveText(atual);
  await expect(indicador(page, /^Saldo de fechamento/)).toHaveText(atual);
});

test('os chips mostram as contas cadastradas, inclusive uma criada agora', async ({ page }) => {
  const u = await comSeed();
  await entrar(page, u, '/contas');
  await page.getByRole('button', { name: 'Nova conta' }).first().click();
  await preencherConta(page, { nome: 'Cofrinho' });
  await expect(formConta(page)).toBeHidden();
  await page.getByRole('link', { name: 'Cofrinho', exact: true }).click();

  const chips = page.getByRole('navigation', { name: 'Contas' });
  const nomes = (await derivadoNoBanco(u)).fatos.contas
    .filter((c) => !c.arquivada)
    .map((c) => c.nome);
  for (const n of nomes) await expect(chips.getByRole('link', { name: n })).toBeVisible();
  await expect(chips.getByRole('link', { name: 'Cofrinho' })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('o CSV exportado tem as mesmas linhas e totais da tela', async ({ page }) => {
  const u = await comSeed();
  const d = await derivadoNoBanco(u);
  const conta = d.fatos.contas.find((c) => c.nome === 'Conta corrente');
  if (!conta) throw new Error('sem conta');
  const mes = somarMeses(competenciaDe(hojeEmBrasilia()), -1);
  await entrar(page, u, `/contas/${conta.id}?mes=${mes}`);
  const e = extratoDaTela(d, conta, mes);
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(1 + 1 + e.linhas.length + 1);

  const baixou = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar CSV' }).click();
  const download = await baixou;
  expect(download.suggestedFilename()).toBe(nomeDoCsv(conta, mes));
  expect(await readFile(await download.path(), 'utf8')).toBe(csvDoExtrato(e));
});

test('o FAB nesta tela abre Despesa com esta conta (7.2)', async ({ page }) => {
  const u = await comSeed();
  const conta = (await derivadoNoBanco(u)).fatos.contas.find((c) => c.nome === 'Poupança');
  await entrar(page, u, `/contas/${conta?.id ?? ''}`);
  await fab(page).click();
  await expect(dialogo(page).getByRole('radio', { name: 'Despesa' })).toBeChecked();
  await expect(dialogo(page).getByRole('combobox', { name: 'Conta' })).toHaveText('Poupança');
  await expect(campoValor(page)).toBeFocused();
});
