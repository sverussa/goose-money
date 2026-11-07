import AxeBuilder from '@axe-core/playwright';
import {
  badges,
  deMascara,
  mais,
  periodoParaUrl,
  periodoPreset,
  somarDias,
} from '@goose-money/core';
import { expect, type Page, test } from '@playwright/test';

import { formatarMoeda, MENOS } from '../../../src/app/formatacao';
import { mensagens } from '../../../src/app/mensagens';
import { gravarOk, hojeEmBrasilia, inserir } from '../../../../../supabase/tests/apoio';
import { barraNoBanco, comSeed, conferirBarra, derivadoNoBanco, entrar } from '../lancar/apoio';

// T05-07: Movimentações, filtros e ações por item (3.2, 6.3, 9.4, 11.8).

test.use({ viewport: { width: 1440, height: 900 } });

const lista = (page: Page) => page.getByRole('list', { name: 'Lançamentos' });
const item = (page: Page, texto: string) =>
  lista(page).getByRole('listitem').filter({ hasText: texto });
const visao = (page: Page, nome: string) => page.getByRole('radio', { name: nome });

test('uma transferência aparece em Movimentações e não em Receitas e despesas', async ({
  page,
}) => {
  const u = await comSeed();
  const { fatos } = await derivadoNoBanco(u);
  const conta = (nome: string) => fatos.contas.find((c) => c.nome === nome)?.id;
  await gravarOk(u.cliente, [
    inserir('lancamentos', {
      tipo: 'transferencia',
      status: 'efetivado',
      data: hojeEmBrasilia(),
      valor: deMascara('33300'),
      descricao: 'Reserva de emergência',
      conta_id: conta('Conta corrente'),
      conta_destino_id: conta('Poupança'),
    }),
  ]);
  await entrar(page, u, '/lancamentos');
  await page.getByRole('button', { name: 'Este mês' }).click();
  await expect(item(page, 'Reserva de emergência')).toHaveCount(0);

  await visao(page, 'Movimentações').click();
  await expect(page).toHaveURL(/visao=movimentacoes/);
  await expect(item(page, 'Reserva de emergência')).toContainText(
    `${MENOS}${formatarMoeda(deMascara('33300'))}`,
  );
  await expect(item(page, 'Reserva de emergência')).toContainText('Conta corrente → Poupança');
  expect((await new AxeBuilder({ page }).include('main').analyze()).violations).toEqual([]);
});

test('classificar um item muda a categoria e atualiza o badge na hora', async ({ page }) => {
  const u = await comSeed();
  const d = await derivadoNoBanco(u);
  const antes = badges(d).lancamentos;
  expect(antes).toBeGreaterThan(0);
  const aClassificar = d.fatos.categorias.find((c) => c.sistema === 'a_classificar');
  const p = periodoPreset('ultimos-12-meses', hojeEmBrasilia());
  await entrar(page, u, `/lancamentos?${periodoParaUrl(p)}&categoria=${aClassificar?.id ?? ''}`);
  const menu = page.getByRole('navigation').getByRole('link', { name: /^Lançamentos/ });
  await expect(menu).toHaveAccessibleName(new RegExp(mensagens.navegacao.pendencias(antes)));
  const pendentes = lista(page)
    .getByRole('listitem')
    .filter({
      has: page.getByRole('button', { name: 'Classificar', exact: true }),
    });
  const quantos = await pendentes.count();
  expect(quantos).toBeGreaterThan(0);

  await pendentes.first().getByRole('button', { name: 'Classificar', exact: true }).click();
  await page.getByRole('combobox', { name: 'Buscar categoria' }).fill('Lazer');
  await page.getByRole('option', { name: 'Lazer', exact: true }).click();

  await expect(page.getByText('Classificado')).toBeVisible();
  await expect(pendentes).toHaveCount(quantos - 1);
  if (antes > 1)
    await expect(menu).toHaveAccessibleName(new RegExp(mensagens.navegacao.pendencias(antes - 1)));
  else await expect(menu).toHaveAccessibleName('Lançamentos');
  expect(badges(await derivadoNoBanco(u)).lancamentos).toBe(antes - 1);
});

