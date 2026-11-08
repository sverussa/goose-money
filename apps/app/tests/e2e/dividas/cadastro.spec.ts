import AxeBuilder from '@axe-core/playwright';
import {
  centavos,
  D,
  type Derivado,
  indicadoresDaBarra,
  mais,
  tabelaParcelaInformada,
  tabelaPrice,
  type TabelaDaDivida,
  taxaImplicita,
} from '@goose-money/core';
import { expect, type Page, test } from '@playwright/test';

import { formatarMoeda, formatarTaxa } from '../../../src/app/formatacao';
import { mensagensDividas } from '../../../src/features/dividas/mensagens';
import { opcoesDeCategoria } from '../../../src/features/lancar/padroes';
import { conferirBarra, entrar } from '../lancar/apoio';
import { gravadoEmHoje, preparar } from '../painel/apoio';

// T05-23: cadastro de dívida em 5 etapas (6.6, 3.7, 11.5), com o seed de 04/11/2026.

test.use({ viewport: { width: 1440, height: 900 } });

const m = mensagensDividas.cadastro;
const dialogo = (page: Page) => page.getByRole('dialog', { name: m.titulo });
const etapa = (page: Page, n: number, nome: string) =>
  dialogo(page).getByRole('heading', { name: m.etapa(n, 5, nome) });
const continuar = (page: Page) => dialogo(page).getByRole('button', { name: m.continuar }).click();
async function escolher(page: Page, rotulo: string, opcao: string) {
  await dialogo(page).getByRole('combobox', { name: rotulo }).click();
  await page.getByRole('option', { name: opcao, exact: true }).click();
}
/** O valor (`dd`) do item `rotulo` no resumo da prévia. */
const resumo = (page: Page, rotulo: string) =>
  dialogo(page)
    .getByRole('term')
    .filter({ hasText: new RegExp(`^${rotulo}$`) })
    .locator('xpath=following-sibling::dd[1]');
const doSistema = (d: Derivado, s: string) => {
  const t = [...d.dividas.values()].find((x) => x.divida.sistemaAmortizacao === s);
  if (!t) throw new Error(`seed sem dívida ${s}`);
  return t;
};
const nomeDaConta = (d: Derivado, id: string) => d.porId.contas.get(id)?.nome ?? '';

/** Etapa 1 com os dados do contrato da dívida do seed e um credor novo. */
async function contrato(page: Page, t: TabelaDaDivida, credor: string) {
  await page.getByRole('button', { name: mensagensDividas.nova }).click();
  await expect(page).toHaveURL(/nova=1/);
  await expect(etapa(page, 1, m.nomes.contrato)).toBeVisible();
  await dialogo(page).getByRole('radio', { name: mensagensDividas.tipo[t.divida.tipo] }).click();
  await dialogo(page).getByRole('textbox', { name: m.credor }).fill(credor);
  await dialogo(page)
    .getByRole('textbox', { name: m.valorContratado })
    .pressSequentially(String(t.divida.valorContratado));
  await dialogo(page).getByLabel(m.dataContratacao).fill(t.divida.dataContratacao);
  await continuar(page);
  await expect(etapa(page, 2, m.nomes.destino)).toBeVisible();
}

