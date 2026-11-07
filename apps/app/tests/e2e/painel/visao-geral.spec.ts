import AxeBuilder from '@axe-core/playwright';
import {
  type Centavos,
  competencia,
  type Contexto,
  criarRecorrencia,
  dataCivil,
  deMascara,
  type Fatos,
  lancar,
  pendencias,
  podeConfirmarTodos,
  taxaDePoupanca,
  periodoPreset,
  derivar,
  badges,
  indicadoresDaBarra,
} from '@goose-money/core';
import { expect, type Page, test } from '@playwright/test';

import { formatarMoeda, formatarPercentual } from '../../../src/app/formatacao';
import { entrar } from '../lancar/apoio';
import { gravadoEmHoje, HOJE, preparar, semSeed } from './apoio';

// T05-16: Painel › Visão geral, pendências e KPIs (6.2, 3.10, 11.7), com "hoje" = 04/11/2026.

test.use({ viewport: { width: 1440, height: 1000 } });

const categoria = (f: Fatos, nome: string) => f.categorias.find((c) => c.nome === nome)?.id ?? '';
const avulso = (
  f: Fatos,
  ctx: Contexto,
  contaId: string,
  tipo: 'receita' | 'despesa',
  valor: Centavos,
  data: string,
) =>
  lancar(f, ctx, {
    tipo,
    status: 'efetivado',
    data: dataCivil(data),
    valor,
    descricao: null,
    observacao: null,
    contaId,
    contaDestinoId: null,
    categoriaId: categoria(f, tipo === 'receita' ? 'Renda' : 'Lazer'),
    cartaoId: null,
    faturaCompetencia: null,
    dividaId: null,
    parcelaDividaId: null,
  });

const kpi = (page: Page, rotulo: string) =>
  page
    .getByRole('region', { name: 'Indicadores do período' })
    .locator('[data-slot="card"]')
    .filter({ has: page.getByRole('heading', { name: rotulo, exact: true }) });
const periodo = (page: Page, nome: string) =>
  page.getByRole('group', { name: 'Período' }).getByRole('button', { name: nome, exact: true });

test('anterior zero e atual R$ 500,00: Variação "Novo"; período sem receitas: Taxa de poupança "—" (11.7)', async ({
  page,
}) => {
  const receita = deMascara('50000');
  const despesa = deMascara('10000');
  const { u, f } = await semSeed(page, (fatos, ctx, conta) => {
    const r = avulso(fatos, ctx, conta, 'receita', receita, '2026-11-02');
    return [r, avulso(fatos, ctx, conta, 'despesa', despesa, '2026-11-03')];
  });
  await entrar(page, u, '/');
  await expect(page.getByRole('tablist', { name: 'Abas do Painel' })).toBeVisible();
  // Sem pendências, o card não aparece.
  await expect(page.getByRole('heading', { name: /^Pendências/ })).toHaveCount(0);

  await periodo(page, 'Este mês').click();
  await expect(kpi(page, 'Receitas')).toContainText(`+${formatarMoeda(receita)}`);
  await expect(kpi(page, 'Receitas')).toContainText('Novo');
  await expect(kpi(page, 'Despesas')).toContainText('Novo');
  const d = derivar(f, HOJE);
  await expect(kpi(page, 'Taxa de poupança')).toContainText(
    formatarPercentual(taxaDePoupanca(d, periodoPreset('este-mes', HOJE))),
  );
  expect((await new AxeBuilder({ page }).include('main').analyze()).violations).toEqual([]);

  // Outubro: nem receitas nem despesas; nada de NaN nem Infinity.
  await periodo(page, 'Mês passado').click();
  await expect(kpi(page, 'Taxa de poupança').getByRole('paragraph')).toHaveText('—');
  await expect(kpi(page, 'Receitas')).toContainText('—');
  await expect(page.getByRole('main')).not.toContainText(/NaN|Infinity/);
});

test('pendências do seed com ação direta; "Pagar fatura" abre o diálogo da fatura', async ({
  page,
}) => {
  const { u, d } = await preparar(page);
  const lista = pendencias(d);
  await entrar(page, u, '/');
  await expect(
    page.getByRole('heading', { name: `Pendências · ${String(lista.length)}` }),
  ).toBeVisible();
  const fatura = lista.find((p) => p.tipo === 'fatura');
  if (fatura?.tipo !== 'fatura') throw new Error('o seed não tem fatura pendente');
  await page
    .getByRole('link', { name: new RegExp(`^Pagar fatura: Fatura ${fatura.texto}`) })
    .click();
  await expect(page).toHaveURL(new RegExp(`/cartoes/${fatura.cartaoId}\\?acao=pagar$`));
  await expect(page.getByRole('dialog', { name: 'Pagar fatura' })).toBeVisible();
});

test('confirmar a renda atrasada pela pendência atualiza a Barra e o badge de Rendas', async ({
  page,
}) => {
  const valor = deMascara('80000');
  const { u, d } = await preparar(page, (f, ctx) => [
    criarRecorrencia(
      f,
      ctx,
      {
        natureza: 'renda',
        descricao: 'Freela',
        competenciaInicio: competencia('2026-11'),
        competenciaFim: null,
        autoConfirmar: false,
      },
      {
        valor,
        dia: 2,
        formaPagamento: 'conta',
        contaId: f.contas[0]?.id ?? '',
        cartaoId: null,
        categoriaId: categoria(f, 'Renda'),
      },
    ),
  ]);
  const fixos = podeConfirmarTodos(pendencias(d), HOJE);
  expect(fixos.some((p) => p.texto === 'Freela')).toBe(true);
  await entrar(page, u, '/');
  const menu = page.getByRole('navigation', { name: 'Menu principal' });
  await expect(menu.getByRole('link', { name: /^Rendas fixas/ })).toContainText(
    String(badges(d).rendasFixas),
  );
  await expect(page.getByText('Freela · renda fixa')).toBeVisible();

  await page.getByRole('button', { name: 'Confirmar todos os fixos' }).click();
  await expect(
    page.getByText(
      `${String(fixos.length)} ${fixos.length === 1 ? 'fixo confirmado' : 'fixos confirmados'}`,
    ),
  ).toBeVisible();
  await expect(page.getByText('Freela · renda fixa')).toHaveCount(0);

  const g = await gravadoEmHoje(u);
  expect(badges(g).rendasFixas).toBe(badges(d).rendasFixas - 1);
  await expect(page.getByRole('link', { name: /^Saldo em contas/ })).toContainText(
    formatarMoeda(indicadoresDaBarra(g).saldoEmContas),
  );
  expect(indicadoresDaBarra(g).saldoEmContas).not.toBe(indicadoresDaBarra(d).saldoEmContas);
  if (badges(g).rendasFixas === 0)
    await expect(menu.getByRole('link', { name: /^Rendas fixas/ })).not.toContainText(/\d/);
});
