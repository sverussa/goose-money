import AxeBuilder from '@axe-core/playwright';
import {
  type Centavos,
  criarCartao,
  dataCivil,
  deMascara,
  type Derivado,
  indicadoresDaBarra,
  limiteDisponivelDoCartao,
  menos,
  negar,
  obrigacoesDeCartao,
  obrigacoesDoCartao,
  pagaAntesDoCadastro,
  previaDaCompra,
  somarMeses,
} from '@goose-money/core';
import { expect, type Page, test } from '@playwright/test';

import { formatarMesCurto, formatarMoeda } from '../../../src/app/formatacao';
import { entrar } from '../lancar/apoio';
import { gravadoEmHoje, HOJE, idDo, preparar } from './apoio';

// T05-13: Nova compra à vista ou parcelada (6.5, 3.6, 7.4, 11.3), com "hoje" = 04/11/2026.

test.use({ viewport: { width: 1440, height: 1000 } });

const dialogo = (page: Page, cartao = 'Cartão A') =>
  page.getByRole('dialog', { name: `Nova compra · ${cartao}` });
const previa = (page: Page) =>
  dialogo(page).getByRole('region', { name: 'Em quais faturas cada parcela cai' });
const efeito = (page: Page, rotulo: string) =>
  dialogo(page)
    .getByRole('region', { name: 'O que muda ao salvar' })
    .locator('div')
    .filter({ has: page.getByRole('term').getByText(rotulo, { exact: true }) })
    .getByRole('definition');
const comSinal = (c: Centavos) => (c > 0 ? `+${formatarMoeda(c)}` : formatarMoeda(c));

async function abrir(page: Page, cartaoId: string, cartao = 'Cartão A') {
  await page.getByRole('button', { name: 'Nova compra', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/cartoes/${cartaoId}\\?acao=nova-compra$`));
  await expect(dialogo(page, cartao)).toBeVisible();
}

async function parcelar(page: Page, n: number) {
  await dialogo(page).getByRole('switch', { name: 'Parcelado' }).click();
  await dialogo(page)
    .getByRole('radio', { name: `${String(n)} parcelas`, exact: true })
    .click();
}

const prevista = (d: Derivado, cartaoId: string, valorTotal: Centavos, n: number, data = HOJE) => {
  const cartao = d.fatos.cartoes.find((c) => c.id === cartaoId);
  if (!cartao) throw new Error('sem cartão');
  return {
    cartao,
    ...previaDaCompra(
      { data, valorTotal, numeroParcelas: n },
      cartao,
      d.fatos.cartaoCiclos,
      obrigacoesDoCartao(d.faturas.get(cartaoId) ?? []),
    ),
  };
};

test('R$ 1.000,00 em 3x: 333,34 + 333,33 + 333,33 em faturas seguidas e Limite −R$ 1.000,00 (11.3)', async ({
  page,
}) => {
  const { u, d } = await preparar(page);
  const a = idDo(d.fatos, 'Cartão A');
  const total = deMascara('100000');
  const p = prevista(d, a, total, 3);
  await entrar(page, u, `/cartoes/${a}`);
  await abrir(page, a);

  await dialogo(page).getByRole('textbox', { name: 'Valor total' }).pressSequentially('100000');
  await dialogo(page).getByRole('textbox', { name: 'Descrição (opcional)' }).fill('Bicicleta');
  await parcelar(page, 3);

  // Rateio com o centavo que sobra na 1ª, em faturas consecutivas (3.6).
  const [primeira] = p.parcelas;
  if (!primeira) throw new Error('sem parcelas');
  const valores = ['33334', '33333', '33333'].map(deMascara);
  await expect(previa(page).getByRole('listitem')).toHaveText(
    valores.map(
      (v, k) =>
        `${String(k + 1)}/3 · fatura de ${formatarMesCurto(somarMeses(primeira.competencia, k))}${formatarMoeda(v)}`,
    ),
  );
  expect(p.parcelas.map((x) => x.valor)).toEqual(valores);

  const antes = limiteDisponivelDoCartao(d, a);
  await expect(efeito(page, 'Limite disponível do Cartão A')).toHaveText(
    `${formatarMoeda(antes)} → ${formatarMoeda(menos(antes, total))}`,
  );
  expect((await new AxeBuilder({ page }).include('[role="dialog"]').analyze()).violations).toEqual(
    [],
  );

  await dialogo(page).getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialogo(page)).toBeHidden();
  await expect(page.getByText('Compra lançada')).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/cartoes/${a}$`));
  await expect(
    page.getByRole('region', { name: 'Totais da fatura' }).getByRole('definition').nth(2),
  ).toHaveText(formatarMoeda(menos(antes, total)));
  const g = await gravadoEmHoje(u);
  const compra = g.fatos.compras.find((c) => c.descricao === 'Bicicleta');
  expect(g.fatos.parcelas.filter((x) => x.compraId === compra?.id).map((x) => x.valor)).toEqual(
    valores,
  );
});

