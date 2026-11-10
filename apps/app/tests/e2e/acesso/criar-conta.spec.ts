import { randomUUID } from 'node:crypto';

import AxeBuilder from '@axe-core/playwright';
import { categoriasIniciais } from '@goose-money/core';
import { expect, type Page, test } from '@playwright/test';

import { mensagensPainel } from '../../../src/features/painel/mensagens';
import { criarUsuario, emailUnico, sqlComoPostgres } from '../../../../../supabase/tests/apoio';

// T05-30: criar conta, confirmar pelo e-mail (Mailpit local) e entrar no primeiro uso (6.1, 11.1).
const MAILPIT = 'http://127.0.0.1:54324';
const NEUTRA = 'Se o e-mail puder ser cadastrado, você vai receber um link de confirmação';

/** O link do e-mail mais recente para `email` (como em `redefinir-senha.spec.ts`). */
async function linkDoEmail(email: string): Promise<string> {
  for (let tentativa = 0; tentativa < 40; tentativa++) {
    const r = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
    const { messages } = (await r.json()) as { messages: { ID: string }[] };
    const [primeira] = messages;
    if (primeira) {
      const m = (await (await fetch(`${MAILPIT}/api/v1/message/${primeira.ID}`)).json()) as {
        HTML: string;
      };
      const href = /href="([^"]*\/auth\/v1\/verify[^"]*)"/.exec(m.HTML)?.[1];
      if (!href) throw new Error('E-mail sem link de verificação');
      return href.replaceAll('&amp;', '&');
    }
    await new Promise((ok) => setTimeout(ok, 250));
  }
  throw new Error(`Nenhum e-mail para ${email}`);
}

async function preencher(page: Page, email: string, senha: string, confirmar = senha) {
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(senha);
  await page.getByLabel('Confirmar senha').fill(confirmar);
  await page.getByRole('button', { name: 'Criar conta' }).click();
}

/** Conta as chamadas ao cadastro do Supabase Auth. */
function contarCadastros(page: Page) {
  const chamadas = { n: 0 };
  void page.route('**/auth/v1/signup**', (rota) => {
    chamadas.n++;
    return rota.continue();
  });
  return chamadas;
}

