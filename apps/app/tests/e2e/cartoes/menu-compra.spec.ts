import AxeBuilder from '@axe-core/playwright';
import {
  anteciparParcelas,
  cancelarCompra,
  deMascara,
  type Derivado,
  faturaAberta,
  mais,
  negar,
  operacoesPermitidas,
  somar,
} from '@goose-money/core';
import { expect, type Page, test } from '@playwright/test';

import { formatarMesCurto, formatarMoeda } from '../../../src/app/formatacao';
import { entrar } from '../lancar/apoio';
import { gravadoEmHoje, HOJE, idDo, preparar } from './apoio';

// T05-14: menu de uma compra (3.6, 6.5, 11.3), com "hoje" = 04/11/2026.

test.use({ viewport: { width: 1440, height: 1000 } });

/** A compra do seed, as parcelas dela e a fatura aberta do cartão. */
function daCompra(d: Derivado, descricao: string) {
  const compra = d.fatos.compras.find((c) => c.descricao === descricao);
  const cartao = d.fatos.cartoes.find((c) => c.id === compra?.cartaoId);
  if (!compra || !cartao) throw new Error(`${descricao} não está no seed`);
  const parcelas = d.fatos.parcelas
    .filter((p) => p.compraId === compra.id)
    .sort((a, b) => a.numero - b.numero);
  return { compra, cartao, parcelas, aberta: faturaAberta(cartao, d.fatos.cartaoCiclos, HOJE) };
}

const menu = (page: Page) => page.getByRole('menu');
const item = (page: Page, rotulo: string) =>
  menu(page).getByRole('menuitem', { name: new RegExp(`^${rotulo}`) });

/** Abre a fatura aberta do cartão e o menu da primeira linha da compra. */
async function abrirMenu(page: Page, d: Derivado, descricao: string) {
  const { compra, cartao, parcelas, aberta } = daCompra(d, descricao);
  const naAberta = parcelas.find((p) => p.competencia === aberta);
  const nome =
    compra.numeroParcelas > 1
      ? `${descricao} · ${String(naAberta?.numero)}/${String(compra.numeroParcelas)}`
      : descricao;
  await page.getByRole('button', { name: `Operações da compra ${nome}`, exact: true }).click();
  await expect(menu(page)).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`acao=compra&compra=${compra.id}$`));
  return { compra, cartao, parcelas, aberta };
}

test('parcela em fatura fechada: "Editar valor" desabilitado com motivo; ajuste e cancelar disponíveis; soma = total (11.3)', async ({
  page,
}) => {
  const { u, d } = await preparar(page);
  const a = idDo(d.fatos, 'Cartão A');
  await entrar(page, u, `/cartoes/${a}`);
  const { compra, parcelas, aberta } = await abrirMenu(page, d, 'Notebook');
  const pode = operacoesPermitidas(compra, parcelas, aberta);

  await expect(item(page, 'Editar valor, parcelas, data ou cartão')).toBeDisabled();
  await expect(item(page, 'Editar valor, parcelas, data ou cartão')).toContainText(
    pode.editarValor.motivo ?? '',
  );
  await expect(item(page, 'Excluir compra')).toBeDisabled();
  await expect(item(page, 'Excluir compra')).toContainText(pode.excluir.motivo ?? '');
  for (const r of ['Editar descrição', 'Lançar ajuste', 'Antecipar parcelas', 'Cancelar compra'])
    await expect(item(page, r)).toBeEnabled();
  expect((await new AxeBuilder({ page }).include('[role="menu"]').analyze()).violations).toEqual(
    [],
  );

  // Lançar ajuste: estorno de R$ 50,00 na fatura aberta, com o valor efetivo antes de salvar.
  await item(page, 'Lançar ajuste').click();
  const dialogo = page.getByRole('dialog', { name: 'Lançar ajuste' });
  await expect(dialogo).toContainText(formatarMesCurto(aberta));
  await dialogo.getByRole('textbox', { name: 'Valor' }).pressSequentially('5000');
  const estorno = negar(deMascara('5000'));
  await expect(dialogo.getByRole('definition').nth(1)).toHaveText(
    formatarMoeda(mais(compra.valorTotal, estorno)),
  );
  await dialogo.getByRole('button', { name: 'Lançar ajuste' }).click();
  await expect(page.getByText('Ajuste lançado')).toBeVisible();

  const g = await gravadoEmHoje(u);
  const ajuste = g.fatos.itensFatura.find((i) => i.compraId === compra.id);
  expect(ajuste).toMatchObject({ tipo: 'ajuste_compra', valor: estorno, competencia: aberta });
  const ps = g.fatos.parcelas.filter((p) => p.compraId === compra.id);
  expect(somar(ps.map((p) => p.valor))).toBe(compra.valorTotal);
  expect(ps).toHaveLength(compra.numeroParcelas);
});