test('financiamento Price R$ 40.000,00, 1,49%, 48x: prévia com a tabela do core e saldo final R$ 0,00 (11.5)', async ({
  page,
}) => {
  const { u, d } = await preparar(page);
  const t = doSistema(d, 'price');
  const credor = `${t.divida.credor} 2`;
  await entrar(page, u, '/dividas');
  await contrato(page, t, credor);

  // Etapa 2: pago a terceiro (o padrão do financiamento), com a categoria do seed.
  await expect(dialogo(page).getByRole('radio', { name: 'Pago a terceiro' })).toBeChecked();
  await expect(dialogo(page).getByRole('note')).toHaveText(m.explicacao.pago_a_terceiro);
  const categoria = opcoesDeCategoria(d.fatos, 'despesa').find(
    (c) => c.id === t.divida.categoriaId,
  );
  await escolher(page, m.categoria, categoria?.nome ?? '');
  await continuar(page);

  // Etapa 3: Price, taxa, n, 1ª parcela e conta de débito.
  await expect(etapa(page, 3, m.nomes.condicoes)).toBeVisible();
  await expect(dialogo(page).getByRole('radio', { name: 'Price' })).toBeChecked();
  await dialogo(page).getByRole('textbox', { name: m.taxa }).fill('1,49');
  await dialogo(page).getByRole('textbox', { name: m.numeroParcelas }).fill('48');
  await dialogo(page).getByLabel(m.dataPrimeiraParcela).fill(t.divida.dataPrimeiraParcela);
  await escolher(page, m.contaDebito, nomeDaConta(d, t.divida.contaDebitoId));
  await continuar(page);

  // Etapa 4: as 12 pagas antes do cadastro.
  await expect(etapa(page, 4, m.nomes.antes)).toBeVisible();
  await dialogo(page).getByRole('textbox', { name: m.parcelasPagas }).fill('12');
  await continuar(page);

  // Etapa 5: a tabela inteira do core, com a última zerando o saldo.
  await expect(etapa(page, 5, m.nomes.previa)).toBeVisible();
  const gerada = tabelaPrice(
    t.divida.valorContratado,
    new D('0.0149'),
    48,
    t.divida.dataPrimeiraParcela,
  );
  const ultima = gerada.at(-1);
  if (!ultima) throw new Error('tabela vazia');
  expect(ultima.saldoDevedor).toBe(0);
  const tabela = dialogo(page).getByRole('table', { name: mensagensDividas.tabela.titulo });
  await expect(tabela.getByRole('row')).toHaveCount(gerada.length + 1);
  await expect(tabela.getByRole('row').last()).toContainText(formatarMoeda(ultima.valor));
  await expect(tabela.getByRole('row').last()).toContainText(formatarMoeda(ultima.saldoDevedor));
  await expect(tabela.getByRole('row').filter({ hasText: 'Paga antes do cadastro' })).toHaveCount(
    12,
  );
  await expect(resumo(page, m.saldoFinal)).toHaveText(formatarMoeda(ultima.saldoDevedor));
  await expect(resumo(page, m.totalJuros)).toHaveText(
    formatarMoeda(gerada.reduce((s, l) => mais(s, l.juros), centavos(0))),
  );
  await expect(resumo(page, mensagensDividas.detalhe.taxaInformada)).toHaveText(
    `${formatarTaxa('0.0149')} a.m.`,
  );
  expect(
    (await new AxeBuilder({ page }).include('[role="dialog"]').analyze()).violations.map(
      (v) => v.id,
    ),
  ).toEqual([]);

  // Voltar mantém o que foi digitado.
  await dialogo(page).getByRole('button', { name: m.voltar }).click();
  await expect(dialogo(page).getByRole('textbox', { name: m.parcelasPagas })).toHaveValue('12');
  await continuar(page);

  await dialogo(page).getByRole('button', { name: m.salvar }).click();
  await expect(dialogo(page)).toBeHidden();
  await expect(page).not.toHaveURL(/nova=1/);
  await expect(page.getByText('Dívida cadastrada')).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: mensagensDividas.lista }).getByRole('link', {
      name: new RegExp(credor),
    }),
  ).toBeVisible();
  const gravado = await gravadoEmHoje(u);
  const nova = [...gravado.dividas.values()].find((x) => x.divida.credor === credor);
  expect(
    nova?.parcelas.map(({ valor, juros, amortizacao, vencimento }) => ({
      valor,
      juros,
      amortizacao,
      vencimento,
    })),
  ).toEqual(
    gerada.map(({ valor, juros, amortizacao, vencimento }) => ({
      valor,
      juros,
      amortizacao,
      vencimento,
    })),
  );
  expect(nova?.parcelas.filter((p) => p.status === 'paga_antes_do_cadastro')).toHaveLength(12);
  expect(nova?.divida.categoriaId).toBe(t.divida.categoriaId);
});

