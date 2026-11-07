import AxeBuilder from '@axe-core/playwright';
import {
  competenciaDe,
  criarCartao,
  deMascara,
  itensPrevistosNaFatura,
  negar,
  pagarFatura,
  somar,
} from '@goose-money/core';
import { expect, type Page, test } from '@playwright/test';

import { formatarMesCurto, formatarMoeda } from '../../../src/app/formatacao';
import { entrar } from '../lancar/apoio';
import { HOJE, idDo, preparar } from './apoio';

// T05-12: fatura do cartão (6.5, 3.5, 11.3), com o seed de "hoje" = 04/11/2026 (DESIGN-HANDOFF 2).

test.use({ viewport: { width: 1440, height: 1000 } });

const faturas = (page: Page) => page.getByRole('navigation', { name: 'Faturas' });
const totais = (page: Page) => page.getByRole('region', { name: 'Totais da fatura' });
const linha = (page: Page, texto: string) => page.getByRole('listitem').filter({ hasText: texto });

test('status do seed: B de out "Transportada", nov com "Saldo anterior não pago"; A com crédito de −R$ 50,00 (3.5, 11.3)', async ({
  page,
}) => {
  const { u, d } = await preparar(page);
  const b = idDo(d.fatos, 'Cartão B');
  const fb = d.faturas.get(b) ?? [];
  await entrar(page, u, '/cartoes');
  await page.getByRole('link', { name: 'Cartão B', exact: true }).click();

  // Abre na aberta.
  const aberta = fb.find((x) => x.status === 'aberta');
  if (!aberta) throw new Error('sem fatura aberta');
  await expect(page).toHaveURL(new RegExp(`/cartoes/${b}$`));
  await expect(faturas(page).locator('[aria-current="page"]')).toContainText(
    formatarMesCurto(aberta.competencia),
  );
  await expect(totais(page).getByRole('definition').first()).toHaveText(
    formatarMoeda(aberta.saldo),
  );

  // M−1 (out/2026): paga em 60% e transportada.
  const out = fb.find((x) => x.competencia === '2026-10');
  if (!out) throw new Error('sem a fatura de outubro');
  expect(out.status).toBe('transportada');
  await faturas(page)
    .getByRole('link', { name: /^out\/2026/ })
    .click();
  await expect(page).toHaveURL(/\?fatura=2026-10$/);
  await expect(totais(page)).toContainText('Transportada');
  await expect(totais(page).getByRole('definition').nth(1)).toHaveText(
    formatarMoeda(out.totalPago),
  );

  // A seguinte (nov/2026) recebe o saldo transportado.
  const nov = fb.find((x) => x.competencia === '2026-11');
  const transporte = nov?.itens.find((i) => i.tipo === 'saldo_anterior_nao_pago');
  if (!nov || !transporte) throw new Error('sem o transporte em novembro');
  await faturas(page)
    .getByRole('link', { name: /^nov\/2026/ })
    .click();
  await expect(linha(page, 'Saldo anterior não pago')).toContainText(
    formatarMoeda(transporte.valor),
  );
  await expect(linha(page, 'Juros do rotativo')).toContainText('Encargo');
  await expect(totais(page)).toContainText(nov.status === 'fechada' ? 'Fechada' : 'Vencida');

  // Trocar de cartão: o A abre na aberta dele, e a fatura M−1 tem o crédito de R$ 50,00.
  await page
    .getByRole('navigation', { name: 'Cartões' })
    .getByRole('link', { name: 'Cartão A' })
    .click();
  await expect(page).toHaveURL(new RegExp(`/cartoes/${idDo(d.fatos, 'Cartão A')}$`));
  await expect(page.getByRole('heading', { name: 'Cartão A' })).toBeVisible();
  await faturas(page)
    .getByRole('link', { name: /^set\/2026/ })
    .click();
  await expect(totais(page)).toContainText('Paga');
  await faturas(page)
    .getByRole('link', { name: /^out\/2026/ })
    .click();
  await expect(linha(page, 'Crédito de pagamento')).toContainText(
    formatarMoeda(negar(deMascara('5000'))),
  );
  expect((await new AxeBuilder({ page }).include('main').analyze()).violations).toEqual([]);
});

