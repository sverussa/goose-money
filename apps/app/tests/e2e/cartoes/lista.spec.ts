import AxeBuilder from '@axe-core/playwright';
import {
  aPagarNoCartao,
  aPagarNosCartoes,
  deMascara,
  despesas,
  limiteDisponivel,
  limiteDisponivelDoCartao,
  obrigacoesDeCartao,
  obrigacoesDoCartao,
  periodo,
  previaDoCadastro,
  somar,
} from '@goose-money/core';
import { expect, test } from '@playwright/test';

import { formatarData, formatarMoeda } from '../../../src/app/formatacao';
import { hojeEmBrasilia } from '../../../../../supabase/tests/apoio';
import { comSeed, derivadoNoBanco, entrar } from '../lancar/apoio';
import { abrirMenu, cardDoCartao, formCartao, preencherCartao, totais } from './apoio';

// T05-11: Cartões, lista, formulário e menu (6.5, 11.3).

test.use({ viewport: { width: 1440, height: 900 } });

test('três cartões: A pagar e Obrigações somam os três; a fatura fechada a pagar entra nelas e não em Despesas (11.3)', async ({
  page,
}) => {
  const u = await comSeed();
  const antes = await derivadoNoBanco(u);
  await entrar(page, u, '/cartoes');
  await expect(cardDoCartao(page, 'Cartão A')).toBeVisible();
  await expect(cardDoCartao(page, 'Cartão B')).toBeVisible();

  await page.getByRole('button', { name: 'Novo cartão' }).click();
  // A prévia mostra a fatura das compras de hoje antes de salvar (6.5).
  const f = formCartao(page);
  await f.getByRole('spinbutton', { name: 'Dia de fechamento' }).fill('3');
  await f.getByRole('spinbutton', { name: 'Dia de vencimento' }).fill('10');
  const previa = previaDoCadastro(3, 10, hojeEmBrasilia());
  await expect(f.getByRole('note', { name: 'Antes de salvar' })).toContainText(
    `Compras feitas hoje caem na fatura que vence em ${formatarData(previa.vencimento)}`,
  );
  await expect(f.getByRole('note', { name: 'Antes de salvar' })).toContainText(
    `Fatura aberta: fecha em ${formatarData(previa.fechamento)} e vence em ${formatarData(previa.vencimento)}`,
  );
  await preencherCartao(page, {
    nome: 'Cartão C',
    limite: '500000',
    fecha: '3',
    vence: '10',
    saldoFechada: '90000',
  });
  await expect(formCartao(page)).toBeHidden();
  await expect(cardDoCartao(page, 'Cartão C')).toBeVisible();

  const d = await derivadoNoBanco(u);
  const faturas = d.fatos.cartoes.map((c) => d.faturas.get(c.id) ?? []);
  expect(faturas).toHaveLength(3);
  const novecentos = deMascara('90000');
  expect(aPagarNosCartoes(d)).toBe(somar(faturas.map(aPagarNoCartao)));
  expect(obrigacoesDeCartao(d)).toBe(somar(faturas.map(obrigacoesDoCartao)));
  expect(aPagarNosCartoes(d) - aPagarNosCartoes(antes)).toBe(novecentos);
  expect(obrigacoesDeCartao(d) - obrigacoesDeCartao(antes)).toBe(novecentos);
  const tudo = periodo(antes.fatos.contas[0]?.dataSaldoInicial ?? d.hoje, d.hoje);
  expect(despesas(d, tudo)).toBe(despesas(antes, tudo));
  await expect(totais(page).nth(0)).toHaveText(formatarMoeda(aPagarNosCartoes(d)));
  await expect(totais(page).nth(1)).toHaveText(formatarMoeda(obrigacoesDeCartao(d)));

  const c = d.fatos.cartoes.find((x) => x.nome === 'Cartão C');
  if (!c) throw new Error('Cartão C não gravado');
  await expect(cardDoCartao(page, 'Cartão C')).toContainText(
    `${formatarMoeda(limiteDisponivelDoCartao(d, c.id))} de ${formatarMoeda(c.limite)}`,
  );
  expect(
    (await new AxeBuilder({ page }).include('main').analyze()).violations.map((v) => v.id),
  ).toEqual([]);
});

test('arquivar com Obrigações > 0 e excluir com compras ficam desabilitados com motivo (11.3)', async ({
  page,
}) => {
  await entrar(page, await comSeed(), '/cartoes');
  await abrirMenu(page, 'Cartão A');
  const arquivar = page.getByRole('menuitem', { name: /^Arquivar/ });
  await expect(arquivar).toBeDisabled();
  await expect(arquivar).toContainText('Há saldo em faturas do cartão');
  const excluir = page.getByRole('menuitem', { name: /^Excluir/ });
  await expect(excluir).toBeDisabled();
  await expect(excluir).toContainText('Use "Arquivar"');
  await page.keyboard.press('Escape');
});