test('R$ 1.200,00 em 12x: Patrimônio −R$ 1.200,00, Obrigações +R$ 1.200,00, A pagar +R$ 100,00 (11.3, 7.4)', async ({
  page,
}) => {
  const { u, d } = await preparar(page);
  const a = idDo(d.fatos, 'Cartão A');
  const total = deMascara('120000');
  const parcela = deMascara('10000');
  await entrar(page, u, `/cartoes/${a}`);
  await abrir(page, a);
  await dialogo(page).getByRole('textbox', { name: 'Valor total' }).pressSequentially('120000');
  await parcelar(page, 12);

  await expect(previa(page).getByRole('listitem')).toHaveCount(12);
  await expect(previa(page)).toContainText(
    `12 × ${formatarMoeda(parcela)} = ${formatarMoeda(total)}.`,
  );
  await expect(efeito(page, 'Patrimônio líquido')).toHaveText(formatarMoeda(negar(total)));
  await expect(efeito(page, 'Obrigações de cartão')).toHaveText(comSinal(total));
  // Só a parcela da fatura aberta entra em A pagar.
  await expect(efeito(page, 'A pagar nos cartões')).toHaveText(comSinal(parcela));

  const barraAntes = indicadoresDaBarra(d);
  await dialogo(page).getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByText('Compra lançada')).toBeVisible();
  const g = await gravadoEmHoje(u);
  const barra = indicadoresDaBarra(g);
  expect(menos(barra.patrimonioLiquido, barraAntes.patrimonioLiquido)).toBe(negar(total));
  expect(menos(barra.aPagarNosCartoes, barraAntes.aPagarNosCartoes)).toBe(parcela);
  expect(menos(obrigacoesDeCartao(g), obrigacoesDeCartao(d))).toBe(total);
});

test('"Valor da parcela" de R$ 420,00 em 10x grava o total de R$ 4.200,00', async ({ page }) => {
  const { u, d } = await preparar(page);
  const a = idDo(d.fatos, 'Cartão A');
  const parcela = deMascara('42000');
  const total = deMascara('420000');
  await entrar(page, u, `/cartoes/${a}`);
  await abrir(page, a);
  await dialogo(page).getByRole('switch', { name: 'Parcelado' }).click();
  await dialogo(page).getByRole('radio', { name: 'Valor da parcela' }).click();
  await dialogo(page).getByRole('textbox', { name: 'Valor da parcela' }).pressSequentially('42000');
  await dialogo(page).getByRole('radio', { name: '10 parcelas', exact: true }).click();
  await dialogo(page).getByRole('textbox', { name: 'Descrição (opcional)' }).fill('Sofá');

  await expect(previa(page)).toContainText(
    `10 × ${formatarMoeda(parcela)} = ${formatarMoeda(total)}.`,
  );
  await dialogo(page).getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByText('Compra lançada')).toBeVisible();
  const compra = (await gravadoEmHoje(u)).fatos.compras.find((c) => c.descricao === 'Sofá');
  expect(compra?.valorTotal).toBe(total);
  expect(compra?.numeroParcelas).toBe(10);
});