test('excluir e desfazer devolve o item e os indicadores (11.8)', async ({ page }) => {
  const u = await comSeed();
  const { fatos } = await derivadoNoBanco(u);
  const conta = fatos.contas.find((c) => c.nome === 'Carteira');
  const lazer = fatos.categorias.find((c) => c.nome === 'Lazer');
  await gravarOk(u.cliente, [
    inserir('lancamentos', {
      tipo: 'despesa',
      status: 'efetivado',
      data: hojeEmBrasilia(),
      valor: deMascara('4200'),
      descricao: 'Cinema com a família',
      conta_id: conta?.id,
      categoria_id: lazer?.id,
    }),
  ]);
  await entrar(page, u, '/lancamentos');
  await page.getByRole('button', { name: 'Este mês' }).click();
  const antes = await barraNoBanco(u);

  await item(page, 'Cinema com a família')
    .getByRole('button', { name: 'Ações de Cinema com a família' })
    .click();
  await page.getByRole('menuitem', { name: 'Excluir' }).click();
  await expect(page.getByText('Lançamento excluído')).toBeVisible();
  await expect(item(page, 'Cinema com a família')).toHaveCount(0);
  expect((await barraNoBanco(u)).saldoEmContas).toBe(mais(antes.saldoEmContas, deMascara('4200')));

  await page.getByRole('button', { name: 'Desfazer' }).click();
  await expect(item(page, 'Cinema com a família')).toHaveCount(1);
  await conferirBarra(page, antes);
  expect(await barraNoBanco(u)).toEqual(antes);
});

test('editar abre o mesmo formulário preenchido e grava a alteração', async ({ page }) => {
  const u = await comSeed();
  const { fatos } = await derivadoNoBanco(u);
  await gravarOk(u.cliente, [
    inserir('lancamentos', {
      tipo: 'despesa',
      status: 'efetivado',
      data: somarDias(hojeEmBrasilia(), -1),
      valor: deMascara('1000'),
      descricao: 'Pão de queijo',
      conta_id: fatos.contas.find((c) => c.nome === 'Carteira')?.id,
      categoria_id: fatos.categorias.find((c) => c.nome === 'Alimentação')?.id,
    }),
  ]);
  await entrar(page, u, '/lancamentos');
  await page.getByRole('button', { name: 'Este mês' }).click();
  await item(page, 'Pão de queijo').getByRole('button', { name: 'Ações de Pão de queijo' }).click();
  await page.getByRole('menuitem', { name: 'Editar' }).click();

  const dialogo = page.getByRole('dialog', { name: 'Editar lançamento' });
  const valor = dialogo.getByRole('textbox', { name: 'Valor', exact: true });
  await expect(valor).toHaveValue(formatarMoeda(deMascara('1000')));
  await expect(dialogo.getByRole('radio', { name: 'Receita' })).toBeDisabled();
  await expect(dialogo.getByRole('button', { name: 'Salvar e lançar outro' })).toHaveCount(0);
  await valor.fill('');
  await valor.pressSequentially('1050');
  await valor.press('Enter');

  await expect(dialogo).toBeHidden();
  await expect(item(page, 'Pão de queijo')).toContainText(
    `${MENOS}${formatarMoeda(deMascara('1050'))}`,
  );
});

test('os filtros ficam na URL e sobrevivem a recarregar a página', async ({ page }) => {
  await entrar(page, await comSeed(), '/lancamentos');
  await visao(page, 'Movimentações').click();
  const filtros = page.getByRole('group', { name: 'Filtros' });
  await filtros.getByRole('button', { name: 'Tipo' }).click();
  await page.getByRole('menuitemcheckbox', { name: 'Compra no cartão' }).click();
  await page.keyboard.press('Escape');
  await filtros.getByRole('button', { name: 'Estado: realizados' }).click();
  await page.getByRole('menuitemcheckbox', { name: 'Previsto' }).click();
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/tipo=compra/);

  await page.reload();
  await expect(filtros.getByRole('button', { name: 'Tipo: Compra no cartão' })).toBeVisible();
  await expect(filtros.getByRole('button', { name: 'Estado (4)' })).toBeVisible();
  await expect(visao(page, 'Movimentações')).toBeChecked();
  await filtros.getByRole('button', { name: 'Limpar filtros' }).click();
  await expect(filtros.getByRole('button', { name: 'Tipo', exact: true })).toBeVisible();
});
