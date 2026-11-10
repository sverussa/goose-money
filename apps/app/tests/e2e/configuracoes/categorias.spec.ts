import AxeBuilder from '@axe-core/playwright';
import {
  aplicar,
  badges,
  classificar,
  conclusaoDespesasPorCategoria,
  criarCategoria,
  type Derivado,
  despesasPorCategoria,
  editarCategoria,
  excluirCategoria,
  type Fatos,
  periodoPreset,
} from '@goose-money/core';
import { expect, type Page, test } from '@playwright/test';

import { CORES, itensMovidos, listaDosItens } from '../../../src/features/configuracoes/categorias';
import { mensagensConfiguracoes } from '../../../src/features/configuracoes/mensagens';
import { alterar, gravar } from '../../../../../supabase/tests/apoio';
import { entrar } from '../lancar/apoio';
import { gravadoEmHoje, HOJE, preparar } from '../painel/apoio';

// T05-27: Configurações › Categorias (6.9, 4.3, D35, D49), com o seed de 04/11/2026.

test.use({ viewport: { width: 1440, height: 1000 } });

const m = mensagensConfiguracoes.categorias;
const secao = (page: Page) => page.getByRole('region', { name: m.titulo });
const linha = (page: Page, nome: string) =>
  secao(page)
    .getByRole('listitem')
    .filter({ has: page.getByText(nome, { exact: true }) });
const idDa = (f: Fatos, nome: string) => {
  const c = f.categorias.find((x) => x.nome === nome);
  if (!c) throw new Error(`${nome} não está nas categorias`);
  return c.id;
};
async function abrirAcao(page: Page, nome: string, acao: string) {
  await page.getByRole('button', { name: m.menu.rotulo(nome), exact: true }).click();
  await page.getByRole('menuitem', { name: acao }).click();
}
/** Tudo o que tem categoria (o que o `excluirCategoria` pode mover). */
const itens = (f: Fatos): { id: string; categoriaId: string | null }[] => [
  ...f.lancamentos,
  ...f.compras,
  ...f.itensFatura,
  ...f.dividas,
  ...f.recorrenciaVersoes,
  ...f.ocorrencias,
];
/** A categoria de cada item: compara antes e depois do Desfazer. */
const categoriasDosItens = (f: Fatos) =>
  itens(f)
    .map((x) => `${x.id}:${x.categoriaId ?? ''}`)
    .sort();
async function violacoesNoDialogo(page: Page) {
  await page
    .getByRole('dialog')
    .evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)));
  return (await new AxeBuilder({ page }).include('[role="dialog"]').analyze()).violations;
}

test('categorias de sistema ficam travadas na tela, no core e no banco; sem violações de acessibilidade', async ({
  page,
}) => {
  const { u, d, ctx } = await preparar(page);
  await entrar(page, u, '/configuracoes');
  await expect(page.getByRole('heading', { name: m.titulo })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  const sistema = d.fatos.categorias.filter((c) => c.sistema !== null);
  expect(sistema).toHaveLength(4);
  for (const c of sistema) {
    await expect(linha(page, c.nome)).toContainText(m.selo);
    await expect(page.getByRole('button', { name: m.menu.rotulo(c.nome) })).toHaveCount(0);
    expect(() => editarCategoria(d.fatos, ctx, c.id, { nome: 'Outro' })).toThrow();
    expect(() => excluirCategoria(d.fatos, ctx, c.id)).toThrow();
    for (const dados of [{ nome: 'Outro' }, { is_deleted: true }]) {
      const { erro } = await gravar(u.cliente, [alterar('categorias', c.id, dados)]);
      expect(erro?.code).toBe('23514');
    }
  }
  // A explicação aparece no foco (e no ponteiro).
  await linha(page, 'Tarifas').getByText(m.selo).focus();
  await expect(page.getByRole('tooltip')).toHaveText(m.trava);
  // As comuns têm menu.
  await expect(page.getByRole('button', { name: m.menu.rotulo('Moradia') })).toBeVisible();
});

test('criar uma subcategoria: tipo da pai, ícone e cor gravados', async ({ page }) => {
  const { u, d } = await preparar(page);
  await entrar(page, u, '/configuracoes');
  await page.getByRole('button', { name: m.nova }).click();
  const dialogo = page.getByRole('dialog', { name: m.formulario.tituloNova });
  await dialogo.getByLabel(m.formulario.nome).fill('Mercado');
  await dialogo.getByRole('combobox', { name: m.formulario.pai }).click();
  await page.getByRole('option', { name: 'Alimentação', exact: true }).click();
  // O tipo segue a pai.
  await expect(dialogo.getByRole('radio', { name: m.tipos.receita })).toBeDisabled();
  await dialogo.getByRole('radio', { name: 'Carrinho' }).click();
  await dialogo.getByRole('radio', { name: m.formulario.corN(3) }).click();
  expect(await violacoesNoDialogo(page)).toEqual([]);
  await dialogo.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialogo).toBeHidden();
  await expect(page.getByText('Categoria criada')).toBeVisible();

  await expect(linha(page, 'Mercado')).toContainText(m.subcategoriaDe('Alimentação'));
  await expect(linha(page, 'Alimentação')).toContainText(`${m.tipos.despesa} · Mercado`);
  const g = await gravadoEmHoje(u);
  expect(g.fatos.categorias.find((c) => c.nome === 'Mercado')).toMatchObject({
    tipo: 'despesa',
    icone: 'shopping-cart',
    cor: 'categorica-3',
    categoriaPaiId: idDa(d.fatos, 'Alimentação'),
    sistema: null,
  });
});

