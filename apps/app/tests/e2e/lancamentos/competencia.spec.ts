import {
  competenciaDe,
  despesas,
  despesasReconhecidas,
  periodoParaUrl,
  periodoPreset,
  negar,
  primeiroDia,
  somarMeses,
  ultimaData,
  periodo as criarPeriodo,
} from '@goose-money/core';
import { expect, type Page, test } from '@playwright/test';

import { formatarMoeda, MENOS } from '../../../src/app/formatacao';
import { criarUsuario, hojeEmBrasilia, sqlComoPostgres } from '../../../../../supabase/tests/apoio';
import { comSeed, derivadoNoBanco, dialogo, entrar } from '../lancar/apoio';

// T05-06: Lançamentos › Receitas e despesas (6.3, 8, 11.4, 11.7).

test.use({ viewport: { width: 1440, height: 900 } });

const lista = (page: Page) => page.getByRole('list', { name: 'Lançamentos' });
const totais = (page: Page) => page.getByRole('region', { name: 'Totais do recorte' });

test('aberta a partir de um gráfico, a soma dos itens é o valor clicado (6.3, 11.7)', async ({
  page,
}) => {
  const u = await comSeed();
  const d = await derivadoNoBanco(u);
  const mes = somarMeses(competenciaDe(hojeEmBrasilia()), -1);
  const p = criarPeriodo(primeiroDia(mes), ultimaData(mes));
  const alimentacao = d.fatos.categorias.find((c) => c.nome === 'Alimentação');
  const filtros = { tipo: 'despesa' as const, categorias: [alimentacao?.id ?? ''] };
  const itens = despesasReconhecidas(d, p, filtros);
  expect(itens.length).toBeGreaterThan(1);

  // A URL que o clique no ponto do gráfico monta (8): visão, período e filtros.
  await entrar(
    page,
    u,
    `/lancamentos?visao=competencia&${periodoParaUrl(p)}&tipo=despesa&categoria=${alimentacao?.id ?? ''}`,
  );
  const despesasNoTopo = totais(page)
    .locator('div')
    .filter({ has: page.getByText('Despesas', { exact: true }) })
    .getByRole('definition');
  await expect(despesasNoTopo).toHaveText(`${MENOS}${formatarMoeda(despesas(d, p, filtros))}`);

  const valores = await lista(page)
    .getByRole('listitem')
    .filter({ hasNot: page.getByRole('heading') })
    .locator('span.tabular-nums')
    .allTextContents();
  const esperados = itens.map((i) =>
    i.valor < 0 ? `+${formatarMoeda(negar(i.valor))}` : `${MENOS}${formatarMoeda(i.valor)}`,
  );
  expect(valores.sort()).toEqual(esperados.sort());
});

test('a parcela da compra do mês passado com fatura neste mês aparece neste mês (11.4)', async ({
  page,
}) => {
  const u = await comSeed();
  const d = await derivadoNoBanco(u);
  const hoje = hojeEmBrasilia();
  const parcela = d.reconhecidos.find(
    (i) =>
      i.registro.entidade === 'parcela' &&
      i.texto.startsWith('Geladeira · 1/6') &&
      competenciaDe(i.data) === competenciaDe(hoje),
  );
  expect(parcela).toBeDefined();
  await entrar(page, u, '/lancamentos');
  await page.getByRole('button', { name: 'Este mês' }).click();
  await page.getByRole('searchbox', { name: 'Buscar por descrição' }).fill('Geladeira');
  await expect(lista(page).getByText(parcela?.texto ?? '', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Mês passado' }).click();
  await expect(lista(page).getByText(parcela?.texto ?? '', { exact: true })).toBeHidden();
});

test('a lista é virtualizada: com 3 mil itens, só as linhas visíveis existem', async ({ page }) => {
  const u = await comSeed();
  const d = await derivadoNoBanco(u);
  const conta = d.fatos.contas.find((c) => c.nome === 'Conta corrente');
  const categoria = d.fatos.categorias.find((c) => c.nome === 'Lazer');
  const hoje = hojeEmBrasilia();
  await sqlComoPostgres`
    insert into public.lancamentos (created_by, tipo, data, valor, conta_id, categoria_id, descricao)
    select ${u.id}, 'despesa', ${primeiroDia(competenciaDe(hoje))}::date + (i % 3), 100 + i,
      ${conta?.id ?? ''}, ${categoria?.id ?? ''}, 'Volume ' || i
    from generate_series(1, 3000) i`;
  await entrar(page, u, `/lancamentos?${periodoParaUrl(periodoPreset('este-mes', hoje))}`);
  await expect(lista(page).getByRole('listitem').first()).toBeVisible();
  expect(await lista(page).getByRole('listitem').count()).toBeLessThan(80);
  await page.mouse.wheel(0, 20_000);
  await expect(lista(page).getByRole('listitem').first()).toBeVisible();
  expect(await lista(page).getByRole('listitem').count()).toBeLessThan(80);
});

test('sem lançamentos no período: "Sem lançamentos neste período · Lançar"', async ({ page }) => {
  await entrar(page, await criarUsuario(), '/lancamentos');
  await expect(page.getByText('Sem lançamentos neste período')).toBeVisible();
  await page.getByRole('main').getByRole('button', { name: 'Lançar' }).click();
  await expect(dialogo(page)).toBeVisible();
});
