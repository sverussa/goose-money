import { expect, type Page, test } from '@playwright/test';

import { criarUsuario } from '../../../../supabase/tests/apoio';

// T03-08: "Esqueci a senha" de ponta a ponta no navegador, lendo o e-mail no Mailpit local.
const MAILPIT = 'http://127.0.0.1:54324';

interface Busca {
  messages: { ID: string }[];
}

/** O link do e-mail de redefinição mais recente para `email`. */
async function linkDoEmail(email: string): Promise<string> {
  for (let tentativa = 0; tentativa < 40; tentativa++) {
    const r = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
    const { messages } = (await r.json()) as Busca;
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

async function entrar(page: Page, email: string, senha: string) {
  await page.goto('/#/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(senha);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

test('pedir, seguir o link, definir a senha nova e entrar com ela', async ({ page, context }) => {
  const u = await criarUsuario();
  await page.goto('/#/login');
  await page.getByRole('link', { name: 'Esqueci a senha' }).click();
  // O link abre um diálogo sobre o login (T05-01), que também tem "E-mail".
  const dialogo = page.getByRole('dialog', { name: 'Esqueci a senha' });
  await dialogo.getByLabel('E-mail').fill(u.email);
  await dialogo.getByRole('button', { name: 'Enviar link' }).click();
  await expect(dialogo.getByRole('status')).toHaveText(
    'Se o e-mail estiver cadastrado, você vai receber um link para criar uma senha nova.',
  );

  // O link costuma abrir numa aba nova, sem o sessionStorage da que pediu.
  const link = await linkDoEmail(u.email);
  const aba = await context.newPage();
  await aba.goto(link);
  await expect(aba).toHaveURL(/#\/redefinir-senha$/);
  const nova = `nova-${u.senha}`;
  await aba.getByLabel('Nova senha', { exact: true }).fill(nova);
  await aba.getByLabel('Confirmar nova senha').fill('diferente');
  await aba.getByRole('button', { name: 'Salvar senha' }).click();
  await expect(aba.getByRole('alert')).toHaveText('As senhas não são iguais');
  await aba.getByLabel('Confirmar nova senha').fill(nova);
  await aba.getByRole('button', { name: 'Salvar senha' }).click();
  await expect(aba).toHaveURL(/#\/login$/);
  await expect(aba.getByText('Senha alterada. Entre com a senha nova.')).toBeVisible();

  // A senha antiga não entra mais; a nova entra.
  await entrar(aba, u.email, u.senha);
  await expect(aba.getByRole('alert')).toHaveText('E-mail ou senha inválidos');
  await entrar(aba, u.email, nova);
  await expect(aba.getByRole('button', { name: 'Sair' })).toBeVisible();

  // O mesmo link de novo: já usado.
  await aba.getByRole('button', { name: 'Sair' }).click();
  await aba.goto(link);
  await expect(aba.getByRole('alert')).toContainText('Link inválido ou expirado');
  await aba.getByRole('link', { name: 'Pedir novo link' }).click();
  await expect(aba).toHaveURL(/#\/esqueci-senha$/);
});

test('sem link, a tela de nova senha mostra "Link inválido ou expirado"', async ({ page }) => {
  await page.goto('/#/redefinir-senha');
  await expect(page.getByRole('alert')).toContainText('Link inválido ou expirado');
  await expect(page.getByRole('link', { name: 'Pedir novo link' })).toBeVisible();
});