test('a conta de pagamento só lista contas ativas e incluídas no total', async ({ page }) => {
  const u = await comSeed();
  const { fatos } = await derivadoNoBanco(u);
  await entrar(page, u, '/cartoes');
  // O "Cadastrar cartão" do formulário de lançamento (T05-03) chega por `?novo=1`.
  await page.goto('/#/cartoes?novo=1');
  await formCartao(page).getByRole('combobox', { name: 'Conta de pagamento' }).click();
  const esperadas = fatos.contas.filter((c) => !c.arquivada && c.incluirNoTotal);
  expect(esperadas.length).toBeLessThan(fatos.contas.length);
  await expect(page.getByRole('option')).toHaveText(esperadas.map((c) => c.nome));
  await page.keyboard.press('Escape');
  // O axe mede as cores no fim da animação de abertura.
  await formCartao(page).evaluate((el) =>
    Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)),
  );
  expect((await new AxeBuilder({ page }).include('[role="dialog"]').analyze()).violations).toEqual(
    [],
  );
});

test('editar mostra o novo Limite disponível antes de salvar; os dias do ciclo ficam travados (6.5)', async ({
  page,
}) => {
  const u = await comSeed();
  const d = await derivadoNoBanco(u);
  const a = d.fatos.cartoes.find((x) => x.nome === 'Cartão A');
  if (!a) throw new Error('Cartão A não está no seed');
  const novoLimite = deMascara('1000000');
  const depois = limiteDisponivel(
    { limite: novoLimite },
    obrigacoesDoCartao(d.faturas.get(a.id) ?? []),
  );
  await entrar(page, u, '/cartoes');
  await abrirMenu(page, 'Cartão A');
  await page.getByRole('menuitem', { name: 'Editar' }).click();
  const f = formCartao(page);
  await expect(f.getByRole('spinbutton', { name: 'Dia de fechamento' })).toBeDisabled();
  await expect(f.getByRole('spinbutton', { name: 'Dia de fechamento' })).toHaveValue('3');
  const limite = f.getByRole('textbox', { name: 'Limite' });
  await limite.fill('');
  await limite.pressSequentially('1000000');
  await expect(f.getByRole('note', { name: 'Antes de salvar' })).toContainText(
    `Limite disponível: ${formatarMoeda(limiteDisponivelDoCartao(d, a.id))} → ${formatarMoeda(depois)}`,
  );
  await f.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(formCartao(page)).toBeHidden();
  await expect(cardDoCartao(page, 'Cartão A')).toContainText(
    `${formatarMoeda(depois)} de ${formatarMoeda(novoLimite)}`,
  );
});

test('sem obrigações, arquivar tira o cartão da lista e Desarquivar o traz; sem movimento, Excluir (6.5)', async ({
  page,
}) => {
  await entrar(page, await comSeed(), '/cartoes');
  await page.getByRole('button', { name: 'Novo cartão' }).click();
  await preencherCartao(page, { nome: 'Cartão novo', limite: '100000', fecha: '20', vence: '28' });
  await expect(cardDoCartao(page, 'Cartão novo')).toBeVisible();

  await abrirMenu(page, 'Cartão novo');
  await page.getByRole('menuitem', { name: 'Arquivar' }).click();
  await expect(page.getByText('Cartão arquivado')).toBeVisible();
  await expect(cardDoCartao(page, 'Cartão novo')).toHaveCount(0);
  await page.getByRole('button', { name: 'Arquivados (1)' }).click();
  await abrirMenu(page, 'Cartão novo');
  await page.getByRole('menuitem', { name: 'Desarquivar' }).click();
  await expect(page.getByRole('button', { name: /^Arquivados/ })).toHaveCount(0);

  await abrirMenu(page, 'Cartão novo');
  await page.getByRole('menuitem', { name: 'Excluir' }).click();
  await expect(page.getByText('Cartão excluído')).toBeVisible();
  await expect(cardDoCartao(page, 'Cartão novo')).toHaveCount(0);
});

test('nome repetido e campos obrigatórios são recusados no cadastro', async ({ page }) => {
  await entrar(page, await comSeed(), '/cartoes');
  await page.getByRole('button', { name: 'Novo cartão' }).click();
  const f = formCartao(page);
  await f.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(f.getByText('Informe o nome')).toBeVisible();
  await expect(f.getByText('O limite precisa ser maior que zero')).toBeVisible();
  await expect(f.getByText('Informe um dia de 1 a 31')).toHaveCount(2);
  await f.getByLabel('Nome').fill('');
  await preencherCartao(page, { nome: ' cartão a ', limite: '1000', fecha: '5', vence: '12' });
  await expect(f.getByRole('alert')).toHaveText(
    'Já existe uma conta ou um cartão ativo chamado "cartão a"',
  );
});
