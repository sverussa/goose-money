import AxeBuilder from '@axe-core/playwright';
import {
  comprasParceladasAtivas,
  deMascara,
  despesasReconhecidas,
  gastoPorCartao,
  negar,
  parcelasComprometidas,
  periodoPreset,
  somar,
} from '@goose-money/core';
import { expect, type Page, test } from '@playwright/test';

import { formatarMesCurto, formatarMoeda, MENOS } from '../../../src/app/formatacao';
import { entrar } from '../lancar/apoio';
import { HOJE, preparar } from './apoio';

// T05-19: Painel › Cartões (6.2, 8.1, 11.7), com "hoje" = 04/11/2026.

test.use({ viewport: { width: 1440, height: 1100 } });

/** "−R$ 1.234,56" ou "+R$ 12,00" em centavos com sinal (despesa positiva, estorno negativo). */
const centavosDe = (texto: string) => {
  const c = deMascara(texto.replace(/\D/g, ''));
  return texto.startsWith('+') ? negar(c) : c;
};

const tabela = (page: Page) =>
  page.getByRole('region', { name: 'Compras parceladas ativas' }).getByRole('table');

test('o total do rodapé é a soma dos valores restantes das linhas', async ({ page }) => {
  const { u, d } = await preparar(page);
  const { linhas, total } = comprasParceladasAtivas(d.fatos, HOJE);
  expect(linhas.length).toBeGreaterThan(1);
  await entrar(page, u, '/?aba=cartoes');
  const corpo = tabela(page).locator('tbody tr');
  await expect(corpo).toHaveCount(linhas.length);
  // Coluna "Valor restante" (6ª) de cada linha, somada, é o rodapé.
  const restantes = await corpo.locator('td:nth-child(6)').allTextContents();
  const soma = somar(restantes.map(centavosDe));
  expect(soma).toBe(total.valorRestante);
  await expect(tabela(page).locator('tfoot td').nth(3)).toHaveText(formatarMoeda(soma));
  await expect(page.getByRole('region', { name: 'Cartões' }).getByRole('listitem')).toHaveCount(
    d.fatos.cartoes.filter((c) => !c.arquivado).length,
  );
  expect((await new AxeBuilder({ page }).include('main').analyze()).violations).toEqual([]);
});

test('clique numa barra de Parcelas comprometidas abre a fatura daquele cartão e competência', async ({
  page,
}) => {
  const { u, d } = await preparar(page);
  const janela = parcelasComprometidas(d.fatos, HOJE);
  const mes = janela[0];
  const primeiro = mes?.cartoes[0];
  if (!mes || !primeiro || primeiro.valor === 0)
    throw new Error('o 1º cartão não tem parcela no 1º mês');
  await entrar(page, u, '/?aba=cartoes');
  const grafico = page.getByRole('img', { name: /^Quanto das próximas faturas/ });
  // A 1ª série (1º cartão) no 1º mês da janela.
  await grafico.locator('.recharts-bar').first().locator('.recharts-bar-rectangle').first().click();
  await expect(page).toHaveURL(
    new RegExp(`/cartoes/${primeiro.cartaoId}\\?fatura=${mes.competencia}$`),
  );
  await expect(
    page.getByRole('navigation', { name: 'Faturas' }).locator('[aria-current="page"]'),
  ).toContainText(formatarMesCurto(mes.competencia));
});

test('Gasto por cartão: a soma da lista aberta é o valor da barra (11.7)', async ({ page }) => {
  const { u, d } = await preparar(page);
  const p = periodoPreset('ultimos-3-meses', HOJE);
  const gasto = gastoPorCartao(d, p);
  const alvo = gasto[1] ?? gasto[0];
  if (!alvo) throw new Error('sem gasto no cartão');
  const i = gasto.indexOf(alvo);
  await entrar(page, u, '/?aba=cartoes');
  const grafico = page.getByRole('img', { name: /^Quanto foi gasto em cada cartão/ });
  await grafico.locator('.recharts-bar-rectangle').nth(i).click();
  await expect(page).toHaveURL(new RegExp(`/lancamentos\\?.*cartao=${alvo.cartaoId}`));

  const despesasNoTopo = page
    .getByRole('region', { name: 'Totais do recorte' })
    .locator('div')
    .filter({ has: page.getByText('Despesas', { exact: true }) })
    .getByRole('definition');
  await expect(despesasNoTopo).toHaveText(`${MENOS}${formatarMoeda(alvo.valor)}`);
  const itens = despesasReconhecidas(d, p, { cartaoId: alvo.cartaoId });
  const valores = await page
    .getByRole('list', { name: 'Lançamentos' })
    .getByRole('listitem')
    .filter({ hasNot: page.getByRole('heading') })
    .locator('span.tabular-nums')
    .allTextContents();
  expect(valores).toHaveLength(itens.length);
  expect(somar(valores.map(centavosDe))).toBe(alvo.valor);
});
