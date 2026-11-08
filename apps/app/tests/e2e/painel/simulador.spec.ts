import AxeBuilder from '@axe-core/playwright';
import {
  centavos,
  competenciaDe,
  conclusaoSimulacao,
  type Derivado,
  type Hipotetico,
  indicadoresDaBarra,
  mais,
  menos,
  previsaoDeQuitacao,
  projetarFluxo,
  somar,
  somarMeses,
  ultimaData,
} from '@goose-money/core';
import { expect, type Page, test } from '@playwright/test';

import { formatarData, formatarMoeda } from '../../../src/app/formatacao';
import { mensagensPainel } from '../../../src/features/painel/mensagens';
import { frasesDaSimulacao } from '../../../src/features/painel/simulacao';
import { conferirBarra, entrar } from '../lancar/apoio';
import { gravadoEmHoje, HOJE, idDo, preparar } from './apoio';

// T05-21: Painel › Projeções › "E se?" e "Quando cada compromisso termina" (6.2), hoje = 04/11/2026.

test.use({ viewport: { width: 1440, height: 1100 } });

const s = mensagensPainel.projecoes.simulador;
const HORIZONTE = 6;
const ate = ultimaData(somarMeses(competenciaDe(HOJE), HORIZONTE - 1));
const simulador = (page: Page) => page.getByRole('region', { name: 'E se?' });
const tabela = (page: Page) => page.getByRole('region', { name: 'Mês a mês' }).getByRole('table');

/** A frase-conclusão da tela, com os números do core. */
function conclusao(d: Derivado, h: Hipotetico): string {
  const limite = d.fatos.preferencias?.limiteAlerta ?? centavos(0);
  const c = conclusaoSimulacao(projetarFluxo(d, ate, [h]), limite);
  if (!c) throw new Error('sem conclusão');
  return frasesDaSimulacao(c, h.tipo, limite);
}

async function simularCompra(page: Page, digitos: string, parcelas: string, cartao: string) {
  const sim = simulador(page);
  await sim.getByLabel(s.valorTotal).fill(digitos);
  await sim.getByLabel(s.parcelas).fill(parcelas);
  await sim.getByRole('combobox', { name: s.cartao }).click();
  await page.getByRole('option', { name: cartao, exact: true }).click();
}

test('simular uma compra desenha a curva e a coluna, sem mexer na Barra nem gravar (6.2)', async ({
  page,
}) => {
  const { u, d } = await preparar(page);
  const gravacoes: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/rpc/gravar')) gravacoes.push(r.url());
  });
  await entrar(page, u, `/?aba=projecoes&horizonte=${String(HORIZONTE)}`);
  const barra = indicadoresDaBarra(d);
  await conferirBarra(page, barra);
  await expect(tabela(page).getByRole('columnheader', { name: s.coluna })).toHaveCount(0);

  await simularCompra(page, '300000', '10', 'Cartão A');
  const h: Hipotetico = {
    tipo: 'compra',
    descricao: s.compraSimulada,
    cartaoId: idDo(d.fatos, 'Cartão A'),
    data: HOJE,
    valorTotal: centavos(300000),
    numeroParcelas: 10,
  };
  const p = projetarFluxo(d, ate, [h]);
  const simulada = p.simulacao ?? [];
  expect(simulada).toHaveLength(HORIZONTE);
  // A curva simulada difere da principal exatamente pelas parcelas simuladas, acumuladas.
  let acumulado = centavos(0);
  simulada.forEach((x, i) => {
    const parcelas = x.itens.filter((it) => it.ref.entidade === 'hipotetico');
    acumulado = mais(acumulado, somar(parcelas.map((it) => it.valor)));
    expect(menos(p.meses[i]?.saldoFinal ?? centavos(0), x.saldoFinal)).toBe(acumulado);
  });
  expect(acumulado).toBeGreaterThan(0);

  await expect(tabela(page).getByRole('columnheader', { name: s.coluna })).toBeVisible();
  const linhas = tabela(page).locator('tbody tr');
  for (const [i, x] of simulada.entries())
    await expect(linhas.nth(i).locator('td').last()).toHaveText(formatarMoeda(x.saldoFinal));
  // A principal não muda.
  for (const [i, x] of p.meses.entries())
    await expect(linhas.nth(i).locator('td').nth(-2)).toHaveText(formatarMoeda(x.saldoFinal));
  await expect(simulador(page)).toContainText(conclusao(d, h));
  await expect(page.getByText(s.legendaCompra(formatarMoeda(h.valorTotal), 10))).toBeVisible();
  expect((await new AxeBuilder({ page }).include('main').analyze()).violations).toEqual([]);

  await conferirBarra(page, barra);
  await simulador(page).getByRole('button', { name: s.limpar }).click();
  await expect(tabela(page).getByRole('columnheader', { name: s.coluna })).toHaveCount(0);
  await expect(simulador(page).getByLabel(s.valorTotal)).toHaveValue('');
  await conferirBarra(page, barra);
  expect(gravacoes).toEqual([]);
  const gravado = await gravadoEmHoje(u);
  expect(gravado.fatos.compras).toHaveLength(d.fatos.compras.length);
  expect(gravado.fatos.recorrencias).toHaveLength(d.fatos.recorrencias.length);
});

