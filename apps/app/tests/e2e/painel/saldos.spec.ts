import AxeBuilder from '@axe-core/playwright';
import {
  causaDoPatrimonioNegativo,
  competenciaDe,
  composicaoDoSaldo,
  mais,
  menos,
  obrigacoesDeCartao,
  patrimonioLiquido,
  saldoDevedorDeDividas,
  saldoEmContas,
  saldoEmTodasAsContas,
} from '@goose-money/core';
import { expect, type Page, test } from '@playwright/test';

import { formatarMoeda } from '../../../src/app/formatacao';
import { entrar } from '../lancar/apoio';
import { HOJE, preparar } from './apoio';

// T05-18: Painel › Saldos (6.2, 3.10, 8.1, D47), com "hoje" = 04/11/2026.

test.use({ viewport: { width: 1440, height: 1100 } });

const parte = (page: Page, rotulo: string) =>
  page
    .getByRole('list', { name: 'Decomposição do Patrimônio líquido' })
    .getByRole('link', { name: new RegExp(`^${rotulo}`) });

test('a decomposição soma o Patrimônio líquido da Barra e explica o negativo (D47)', async ({
  page,
}) => {
  const { u, d } = await preparar(page);
  await entrar(page, u, '/?aba=saldos');
  await expect(page.getByRole('tab', { name: 'Saldos' })).toHaveAttribute('aria-selected', 'true');

  const todas = saldoEmTodasAsContas(d);
  const obrigacoes = obrigacoesDeCartao(d);
  const devedor = saldoDevedorDeDividas(d);
  await expect(parte(page, 'Saldo em todas as contas')).toContainText(formatarMoeda(todas));
  await expect(parte(page, 'Obrigações de cartão')).toContainText(formatarMoeda(obrigacoes));
  await expect(parte(page, 'Saldo devedor de dívidas')).toContainText(formatarMoeda(devedor));
  const soma = menos(menos(todas, obrigacoes), devedor);
  expect(soma).toBe(patrimonioLiquido(d));
  await expect(page.getByRole('link', { name: /^Patrimônio líquido/ })).toContainText(
    formatarMoeda(soma),
  );
  await expect(page.getByRole('heading', { name: /^Patrimônio líquido · hoje/ })).toBeVisible();

  const causa = causaDoPatrimonioNegativo(d);
  if (!causa) throw new Error('o seed devia ter patrimônio negativo');
  await expect(page.getByText(/^Negativo porque/)).toContainText(
    `somam ${formatarMoeda(causa.compromissos)}, mais que os ${formatarMoeda(causa.saldoEmTodasAsContas)} em contas`,
  );
  await expect(page.getByText(/^Negativo porque/)).toContainText(
    `saldo devedor de dívidas (${formatarMoeda(causa.valorDoMaior)})`,
  );
  expect((await new AxeBuilder({ page }).include('main').analyze()).violations).toEqual([]);
});

test('conta fora do total tem a marca e entra em "Saldo em todas as contas"', async ({ page }) => {
  const { u, d } = await preparar(page);
  const fora = d.fatos.contas.find((c) => !c.incluirNoTotal && !c.arquivada);
  if (!fora) throw new Error('o seed não tem conta fora do total');
  const saldoFora = d.saldos.get(fora.id)?.atual;
  if (saldoFora == null) throw new Error('conta sem saldo');
  await entrar(page, u, '/?aba=saldos');
  const card = page
    .getByRole('region', { name: 'Contas' })
    .getByRole('link', { name: new RegExp(`^${fora.nome}`) });
  await expect(card).toContainText('Fora do total');
  await expect(card).toContainText(formatarMoeda(saldoFora));
  expect(saldoEmTodasAsContas(d)).toBe(mais(saldoEmContas(d), saldoFora));
  await expect(parte(page, 'Saldo em todas as contas')).toContainText(
    formatarMoeda(saldoEmTodasAsContas(d)),
  );
});

test('clique numa barra da composição abre o extrato da conta no mês corrente', async ({
  page,
}) => {
  const { u, d } = await preparar(page);
  const composicao = composicaoDoSaldo(d).filter((x) => x.saldo !== null);
  const alvo = 1;
  const contaId = composicao[alvo]?.contaId;
  await entrar(page, u, '/?aba=saldos');
  const grafico = page.getByRole('img', { name: /^Onde está o seu dinheiro\?/ });
  await grafico.locator('.recharts-bar-rectangle').nth(alvo).click();
  await expect(page).toHaveURL(
    new RegExp(`/contas/${String(contaId)}\\?mes=${competenciaDe(HOJE)}$`),
  );
});
