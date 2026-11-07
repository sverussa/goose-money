import AxeBuilder from '@axe-core/playwright';
import {
  competenciaDe,
  dataCivil,
  maxData,
  minData,
  periodo,
  primeiroDia,
  ultimaData,
  conclusaoDespesasPorCategoria,
  conclusaoReceitasDespesas,
  despesasPorCategoria,
  despesasReconhecidas,
  fixosEVariaveis,
  gastoAcumulado,
  maioresDespesas,
  periodoPreset,
  receitasEDespesasPorMes,
  somar,
} from '@goose-money/core';
import { expect, type Page, test } from '@playwright/test';

import { formatarMesCurto, formatarPercentual } from '../../../src/app/formatacao';
import { entrar } from '../lancar/apoio';
import { HOJE, preparar, somaDaLista } from './apoio';

// T05-17: gráficos da Visão geral (8.1, 8.3, 11.7), com "hoje" = 04/11/2026 e o período padrão
// "Últimos 3 meses".

test.use({ viewport: { width: 1440, height: 1000 } });

const P = periodoPreset('ultimos-3-meses', HOJE);
const grafico = (page: Page, titulo: RegExp) => page.getByRole('img', { name: titulo });

test('Receitas × Despesas: a barra de despesas de um mês abre a lista com a mesma soma (11.7)', async ({
  page,
}) => {
  const { u, d } = await preparar(page);
  const serie = receitasEDespesasPorMes(d, P);
  const k = 1;
  const mes = serie[k];
  if (!mes) throw new Error('sem o mês');
  await entrar(page, u, '/');
  const g = grafico(page, /^(Sobrou|Faltou) dinheiro/);
  // As barras: todas as de Receitas e depois todas as de Despesas.
  await g.locator('.recharts-bar').nth(1).locator('.recharts-bar-rectangle').nth(k).click();
  await expect(page).toHaveURL(/#\/lancamentos\?.*tipo=despesa/);
  // O mês dentro do período do seletor: os dias que a barra soma.
  const doMes = periodo(
    maxData(primeiroDia(mes.competencia), P.de),
    minData(ultimaData(mes.competencia), P.ate),
  );
  const itens = despesasReconhecidas(d, doMes, {});
  expect(await somaDaLista(page, itens.length)).toBe(mes.despesas);
});

test('Despesas por categoria: a fatia e "Outras" abrem a lista com a mesma soma; "Ver itens" abre todas (11.7)', async ({
  page,
}) => {
  const { u, d } = await preparar(page);
  const serie = despesasPorCategoria(d, P);
  const c = conclusaoDespesasPorCategoria(serie);
  if (c.tipo !== 'maior' || !serie.outras) throw new Error('o seed devia ter "Outras"');
  const nome = d.porId.categorias.get(c.categoriaId)?.nome ?? '';
  await entrar(page, u, '/');
  await expect(
    page.getByRole('heading', { name: `${nome} é ${formatarPercentual(c.fatia)} das despesas` }),
  ).toBeVisible();

  await page.getByRole('button', { name: new RegExp(`^${nome}`) }).click();
  const daCategoria = despesasReconhecidas(d, P, { categorias: [c.categoriaId] });
  expect(await somaDaLista(page, daCategoria.length)).toBe(c.valor);

  await page.goBack();
  await page.getByRole('button', { name: /^Outras/ }).click();
  const outras = despesasReconhecidas(d, P, { categorias: serie.outras.categorias });
  expect(await somaDaLista(page, outras.length)).toBe(serie.outras.valor);

  await page.goBack();
  await page
    .getByRole('button', {
      name: `Opções do gráfico: ${nome} é ${formatarPercentual(c.fatia)} das despesas`,
    })
    .click();
  await page.getByRole('menuitem', { name: 'Ver itens' }).click();
  const todas = despesasReconhecidas(d, P, {});
  expect(await somaDaLista(page, todas.length)).toBe(somar(serie.ranking.map((f) => f.valor)));
});

test('Gasto acumulado: o dia clicado abre do dia 1 até ele, com a mesma soma (11.7)', async ({
  page,
}) => {
  const { u, d } = await preparar(page);
  const serie = gastoAcumulado(d, P);
  const dia = 4;
  const acumulado = serie.dias[dia - 1]?.atual;
  if (acumulado == null) throw new Error('sem o acumulado do dia');
  await entrar(page, u, '/');
  const g = grafico(page, /novembro gastou/);
  await g.scrollIntoViewIfNeeded();
  const caixa = await g.locator('.recharts-surface').boundingBox();
  if (!caixa) throw new Error('sem gráfico');
  // Eixo Y de 72 px e uma faixa igual por dia do mês mais longo.
  const x = caixa.x + 72 + ((caixa.width - 72) * (dia - 0.5)) / serie.dias.length;
  await page.mouse.move(x, caixa.y + caixa.height / 2, { steps: 5 });
  // Sob carga, o ponto ativo demora: só clica com o tooltip já no dia certo.
  await expect(g.locator('.recharts-tooltip-wrapper')).toContainText(
    new RegExp(`^${String(dia)}\\D`),
  );
  await page.mouse.down();
  await page.mouse.up();
  const ate = dataCivil(`${serie.mes}-${String(dia).padStart(2, '0')}`);
  await expect(page).toHaveURL(new RegExp(`de=${primeiroDia(serie.mes)}&ate=${ate}`));
  const itens = despesasReconhecidas(d, periodo(primeiroDia(serie.mes), ate), {});
  expect(await somaDaLista(page, itens.length)).toBe(acumulado);
});

test('Fixos × variáveis: a parte fixa de um mês abre a lista das recorrências com a mesma soma (11.7)', async ({
  page,
}) => {
  const { u, d } = await preparar(page);
  const serie = fixosEVariaveis(d, P);
  const k = 1;
  const mes = serie[k];
  if (!mes) throw new Error('sem o mês');
  await entrar(page, u, '/');
  const g = grafico(page, /fixos são/i);
  await g.scrollIntoViewIfNeeded();
  await g.locator('.recharts-bar').first().locator('.recharts-bar-rectangle').nth(k).click();
  await expect(page).toHaveURL(/origem=recorrencia/);
  const itens = despesasReconhecidas(d, P, { origens: ['recorrencia'] }).filter(
    (i) => competenciaDe(i.data) === mes.competencia,
  );
  expect(await somaDaLista(page, itens.length)).toBe(mes.fixos);
});

test('cada gráfico respeita o período; Comprometimento e Maiores despesas abrem o destino (8.1)', async ({
  page,
}) => {
  const { u, d } = await preparar(page);
  await entrar(page, u, '/');
  expect((await new AxeBuilder({ page }).include('main').analyze()).violations).toEqual([]);
  await page
    .getByRole('group', { name: 'Período' })
    .getByRole('button', { name: 'Mês passado', exact: true })
    .click();
  const passado = periodoPreset('mes-passado', HOJE);
  const c = conclusaoReceitasDespesas(receitasEDespesasPorMes(d, passado));
  await expect(
    grafico(
      page,
      c.tipo === 'sobrouEmTodos' ? /^Sobrou dinheiro no mês/ : /^Faltou dinheiro no mês/,
    ),
  ).toBeVisible();
  await expect(
    page.getByText(`Gasto acumulado por dia · ${formatarMesCurto(competenciaDe(passado.ate))}`),
  ).toBeVisible();
  const [maior] = maioresDespesas(d, passado);
  if (!maior) throw new Error('sem despesas no mês passado');
  await expect(
    page.getByRole('region', { name: 'Maiores despesas do período' }).getByRole('link').first(),
  ).toContainText(maior.texto);

  await page.getByRole('link', { name: /^Gastos fixos R\$/ }).click();
  await expect(page).toHaveURL(/#\/gastos-fixos$/);
});