test('uma compra grande leva o saldo abaixo do limite: a frase diz em que mês', async ({
  page,
}) => {
  const { u, d } = await preparar(page);
  await entrar(page, u, `/?aba=projecoes&horizonte=${String(HORIZONTE)}`);
  await simularCompra(page, '3000000', '1', 'Cartão B');
  const h: Hipotetico = {
    tipo: 'compra',
    descricao: s.compraSimulada,
    cartaoId: idDo(d.fatos, 'Cartão B'),
    data: HOJE,
    valorTotal: centavos(3000000),
    numeroParcelas: 1,
  };
  const c = conclusaoSimulacao(
    projetarFluxo(d, ate, [h]),
    d.fatos.preferencias?.limiteAlerta ?? centavos(0),
  );
  expect(c?.tipo).not.toBe('semAlerta');
  await expect(simulador(page)).toContainText(conclusao(d, h));
});

test('gasto fixo hipotético em conta, a partir do mês seguinte', async ({ page }) => {
  const { u, d } = await preparar(page);
  await entrar(page, u, `/?aba=projecoes&horizonte=${String(HORIZONTE)}`);
  const sim = simulador(page);
  await sim.getByRole('radio', { name: s.gastoFixo }).click();
  await sim.getByLabel(s.valor, { exact: true }).fill('20000');
  await sim.getByLabel(s.dia).fill('10');
  const desde = somarMeses(competenciaDe(HOJE), 1);
  await sim.getByLabel(s.desde).fill(desde);
  const h: Hipotetico = {
    tipo: 'gastoFixo',
    descricao: s.gastoSimulado,
    valor: centavos(20000),
    dia: 10,
    desde,
    cartaoId: null,
  };
  const p = projetarFluxo(d, ate, [h]);
  const linhas = tabela(page).locator('tbody tr');
  for (const [i, x] of (p.simulacao ?? []).entries())
    await expect(linhas.nth(i).locator('td').last()).toHaveText(formatarMoeda(x.saldoFinal));
  // Mês corrente sem o gasto: começa no seguinte.
  expect(p.simulacao?.[0]?.saldoFinal).toBe(p.meses[0]?.saldoFinal);
  await expect(sim).toContainText(conclusao(d, h));
  await conferirBarra(page, indicadoresDaBarra(d));
});

test('a lista de quitação mostra a última parcela de cada dívida e compra do seed, por data', async ({
  page,
}) => {
  const { u, d } = await preparar(page);
  await entrar(page, u, '/?aba=projecoes');
  const { dividas, compras } = previsaoDeQuitacao(d);
  expect(dividas.length).toBe(d.fatos.dividas.length);
  const lista = page.getByRole('region', { name: mensagensPainel.projecoes.quitacao.titulo });
  const itens = lista.getByRole('link');
  await expect(itens).toHaveCount(dividas.length + compras.length);
  for (const x of dividas) {
    const t = d.dividas.get(x.dividaId);
    if (!t) throw new Error('dívida sem tabela');
    const link = lista.getByRole('link', { name: new RegExp(`^${t.divida.credor}`) });
    await expect(link).toContainText(formatarData(x.data));
    await expect(link).toHaveAttribute('href', new RegExp(`/dividas/${x.dividaId}$`));
  }
  const datas = [...dividas, ...compras].map((x) => formatarData(x.data));
  const ordem = [...dividas, ...compras]
    .sort((a, b) => a.data.localeCompare(b.data))
    .map((x) => formatarData(x.data));
  expect(datas.length).toBe(ordem.length);
  for (const [i, data] of ordem.entries()) await expect(itens.nth(i)).toContainText(data);
});