test('pagamento parcial mostra "Paga parcialmente"; o seletor mostra os três cartões (3.5, 11.3)', async ({
  page,
}) => {
  const { u, d } = await preparar(page, (f, ctx) => [
    pagarFatura(f, ctx, {
      cartaoId: idDo(f, 'Cartão B'),
      valor: deMascara('10000'),
      data: HOJE,
      faturaCompetencia: competenciaDe(HOJE),
    }),
    criarCartao(f, ctx, {
      nome: 'Cartão C',
      instituicao: null,
      cor: 'categorica-2',
      limite: deMascara('300000'),
      contaPagamentoId: f.cartoes[0]?.contaPagamentoId ?? '',
      diaFechamento: 10,
      diaVencimento: 20,
      saldoFaturaFechada: deMascara('0'),
    }),
  ]);
  const b = idDo(d.fatos, 'Cartão B');
  const nov = (d.faturas.get(b) ?? []).find((x) => x.competencia === '2026-11');
  expect(nov?.pagaParcialmente).toBe(true);
  await entrar(page, u, `/cartoes/${b}?fatura=2026-11`);
  await expect(totais(page)).toContainText('Paga parcialmente');
  await expect(totais(page).getByRole('definition').first()).toHaveText(
    formatarMoeda(nov?.saldo ?? deMascara('0')),
  );
  await expect(page.getByRole('navigation', { name: 'Cartões' }).getByRole('link')).toHaveText([
    'Cartão A',
    'Cartão B',
    'Cartão C',
  ]);
});

test('o gasto fixo previsto no cartão fica separado no fim e fora do saldo da fatura (D46)', async ({
  page,
}) => {
  const { u, d } = await preparar(page);
  const a = idDo(d.fatos, 'Cartão A');
  const fatura = (d.faturas.get(a) ?? []).find(
    (x) => itensPrevistosNaFatura(d.fatos, a, x.competencia, HOJE).length > 0,
  );
  if (!fatura) throw new Error('o seed não tem gasto fixo previsto no Cartão A');
  const [previsto] = itensPrevistosNaFatura(d.fatos, a, fatura.competencia, HOJE);
  // O saldo é só itens menos pagamentos: o previsto não entra.
  expect(somar(fatura.itens.map((i) => i.valor)) - fatura.totalPago).toBe(fatura.saldo);

  await entrar(page, u, `/cartoes/${a}?fatura=${fatura.competencia}`);
  const previstos = page.getByRole('list', { name: 'Previstos' });
  await expect(previstos).toContainText(`${previsto?.recorrencia.descricao ?? ''} · gasto fixo`);
  await expect(previstos).toContainText('Previsto');
  await expect(previstos).toContainText(formatarMoeda(previsto?.valor ?? deMascara('0')));
  await expect(totais(page).getByRole('definition').first()).toHaveText(
    formatarMoeda(fatura.saldo),
  );
});

test('as ações ficam na tela e levam a ação na URL para os diálogos (T05-13 a T05-15)', async ({
  page,
}) => {
  const { u, d } = await preparar(page);
  await entrar(page, u, `/cartoes/${idDo(d.fatos, 'Cartão A')}`);
  for (const [nome, acao] of [
    ['Nova compra', 'nova-compra'],
    ['Pagar fatura', 'pagar'],
    ['Lançar encargo ou estorno', 'encargo'],
    ['Configurar ciclo', 'ciclo'],
  ] as const) {
    await page.getByRole('button', { name: nome, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`[?&]acao=${acao}(&|$)`));
    // Cada diálogo fecha com Esc e tira a ação da URL.
    await expect(page.getByRole('dialog', { name: new RegExp(`^${nome}`) })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page).not.toHaveURL(/[?&]acao=/);
  }
  await page.getByRole('button', { name: 'Operações da compra Fone · 1/3' }).click();
  await expect(page).toHaveURL(/[?&]acao=compra&compra=/);
});
