import AxeBuilder from '@axe-core/playwright';
import {
  competenciaDe,
  conclusaoJurosAmortizacao,
  conclusaoSaldoDevedor,
  contratarDivida,
  dataCivil,
  deMascara,
  type Derivado,
  type MesProjetado,
  projetarFluxo,
  saldoDevedorDeDividas,
  somar,
  type TabelaDaDivida,
  ultimaData,
} from '@goose-money/core';
import { expect, type Page, test } from '@playwright/test';

import {
  formatarData,
  formatarMesCurto,
  formatarMoeda,
  formatarMoedaCurta,
  formatarTaxa,
} from '../../../src/app/formatacao';
import { mensagensDividas } from '../../../src/features/dividas/mensagens';
import { linhasDaTabela } from '../../../src/features/dividas/tabela';
import { entrar } from '../lancar/apoio';
import { gravadoEmHoje, preparar } from '../painel/apoio';

// T05-22: Dívidas, lista e detalhe (6.6, 8.1), com o seed de 04/11/2026.

test.use({ viewport: { width: 1440, height: 900 } });

const g = mensagensDividas.graficos;
const doSistema = (d: Derivado, s: string) => {
  const t = [...d.dividas.values()].find((x) => x.divida.sistemaAmortizacao === s);
  if (!t) throw new Error(`seed sem dívida ${s}`);
  return t;
};
const totais = (page: Page) =>
  page.getByRole('region', { name: 'Totais das dívidas' }).getByRole('definition');
const cards = (page: Page) =>
  page.getByRole('navigation', { name: 'Dívidas cadastradas' }).getByRole('link');
const tabela = (page: Page) => page.getByRole('table', { name: 'Tabela de amortização' });
const linhaDa = (page: Page, numero: number) =>
  tabela(page)
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name: String(numero), exact: true }) })
    .first();
const titulo = (t: TabelaDaDivida) => {
  const c = conclusaoSaldoDevedor(t.resumo);
  if (c.tipo !== 'emAberto') throw new Error('dívida quitada');
  return g.saldo.emAberto(formatarMoedaCurta(c.saldoDevedor), formatarMesCurto(c.quitacao));
};

test('lista: o Saldo devedor de dívidas é a soma dos saldos de cada card; parcelas do mês da projeção', async ({
  page,
}) => {
  const { u, d } = await preparar(page);
  await entrar(page, u, '/dividas');
  const dividas = [...d.dividas.values()];
  await expect(cards(page)).toHaveCount(dividas.length);
  const soma = somar(dividas.map((t) => t.resumo.saldoDevedor));
  expect(saldoDevedorDeDividas(d)).toBe(soma);
  await expect(totais(page).nth(0)).toHaveText(formatarMoeda(soma));
  const mes = projetarFluxo(d, ultimaData(competenciaDe(d.hoje))).meses[0] as MesProjetado;
  await expect(totais(page).nth(1)).toHaveText(formatarMoeda(mes.grupos.parcelasDividas));
  for (const t of dividas) {
    const card = cards(page).filter({ hasText: t.divida.credor });
    const { pagas, total, proximaParcela, quitacaoPrevista } = t.resumo;
    await expect(card).toContainText(formatarMoeda(t.resumo.saldoDevedor));
    await expect(card).toContainText(
      `${String(pagas)}/${String(total)} · quita ${formatarMesCurto(competenciaDe(quitacaoPrevista ?? d.hoje))}`,
    );
    if (proximaParcela)
      await expect(card).toContainText(
        `Próxima: ${formatarData(proximaParcela.vencimento).slice(0, 5)} · ${formatarMoeda(proximaParcela.valor)}`,
      );
    await expect(card.getByRole('progressbar')).toHaveAccessibleName(
      `Parcelas pagas: ${String(pagas)} de ${String(total)}`,
    );
  }
  expect(
    (await new AxeBuilder({ page }).include('main').analyze()).violations.map((v) => v.id),
  ).toEqual([]);

  await cards(page)
    .filter({ hasText: doSistema(d, 'price').divida.credor })
    .click();
  await expect(page).toHaveURL(new RegExp(`#/dividas/${doSistema(d, 'price').divida.id}$`));
  await expect(
    cards(page).filter({ hasText: doSistema(d, 'price').divida.credor }),
  ).toHaveAttribute('aria-current', 'page');
});

