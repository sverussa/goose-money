import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { criarUsuario } from '../../../../../supabase/tests/apoio';

// T05-01: tela de login (6.1, 11.1).

test('usuário válido entra e volta à rota pedida (11.1)', async ({ page }) => {
  const u = await criarUsuario();
  await page.goto('/#/contas');
  await expect(page).toHaveURL(/#\/login\?voltar=%2Fcontas$/);
  // Foco inicial no e-mail; Enter envia.
  await expect(page.getByLabel('E-mail')).toBeFocused();
  await page.keyboard.type(u.email);
  await page.getByLabel('Senha', { exact: true }).fill(u.senha);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/contas$/);
});

test('credencial errada mostra o erro inline e não limpa o e-mail (11.1)', async ({ page }) => {
  const u = await criarUsuario();
  await page.goto('/#/login');
  await page.getByLabel('E-mail').fill(u.email);
  const senha = page.getByLabel('Senha', { exact: true });
  await senha.fill('senha-errada');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('alert')).toHaveText('E-mail ou senha inválidos');
  await expect(senha).toHaveAttribute('aria-invalid', 'true');
  await expect(senha).toHaveAccessibleDescription('E-mail ou senha inválidos');
  await expect(page.getByLabel('E-mail')).toHaveValue(u.email);
});

test('sem rede, mostra "Sem conexão para entrar"', async ({ page, context }) => {
  const u = await criarUsuario();
  await page.goto('/#/login');
  await page.getByLabel('E-mail').fill(u.email);
  await page.getByLabel('Senha', { exact: true }).fill(u.senha);
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('alert')).toHaveText('Sem conexão para entrar');
  await context.setOffline(false);
});

test('mostrar e ocultar a senha', async ({ page }) => {
  await page.goto('/#/login');
  const senha = page.getByLabel('Senha', { exact: true });
  await expect(senha).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Mostrar senha' }).click();
  await expect(senha).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Ocultar senha' }).click();
  await expect(senha).toHaveAttribute('type', 'password');
});

test('"Esqueci a senha" abre um diálogo com mensagem neutra', async ({ page }) => {
  await page.goto('/#/login');
  await page.getByLabel('E-mail').fill('ninguem-cadastrado@teste.local');
  await page.getByRole('link', { name: 'Esqueci a senha' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Esqueci a senha' });
  await expect(dialogo.getByLabel('E-mail')).toHaveValue('ninguem-cadastrado@teste.local');
  await dialogo.getByRole('button', { name: 'Enviar link' }).click();
  await expect(dialogo.getByRole('status')).toHaveText(
    'Se o e-mail estiver cadastrado, você vai receber um link para criar uma senha nova.',
  );
  await expect(page).toHaveURL(/#\/login$/);
});

test('tudo pelo teclado, axe sem violações e sem "Meu Caixa"', async ({ page, browserName }) => {
  // No Safari, Tab só passa pelos campos de texto; Option+Tab passa por tudo.
  const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
  const u = await criarUsuario();
  await page.goto('/#/login');
  await expect(page.getByRole('heading', { name: 'Goose Money', level: 1 })).toBeVisible();
  await expect(page.getByText('Meu Caixa')).toHaveCount(0);
  await expect(page.getByText('Seus dados ficam só neste dispositivo')).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await page.keyboard.type(u.email);
  await page.keyboard.press(tab);
  await expect(page.getByLabel('Senha', { exact: true })).toBeFocused();
  await page.keyboard.type(u.senha);
  await page.keyboard.press(tab);
  await expect(page.getByRole('button', { name: 'Mostrar senha' })).toBeFocused();
  await page.keyboard.press(tab);
  await expect(
    page.getByRole('checkbox', { name: 'Manter conectado neste dispositivo' }),
  ).toBeFocused();
  await page.keyboard.press('Space');
  await expect(
    page.getByRole('checkbox', { name: 'Manter conectado neste dispositivo' }),
  ).toBeChecked();
  await page.keyboard.press(tab);
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/$/);
});
