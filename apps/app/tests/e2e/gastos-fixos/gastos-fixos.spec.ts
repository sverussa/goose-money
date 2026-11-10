import AxeBuilder from '@axe-core/playwright';
import {
  competencia,
  competenciaDe,
  comprometimentoDaRenda,
  type Derivado,
  faturaDoGastoNoCartao,
  indicadoresDaBarra,
  itensPrevistosNaFatura,
  mais,
  menos,
  pendencias,
  resumoGastos,
  somarMeses,
} from '@goose-money/core';
import { expect, type Page, test } from '@playwright/test';

import { formatarData, formatarMoeda, formatarPercentual } from '../../../src/app/formatacao';
import { detalheDoGasto, gastosDoMes } from '../../../src/features/gastos-fixos/gastos';
import { mensagensGastos } from '../../../src/features/gastos-fixos/mensagens';
import { mensagensPainel } from '../../../src/features/painel/mensagens';
import { dataDaConfirmacao, mesPorExtenso } from '../../../src/features/recorrencias/recorrencias';
import { conferirBarra, entrar } from '../lancar/apoio';
import { gravadoEmHoje, HOJE, idDo, preparar } from '../painel/apoio';

// T05-26: Gastos fixos (3.8, 6.8, 7.4, 11.4, 11.6), com o seed de 04/11/2026.

test.use({ viewport: { width: 1440, height: 1000 } });

const m = mensagensGastos;
const MES = competenciaDe(HOJE);
const ddmm = (d: string) => formatarData(d as typeof HOJE).slice(0, 5);
const lista = (page: Page, mes = MES) =>
  page.getByRole('region', { name: m.lista(mesPorExtenso(mes)) });
const linha = (page: Page, nome: string, mes = MES) =>
  lista(page, mes)
    .getByRole('listitem')
    .filter({ has: page.getByText(nome, { exact: true }) });
