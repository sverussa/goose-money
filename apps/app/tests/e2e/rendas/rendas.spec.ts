import AxeBuilder from '@axe-core/playwright';
import {
  competenciaDe,
  criarRecorrencia,
  deMascara,
  type Derivado,
  indicadoresDaBarra,
  mais,
  menos,
  type MesProjetado,
  pendencias,
  projetarFluxo,
  resumoRendas,
  somarMeses,
  ultimaData,
} from '@goose-money/core';
import { expect, type Page, test } from '@playwright/test';

import { formatarData, formatarMoeda, formatarPercentual } from '../../../src/app/formatacao';
import { mensagensPainel } from '../../../src/features/painel/mensagens';
import { mensagensRendas } from '../../../src/features/rendas/mensagens';
import {
  composicaoDaRenda,
  dataDaConfirmacao,
  mesPorExtenso,
  rendasDoMes,
} from '../../../src/features/rendas/rendas';
import { conferirBarra, entrar } from '../lancar/apoio';
import { gravadoEmHoje, HOJE, preparar } from '../painel/apoio';

// T05-25: Rendas fixas (3.8, 6.7, 7.4, 11.6), com o seed de 04/11/2026.

test.use({ viewport: { width: 1440, height: 1000 } });

const m = mensagensRendas;
const MES = competenciaDe(HOJE);
const DEZEMBRO = somarMeses(MES, 1);
const lista = (page: Page, mes = MES) =>
  page.getByRole('region', { name: m.lista(mesPorExtenso(mes)) });
const linha = (page: Page, nome: string, mes = MES) =>
  lista(page, mes)
    .getByRole('listitem')
    .filter({ has: page.getByText(nome, { exact: true }) });
const totais = (page: Page) => page.getByRole('region', { name: m.totais }).getByRole('definition');
const rendaDo = (d: Derivado, nome: string, mes = MES) => {
  const o = rendasDoMes(d.fatos, mes, d.hoje).find((x) => x.recorrencia.descricao === nome);
  if (!o) throw new Error(`${nome} não está em ${mes}`);
  return o;
};
/** O axe mede as cores no fim da animação de abertura do diálogo. */
async function violacoesNoDialogo(page: Page) {
  await page
    .getByRole('dialog')
    .evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)));
  return (await new AxeBuilder({ page }).include('[role="dialog"]').analyze()).violations;
}
/** O grupo Rendas da projeção (3.9) em cada mês até `ate`. */
const rendasProjetadas = (d: Derivado, ate = somarMeses(MES, 6)) =>
  new Map(
    projetarFluxo(d, ultimaData(ate)).meses.map((x: MesProjetado) => [
      x.competencia,
      x.grupos.rendas,
    ]),
  );