test('detalhe do financiamento: resumo, títulos do core e 12 parcelas "Paga antes do cadastro" (6.6)', async ({
  page,
}) => {
  const { u, d } = await preparar(page);
  const t = doSistema(d, 'price');
  await entrar(page, u, `/dividas/${t.divida.id}`);
  const resumo = page.getByRole('definition');
  await expect(page.getByRole('heading', { name: t.divida.credor })).toBeVisible();
  await expect(resumo.filter({ hasText: formatarMoeda(t.resumo.valorContratado) })).toHaveCount(1);
  await expect(page.getByText(`${formatarTaxa(t.resumo.taxa)} a.m.`)).toBeVisible();
  await expect(page.getByText(formatarMoeda(t.resumo.totalPago), { exact: true })).toBeVisible();
  await expect(
    page.getByText(
      `${formatarMoeda(t.resumo.jurosPagos)} · ${formatarMoeda(t.resumo.jurosAPagar)}`,
    ),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: titulo(t) })).toBeVisible();
  const juros = conclusaoJurosAmortizacao(t.parcelas);
  expect(juros.tipo).toBe('amortizacaoCresce');
  await expect(page.getByRole('heading', { name: g.juros.amortizacaoCresce })).toBeVisible();

  // Tabela: as 48 parcelas, com o saldo após cada uma e o status do core.
  const linhas = linhasDaTabela(t);
  await expect(tabela(page).getByRole('row')).toHaveCount(linhas.length + 1);
  const antes = t.parcelas.filter((p) => p.status === 'paga_antes_do_cadastro').length;
  expect(antes).toBe(12);
  await expect(
    tabela(page).getByRole('row').filter({ hasText: 'Paga antes do cadastro' }),
  ).toHaveCount(antes);
  const proxima = t.resumo.proximaParcela;
  if (!proxima) throw new Error('sem próxima parcela');
  const daProxima = linhas.find((l) => l.parcela.numero === proxima.numero);
  if (!daProxima) throw new Error('sem a linha da próxima parcela');
  await expect(linhaDa(page, proxima.numero)).toContainText('A vencer · próxima');
  await expect(linhaDa(page, proxima.numero)).toContainText(formatarMoeda(daProxima.saldo));
  await expect(linhaDa(page, proxima.numero - 1)).toContainText(
    formatarMoeda(t.resumo.saldoDevedor),
  );
  await expect(linhaDa(page, linhas.length)).toContainText(formatarMoeda(somar([])));

  // Excluir fica desabilitado com o motivo do core: a dívida tem pagamentos.
  await page.getByRole('button', { name: `Ações de ${t.divida.credor}` }).click();
  await expect(page.getByRole('menuitem', { name: /^Excluir dívida/ })).toBeDisabled();
  await expect(page.getByRole('menuitem', { name: /^Excluir dívida/ })).toContainText(
    'A dívida tem pagamentos registrados',
  );
  await page.keyboard.press('Escape');
  expect(
    (await new AxeBuilder({ page }).include('main').analyze()).violations.map((v) => v.id),
  ).toEqual([]);
});

