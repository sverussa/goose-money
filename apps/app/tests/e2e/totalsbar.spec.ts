import AxeBuilder from '@axe-core/playwright';
import { gerarSeed } from '@goose-money/core';
import { expect, type Page, test } from '@playwright/test';

import {
  criarUsuario,
  gravarOk,
  hojeEmBrasilia,
  opsDosFatos,
  type Usuario,
} from '../../../../supabase/tests/apoio';

// T04-06: Barra de Totais (5.3, 4.2, 11.1).

const indicadores = [
  'Saldo em contas',
  'Previsto até o fim do mês',
  'A pagar nos cartões',
  'Resultado do mês',
  'Patrimônio líquido',
] as const;

async function comSeed(): Promise<Usuario> {
  const u = await criarUsuario();
  await gravarOk(u.cliente, opsDosFatos(gerarSeed(hojeEmBrasilia(), u.id)));
  return u;
}

async function entrar(page: Page, u: Usuario, rota = '/') {
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

const barra = (page: Page) => page.getByRole('region', { name: 'Barra de Totais' });
const indicador = (page: Page, nome: string) =>
  barra(page).getByRole('link', { name: new RegExp(`^${nome}`) });

for (const largura of [768, 1440]) {
  test.describe(`${String(largura)} dp`, () => {
    test.use({ viewport: { width: largura, height: 900 } });

    for (const tema of ['claro', 'escuro'] as const) {
      test(`os 5 indicadores visíveis ao mesmo tempo, com contraste AA no tema ${tema} (11.1)`, async ({
        page,
      }) => {
        await page.addInitScript((t) => {
          localStorage.setItem('goose-money:tema', t);
        }, tema);
        await entrar(page, await comSeed());
        for (const nome of indicadores) {
          await expect(indicador(page, nome)).toBeInViewport();
          await expect(indicador(page, nome)).toContainText('R$');
        }
        await expect(barra(page).getByRole('button', { name: 'Ocultar valores' })).toBeVisible();
        const r = await new AxeBuilder({ page })
          .include('section[aria-label="Barra de Totais"]')
          .analyze();
        expect(
          r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
        ).toEqual([]);
      });
    }
  });
}

test('cada indicador leva ao destino de 5.3 e explica o cálculo no tooltip', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await entrar(page, await comSeed());
  const destinos: [string, RegExp][] = [
    ['Saldo em contas', /#\/contas$/],
    ['Previsto até o fim do mês', /#\/\?aba=projecoes&mes=\d{4}-\d{2}$/],
    ['A pagar nos cartões', /#\/cartoes$/],
    ['Resultado do mês', /#\/\?de=\d{4}-\d{2}-01&ate=\d{4}-\d{2}-\d{2}$/],
    ['Patrimônio líquido', /#\/\?aba=saldos$/],
  ];
  for (const [nome, url] of destinos) {
    await indicador(page, nome).hover();
    await expect(page.getByRole('tooltip')).not.toBeEmpty();
    await indicador(page, nome).click();
    await expect(page).toHaveURL(url);
  }
});

test.describe('360 dp', () => {
  test.use({ viewport: { width: 360, height: 800 } });

  test('Saldo em contas e Previsto sem interação; os outros 3 a um toque (4.2)', async ({
    page,
  }) => {
    await entrar(page, await comSeed());
    await expect(indicador(page, 'Saldo em contas')).toBeVisible();
    await expect(indicador(page, 'Previsto até o fim do mês')).toBeVisible();
    for (const nome of indicadores.slice(2)) await expect(indicador(page, nome)).toBeHidden();
    // No compact, o olho fica na top app bar (D44).
    await expect(
      page.getByRole('banner').getByRole('button', { name: 'Ocultar valores' }),
    ).toBeVisible();

    await barra(page).getByRole('button', { name: 'Mais 3 indicadores' }).click();
    for (const nome of indicadores.slice(2)) await expect(indicador(page, nome)).toBeVisible();
    await barra(page).getByRole('button', { name: 'Menos' }).click();
    await expect(indicador(page, 'Patrimônio líquido')).toBeHidden();
  });

  test('após uma compra no cartão, A pagar aparece com o chip e depois volta a se esconder (11.1)', async ({
    page,
  }) => {
    await entrar(page, await comSeed(), '/dev/casca');
    const aPagar = indicador(page, 'A pagar nos cartões');
    await expect(aPagar).toBeHidden();
    await page.getByRole('button', { name: 'Simular compra no cartão' }).click();
    await expect(aPagar).toBeVisible();
    await expect(aPagar).toContainText('+R$ 89,90');
    await expect(aPagar).toBeHidden({ timeout: 5000 });
  });
});

test('Desfazer volta os valores, com o chip da variação inversa', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await entrar(page, await comSeed(), '/dev/casca');
  const aPagar = indicador(page, 'A pagar nos cartões');
  const antes = await aPagar.locator('.text-title-lg').textContent();
  await page.getByRole('button', { name: 'Simular compra no cartão' }).click();
  await expect(aPagar).toContainText('+R$ 89,90');
  await expect(aPagar).not.toContainText(antes ?? '');
  await page.getByRole('button', { name: 'Desfazer' }).click();
  await expect(aPagar).toContainText('−R$ 89,90');
  await expect(aPagar).toContainText(antes ?? '');
});

test('o olho oculta os valores da Barra', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await entrar(page, await comSeed());
  const olho = barra(page).getByRole('button', { name: 'Ocultar valores' });
  await olho.click();
  await expect(olho).toHaveAttribute('aria-pressed', 'true');
  await expect(barra(page).getByLabel('Valor oculto')).toHaveCount(5);
  await expect(barra(page)).not.toContainText(/R\$ \d/);
});
