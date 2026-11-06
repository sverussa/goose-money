import { deMascara, destinoPadraoDoPagamento, mais, menos, somarDias } from '@goose-money/core';
import { expect, test } from '@playwright/test';

import { formatarMoeda } from '../../../src/app/formatacao';
import {
  criarUsuario,
  gravarOk,
  hojeEmBrasilia,
  inserir,
} from '../../../../../supabase/tests/apoio';
import {
  barraNoBanco,
  campoValor,
  comSeed,
  conferirBarra,
  derivadoNoBanco,
  dialogo,
  entrar,
  escolher,
  fab,
} from './apoio';

// T05-03: compra no cartão, transferência e pagamento de fatura (7.1, 7.2, 7.4, 11.1–11.3).

test.use({ viewport: { width: 1440, height: 900 } });

test('na tela de um cartão, compra à vista naquele cartão em 3 interações (11.1)', async ({
  page,
}) => {
  const u = await comSeed();
  const cartao = (await derivadoNoBanco(u)).fatos.cartoes.find((c) => c.nome === 'Cartão B');
  await entrar(page, u, `/cartoes/${cartao?.id ?? ''}`);
  const antes = await barraNoBanco(u);

  await fab(page).click();
  await expect(dialogo(page).getByRole('radio', { name: 'Compra no cartão' })).toBeChecked();
  await expect(dialogo(page).getByRole('combobox', { name: 'Cartão' })).toHaveText('Cartão B');
  await page.keyboard.type('8990');
  await page.keyboard.press('Enter');

  await expect(dialogo(page)).toBeHidden();
  const depois = await barraNoBanco(u);
  const v = deMascara('8990');
  expect(depois.saldoEmContas).toBe(antes.saldoEmContas);
  expect(depois.aPagarNosCartoes).toBe(mais(antes.aPagarNosCartoes, v));
  expect(depois.patrimonioLiquido).toBe(menos(antes.patrimonioLiquido, v));
  await conferirBarra(page, depois);
});

test('transferência de incluída para excluída: Saldo em contas −v, Resultado e Patrimônio iguais (7.4)', async ({
  page,
}) => {
  const u = await comSeed();
  await entrar(page, u);
  const antes = await barraNoBanco(u);

  await fab(page).click();
  await dialogo(page).getByRole('radio', { name: 'Transferência' }).click();
  await campoValor(page).pressSequentially('50000');
  await escolher(page, 'De', 'Conta corrente');
  await escolher(page, 'Para', 'Investimentos');
  const v = deMascara('50000');
  await expect(dialogo(page).getByRole('note')).toContainText('o Saldo em contas vai cair');
  await dialogo(page).getByRole('button', { name: 'Salvar', exact: true }).click();

  await expect(dialogo(page)).toBeHidden();
  await conferirBarra(page, {
    ...antes,
    saldoEmContas: menos(antes.saldoEmContas, v),
    previstoAteOFimDoMes: menos(antes.previstoAteOFimDoMes, v),
  });
});

test('pagamento integral da fatura: Saldo em contas −v, A pagar −v, Resultado igual (11.3)', async ({
  page,
}) => {
  const u = await comSeed();
  await entrar(page, u);
  const d = await derivadoNoBanco(u);
  const cartao = d.fatos.cartoes.find((c) => c.nome === 'Cartão A');
  const faturas = d.faturas.get(cartao?.id ?? '') ?? [];
  const destino = faturas.find((f) => f.competencia === destinoPadraoDoPagamento(faturas));
  const antes = await barraNoBanco(u);

  await fab(page).click();
  await dialogo(page).getByRole('radio', { name: 'Pagamento de fatura' }).click();
  await escolher(page, 'Cartão', 'Cartão A');
  await expect(dialogo(page).getByRole('combobox', { name: 'Conta' })).toHaveText('Conta corrente');
  await dialogo(page).getByRole('button', { name: 'Saldo total' }).click();
  await expect(dialogo(page).getByRole('note')).toHaveText('O pagamento quita esta fatura.');
  await dialogo(page).getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(campoValor(page)).toBeHidden();

  const v = destino?.saldo ?? deMascara('0');
  expect(v).toBeGreaterThan(0);
  const depois = await barraNoBanco(u);
  expect(depois.saldoEmContas).toBe(menos(antes.saldoEmContas, v));
  expect(depois.aPagarNosCartoes).toBe(menos(antes.aPagarNosCartoes, v));
  expect(depois.resultadoDoMes).toBe(antes.resultadoDoMes);
  await conferirBarra(page, depois);
});

test('transferência com origem igual ao destino é bloqueada no formulário', async ({ page }) => {
  await entrar(page, await comSeed());
  await fab(page).click();
  await dialogo(page).getByRole('radio', { name: 'Transferência' }).click();
  await campoValor(page).pressSequentially('1000');
  await escolher(page, 'De', 'Poupança');
  await escolher(page, 'Para', 'Poupança');
  await dialogo(page).getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialogo(page).getByRole('combobox', { name: 'Para' })).toHaveAccessibleDescription(
    'Escolha uma conta de destino diferente da origem',
  );
  await expect(dialogo(page)).toBeVisible();
});

test('trocar de chip mantém o valor e a data já digitados', async ({ page }) => {
  await entrar(page, await comSeed());
  const ontem = somarDias(hojeEmBrasilia(), -1);
  await fab(page).click();
  await page.keyboard.type('1234');
  await dialogo(page).getByLabel('Data').fill(ontem);
  for (const tipo of ['Compra no cartão', 'Transferência', 'Pagamento de fatura', 'Receita']) {
    await dialogo(page).getByRole('radio', { name: tipo }).click();
    await expect(campoValor(page)).toHaveValue(formatarMoeda(deMascara('1234')));
    await expect(dialogo(page).getByLabel('Data')).toHaveValue(ontem);
  }
});

test('sem cartão cadastrado, compra e pagamento de fatura levam ao cadastro de cartão (D21)', async ({
  page,
}) => {
  const u = await criarUsuario();
  await u.cliente.rpc('inicializar_usuario');
  await gravarOk(u.cliente, [
    inserir('contas', {
      nome: 'Carteira',
      tipo: 'dinheiro',
      saldo_inicial: 0,
      data_saldo_inicial: somarDias(hojeEmBrasilia(), -1),
      cor: 'categorica-1',
    }),
  ]);
  await entrar(page, u);
  await fab(page).click();
  await dialogo(page).getByRole('radio', { name: 'Pagamento de fatura' }).click();
  await dialogo(page).getByRole('radio', { name: 'Compra no cartão' }).click();
  await dialogo(page).getByRole('button', { name: 'Cadastrar cartão' }).click();
  await expect(page).toHaveURL(/#\/cartoes\?novo=1$/);
});