test('clique numa barra ou num ponto do gráfico rola até a linha da parcela e a destaca (8.1)', async ({
  page,
}) => {
  const { u, d } = await preparar(page);
  const t = doSistema(d, 'price');
  await entrar(page, u, `/dividas/${t.divida.id}`);
  const k = t.parcelas.length - 2;
  // Barras: a série Amortização, a barra da parcela k.
  const barras = page.getByRole('img', { name: g.juros.amortizacaoCresce });
  await barras
    .locator('.recharts-bar')
    .first()
    .locator('.recharts-bar-rectangle')
    .nth(k - 1)
    .click();
  await expect(linhaDa(page, k)).toBeFocused();
  await expect(linhaDa(page, k)).toHaveAttribute('aria-current', 'true');
  await expect(linhaDa(page, k)).toBeInViewport();

  // Linha: o ponto da 3ª parcela; passa o mouse antes, para o Recharts marcar o ponto ativo.
  const linha = page.getByRole('img', { name: titulo(t) });
  await linha.scrollIntoViewIfNeeded();
  const caixa = await linha.locator('.recharts-surface').boundingBox();
  if (!caixa) throw new Error('sem gráfico');
  const n = t.parcelas.length;
  const x = caixa.x + 72 + ((caixa.width - 72) * 2.5) / n;
  await page.mouse.move(x, caixa.y + caixa.height / 2, { steps: 5 });
  await expect(linha.locator('.recharts-tooltip-wrapper .font-semibold').first()).toHaveText('3');
  await page.mouse.down();
  await page.mouse.up();
  await expect(linhaDa(page, 3)).toBeFocused();
  await expect(linhaDa(page, 3)).toHaveAttribute('aria-current', 'true');
  await expect(linhaDa(page, 3)).toBeInViewport();
  await expect(linhaDa(page, k)).not.toHaveAttribute('aria-current');
});

test('excluir uma dívida sem pagamentos tira a dívida e as parcelas; Desfazer devolve', async ({
  page,
}) => {
  const credor = 'Empréstimo da família';
  const { u, d } = await preparar(page, (f, ctx) => [
    contratarDivida(
      f,
      ctx,
      {
        tipo: 'emprestimo',
        credor,
        valorContratado: deMascara('120000'),
        dataContratacao: dataCivil('2026-11-01'),
        destinoDoValor: 'creditado_em_conta',
        sistemaAmortizacao: 'price',
        taxaMensal: '0',
        valorParcelaInformada: null,
        numeroParcelas: 12,
        dataPrimeiraParcela: dataCivil('2026-12-01'),
        contaDebitoId: f.contas[0]?.id ?? '',
        categoriaId: null,
      },
      { parcelasPagas: 0, contaCaptacaoId: null },
    ),
  ]);
  const t = [...d.dividas.values()].find((x) => x.divida.credor === credor);
  if (!t) throw new Error('dívida não preparada');
  await entrar(page, u, `/dividas/${t.divida.id}`);
  // Taxa zero: sem juros (11.5).
  await expect(page.getByRole('heading', { name: g.juros.semJuros })).toBeVisible();

  await page.getByRole('button', { name: `Ações de ${credor}` }).click();
  await page.getByRole('menuitem', { name: /^Excluir dívida/ }).click();
  const dialogo = page.getByRole('dialog', { name: `Excluir ${credor}?` });
  await expect(dialogo).toContainText(`as ${String(t.parcelas.length)} parcelas`);
  await dialogo.getByRole('button', { name: 'Excluir dívida' }).click();
  await expect(page).toHaveURL(/#\/dividas$/);
  await expect(cards(page).filter({ hasText: credor })).toHaveCount(0);
  const gravado = await gravadoEmHoje(u);
  expect(gravado.fatos.dividas.some((x) => x.id === t.divida.id)).toBe(false);
  expect(gravado.fatos.parcelasDivida.some((p) => p.dividaId === t.divida.id)).toBe(false);

  await page.getByRole('button', { name: 'Desfazer' }).click();
  await expect(page.getByText('Desfeito')).toBeVisible();
  await expect(cards(page).filter({ hasText: credor })).toHaveCount(1);
  const volta = await gravadoEmHoje(u);
  expect(volta.fatos.parcelasDivida.filter((p) => p.dividaId === t.divida.id)).toHaveLength(
    t.parcelas.length,
  );
});
