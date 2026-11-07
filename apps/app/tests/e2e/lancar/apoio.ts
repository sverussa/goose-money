import {
  type Derivado,
  derivar,
  gerarSeed,
  indicadoresDaBarra,
  type IndicadoresDaBarra,
} from '@goose-money/core';
import { expect, type Page } from '@playwright/test';

import { formatarMoeda } from '../../../src/app/formatacao';
import { lerFatos } from '../../../src/data/mapeamento';
import {
  criarUsuario,
  gravarOk,
  hojeEmBrasilia,
  opsDosFatos,
  type Usuario,
} from '../../../../../supabase/tests/apoio';

// Apoio dos testes do formulário de lançamento (T05-02 a T05-05).

export async function comSeed(): Promise<Usuario> {
  const u = await criarUsuario();
  await gravarOk(u.cliente, opsDosFatos(gerarSeed(hojeEmBrasilia(), u.id)));
  return u;
}

export async function entrar(page: Page, u: Usuario, rota = '/') {
  await page.goto(`/#/login?voltar=${encodeURIComponent(rota)}`);
  await page.getByLabel('E-mail').fill(u.email);
  await page.getByLabel('Senha', { exact: true }).fill(u.senha);
  await page.getByRole('button', { name: 'Entrar' }).click();
  // Entrar prepara o usuário e carrega o seed inteiro: mais lento que o padrão de 5 s sob carga.
  await expect(page.getByRole('link', { name: /^Saldo em contas/ })).toBeVisible({
    timeout: 15_000,
  });
  // A confirmação automática (T03-06) pode gravar ao abrir; espera ela acabar.
  await page.waitForLoadState('networkidle');
}

/** O que está gravado, derivado pelo core com o "hoje" de Brasília. */
export async function derivadoNoBanco(u: Usuario): Promise<Derivado> {
  const r = await u.cliente.rpc('carregar_tudo');
  if (r.error) throw new Error(r.error.message);
  return derivar(lerFatos(r.data), hojeEmBrasilia());
}

/** Os indicadores da Barra calculados pelo core sobre o que está gravado. */
export const barraNoBanco = async (u: Usuario): Promise<IndicadoresDaBarra> =>
  indicadoresDaBarra(await derivadoNoBanco(u));

const ROTULOS: Record<keyof IndicadoresDaBarra, string> = {
  saldoEmContas: 'Saldo em contas',
  previstoAteOFimDoMes: 'Previsto até o fim do mês',
  aPagarNosCartoes: 'A pagar nos cartões',
  resultadoDoMes: 'Resultado do mês',
  patrimonioLiquido: 'Patrimônio líquido',
};

/** Confere na tela os 5 indicadores da Barra (1440 dp, todos visíveis). */
export async function conferirBarra(page: Page, esperado: IndicadoresDaBarra) {
  const barra = page.getByRole('region', { name: 'Barra de Totais' });
  for (const chave of Object.keys(ROTULOS) as (keyof IndicadoresDaBarra)[])
    await expect(
      barra.getByRole('link', { name: new RegExp(`^${ROTULOS[chave]}`) }).locator('.text-title-lg'),
    ).toHaveText(formatarMoeda(esperado[chave]));
}

export const dialogo = (page: Page) => page.getByRole('dialog', { name: 'Novo lançamento' });
/** O FAB "+ Lançar" (o da tecla N), não os botões "Lançar" das telas. */
export const fab = (page: Page) =>
  page
    .getByRole('button', { name: 'Lançar', exact: true })
    .and(page.locator('[aria-keyshortcuts="N"]'));
export const campoValor = (page: Page) =>
  dialogo(page).getByRole('textbox', { name: 'Valor', exact: true });

/** Escolhe `opcao` no seletor `rotulo` do formulário. */
export async function escolher(page: Page, rotulo: string, opcao: string) {
  await dialogo(page).getByRole('combobox', { name: rotulo, exact: true }).click();
  await page.getByRole('option', { name: opcao, exact: true }).click();
}
