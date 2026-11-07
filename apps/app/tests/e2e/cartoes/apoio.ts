import {
  aplicar,
  type Comando,
  type Contexto,
  dataCivil,
  derivar,
  type Fatos,
  gerarSeed,
} from '@goose-money/core';
import { expect, type Page } from '@playwright/test';

import { lerFatos } from '../../../src/data/mapeamento';
import {
  criarUsuario,
  gravarOk,
  opsDosFatos,
  type Usuario,
} from '../../../../../supabase/tests/apoio';

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

/** "Hoje" do seed nos testes da fatura (DESIGN-HANDOFF 2). */
export const HOJE = dataCivil('2026-11-04');

/** Seed de 04/11/2026 mais os comandos de `extras`, gravado; o navegador vive em 04/11/2026. */
export async function preparar(
  page: Page,
  extras: (f: Fatos, ctx: Contexto) => Comando[] = () => [],
) {
  const u = await criarUsuario();
  let f = gerarSeed(HOJE, u.id);
  const ctx: Contexto = {
    hoje: HOJE,
    agora: `${HOJE}T12:00:00Z`,
    usuario: u.id,
    novoId: () => crypto.randomUUID(),
  };
  for (const c of extras(f, ctx)) f = aplicar(f, c.mudancas);
  await gravarOk(u.cliente, opsDosFatos(f));
  await page.clock.install({ time: new Date(2026, 10, 4, 10) });
  return { u, d: derivar(f, HOJE), ctx };
}

/** O que está gravado, derivado em 04/11/2026. */
export async function gravadoEmHoje(u: Usuario) {
  const r = await u.cliente.rpc('carregar_tudo');
  if (r.error) throw new Error(r.error.message);
  return derivar(lerFatos(r.data), HOJE);
}

export const idDo = (f: Fatos, nome: string) => {
  const c = f.cartoes.find((x) => x.nome === nome);
  if (!c) throw new Error(`${nome} não está no seed`);
  return c.id;
};