test('cabeçalho, lista e composição do mês saem do core; sem violações de acessibilidade', async ({
  page,
}) => {
  const { u, d } = await preparar(page);
  await entrar(page, u, '/rendas');
  const r = resumoRendas(d.fatos, MES, HOJE);
  await expect(totais(page)).toHaveText([
    formatarMoeda(r.previsto),
    r.recebido ? `+${formatarMoeda(r.recebido)}` : formatarMoeda(r.recebido),
    formatarMoeda(r.aReceber),
    formatarMoeda(r.atrasado),
  ]);
  for (const o of rendasDoMes(d.fatos, MES, HOJE)) {
    const l = linha(page, o.recorrencia.descricao);
    await expect(l).toContainText(`+${formatarMoeda(o.valor)}`);
    await expect(l).toContainText(m.chip.prevista(formatarData(o.data).slice(0, 5)));
    await expect(
      l.getByRole('button', { name: m.confirmar.acao(o.recorrencia.descricao) }),
    ).toBeVisible();
  }
  const c = composicaoDaRenda(d.fatos, MES, HOJE).conclusao;
  if (c.tipo !== 'maior') throw new Error('o seed tem duas rendas');
  await expect(
    page.getByRole('heading', {
      name: m.composicao.titulo(c.fonte, formatarPercentual({ tipo: 'valor', valor: c.fatia })),
    }),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  // O clique na fonte da composição abre a recorrência.
  await page
    .getByRole('button', { name: new RegExp(`^${c.fonte}.*${m.composicao.abrir}$`) })
    .click();
  const form = page.getByRole('dialog', { name: m.formulario.tituloEditar(c.fonte) });
  await expect(form.getByLabel(m.formulario.descricao)).toHaveValue(c.fonte);
  expect(await violacoesNoDialogo(page)).toEqual([]);
});

test('salário confirmado em novembro e editado para R$ 7.000,00 a partir de dezembro (11.6)', async ({
  page,
}) => {
  const { u, d } = await preparar(page);
  const salario = rendaDo(d, 'Salário');
  const antes = rendasProjetadas(d);
  await entrar(page, u, '/rendas');

  // Confirma novembro pelo previsto.
  await linha(page, 'Salário')
    .getByRole('button', { name: m.confirmar.acao('Salário') })
    .click();
  const dlg = page.getByRole('dialog', { name: m.confirmar.titulo });
  await expect(dlg.getByRole('textbox', { name: m.confirmar.valor })).toHaveValue(
    formatarMoeda(salario.valor),
  );
  await expect(dlg.getByLabel(m.confirmar.data)).toHaveValue(dataDaConfirmacao(salario, HOJE));
  expect(await violacoesNoDialogo(page)).toEqual([]);
  await dlg.getByRole('button', { name: m.confirmar.titulo }).click();
  await expect(page.getByText('Recebimento confirmado')).toBeVisible();
  await expect(dlg).toBeHidden();
  await expect(linha(page, 'Salário')).toContainText(
    m.chip.confirmada(formatarData(dataDaConfirmacao(salario, HOJE)).slice(0, 5)),
  );

  // Edita: "Aplicar a partir de" vem em dezembro, a primeira não confirmada.
  await page.getByRole('button', { name: m.menu.rotulo('Salário') }).click();
  await page.getByRole('menuitem', { name: m.menu.editar }).click();
  const form = page.getByRole('dialog', { name: m.formulario.tituloEditar('Salário') });
  await expect(form.getByRole('combobox', { name: m.formulario.aPartirDe })).toHaveText(
    m.formulario.opcao(mesPorExtenso(DEZEMBRO), true),
  );
  const valor = form.getByRole('textbox', { name: m.formulario.valor, exact: true });
  await valor.clear();
  await valor.pressSequentially('700000');
  const novo = deMascara('700000');
  await expect(form.getByRole('note', { name: m.formulario.aPartirDe })).toContainText(
    m.formulario.continua(mesPorExtenso(MES), formatarMoeda(salario.valor)),
  );
  await expect(form.getByRole('listitem').first()).toContainText(
    m.formulario.versao(formatarMoeda(novo), Number(salario.data.slice(8))),
  );
  await expect(form.getByRole('listitem').first()).toContainText(m.formulario.nova);
  await form.getByRole('button', { name: m.formulario.salvarNova }).click();
  await expect(page.getByText('Recorrência alterada')).toBeVisible();
  await expect(form).toBeHidden();

  // Novembro continua R$ 6.500,00; dezembro em diante, R$ 7.000,00.
  await expect(linha(page, 'Salário')).toContainText(`+${formatarMoeda(salario.valor)}`);
  await page.getByRole('button', { name: 'Próximo mês' }).click();
  await expect(linha(page, 'Salário', DEZEMBRO)).toContainText(`+${formatarMoeda(novo)}`);

  const g = await gravadoEmHoje(u);
  expect(rendaDo(g, 'Salário').valor).toBe(salario.valor);
  expect(rendaDo(g, 'Salário', somarMeses(MES, -1)).valor).toBe(
    rendaDo(d, 'Salário', somarMeses(MES, -1)).valor,
  );
  const depois = rendasProjetadas(g);
  for (let i = 1; i <= 6; i++) {
    const c = somarMeses(MES, i);
    expect(rendaDo(g, 'Salário', c).valor).toBe(novo);
    expect(depois.get(c)).toBe(mais(antes.get(c) ?? deMascara('0'), menos(novo, salario.valor)));
  }
});

test('confirmar com valor diferente do previsto: a Barra muda pelo valor real (7.4)', async ({
  page,
}) => {
  const { u, d } = await preparar(page);
  const freelance = rendaDo(d, 'Freelance');
  const real = menos(freelance.valor, deMascara('20000'));
  await entrar(page, u, '/rendas');
  await linha(page, 'Freelance')
    .getByRole('button', { name: m.confirmar.acao('Freelance') })
    .click();
  const dlg = page.getByRole('dialog', { name: m.confirmar.titulo });
  const campo = dlg.getByRole('textbox', { name: m.confirmar.valor });
  await campo.clear();
  await campo.pressSequentially(String(real));
  await expect(dlg.getByRole('note', { name: m.confirmar.previa })).toContainText(
    m.confirmar.diferenca(formatarMoeda(menos(freelance.valor, real)), false),
  );
  await dlg.getByRole('button', { name: m.confirmar.titulo }).click();
  await expect(page.getByText('Recebimento confirmado')).toBeVisible();
  await expect(linha(page, 'Freelance')).toContainText(`+${formatarMoeda(real)}`);

  const g = await gravadoEmHoje(u);
  const a = indicadoresDaBarra(d);
  const b = indicadoresDaBarra(g);
  expect(b.saldoEmContas).toBe(mais(a.saldoEmContas, real));
  expect(b.resultadoDoMes).toBe(mais(a.resultadoDoMes, real));
  expect(b.patrimonioLiquido).toBe(mais(a.patrimonioLiquido, real));
  expect(b.previstoAteOFimDoMes).toBe(menos(a.previstoAteOFimDoMes, menos(freelance.valor, real)));
  await conferirBarra(page, b);
  await expect(totais(page).nth(1)).toHaveText(`+${formatarMoeda(real)}`);
});

test('"Ignorar este mês" tira a renda da projeção daquele mês', async ({ page }) => {
  const { u, d } = await preparar(page);
  const freelance = rendaDo(d, 'Freelance');
  const antes = rendasProjetadas(d);
  await entrar(page, u, '/rendas');
  await page.getByRole('button', { name: m.menu.rotulo('Freelance') }).click();
  await page.getByRole('menuitem', { name: new RegExp(`^${m.menu.ignorar}`) }).click();
  await expect(page.getByText('Ignorado este mês')).toBeVisible();
  await expect(linha(page, 'Freelance')).toContainText(m.chip.ignorada);
  await expect(
    linha(page, 'Freelance').getByRole('button', { name: m.confirmar.acao('Freelance') }),
  ).toBeHidden();

  const g = await gravadoEmHoje(u);
  const depois = rendasProjetadas(g);
  expect(depois.get(MES)).toBe(menos(antes.get(MES) ?? deMascara('0'), freelance.valor));
  expect(depois.get(DEZEMBRO)).toBe(antes.get(DEZEMBRO));
  expect(indicadoresDaBarra(g).previstoAteOFimDoMes).toBe(
    menos(indicadoresDaBarra(d).previstoAteOFimDoMes, freelance.valor),
  );
  expect(resumoRendas(g.fatos, MES, HOJE).previsto).toBe(
    menos(resumoRendas(d.fatos, MES, HOJE).previsto, freelance.valor),
  );

  // Já ignorada, o item fica desabilitado com o motivo do core.
  await page.getByRole('button', { name: m.menu.rotulo('Freelance') }).click();
  await expect(
    page.getByRole('menuitem', { name: new RegExp(`^${m.menu.ignorar}`) }),
  ).toBeDisabled();
  await expect(page.getByRole('menu')).toContainText('Este mês já foi confirmado ou ignorado');
});

test('a pendência "Confirmar" do Painel abre o diálogo da renda atrasada', async ({ page }) => {
  const nome = 'Aluguel do quarto';
  const { u, d } = await preparar(page, (f, ctx) => [
    criarRecorrencia(
      f,
      ctx,
      {
        natureza: 'renda',
        descricao: nome,
        competenciaInicio: MES,
        competenciaFim: null,
        autoConfirmar: false,
      },
      {
        valor: deMascara('80000'),
        dia: 2,
        formaPagamento: 'conta',
        contaId: f.contas[0]?.id ?? '',
        cartaoId: null,
        categoriaId: f.categorias.find((c) => c.tipo === 'receita')?.id ?? '',
      },
    ),
  ]);
  const pendencia = pendencias(d).find((p) => p.tipo === 'renda' && p.texto === nome);
  if (pendencia?.tipo !== 'renda') throw new Error('renda atrasada não preparada');
  await entrar(page, u, '/');
  const pm = mensagensPainel.pendencias;
  await page.getByRole('link', { name: pm.acao('Confirmar', pm.renda(nome)) }).click();
  await expect(page).toHaveURL(
    new RegExp(`/rendas\\?mes=${MES}&acao=confirmar&recorrencia=${pendencia.recorrenciaId}$`),
  );
  const dlg = page.getByRole('dialog', { name: m.confirmar.titulo });
  await expect(dlg).toContainText(m.confirmar.explicacao(nome, mesPorExtenso(MES)));
  await expect(dlg.getByLabel(m.confirmar.data)).toHaveValue(pendencia.data);
  await dlg.getByRole('button', { name: m.confirmar.titulo }).click();
  await expect(page.getByText('Recebimento confirmado')).toBeVisible();
  await expect(page).not.toHaveURL(/acao=/);
  await expect(linha(page, nome)).toContainText(
    m.chip.confirmada(formatarData(pendencia.data).slice(0, 5)),
  );
});

test('nova renda fixa entra na lista; excluir tira da lista e Desfazer volta', async ({ page }) => {
  const { u } = await preparar(page);
  await entrar(page, u, '/rendas');
  await page.getByRole('button', { name: m.nova }).click();
  const form = page.getByRole('dialog', { name: m.formulario.tituloNova });
  await form.getByRole('button', { name: m.formulario.criar }).click();
  await expect(form.getByText(m.formulario.erros.descricao)).toBeVisible();
  await form.getByLabel(m.formulario.descricao).fill('Aulas particulares');
  await form
    .getByRole('textbox', { name: m.formulario.valor, exact: true })
    .pressSequentially('45000');
  await form.getByRole('spinbutton', { name: m.formulario.dia }).fill('25');
  expect(await violacoesNoDialogo(page)).toEqual([]);
  await form.getByRole('button', { name: m.formulario.criar }).click();
  await expect(page.getByText('Renda fixa criada')).toBeVisible();
  await expect(form).toBeHidden();
  await expect(linha(page, 'Aulas particulares')).toContainText(
    `+${formatarMoeda(deMascara('45000'))}`,
  );
  const g = await gravadoEmHoje(u);
  expect(rendaDo(g, 'Aulas particulares').data).toBe(`${MES}-25`);

  await page.getByRole('button', { name: m.menu.rotulo('Aulas particulares') }).click();
  await page.getByRole('menuitem', { name: new RegExp(`^${m.menu.excluir}`) }).click();
  await expect(page.getByText(m.excluida)).toBeVisible();
  await expect(linha(page, 'Aulas particulares')).toHaveCount(0);
  await page
    .getByRole('listitem')
    .filter({ hasText: m.excluida })
    .getByRole('button', { name: 'Desfazer' })
    .click();
  await expect(page.getByText('Desfeito')).toBeVisible();
  await expect(linha(page, 'Aulas particulares')).toHaveCount(1);
});
