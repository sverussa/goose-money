import AxeBuilder from '@axe-core/playwright';
import {
  competenciaDe,
  deMascara,
  indicadoresDaBarra,
  projetarFluxo,
  salvarPreferencias,
  somarMeses,
  ultimaData,
} from '@goose-money/core';
import { expect, type Page, test } from '@playwright/test';

import { formatarMes, formatarMesCurto, formatarMoeda } from '../../../src/app/formatacao';
import { alterar, gravarOk } from '../../../../../supabase/tests/apoio';
import { entrar } from '../lancar/apoio';
import { HOJE, preparar } from './apoio';

// T05-20: Painel › Projeções (3.9, 6.2, 8.1, 11.4, D48), com "hoje" = 04/11/2026.

test.use({ viewport: { width: 1440, height: 1100 } });

const tabela = (page: Page) => page.getByRole('region', { name: 'Mês a mês' }).getByRole('table');
const detalhe = (page: Page) => page.getByRole('region', { name: /^Detalhamento de/ });

test('o saldo final do mês corrente é o Previsto até o fim do mês da Barra (11.4)', async ({
  page,
}) => {
  const { u, d } = await preparar(page);
  await entrar(page, u, '/projecoes');
  await expect(page).toHaveURL(/\?aba=projecoes$/);
  const previsto = formatarMoeda(indicadoresDaBarra(d).previstoAteOFimDoMes);
  await expect(page.getByRole('link', { name: /^Previsto até o fim do mês/ })).toContainText(
    previsto,
  );
  const primeira = tabela(page).locator('tbody tr').first();
  await expect(primeira.locator('td').last()).toHaveText(previsto);
  // Abre com o mês corrente detalhado.
  await expect(detalhe(page)).toHaveAccessibleName(
    `Detalhamento de ${formatarMes(competenciaDe(HOJE))}`,
  );
  expect((await new AxeBuilder({ page }).include('main').analyze()).violations).toEqual([]);
});

test('o Streaming no cartão aparece só dentro da fatura, nunca em "Gastos fixos em conta" (11.4)', async ({
  page,
}) => {
  const { u, d } = await preparar(page);
  const ate = ultimaData(somarMeses(competenciaDe(HOJE), 11));
  const meses = projetarFluxo(d, ate).meses;
  const comStreaming = meses.filter((x) => x.itens.some((i) => i.texto.includes('Streaming')));
  expect(comStreaming.length).toBeGreaterThan(0);
  for (const x of meses)
    expect(
      x.itens.filter((i) => i.texto.includes('Streaming')).every((i) => i.grupo === 'faturas'),
    ).toBe(true);
  const mes = comStreaming[0];
  if (!mes) throw new Error('sem mês com Streaming');

  await entrar(page, u, '/?aba=projecoes&horizonte=12');
  await page.getByRole('button', { name: formatarMesCurto(mes.competencia), exact: true }).click();
  await expect(detalhe(page).getByRole('region', { name: 'Faturas de cartão' })).toContainText(
    'Streaming',
  );
  await expect(
    detalhe(page)
      .getByRole('region', { name: 'Gastos fixos em conta' })
      .getByText(/Streaming/),
  ).toHaveCount(0);
});

test('clicar em outro mês troca o detalhamento', async ({ page }) => {
  const { u } = await preparar(page);
  await entrar(page, u, '/?aba=projecoes&horizonte=6');
  const seguinte = somarMeses(competenciaDe(HOJE), 1);
  const botao = tabela(page).getByRole('button', { name: formatarMesCurto(seguinte), exact: true });
  await botao.click();
  await expect(detalhe(page)).toHaveAccessibleName(`Detalhamento de ${formatarMes(seguinte)}`);
  await expect(botao).toHaveAttribute('aria-pressed', 'true');
  // O ponto do gráfico também detalha o mês.
  const terceiro = formatarMes(somarMeses(competenciaDe(HOJE), 2));
  const grafico = page.getByRole('img', { name: /^Como fica o saldo/ });
  await grafico.scrollIntoViewIfNeeded();
  const caixa = await grafico.locator('.recharts-surface').boundingBox();
  if (!caixa) throw new Error('sem gráfico');
  // O 3º de 6 pontos: o eixo Y ocupa 72 px à esquerda e cada mês tem uma faixa igual da largura.
  const x = caixa.x + 72 + ((caixa.width - 72) * 2.5) / 6;
  // Passa o mouse antes, para o Recharts marcar o ponto ativo, e clica.
  await page.mouse.move(x, caixa.y + caixa.height / 2, { steps: 5 });
  // Sob carga, o ponto ativo demora: só clica com o tooltip já no mês certo.
  await expect(grafico.locator('.recharts-tooltip-wrapper')).toContainText(
    formatarMesCurto(somarMeses(competenciaDe(HOJE), 2)),
  );
  await page.mouse.down();
  await page.mouse.up();
  await expect(detalhe(page)).toHaveAccessibleName(`Detalhamento de ${terceiro}`);
});

test('mudar o limite de alerta muda a altura da faixa (D48)', async ({ page }) => {
  const { u, d } = await preparar(page, (f, ctx) => [
    salvarPreferencias(f, ctx, { limiteAlerta: deMascara('50000') }),
  ]);
  await entrar(page, u, '/?aba=projecoes&horizonte=6');
  const faixa = page.locator('.recharts-reference-area-rect');
  await expect(faixa).toHaveCount(1);
  const antes = (await faixa.boundingBox())?.height ?? 0;
  expect(antes).toBeGreaterThan(0);

  const p = d.fatos.preferencias;
  if (!p) throw new Error('sem preferências');
  await gravarOk(u.cliente, [alterar('preferencias', p.id, { limite_alerta: 1_000_000 })]);
  await page.reload();
  await expect(page.getByRole('note').first()).toContainText(formatarMoeda(deMascara('1000000')));
  await expect.poll(async () => (await faixa.boundingBox())?.height ?? 0).toBeGreaterThan(antes);
});
