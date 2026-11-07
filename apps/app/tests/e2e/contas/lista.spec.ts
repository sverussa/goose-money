import AxeBuilder from '@axe-core/playwright';
import { deMascara, impactoDoNovoSaldoInicial, saldoEmTodasAsContas } from '@goose-money/core';
import { expect, test } from '@playwright/test';

import { formatarMoeda } from '../../../src/app/formatacao';
import { criarUsuario, hojeEmBrasilia } from '../../../../../supabase/tests/apoio';
import { comSeed, derivadoNoBanco, dialogo, entrar, fab } from '../lancar/apoio';
import { abrirMenu, cardDaConta, formConta, preencherConta } from './apoio';

// T05-08: Contas, lista, formulário e menu (6.4, 7.2, 11.2).

test.use({ viewport: { width: 1440, height: 900 } });

test('primeiro uso: sem contas, o FAB leva ao formulário de conta (7.2)', async ({ page }) => {
  await entrar(page, await criarUsuario(), '/contas');
  await expect(page.getByText('Cadastre sua primeira conta')).toBeVisible();
  await fab(page).click();
  await dialogo(page).getByRole('button', { name: 'Cadastrar conta' }).click();
  await expect(formConta(page)).toBeVisible();
  // O axe mede as cores no fim da animação de abertura.
  await formConta(page).evaluate((el) =>
    Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)),
  );
  expect((await new AxeBuilder({ page }).include('[role="dialog"]').analyze()).violations).toEqual(
    [],
  );
});

test('várias contas de todos os tipos; nome repetido entre ativas é recusado (11.2)', async ({
  page,
}) => {
  const u = await criarUsuario();
  await entrar(page, u, '/contas');
  const contas = [
    { nome: 'Banco Azul', tipo: 'Conta corrente', saldo: '120000' },
    { nome: 'Reserva', tipo: 'Poupança', saldo: '500000' },
    { nome: 'Corretora', tipo: 'Investimento', saldo: '1000000' },
    { nome: 'Bolso', tipo: 'Dinheiro', saldo: '5000' },
    { nome: 'Vale-refeição', tipo: 'Outra', saldo: '30000' },
  ];
  for (const c of contas) {
    await page.getByRole('button', { name: 'Nova conta' }).first().click();
    if (c.tipo === 'Investimento') {
      await formConta(page).getByRole('combobox', { name: 'Tipo' }).click();
      await page.getByRole('option', { name: 'Investimento', exact: true }).click();
      // Investimento nasce fora do total (6.4).
      await expect(
        formConta(page).getByRole('switch', { name: 'Incluir no total' }),
      ).not.toBeChecked();
      await preencherConta(page, { nome: c.nome, saldo: c.saldo });
    } else await preencherConta(page, c);
    await expect(formConta(page)).toBeHidden();
    await expect(cardDaConta(page, c.nome)).toContainText(formatarMoeda(deMascara(c.saldo)));
  }
  await expect(cardDaConta(page, 'Corretora')).toContainText('Fora do total');
  const d = await derivadoNoBanco(u);
  await expect(
    page.getByRole('region', { name: 'Totais das contas' }).getByRole('definition').last(),
  ).toHaveText(formatarMoeda(saldoEmTodasAsContas(d)));

  await page.getByRole('button', { name: 'Nova conta' }).first().click();
  await preencherConta(page, { nome: ' reserva ' });
  await expect(formConta(page).getByRole('alert')).toHaveText(
    'Já existe uma conta ou um cartão ativo chamado "reserva"',
  );
});

test('arquivar com saldo, ou sendo conta de pagamento de cartão, fica desabilitado com motivo (11.2)', async ({
  page,
}) => {
  await entrar(page, await comSeed(), '/contas');
  await abrirMenu(page, 'Poupança');
  await expect(page.getByRole('menuitem', { name: /^Arquivar/ })).toBeDisabled();
  await expect(page.getByRole('menuitem', { name: /^Arquivar/ })).toContainText(
    'Arquivar exige saldo zero',
  );
  // Com movimentos, Excluir fica desabilitado e oferece Arquivar.
  await expect(page.getByRole('menuitem', { name: /^Excluir/ })).toBeDisabled();
  await expect(page.getByRole('menuitem', { name: /^Excluir/ })).toContainText('Arquive-a');
  await page.keyboard.press('Escape');
});

test('com saldo zero, arquivar tira a conta dos indicadores e Desarquivar a traz de volta (11.2)', async ({
  page,
}) => {
  const u = await comSeed();
  await entrar(page, u, '/contas');
  await page.getByRole('button', { name: 'Nova conta' }).first().click();
  await preencherConta(page, { nome: 'Conta antiga' });
  await expect(cardDaConta(page, 'Conta antiga')).toBeVisible();

  await abrirMenu(page, 'Conta antiga');
  await page.getByRole('menuitem', { name: 'Arquivar' }).click();
  await expect(page.getByText('Conta arquivada')).toBeVisible();
  await expect(cardDaConta(page, 'Conta antiga')).toHaveCount(0);
  expect(
    (await derivadoNoBanco(u)).fatos.contas.find((c) => c.nome === 'Conta antiga')?.arquivada,
  ).toBe(true);
  // Fora dos seletores do formulário de lançamento.
  await fab(page).click();
  await dialogo(page).getByRole('combobox', { name: 'Conta' }).click();
  await expect(page.getByRole('option', { name: 'Conta antiga' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Arquivadas (1)' }).click();
  await expect(cardDaConta(page, 'Conta antiga')).toBeVisible();
  await abrirMenu(page, 'Conta antiga');
  await page.getByRole('menuitem', { name: 'Desarquivar' }).click();
  await expect(page.getByRole('button', { name: /^Arquivadas/ })).toHaveCount(0);
  await expect(cardDaConta(page, 'Conta antiga')).toBeVisible();
});

test('desmarcar "Incluir no total" da conta de pagamento de cartão ativo é bloqueado (11.2)', async ({
  page,
}) => {
  await entrar(page, await comSeed(), '/contas');
  await abrirMenu(page, 'Conta corrente');
  await page.getByRole('menuitem', { name: 'Editar' }).click();
  const incluir = formConta(page).getByRole('switch', { name: 'Incluir no total' });
  await expect(incluir).toBeChecked();
  await expect(incluir).toBeDisabled();
  await expect(incluir).toHaveAccessibleDescription(
    'A conta de pagamento de um cartão ativo precisa ficar no total.',
  );
});

test('mudar o saldo inicial mostra antes o saldo atual novo (6.4)', async ({ page }) => {
  const u = await comSeed();
  const { fatos } = await derivadoNoBanco(u);
  const conta = fatos.contas.find((c) => c.nome === 'Poupança');
  if (!conta) throw new Error('Poupança não está no seed');
  const impacto = impactoDoNovoSaldoInicial(
    fatos,
    conta,
    deMascara('100'),
    conta.dataSaldoInicial,
    hojeEmBrasilia(),
  );
  await entrar(page, u, '/contas');
  await abrirMenu(page, 'Poupança');
  await page.getByRole('menuitem', { name: 'Editar' }).click();
  const saldo = formConta(page).getByRole('textbox', { name: 'Saldo inicial', exact: true });
  await saldo.fill('');
  await saldo.pressSequentially('100');
  await expect(formConta(page).getByRole('note', { name: 'O que muda ao salvar' })).toContainText(
    `Saldo atual: ${formatarMoeda(impacto.saldoAtualAntes ?? deMascara('0'))} → ${formatarMoeda(impacto.saldoAtualDepois ?? deMascara('0'))}`,
  );
});