test('Desfazer remove a compra e todas as parcelas; "Salvar e lançar outro" mantém o diálogo', async ({
  page,
}) => {
  const { u, d } = await preparar(page);
  const a = idDo(d.fatos, 'Cartão A');
  await entrar(page, u, `/cartoes/${a}`);
  await abrir(page, a);
  await dialogo(page).getByRole('textbox', { name: 'Valor total' }).pressSequentially('60000');
  await dialogo(page)
    .getByRole('textbox', { name: 'Descrição (opcional)' })
    .fill('Mochila de trilha');
  await parcelar(page, 6);
  await dialogo(page).getByRole('button', { name: 'Salvar e lançar outro' }).click();
  await expect(page.getByText('Compra lançada')).toBeVisible();
  // O diálogo volta vazio, pronto para a próxima compra.
  await expect(dialogo(page).getByRole('textbox', { name: 'Valor total' })).toHaveValue('');
  await expect(dialogo(page).getByRole('textbox', { name: 'Valor total' })).toBeFocused();

  const gravado = await gravadoEmHoje(u);
  const compra = gravado.fatos.compras.find((c) => c.descricao === 'Mochila de trilha');
  expect(gravado.fatos.parcelas.filter((x) => x.compraId === compra?.id)).toHaveLength(6);

  await dialogo(page).getByRole('button', { name: 'Cancelar' }).click();
  await page.getByRole('button', { name: 'Desfazer' }).click();
  await expect(page.getByText('Desfeito')).toBeVisible();
  const depois = await gravadoEmHoje(u);
  expect(depois.fatos.compras.some((c) => c.id === compra?.id)).toBe(false);
  expect(depois.fatos.parcelas.some((x) => x.compraId === compra?.id)).toBe(false);
});

test('compra anterior ao cadastro do cartão: parcelas antes da 1ª fatura controlada são "Paga antes do cadastro" (3.5)', async ({
  page,
}) => {
  const { u, d } = await preparar(page, (f, ctx) => [
    criarCartao(f, ctx, {
      nome: 'Cartão C',
      instituicao: null,
      cor: 'categorica-2',
      limite: deMascara('500000'),
      contaPagamentoId: f.cartoes[0]?.contaPagamentoId ?? '',
      diaFechamento: 10,
      diaVencimento: 20,
      saldoFaturaFechada: deMascara('0'),
    }),
  ]);
  const c = idDo(d.fatos, 'Cartão C');
  const data = dataCivil('2026-06-15');
  const p = prevista(d, c, deMascara('120000'), 12, data);
  const antes = p.parcelas.filter((x) => pagaAntesDoCadastro(p.cartao, x)).length;
  expect(antes).toBeGreaterThan(0);

  await entrar(page, u, `/cartoes/${c}`);
  await abrir(page, c, 'Cartão C');
  await dialogo(page, 'Cartão C')
    .getByRole('textbox', { name: 'Valor total' })
    .pressSequentially('120000');
  await dialogo(page, 'Cartão C').getByLabel('Data da compra').fill(data);
  await dialogo(page, 'Cartão C').getByRole('switch', { name: 'Parcelado' }).click();
  await dialogo(page, 'Cartão C').getByRole('radio', { name: '12 parcelas', exact: true }).click();
  await expect(
    dialogo(page, 'Cartão C').getByRole('listitem').filter({ hasText: 'Paga antes do cadastro' }),
  ).toHaveCount(antes);
  // Só as parcelas controladas reduzem o limite.
  await expect(
    dialogo(page, 'Cartão C')
      .getByRole('region', { name: 'O que muda ao salvar' })
      .locator('div')
      .filter({ has: page.getByRole('term').getByText('Limite disponível do Cartão C') })
      .getByRole('definition'),
  ).toHaveText(
    `${formatarMoeda(limiteDisponivelDoCartao(d, c))} → ${formatarMoeda(p.limiteDisponivel)}`,
  );
});
