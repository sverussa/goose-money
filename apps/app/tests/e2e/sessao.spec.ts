import { expect, type Page, test } from '@playwright/test';

import { criarUsuario, sqlComoPostgres, type Usuario } from '../../../../supabase/tests/apoio';

// T03-01: usuários criados pelos utilitários dos testes de banco; o app só usa a chave anon.

async function entrarPelaTela(page: Page, u: Usuario, manter = false) {
  await page.getByLabel('E-mail').fill(u.email);
  await page.getByLabel('Senha', { exact: true }).fill(u.senha);
  if (manter) await page.getByLabel('Manter conectado').check();
  await page.getByRole('button', { name: 'Entrar' }).click();
}

test('rota protegida sem sessão vai para o login e volta à rota pedida (11.1)', async ({
  page,
}) => {
  const u = await criarUsuario();
  await page.goto('/#/contas');
  await expect(page).toHaveURL(/#\/login\?voltar=%2Fcontas$/);

  await entrarPelaTela(page, u);
  await expect(page).toHaveURL(/#\/contas$/);
  await expect(page.getByText(u.email)).toBeVisible();

  // Antes de liberar a tela, o app preparou o usuário (T02-08).
  const [{ n }] = await sqlComoPostgres<[{ n: number }]>`
    select count(*)::int as n from categorias where created_by = ${u.id} and sistema is not null`;
  expect(n).toBe(4);
});

test('credencial errada mostra erro inline', async ({ page }) => {
  const u = await criarUsuario();
  await page.goto('/#/login');
  await entrarPelaTela(page, { ...u, senha: 'senha-errada' });
  await expect(page.getByRole('alert')).toHaveText('E-mail ou senha inválidos');
});

test('sair encerra a sessão e leva ao login', async ({ page }) => {
  const u = await criarUsuario();
  await page.goto('/#/login');
  await entrarPelaTela(page, u, true);
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/#\/login$/);

  const sessoes = await page.evaluate(() =>
    [...Object.keys(localStorage), ...Object.keys(sessionStorage)].filter((k) =>
      k.endsWith('-auth-token'),
    ),
  );
  expect(sessoes).toEqual([]);
  await page.goto('/#/contas');
  await expect(page).toHaveURL(/#\/login\?voltar=%2Fcontas$/);
});

// Uma aba nova tem sessionStorage vazio, como o navegador reaberto; o localStorage continua.
for (const manter of [false, true]) {
  test(`${manter ? 'com' : 'sem'} "Manter conectado", reabrir ${manter ? 'continua conectado' : 'pede login'}`, async ({
    page,
    context,
  }) => {
    const u = await criarUsuario();
    await page.goto('/#/login');
    await entrarPelaTela(page, u, manter);
    await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();

    const nova = await context.newPage();
    await nova.goto('/#/contas');
    if (manter) await expect(nova.getByText(u.email)).toBeVisible();
    else await expect(nova).toHaveURL(/#\/login\?voltar=%2Fcontas$/);
  });
}
