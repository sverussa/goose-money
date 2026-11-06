import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

// T04-03: a página de componentes passa no axe nos dois temas, também com dialog e menu abertos.

async function semViolacoes(page: Page, so?: string) {
  // Medir o contraste no meio da animação de abertura (opacidade < 1) daria falso positivo.
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every((a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity),
  );
  const axe = new AxeBuilder({ page });
  const resultado = await (so ? axe.include(so) : axe).analyze();
  expect(
    resultado.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
    ),
  ).toEqual([]);
}

for (const tema of ['claro', 'escuro'] as const) {
  test(`componentes sem violações de acessibilidade no tema ${tema}`, async ({ page }) => {
    await page.addInitScript((t) => {
      localStorage.setItem('goose-money:tema', t);
    }, tema);
    await page.goto('/#/dev/componentes');
    await expect(page.getByRole('heading', { name: 'Componentes' })).toBeVisible();
    await semViolacoes(page);

    await page.getByRole('button', { name: 'Abrir dialog' }).click();
    await expect(page.getByRole('dialog', { name: 'Novo lançamento' })).toBeVisible();
    await semViolacoes(page);
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Operações da compra' }).click();
    const desabilitado = page.getByRole('menuitem', { name: /Mudar o número de parcelas/ });
    await expect(desabilitado).toHaveAttribute('aria-disabled', 'true');
    await expect(desabilitado).toContainText('A primeira parcela já está numa fatura paga');
    // Menu modal: o Radix esconde o resto da página (aria-hidden), já conferido acima.
    await semViolacoes(page, '[role="menu"]');
  });
}

test('botões, chips e segmentos têm alvo de pelo menos 48 dp', async ({ page }) => {
  await page.goto('/#/dev/componentes');
  const alvos = await page.evaluate(() =>
    [
      ...document.querySelectorAll(
        'main button, main [role="radio"], main [role="checkbox"], main [role="switch"]',
      ),
    ].map((el) => {
      const r = el.getBoundingClientRect();
      const antes = getComputedStyle(el, '::before');
      const w = Math.max(r.width, parseFloat(antes.width) || 0);
      const h = Math.max(r.height, parseFloat(antes.height) || 0);
      return { nome: el.textContent || el.getAttribute('aria-label'), w, h };
    }),
  );
  expect(alvos.length).toBeGreaterThan(10);
  expect(alvos.filter((a) => a.w < 48 || a.h < 48)).toEqual([]);
});