test('criar, confirmar pelo e-mail e entrar no primeiro uso (11.1)', async ({
  page,
  context,
  browser,
}) => {
  const email = emailUnico('cadastro');
  const senha = randomUUID();
  await page.goto('/#/login');
  await page.getByRole('link', { name: 'Criar conta' }).click();
  await expect(page).toHaveURL(/#\/criar-conta$/);
  await preencher(page, email, senha);
  await expect(page.getByRole('status')).toHaveText(NEUTRA);

  // Antes de confirmar, o login é recusado.
  await page.getByRole('link', { name: 'Voltar para o login' }).click();
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(senha);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('alert')).toHaveText('Confirme seu e-mail para entrar');

  // O link do e-mail costuma abrir numa aba nova.
  const link = await linkDoEmail(email);
  const aba = await context.newPage();
  await aba.goto(link);
  await expect(aba).toHaveURL(/#\/$/);
  await expect(aba.getByText(mensagensPainel.semContas)).toBeVisible();
  await expect(aba.getByRole('link', { name: mensagensPainel.cadastrarConta })).toBeVisible();

  // `inicializar_usuario()` criou as categorias iniciais do core.
  const gravadas = await sqlComoPostgres<{ nome: string; sistema: string | null }[]>`
    select c.nome, c.sistema from categorias c join auth.users u on u.id = c.created_by
    where u.email = ${email} and not c.is_deleted`;
  const esperadas = categoriasIniciais({ agora: '', usuario: '', novoId: randomUUID });
  const chave = (c: { nome: string; sistema: string | null }) => `${c.nome}|${c.sistema ?? ''}`;
  expect(gravadas.map(chave).sort()).toEqual(esperadas.map(chave).sort());
  expect(gravadas.some((c) => c.sistema === 'a_classificar')).toBe(true);

  // O mesmo link de novo, numa aba sem sessão: já usado.
  const semSessao = await browser.newContext();
  const outra = await semSessao.newPage();
  await outra.goto(link);
  await expect(outra.getByRole('alert')).toContainText('Link inválido ou expirado');
  await outra.getByRole('link', { name: 'Voltar ao login' }).click();
  await expect(outra).toHaveURL(/#\/login$/);
  await semSessao.close();
});

test('e-mail já cadastrado: mesma mensagem neutra e fica fora do app', async ({ page }) => {
  const u = await criarUsuario();
  await page.goto('/#/criar-conta');
  // Segura a resposta para ver "Salvando…".
  let liberar: () => void = () => undefined;
  const espera = new Promise<void>((ok) => (liberar = ok));
  await page.route('**/auth/v1/signup**', async (rota) => {
    await espera;
    await rota.continue();
  });
  await preencher(page, u.email, randomUUID());
  await expect(page.getByRole('button', { name: 'Salvando…' })).toBeDisabled();
  liberar();
  await expect(page.getByRole('status')).toHaveText(NEUTRA);
  await expect(page).toHaveURL(/#\/criar-conta$/);
  await expect(page.getByRole('button', { name: 'Sair' })).toHaveCount(0);
});

test('senha curta, confirmação diferente e e-mail inválido não chamam o Supabase', async ({
  page,
}) => {
  const chamadas = contarCadastros(page);
  await page.goto('/#/criar-conta');
  const email = emailUnico('cadastro');

  await preencher(page, email, '1234567');
  const senha = page.getByLabel('Senha', { exact: true });
  await expect(page.getByRole('alert')).toHaveText('A senha precisa ter pelo menos 8 caracteres');
  await expect(senha).toHaveAttribute('aria-invalid', 'true');
  await expect(senha).toHaveAccessibleDescription('A senha precisa ter pelo menos 8 caracteres');

  await preencher(page, email, '12345678', '12345679');
  await expect(page.getByRole('alert')).toHaveText('As senhas não são iguais');
  await expect(page.getByLabel('Confirmar senha')).toHaveAccessibleDescription(
    'As senhas não são iguais',
  );

  await preencher(page, 'sem-arroba', '12345678');
  await expect(page.getByRole('alert')).toHaveText('Informe um e-mail válido');
  await expect(page.getByLabel('E-mail')).toHaveAttribute('aria-invalid', 'true');

  expect(chamadas.n).toBe(0);
  await expect(page.getByRole('status')).toHaveCount(0);
});

test('sem rede, mostra "Sem conexão para criar a conta"', async ({ page, context }) => {
  await page.goto('/#/criar-conta');
  await context.setOffline(true);
  await preencher(page, emailUnico('cadastro'), randomUUID());
  await expect(page.getByRole('alert')).toHaveText('Sem conexão para criar a conta');
  await context.setOffline(false);
});

test('sem link, #/confirmar mostra "Link inválido ou expirado"', async ({ page }) => {
  await page.goto('/#/confirmar');
  await expect(page.getByRole('alert')).toContainText('Link inválido ou expirado');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('tudo pelo teclado e axe sem violações', async ({ page, browserName }) => {
  // No Safari, Tab só passa pelos campos de texto; Option+Tab passa por tudo.
  const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
  await page.goto('/#/login');
  await page.getByRole('button', { name: 'Entrar' }).focus();
  await page.keyboard.press(tab);
  await expect(page.getByRole('link', { name: 'Criar conta' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/criar-conta$/);
  await expect(page.getByLabel('E-mail')).toBeFocused();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await page.keyboard.type(emailUnico('cadastro'));
  await page.keyboard.press(tab);
  await expect(page.getByLabel('Senha', { exact: true })).toBeFocused();
  await page.keyboard.type('curta');
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Senha', { exact: true })).toHaveAccessibleDescription(
    'A senha precisa ter pelo menos 8 caracteres',
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  const senha = randomUUID();
  await page.getByLabel('Senha', { exact: true }).fill(senha);
  await page.keyboard.press(tab);
  await expect(page.getByRole('button', { name: 'Mostrar senha' })).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.getByLabel('Senha', { exact: true })).toHaveAttribute('type', 'text');
  await page.keyboard.press(tab);
  await expect(page.getByLabel('Confirmar senha')).toBeFocused();
  await page.keyboard.type(senha);
  await page.keyboard.press(tab);
  await expect(page.getByRole('button', { name: 'Criar conta' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText(NEUTRA);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press(tab);
  await expect(page.getByRole('link', { name: 'Voltar para o login' })).toBeFocused();
});
