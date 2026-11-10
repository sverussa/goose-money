import AxeBuilder from '@axe-core/playwright';
import {
  centavos,
  competenciaDe,
  estadoDoPrevisto,
  indicadoresDaBarra,
  somar,
} from '@goose-money/core';
import { expect, type Page, test } from '@playwright/test';

import { formatarMoeda } from '../../../src/app/formatacao';
import { mensagensAcesso } from '../../../src/features/acesso/mensagens';
import { mensagensConfiguracoes } from '../../../src/features/configuracoes/mensagens';
import { linhasDaConfirmacao } from '../../../src/features/configuracoes/preferencias';
import { clienteAnonimo } from '../../../../../supabase/tests/apoio';
import { entrar } from '../lancar/apoio';
import { gravadoEmHoje, preparar } from '../painel/apoio';

// T05-28: Configurações › Aparência, Preferências e Acesso (5.3, 6.1, 6.9, D20), seed de 04/11/2026.

test.use({ viewport: { width: 1440, height: 1000 } });

const m = mensagensConfiguracoes;
const secao = (page: Page, nome: string) => page.getByRole('region', { name: nome });
const previsto = (page: Page) =>
  page
    .getByRole('region', { name: 'Barra de Totais' })
    .getByRole('link', { name: /^Previsto até o fim do mês/ })
    .locator('.text-title-lg');
const campoLimite = (page: Page) => page.getByRole('textbox', { name: m.preferencias.limite });
const horizonte = (page: Page) => page.getByRole('combobox', { name: m.preferencias.horizonte });
const automatica = (page: Page, descricao: string, dia: number) =>
  page.getByRole('switch', { name: m.preferencias.linha(descricao, dia) });

test('limite de alerta acima do Previsto deixa o Previsto em warning na hora; Desfazer volta', async ({
  page,
}) => {
  const { u, d } = await preparar(page);
  const valor = indicadoresDaBarra(d).previstoAteOFimDoMes;
  const limiteAtual = d.fatos.preferencias?.limiteAlerta ?? centavos(0);
  expect(estadoDoPrevisto(valor, limiteAtual)).toBe('normal');
  const novo = somar([valor, centavos(100)]);
  expect(estadoDoPrevisto(valor, novo)).toBe('warning');

  await entrar(page, u, '/configuracoes');
  await expect(previsto(page)).toHaveText(formatarMoeda(valor));
  await expect(previsto(page)).not.toHaveClass(/text-warning/);
  await expect(campoLimite(page)).toHaveValue(formatarMoeda(limiteAtual));
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await campoLimite(page).fill('');
  await campoLimite(page).pressSequentially(String(novo));
  await expect(campoLimite(page)).toHaveValue(formatarMoeda(novo));
  await campoLimite(page).press('Enter');
  await expect(previsto(page)).toHaveClass(/text-warning/);
  await expect(page.getByText('Preferências salvas')).toBeVisible();
  await expect
    .poll(async () => (await gravadoEmHoje(u)).fatos.preferencias?.limiteAlerta)
    .toBe(novo);

  await page.getByRole('button', { name: 'Desfazer' }).click();
  await expect(previsto(page)).not.toHaveClass(/text-warning/);
  await expect(campoLimite(page)).toHaveValue(formatarMoeda(limiteAtual));
  await expect
    .poll(async () => (await gravadoEmHoje(u)).fatos.preferencias?.limiteAlerta)
    .toBe(limiteAtual);
});

test('as preferências salvas aparecem iguais em outro navegador logado na mesma conta', async ({
  page,
  browser,
}) => {
  const { u, d } = await preparar(page);
  const pref = d.fatos.preferencias;
  if (!pref) throw new Error('o seed tem preferências');
  const freelance = linhasDaConfirmacao(d.fatos, competenciaDe(d.hoje)).find(
    (l) => l.descricao === 'Freelance',
  );
  if (!freelance) throw new Error('Freelance não está no seed');
  expect(freelance.autoConfirmar).toBe(false);
  expect(pref.horizontePadrao).not.toBe(6);
  expect(pref.ocultarValoresAoAbrir).toBe(false);
  const limite = somar([pref.limiteAlerta, centavos(25_000)]);

  await entrar(page, u, '/configuracoes');
  await campoLimite(page).fill('');
  await campoLimite(page).pressSequentially(String(limite));
  await campoLimite(page).blur();
  await expect(page.getByRole('status').filter({ hasText: m.salvando })).toHaveCount(0);
  await horizonte(page).click();
  await page.getByRole('option', { name: m.preferencias.meses(6) }).click();
  await expect(horizonte(page)).toHaveText(m.preferencias.meses(6));
  await automatica(page, freelance.descricao, freelance.dia).click();
  await expect(automatica(page, freelance.descricao, freelance.dia)).toBeChecked();
  await secao(page, m.aparencia.titulo).getByRole('switch', { name: m.aparencia.ocultar }).click();
  await expect(
    secao(page, m.aparencia.titulo).getByRole('switch', { name: m.aparencia.ocultar }),
  ).toBeChecked();

  await expect
    .poll(async () => {
      const f = (await gravadoEmHoje(u)).fatos;
      return [
        f.preferencias?.limiteAlerta,
        f.preferencias?.horizontePadrao,
        f.preferencias?.ocultarValoresAoAbrir,
        f.recorrencias.find((r) => r.id === freelance.id)?.autoConfirmar,
      ];
    })
    .toEqual([limite, 6, true, true]);

  const outro = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page2 = await outro.newPage();
  await page2.clock.install({ time: new Date(2026, 10, 4, 10) });
  await entrar(page2, u, '/configuracoes');
  await expect(campoLimite(page2)).toHaveValue(formatarMoeda(limite));
  await expect(horizonte(page2)).toHaveText(m.preferencias.meses(6));
  await expect(automatica(page2, freelance.descricao, freelance.dia)).toBeChecked();
  await expect(
    secao(page2, m.aparencia.titulo).getByRole('switch', { name: m.aparencia.ocultar }),
  ).toBeChecked();
  // "Ocultar valores ao abrir": o outro navegador já abre com os valores ocultos.
  await expect(previsto(page2)).not.toHaveText(
    formatarMoeda(indicadoresDaBarra(d).previstoAteOFimDoMes),
  );
  await outro.close();
});

