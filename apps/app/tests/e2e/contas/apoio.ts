import { expect, type Page } from '@playwright/test';

/** O diálogo de conta, novo ou de edição. */
export const formConta = (page: Page) =>
  page.getByRole('dialog', { name: /^(Nova|Editar) conta$/ });

/** Preenche e salva o formulário de conta; `saldo` são os dígitos da máscara. */
export async function preencherConta(
  page: Page,
  { nome, tipo, saldo }: { nome: string; tipo?: string; saldo?: string },
) {
  const f = formConta(page);
  await f.getByLabel('Nome').fill(nome);
  if (tipo) {
    await f.getByRole('combobox', { name: 'Tipo' }).click();
    await page.getByRole('option', { name: tipo, exact: true }).click();
  }
  if (saldo)
    await f.getByRole('textbox', { name: 'Saldo inicial', exact: true }).pressSequentially(saldo);
  await f.getByRole('button', { name: 'Salvar', exact: true }).click();
}

export const cardDaConta = (page: Page, nome: string) =>
  page.getByRole('listitem').filter({ has: page.getByRole('link', { name: nome, exact: true }) });

export async function abrirMenu(page: Page, nome: string) {
  await page.getByRole('button', { name: `Ações de ${nome}`, exact: true }).click();
  await expect(page.getByRole('menu')).toBeVisible();
}