test('parcela informada: R$ 300,00 × 12 é rejeitada na etapa 3; R$ 450,00 × 12 mostra a taxa implícita (11.5)', async ({
  page,
}) => {
  const { u, d } = await preparar(page);
  const t = doSistema(d, 'parcela_informada');
  const credor = `${t.divida.credor} 2`;
  await entrar(page, u, `/dividas/${t.divida.id}`);
  await contrato(page, t, credor);

  // Dívida antiga: "Registrar a entrada" começa desligado.
  await expect(dialogo(page).getByRole('radio', { name: 'Creditado em conta' })).toBeChecked();
  await expect(dialogo(page).getByRole('switch', { name: m.registrarEntrada })).not.toBeChecked();
  await continuar(page);

  await dialogo(page).getByRole('radio', { name: 'Parcela informada' }).click();
  const parcela = dialogo(page).getByRole('textbox', { name: m.valorParcela });
  await parcela.pressSequentially('30000');
  await dialogo(page).getByRole('textbox', { name: m.numeroParcelas }).fill('12');
  await dialogo(page).getByLabel(m.dataPrimeiraParcela).fill(t.divida.dataPrimeiraParcela);
  await escolher(page, m.contaDebito, nomeDaConta(d, t.divida.contaDebitoId));
  await continuar(page);
  await expect(etapa(page, 3, m.nomes.condicoes)).toBeVisible();
  await expect(parcela).toHaveAccessibleDescription(m.erros.somaMenor);
  await expect(parcela).toHaveAttribute('aria-invalid', 'true');

  await parcela.fill('');
  await parcela.pressSequentially('45000');
  await continuar(page);
  await dialogo(page).getByRole('textbox', { name: m.parcelasPagas }).fill('3');
  await continuar(page);

  await expect(etapa(page, 5, m.nomes.previa)).toBeVisible();
  const pv = t.divida.valorContratado;
  const pmt = t.divida.valorParcelaInformada ?? centavos(0);
  const taxa = taxaImplicita(pv, pmt, 12);
  expect(formatarTaxa(taxa)).toMatch(/^1,86/);
  await expect(resumo(page, mensagensDividas.detalhe.taxaImplicita)).toHaveText(
    `${formatarTaxa(taxa)} a.m.`,
  );
  const { diferencaUltima, linhas } = tabelaParcelaInformada(
    pv,
    pmt,
    12,
    t.divida.dataPrimeiraParcela,
  );
  await expect(resumo(page, m.diferencaUltima)).toHaveText(
    m.diferenca(formatarMoeda(diferencaUltima), diferencaUltima > 0),
  );
  await expect(resumo(page, m.saldoFinal)).toHaveText(
    formatarMoeda(linhas.at(-1)?.saldoDevedor ?? centavos(-1)),
  );

  await dialogo(page).getByRole('button', { name: m.salvar }).click();
  await expect(page.getByText('Dívida cadastrada')).toBeVisible();
  const gravado = await gravadoEmHoje(u);
  const nova = [...gravado.dividas.values()].find((x) => x.divida.credor === credor);
  expect(nova?.parcelas.map((p) => p.valor)).toEqual(linhas.map((l) => l.valor));
  expect(nova?.parcelas.filter((p) => p.status === 'paga_antes_do_cadastro')).toHaveLength(3);
  // Sem "Registrar a entrada": nenhuma captação.
  expect(
    gravado.fatos.lancamentos.filter(
      (l) => l.dividaId === nova?.divida.id && l.tipo === 'captacao',
    ),
  ).toHaveLength(0);
});

test('empréstimo creditado em conta com "Registrar a entrada" aumenta o Saldo em contas e não muda o Resultado; Desfazer volta', async ({
  page,
}) => {
  const { u, d } = await preparar(page);
  const conta = d.fatos.contas.find((c) => c.incluirNoTotal && !c.arquivada);
  if (!conta) throw new Error('seed sem conta no total');
  const valor = centavos(1_000_000);
  await entrar(page, u, '/dividas');
  await page.getByRole('button', { name: mensagensDividas.nova }).click();
  await dialogo(page).getByRole('textbox', { name: m.credor }).fill('Banco do bairro');
  await dialogo(page)
    .getByRole('textbox', { name: m.valorContratado })
    .pressSequentially(String(valor));
  await continuar(page);

  // Contratado hoje: dívida nova, "Registrar a entrada" começa ligado.
  await expect(dialogo(page).getByRole('note')).toHaveText(m.explicacao.creditado_em_conta);
  await expect(dialogo(page).getByRole('switch', { name: m.registrarEntrada })).toBeChecked();
  await escolher(page, m.contaCredito, conta.nome);
  await continuar(page);
  await dialogo(page).getByRole('textbox', { name: m.taxa }).fill('2');
  await escolher(page, m.contaDebito, conta.nome);
  await continuar(page);
  await continuar(page);
  await expect(etapa(page, 5, m.nomes.previa)).toBeVisible();

  const antes = indicadoresDaBarra(await gravadoEmHoje(u));
  await dialogo(page).getByRole('button', { name: m.salvar }).click();
  await expect(page.getByText('Dívida cadastrada')).toBeVisible();
  const depois = indicadoresDaBarra(await gravadoEmHoje(u));
  expect(depois.saldoEmContas).toBe(mais(antes.saldoEmContas, valor));
  expect(depois.resultadoDoMes).toBe(antes.resultadoDoMes);
  await conferirBarra(page, depois);

  await page.getByRole('button', { name: 'Desfazer' }).click();
  await expect(page.getByText('Desfeito')).toBeVisible();
  await conferirBarra(page, antes);
  expect(indicadoresDaBarra(await gravadoEmHoje(u))).toEqual(antes);
});

test('erros inline da etapa 1 e Cancelar fecha sem gravar', async ({ page }) => {
  const { u, d } = await preparar(page);
  await entrar(page, u, '/dividas');
  await page.getByRole('button', { name: mensagensDividas.nova }).click();
  await continuar(page);
  await expect(etapa(page, 1, m.nomes.contrato)).toBeVisible();
  await expect(dialogo(page).getByRole('textbox', { name: m.credor })).toHaveAccessibleDescription(
    `${m.dicaCredor} ${m.erros.credor}`,
  );
  await expect(
    dialogo(page).getByRole('textbox', { name: m.valorContratado }),
  ).toHaveAccessibleDescription(m.erros.valor);
  await dialogo(page).getByRole('button', { name: 'Cancelar' }).click();
  await expect(dialogo(page)).toBeHidden();
  expect((await gravadoEmHoje(u)).dividas.size).toBe(d.dividas.size);
});