test('mudar a cor de uma categoria muda a cor dela nos gráficos do Painel', async ({ page }) => {
  const { u, d } = await preparar(page);
  const c = conclusaoDespesasPorCategoria(
    despesasPorCategoria(d, periodoPreset('ultimos-3-meses', HOJE)),
  );
  if (c.tipo !== 'maior') throw new Error('o seed devia ter despesas');
  const categoria = d.porId.categorias.get(c.categoriaId);
  if (!categoria) throw new Error('categoria do gráfico');
  const i = CORES.findIndex((x) => x !== categoria.cor);
  const nova = CORES[i] ?? '';
  const variavel = `var(--color-cat-${String(i + 1)})`;

  await entrar(page, u, '/configuracoes');
  await abrirAcao(page, categoria.nome, m.menu.editar);
  const dialogo = page.getByRole('dialog', { name: m.formulario.tituloEditar });
  await expect(dialogo.getByLabel(m.formulario.nome)).toHaveValue(categoria.nome);
  await dialogo.getByRole('radio', { name: m.formulario.corN(i + 1) }).click();
  await dialogo.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialogo).toBeHidden();
  await expect(page.getByText('Categoria alterada')).toBeVisible();
  expect((await gravadoEmHoje(u)).porId.categorias.get(categoria.id)?.cor).toBe(nova);

  await page
    .getByRole('navigation', { name: 'Menu principal' })
    .getByRole('link', { name: /^Painel/ })
    .click();
  // O ranking e a fatia da rosca usam a cor nova.
  const ranking = page.getByRole('button', { name: new RegExp(`^${categoria.nome}`) });
  await expect(ranking.locator('span').first()).toHaveAttribute(
    'style',
    new RegExp(variavel.replace(/[()]/g, '\\$&')),
  );
  await expect(page.locator(`path[fill="${variavel}"]`).first()).toBeAttached();
});

test('excluir categoria em uso move os itens dela e das subcategorias para "A classificar"; Desfazer devolve', async ({
  page,
}) => {
  // Uma subcategoria de Alimentação com um lançamento.
  const { u } = await preparar(page, (f, ctx) => {
    const pai = idDa(f, 'Alimentação');
    const sub = criarCategoria(f, ctx, {
      nome: 'Mercado',
      tipo: 'despesa',
      icone: 'shopping-cart',
      cor: 'categorica-3',
      categoriaPaiId: pai,
    });
    const comSub = aplicar(f, sub.mudancas);
    const l = f.lancamentos.find((x) => x.categoriaId === pai);
    if (!l) throw new Error('o seed devia ter lançamentos de Alimentação');
    return [sub, classificar(comSub, ctx, [l.id], idDa(comSub, 'Mercado'))];
  });
  await entrar(page, u, '/configuracoes');
  // Os números esperados saem do que está gravado depois da confirmação automática.
  const antes: Derivado = await gravadoEmHoje(u);
  const comando = excluirCategoria(
    antes.fatos,
    {
      hoje: HOJE,
      agora: `${HOJE}T12:00:00Z`,
      usuario: u.id,
      novoId: () => crypto.randomUUID(),
    },
    idDa(antes.fatos, 'Alimentação'),
  );
  const n = itensMovidos(antes.fatos, comando);
  expect(n.lancamentos).toBeGreaterThan(1);

  await abrirAcao(page, 'Alimentação', m.menu.excluir);
  const dialogo = page.getByRole('dialog', { name: m.excluir.titulo('Alimentação') });
  await expect(dialogo).toContainText(
    `${m.excluir.comSubcategorias(1)} ${m.excluir.vaoPara(listaDosItens(n))}`,
  );
  expect(await violacoesNoDialogo(page)).toEqual([]);
  await dialogo.getByRole('button', { name: m.excluir.confirmar }).click();
  await expect(dialogo).toBeHidden();
  await expect(page.getByText(m.movidos(n.total))).toBeVisible();
  await expect(linha(page, 'Alimentação')).toHaveCount(0);
  await expect(linha(page, 'Mercado')).toHaveCount(0);

  const depois = await gravadoEmHoje(u);
  const vivas = new Set(depois.fatos.categorias.map((c) => c.id));
  const aClassificar = idDa(depois.fatos, 'A classificar');
  const excluidas = new Set([idDa(antes.fatos, 'Alimentação'), idDa(antes.fatos, 'Mercado')]);
  // Nenhum item aponta para categoria excluída; os de antes estão em "A classificar".
  expect(itens(depois.fatos).every((x) => x.categoriaId === null || vivas.has(x.categoriaId))).toBe(
    true,
  );
  const movidos = itens(antes.fatos).filter((x) => x.categoriaId && excluidas.has(x.categoriaId));
  const porId = new Map(itens(depois.fatos).map((x) => [x.id, x.categoriaId]));
  expect(movidos.every((x) => porId.get(x.id) === aClassificar)).toBe(true);
  // O badge de Lançamentos conta os movidos.
  const b = badges(depois).lancamentos;
  expect(b).toBe(badges(antes).lancamentos + n.lancamentos + n.compras);
  await expect(
    page
      .getByRole('navigation', { name: 'Menu principal' })
      .getByRole('link', { name: /^Lançamentos/ }),
  ).toContainText(String(b));

  await page.getByRole('button', { name: 'Desfazer' }).click();
  await expect(page.getByText('Desfeito')).toBeVisible();
  await expect(linha(page, 'Mercado')).toContainText(m.subcategoriaDe('Alimentação'));
  const desfeito = await gravadoEmHoje(u);
  expect(desfeito.fatos.categorias.map((c) => c.id).sort()).toEqual(
    antes.fatos.categorias.map((c) => c.id).sort(),
  );
  expect(categoriasDosItens(desfeito.fatos)).toEqual(categoriasDosItens(antes.fatos));
});
