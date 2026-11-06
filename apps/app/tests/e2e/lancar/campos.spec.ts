import { deMascara, somarDias, sugestoesDeLancamento } from '@goose-money/core';
import { expect, test } from '@playwright/test';

import { gravarOk, hojeEmBrasilia, inserir } from '../../../../../supabase/tests/apoio';
import { barraNoBanco, campoValor, comSeed, derivadoNoBanco, dialogo, entrar, fab } from './apoio';

// T05-04: campos inteligentes e "Mais opções" (3.1, 3.4, 7.3).

test.use({ viewport: { width: 1440, height: 900 } });

const grade = (page: Parameters<typeof dialogo>[0]) =>
  dialogo(page).getByRole('group', { name: 'Categoria' });

test('a descrição "Mercado" sugerida preenche a categoria do último "Mercado"', async ({
  page,
}) => {
  const u = await comSeed();
  const { fatos } = await derivadoNoBanco(u);
  const categoria = (nome: string) => fatos.categorias.find((c) => c.nome === nome);
  const conta = fatos.contas.find((c) => c.nome === 'Conta corrente');
  const mercado = (dias: number, nome: string) =>
    inserir('lancamentos', {
      tipo: 'despesa',
      status: 'efetivado',
      data: somarDias(hojeEmBrasilia(), dias),
      valor: 5000,
      descricao: 'Mercado',
      conta_id: conta?.id,
      categoria_id: categoria(nome)?.id,
    });
  await gravarOk(u.cliente, [mercado(-10, 'Lazer'), mercado(-2, 'Alimentação')]);
  await entrar(page, u);

  await fab(page).click();
  const descricao = dialogo(page).getByRole('combobox', { name: 'Descrição (opcional)' });
  await descricao.fill('Merc');
  await dialogo(page)
    .getByRole('option', { name: /^Mercado/ })
    .click();
  await expect(descricao).toHaveValue('Mercado');
  await expect(
    grade(page).getByRole('button', { name: 'Alimentação', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
});

test('a grade mostra as 8 categorias mais usadas do tipo', async ({ page }) => {
  const u = await comSeed();
  const { fatos } = await derivadoNoBanco(u);
  const nome = (id: string) => fatos.categorias.find((c) => c.id === id)?.nome ?? '';
  const esperadas = sugestoesDeLancamento(fatos, 'despesa').maisUsadas.map(nome);
  expect(esperadas).toHaveLength(8);
  await entrar(page, u);
  await fab(page).click();

  for (const n of esperadas)
    await expect(grade(page).getByRole('button', { name: n, exact: true })).toBeVisible();
  // As 8 mais a escolhida ("A classificar", fora delas) e "Ver todas".
  await expect(grade(page).getByRole('button')).toHaveCount(
    esperadas.includes('A classificar') ? 9 : 10,
  );

  await grade(page).getByRole('button', { name: 'Ver todas' }).click();
  await page.getByRole('combobox', { name: 'Buscar categoria' }).fill('Saú');
  await page.getByRole('option', { name: 'Saúde e bem-estar' }).click();
  await expect(
    grade(page).getByRole('button', { name: 'Saúde e bem-estar', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
});

test('lançamento previsto não altera nenhum saldo nem o Resultado (3.1)', async ({ page }) => {
  const u = await comSeed();
  await entrar(page, u);
  const antes = await barraNoBanco(u);

  await fab(page).click();
  await page.keyboard.type('70000');
  await dialogo(page).getByLabel('Data').fill(somarDias(hojeEmBrasilia(), 1));
  await dialogo(page).getByRole('button', { name: 'Mais opções: previsto e observação' }).click();
  await dialogo(page).getByRole('switch', { name: 'Previsto: ainda vai acontecer' }).click();
  await dialogo(page).getByLabel('Observação (opcional)').fill('Conserto do carro');
  await dialogo(page).getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialogo(page)).toBeHidden();

  const depois = await barraNoBanco(u);
  expect(depois.saldoEmContas).toBe(antes.saldoEmContas);
  expect(depois.resultadoDoMes).toBe(antes.resultadoDoMes);
  expect(depois.patrimonioLiquido).toBe(antes.patrimonioLiquido);
  const { fatos } = await derivadoNoBanco(u);
  expect(fatos.lancamentos.find((l) => l.observacao === 'Conserto do carro')).toMatchObject({
    status: 'previsto',
    valor: deMascara('70000'),
  });
});

test('data anterior ao saldo inicial mostra o aviso e, por padrão, grava fora do saldo (3.4)', async ({
  page,
}) => {
  const u = await comSeed();
  const conta = (await derivadoNoBanco(u)).fatos.contas.find((c) => c.nome === 'Conta corrente');
  await entrar(page, u);
  const antes = await barraNoBanco(u);

  await fab(page).click();
  await page.keyboard.type('12345');
  await dialogo(page)
    .getByLabel('Data')
    .fill(conta?.dataSaldoInicial ?? '');
  await expect(dialogo(page).getByRole('note')).toContainText('anterior ao saldo inicial');
  await expect(dialogo(page).getByRole('radio', { name: 'Manter fora do saldo' })).toBeChecked();
  await campoValor(page).press('Enter');
  await expect(dialogo(page)).toBeHidden();

  const depois = await barraNoBanco(u);
  expect(depois.saldoEmContas).toBe(antes.saldoEmContas);
  const { fatos } = await derivadoNoBanco(u);
  expect(fatos.contas.find((c) => c.id === conta?.id)?.dataSaldoInicial).toBe(
    conta?.dataSaldoInicial,
  );
  expect(
    fatos.lancamentos.some(
      (l) => l.valor === deMascara('12345') && l.data === conta?.dataSaldoInicial,
    ),
  ).toBe(true);
});

test('Hoje e Ontem trocam a data', async ({ page }) => {
  await entrar(page, await comSeed());
  await fab(page).click();
  const data = dialogo(page).getByLabel('Data');
  await expect(data).toHaveValue(hojeEmBrasilia());
  await dialogo(page).getByRole('button', { name: 'Ontem' }).click();
  await expect(data).toHaveValue(somarDias(hojeEmBrasilia(), -1));
  await expect(dialogo(page).getByRole('button', { name: 'Ontem' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});