test('antecipar 3 parcelas as põe na fatura aberta, como na prévia', async ({ page }) => {
  const { u, d } = await preparar(page);
  await entrar(page, u, `/cartoes/${idDo(d.fatos, 'Cartão A')}`);
  const { compra, parcelas, aberta } = await abrirMenu(page, d, 'Notebook');
  await item(page, 'Antecipar parcelas').click();
  const dialogo = page.getByRole('dialog', { name: 'Antecipar parcelas' });
  await dialogo.getByRole('combobox', { name: 'Quantas parcelas (as últimas)' }).click();
  await page.getByRole('option', { name: '3 parcelas' }).click();

  const esperado = anteciparParcelas(compra, parcelas, 3, aberta);
  const linhas = (ps: typeof esperado.parcelas) =>
    [...ps]
      .sort((x, y) => x.numero - y.numero)
      .map(
        (p) =>
          `${String(p.numero)}/${String(ps.length)} · ${formatarMesCurto(p.competencia)}${formatarMoeda(p.valor)}`,
      );
  await expect(dialogo.getByRole('region', { name: 'Antes' }).getByRole('listitem')).toHaveText(
    linhas(parcelas),
  );
  await expect(dialogo.getByRole('region', { name: 'Depois' }).getByRole('listitem')).toHaveText(
    linhas(esperado.parcelas),
  );
  // A da fatura aberta mais as 3 antecipadas.
  expect(esperado.parcelas.filter((p) => p.competencia === aberta)).toHaveLength(1 + 3);

  await dialogo.getByRole('button', { name: 'Antecipar' }).click();
  await expect(page.getByText('Parcelas antecipadas')).toBeVisible();
  const g = await gravadoEmHoje(u);
  const gravadas = g.fatos.parcelas
    .filter((p) => p.compraId === compra.id)
    .sort((x, y) => x.numero - y.numero)
    .map((p) => [p.numero, p.competencia, p.valor]);
  expect(gravadas).toEqual(esperado.parcelas.map((p) => [p.numero, p.competencia, p.valor]));
});

test('excluir e desfazer devolvem a compra e as parcelas (11.8)', async ({ page }) => {
  const { u, d } = await preparar(page);
  await entrar(page, u, `/cartoes/${idDo(d.fatos, 'Cartão A')}`);
  const { compra, parcelas } = await abrirMenu(page, d, 'Fone');
  await item(page, 'Excluir compra').click();
  const dialogo = page.getByRole('dialog', { name: 'Excluir a compra Fone?' });
  await dialogo.getByRole('button', { name: 'Excluir compra' }).click();
  await expect(page.getByText('Compra excluída')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Operações da compra Fone/ })).toHaveCount(0);
  const g = await gravadoEmHoje(u);
  expect(g.fatos.compras.some((c) => c.id === compra.id)).toBe(false);
  expect(g.fatos.parcelas.some((p) => p.compraId === compra.id)).toBe(false);

  await page.getByRole('button', { name: 'Desfazer' }).click();
  await expect(page.getByText('Desfeito')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Operações da compra Fone/ })).toHaveCount(1);
  const volta = await gravadoEmHoje(u);
  expect(
    volta.fatos.parcelas
      .filter((p) => p.compraId === compra.id)
      .map((p) => p.id)
      .sort(),
  ).toEqual(parcelas.map((p) => p.id).sort());
});

test('"Editar valor" reabre a Nova compra preenchida e regenera as parcelas; "Editar descrição" vale para a compra', async ({
  page,
}) => {
  const { u, d } = await preparar(page);
  await entrar(page, u, `/cartoes/${idDo(d.fatos, 'Cartão A')}`);
  const { compra } = await abrirMenu(page, d, 'Fone');
  await item(page, 'Editar valor, parcelas, data ou cartão').click();
  const dialogo = page.getByRole('dialog', { name: 'Editar compra · Cartão A' });
  await expect(dialogo.getByRole('textbox', { name: 'Valor total' })).toHaveValue(
    formatarMoeda(compra.valorTotal),
  );
  await expect(dialogo.getByRole('radio', { name: '3 parcelas' })).toBeChecked();
  await dialogo.getByRole('radio', { name: '6 parcelas' }).click();
  await expect(dialogo.getByRole('button', { name: 'Salvar e lançar outro' })).toHaveCount(0);
  await dialogo.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByText('Compra alterada')).toBeVisible();
  let g = await gravadoEmHoje(u);
  expect(g.fatos.parcelas.filter((p) => p.compraId === compra.id)).toHaveLength(6);

  await abrirMenu(page, g, 'Fone');
  await item(page, 'Editar descrição').click();
  const editar = page.getByRole('dialog', { name: 'Editar descrição, categoria e observação' });
  await editar.getByRole('textbox', { name: 'Descrição (opcional)' }).fill('Fone sem fio');
  await editar.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByText('Compra alterada')).toBeVisible();
  await expect(
    page.getByRole('button', { name: /^Operações da compra Fone sem fio/ }),
  ).toBeVisible();
  g = await gravadoEmHoje(u);
  expect(g.fatos.compras.find((c) => c.id === compra.id)?.descricao).toBe('Fone sem fio');
});

test('cancelar compra pergunta se o banco estornou e gera o estorno das já faturadas', async ({
  page,
}) => {
  const { u, d } = await preparar(page);
  await entrar(page, u, `/cartoes/${idDo(d.fatos, 'Cartão A')}`);
  const { compra, cartao, parcelas, aberta } = await abrirMenu(page, d, 'Notebook');
  const r = cancelarCompra(compra, parcelas, cartao, aberta, true);
  if (!r.estorno) throw new Error('o Notebook não tem parcela faturada');
  await item(page, 'Cancelar compra').click();
  const dialogo = page.getByRole('dialog', { name: 'Cancelar a compra Notebook?' });
  await dialogo
    .getByRole('radio', {
      name: `Sim: lançar estorno de ${formatarMoeda(negar(r.estorno))} na fatura aberta`,
    })
    .check();
  await dialogo.getByRole('button', { name: 'Cancelar compra' }).click();
  await expect(page.getByText('Compra cancelada')).toBeVisible();
  const g = await gravadoEmHoje(u);
  expect(g.fatos.compras.find((c) => c.id === compra.id)?.cancelada).toBe(true);
  expect(g.fatos.parcelas.filter((p) => p.compraId === compra.id)).toHaveLength(
    parcelas.length - r.remover.length,
  );
  expect(g.fatos.itensFatura.find((i) => i.compraId === compra.id)).toMatchObject({
    tipo: 'estorno',
    valor: r.estorno,
    competencia: aberta,
  });
});