const totais = (page: Page) => page.getByRole('region', { name: m.totais }).getByRole('definition');
const gastoDo = (d: Derivado, nome: string, mes = MES) => {
  const o = gastosDoMes(d.fatos, mes, d.hoje).find((x) => x.recorrencia.descricao === nome);
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

test('cabeçalho, comprometimento e lista saem do core; Energia do dia 31 cai no 30 e no 28 (11.6)', async ({
  page,
}) => {
  const { u, d } = await preparar(page);
  await entrar(page, u, '/gastos-fixos');
  const r = resumoGastos(d.fatos, MES, HOJE);
  await expect(totais(page)).toHaveText([
    formatarMoeda(r.previsto),
    formatarMoeda(r.pago),
    formatarMoeda(r.aPagar),
    formatarMoeda(r.vencido),
    formatarPercentual(comprometimentoDaRenda(d, MES).razao),
  ]);
  for (const o of gastosDoMes(d.fatos, MES, HOJE)) {
    const l = linha(page, o.recorrencia.descricao);
    await expect(l).toContainText(`−${formatarMoeda(o.valor)}`);
    await expect(l).toContainText(detalheDoGasto(d, o));
    await expect(l).toContainText(m.diaDoMes(Number(o.data.slice(8))));
    const acao = o.cartaoId ? m.noCartao : m.pagar;
    await expect(l.getByRole('button', { name: acao.acao(o.recorrencia.descricao) })).toBeVisible();
  }
  // Academia vence amanhã: a mesma regra das Pendências do Painel.
  await expect(linha(page, 'Academia')).toContainText(m.chip.venceAmanha);
  const streaming = gastoDo(d, 'Streaming');
  const fatura = faturaDoGastoNoCartao(d.fatos, streaming);
  if (!fatura) throw new Error('Streaming é no cartão');
  await expect(page.getByRole('note')).toContainText(
    m.nota('Streaming', 'Cartão A', mesPorExtenso(fatura)),
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  // 11.6: dia 31 vira 30 em novembro e 28 em fevereiro.
  const energia = gastoDo(d, 'Energia');
  expect(energia.data).toBe(`${MES}-30`);
  await expect(linha(page, 'Energia')).toContainText(m.chip.prevista(ddmm(energia.data)));
  await expect(linha(page, 'Energia')).toContainText(m.detalhe.diaAjustado(31, 30, 'novembro'));
  const FEVEREIRO = competencia('2027-02');
  const fev = gastoDo(d, 'Energia', FEVEREIRO);
  expect(fev.data).toBe(`${FEVEREIRO}-28`);
  await page.goto(`/#/gastos-fixos?mes=${FEVEREIRO}`);
  await expect(linha(page, 'Energia', FEVEREIRO)).toContainText(m.diaDoMes(28));
  await expect(linha(page, 'Energia', FEVEREIRO)).toContainText(m.chip.prevista(ddmm(fev.data)));
});

test('"Pagar" em conta pelo valor previsto: Saldo em contas −v, Previsto inalterado (7.4)', async ({
  page,
}) => {
  const { u, d } = await preparar(page);
  const aluguel = gastoDo(d, 'Aluguel');
  await entrar(page, u, '/gastos-fixos');
  await linha(page, 'Aluguel')
    .getByRole('button', { name: m.pagar.acao('Aluguel') })
    .click();
  const dlg = page.getByRole('dialog', { name: m.pagar.titulo });
  await expect(dlg).toContainText(m.pagar.explicacao('Aluguel', mesPorExtenso(MES)));
  await expect(dlg.getByRole('textbox', { name: m.pagar.valor })).toHaveValue(
    formatarMoeda(aluguel.valor),
  );
  await expect(dlg.getByLabel(m.pagar.data)).toHaveValue(dataDaConfirmacao(aluguel, HOJE));
  await expect(dlg.getByRole('note', { name: m.pagar.previa })).toContainText(
    m.pagar.entra(formatarMoeda(aluguel.valor), 'Conta corrente'),
  );
  expect(await violacoesNoDialogo(page)).toEqual([]);
  await dlg.getByRole('button', { name: m.pagar.titulo }).click();
  await expect(page.getByText('Pagamento confirmado')).toBeVisible();
  await expect(dlg).toBeHidden();
  await expect(linha(page, 'Aluguel')).toContainText(
    m.chip.confirmada(ddmm(dataDaConfirmacao(aluguel, HOJE))),
  );

  const g = await gravadoEmHoje(u);
  const a = indicadoresDaBarra(d);
  const b = indicadoresDaBarra(g);
  expect(b.saldoEmContas).toBe(menos(a.saldoEmContas, aluguel.valor));
  expect(b.aPagarNosCartoes).toBe(a.aPagarNosCartoes);
  expect(b.resultadoDoMes).toBe(menos(a.resultadoDoMes, aluguel.valor));
  expect(b.previstoAteOFimDoMes).toBe(a.previstoAteOFimDoMes);
  expect(b.patrimonioLiquido).toBe(menos(a.patrimonioLiquido, aluguel.valor));
  await conferirBarra(page, b);
  const r = resumoGastos(g.fatos, MES, HOJE);
  await expect(totais(page).nth(1)).toHaveText(`−${formatarMoeda(r.pago)}`);
  expect(r.pago).toBe(mais(resumoGastos(d.fatos, MES, HOJE).pago, aluguel.valor));
});

test('Streaming confirmado no cartão vira compra na fatura certa e sai dos previstos dela (11.4)', async ({
  page,
}) => {
  const { u, d } = await preparar(page);
  const cartaoA = idDo(d.fatos, 'Cartão A');
  const streaming = gastoDo(d, 'Streaming');
  const data = dataDaConfirmacao(streaming, HOJE);
  const fatura = faturaDoGastoNoCartao(d.fatos, { cartaoId: cartaoA, data });
  if (!fatura) throw new Error('Streaming é no cartão');
  const previstos = (x: Derivado) =>
    itensPrevistosNaFatura(x.fatos, cartaoA, fatura, HOJE).map((o) => o.recorrencia.descricao);
  expect(previstos(d)).toContain('Streaming');

  await entrar(page, u, '/gastos-fixos');
  await linha(page, 'Streaming')
    .getByRole('button', { name: m.noCartao.acao('Streaming') })
    .click();
  const dlg = page.getByRole('dialog', { name: m.noCartao.titulo });
  await expect(dlg.getByRole('note', { name: m.noCartao.previa })).toContainText(
    m.noCartao.entra(formatarMoeda(streaming.valor), 'Cartão A', mesPorExtenso(fatura)),
  );
  expect(await violacoesNoDialogo(page)).toEqual([]);
  await dlg.getByRole('button', { name: m.noCartao.titulo }).click();
  await expect(page.getByText('Pagamento confirmado')).toBeVisible();
  await expect(linha(page, 'Streaming')).toContainText(m.chip.confirmada(ddmm(data)));
  await expect(
    linha(page, 'Streaming').getByRole('button', { name: m.noCartao.acao('Streaming') }),
  ).toBeHidden();

  const g = await gravadoEmHoje(u);
  expect(previstos(g)).not.toContain('Streaming');
  const itens = g.faturas.get(cartaoA)?.find((f) => f.competencia === fatura)?.itens ?? [];
  const compra = itens.find((i) => i.tipo === 'parcela' && i.compra.descricao === 'Streaming');
  expect(compra?.valor).toBe(streaming.valor);
  expect(compra?.tipo === 'parcela' && compra.compra.numeroParcelas).toBe(1);
  // Sem dupla contagem: a compra entra no A pagar e nada mais muda o saldo das contas.
  const a = indicadoresDaBarra(d);
  const b = indicadoresDaBarra(g);
  expect(b.saldoEmContas).toBe(a.saldoEmContas);
  expect(b.aPagarNosCartoes).toBe(mais(a.aPagarNosCartoes, streaming.valor));
});

test('a pendência "Pagar" do Painel abre o diálogo do gasto', async ({ page }) => {
  const { u, d } = await preparar(page);
  const pendencia = pendencias(d).find((p) => p.tipo === 'gasto' && p.texto === 'Academia');
  if (pendencia?.tipo !== 'gasto') throw new Error('Academia não vence logo no seed');
  await entrar(page, u, '/');
  const pm = mensagensPainel.pendencias;
  await page.getByRole('link', { name: pm.acao(pendencia.acao, pm.gasto('Academia')) }).click();
  await expect(page).toHaveURL(
    new RegExp(
      `/gastos-fixos\\?mes=${pendencia.competencia}&acao=confirmar&recorrencia=${pendencia.recorrenciaId}$`,
    ),
  );
  const dlg = page.getByRole('dialog', { name: m.pagar.titulo });
  await expect(dlg).toContainText(m.pagar.explicacao('Academia', mesPorExtenso(MES)));
  await dlg.getByRole('button', { name: m.pagar.titulo }).click();
  await expect(page.getByText('Pagamento confirmado')).toBeVisible();
  await expect(page).not.toHaveURL(/acao=/);
  await expect(linha(page, 'Academia')).toContainText(
    m.chip.confirmada(ddmm(dataDaConfirmacao(pendencia, HOJE))),
  );
});

test('novo gasto fixo no cartão mostra a fatura do mês e entra na lista', async ({ page }) => {
  const { u, d } = await preparar(page);
  await entrar(page, u, '/gastos-fixos');
  await page.getByRole('button', { name: m.nova }).click();
  const form = page.getByRole('dialog', { name: m.formulario.tituloNova });
  await form.getByLabel(m.formulario.descricao).fill('Música');
  await form
    .getByRole('textbox', { name: m.formulario.valor, exact: true })
    .pressSequentially('2190');
  await form.getByRole('spinbutton', { name: m.formulario.dia }).fill('20');
  await form.getByRole('combobox', { name: m.formulario.forma }).click();
  await page.getByRole('option', { name: m.formulario.formas.cartao }).click();
  await form.getByRole('combobox', { name: m.formulario.cartao }).click();
  await page.getByRole('option', { name: 'Cartão A' }).click();
  const fatura = faturaDoGastoNoCartao(d.fatos, {
    cartaoId: idDo(d.fatos, 'Cartão A'),
    data: `${MES}-20` as typeof HOJE,
  });
  if (!fatura) throw new Error('no cartão');
  await expect(form.getByRole('note', { name: m.formulario.notaFatura })).toHaveText(
    m.formulario.fatura(mesPorExtenso(MES), mesPorExtenso(fatura)),
  );
  expect(await violacoesNoDialogo(page)).toEqual([]);
  await form.getByRole('button', { name: m.formulario.criar }).click();
  await expect(page.getByText('Gasto fixo criado')).toBeVisible();
  await expect(form).toBeHidden();
  const g = await gravadoEmHoje(u);
  const musica = gastoDo(g, 'Música');
  expect(musica.cartaoId).toBe(idDo(d.fatos, 'Cartão A'));
  await expect(linha(page, 'Música')).toContainText(detalheDoGasto(g, musica));
  await expect(
    linha(page, 'Música').getByRole('button', { name: m.noCartao.acao('Música') }),
  ).toBeVisible();
  // O mês seguinte também tem o gasto, na fatura do ciclo.
  expect(gastoDo(g, 'Música', somarMeses(MES, 1)).valor).toBe(musica.valor);
});