test('tema claro, escuro ou do sistema fica no aparelho', async ({ page }) => {
  const { u } = await preparar(page);
  await entrar(page, u, '/configuracoes');
  const tema = secao(page, m.aparencia.titulo).getByRole('radiogroup', { name: m.aparencia.tema });
  await tema.getByRole('radio', { name: m.aparencia.temas.escuro }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.reload();
  await expect(
    secao(page, m.aparencia.titulo).getByRole('radio', { name: m.aparencia.temas.escuro }),
  ).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await tema.getByRole('radio', { name: m.aparencia.temas.claro }).click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
});

test('alterar senha: senha atual errada mostra erro inline; a certa troca a senha; Sair volta ao login', async ({
  page,
}) => {
  const { u } = await preparar(page);
  await entrar(page, u, '/configuracoes');
  const acesso = secao(page, m.acesso.titulo);
  await expect(acesso.getByText(u.email)).toBeVisible();

  const t = m.acesso.dialogo;
  const dialogo = page.getByRole('dialog', { name: m.acesso.alterarSenha });
  const nova = `nova-${crypto.randomUUID()}`;
  async function preencher(atual: string, senha: string, confirmar = senha) {
    await dialogo.getByLabel(t.atual).fill(atual);
    await dialogo.getByLabel(t.nova, { exact: true }).fill(senha);
    await dialogo.getByLabel(t.confirmar).fill(confirmar);
    await dialogo.getByRole('button', { name: t.salvar }).click();
  }

  await acesso.getByRole('button', { name: m.acesso.alterarSenha }).click();
  await expect(dialogo.getByLabel(t.atual)).toBeFocused();
  await dialogo.evaluate((el) =>
    Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)),
  );
  expect((await new AxeBuilder({ page }).include('[role="dialog"]').analyze()).violations).toEqual(
    [],
  );

  await preencher(u.senha, nova, `${nova}x`);
  await expect(dialogo.getByRole('alert')).toHaveText(mensagensAcesso.redefinir.diferentes);

  await preencher(`${u.senha}x`, nova);
  await expect(dialogo.getByRole('alert')).toHaveText(t.atualIncorreta);
  await expect(dialogo).toBeVisible();
  // Nada mudou: a senha antiga ainda entra.
  const antes = await clienteAnonimo().auth.signInWithPassword({
    email: u.email,
    password: u.senha,
  });
  expect(antes.error).toBeNull();

  await preencher(u.senha, nova);
  await expect(dialogo).toBeHidden();
  await expect(page.getByText(t.alterada)).toBeVisible();
  expect(page.url()).not.toContain(nova);
  const velha = await clienteAnonimo().auth.signInWithPassword({
    email: u.email,
    password: u.senha,
  });
  expect(velha.error?.code).toBe('invalid_credentials');
  const nova2 = await clienteAnonimo().auth.signInWithPassword({ email: u.email, password: nova });
  expect(nova2.error).toBeNull();

  await acesso.getByRole('button', { name: m.acesso.sair }).click();
  await expect(page).toHaveURL(/#\/login/);
});

test('a coluna de ajustes cabe em 360, 768 e 1440 dp, sem violações de acessibilidade', async ({
  page,
}) => {
  const { u } = await preparar(page);
  await entrar(page, u, '/configuracoes');
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(secao(page, m.acesso.titulo)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    for (const nome of [m.aparencia.titulo, m.preferencias.titulo, m.acesso.titulo]) {
      const caixa = await secao(page, nome).boundingBox();
      expect(caixa && caixa.x + caixa.width).toBeLessThanOrEqual(width);
    }
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
});
