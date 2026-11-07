import { expect, type Page } from '@playwright/test';

/** O diálogo de cartão, novo ou de edição. */
export const formCartao = (page: Page) =>
  page.getByRole('dialog', { name: /^(Novo|Editar) cartão$/ });

/** Preenche e salva o cadastro de cartão; `limite` e `saldoFechada` são os dígitos da máscara. */
export async function preencherCartao(
  page: Page,
  c: { nome: string; limite: string; fecha: string; vence: string; saldoFechada?: string },
) {
  const f = formCartao(page);
  await f.getByLabel('Nome').fill(c.nome);
  await f.getByRole('textbox', { name: 'Limite' }).pressSequentially(c.limite);
  await f.getByRole('spinbutton', { name: 'Dia de fechamento' }).fill(c.fecha);
  await f.getByRole('spinbutton', { name: 'Dia de vencimento' }).fill(c.vence);
  if (c.saldoFechada)
    await f
      .getByRole('textbox', { name: /^Saldo da fatura fechada/ })
      .pressSequentially(c.saldoFechada);
  await f.getByRole('button', { name: 'Salvar', exact: true }).click();
}

export const cardDoCartao = (page: Page, nome: string) =>
  page.getByRole('listitem').filter({ has: page.getByRole('link', { name: nome, exact: true }) });

export async function abrirMenu(page: Page, nome: string) {
  await page.getByRole('button', { name: `Ações de ${nome}`, exact: true }).click();
  await expect(page.getByRole('menu')).toBeVisible();
}

/** Valores do cabeçalho de contexto: A pagar nos cartões e Obrigações de cartão, nessa ordem. */
export const totais = (page: Page) =>
  page.getByRole('region', { name: 'Totais dos cartões' }).getByRole('definition');
