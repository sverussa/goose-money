import AxeBuilder from '@axe-core/playwright';
import {
  aplicar,
  competenciaDe,
  configurarCiclo,
  type Contexto,
  criarCartao,
  dataCivil,
  datasDaFatura,
  deMascara,
  type Fatos,
  faturaAberta,
  menos,
  primeiroDia,
  periodo,
  receitas,
  somarDias,
  ultimaData,
} from '@goose-money/core';
import { expect, type Page, test } from '@playwright/test';

import { formatarData, formatarMesCurto, formatarMoeda } from '../../../src/app/formatacao';
import { entrar } from '../lancar/apoio';
import { gravadoEmHoje, HOJE, idDo, preparar } from './apoio';

// T05-15: Pagar fatura, Lançar encargo ou estorno e Configurar ciclo (3.5, 6.5, 11.3).

test.use({ viewport: { width: 1440, height: 1000 } });

/** Cartão C (fecha 10, vence 20) com uma fatura fechada a pagar de `saldo` (dígitos da máscara). */
const comFaturaDe =
  (saldo: string, cadastro = HOJE) =>
  (f: Fatos, ctx: Contexto) => [
    criarCartao(
      f,
      { ...ctx, hoje: cadastro },
      {
        nome: 'Cartão C',
        instituicao: null,
        cor: 'categorica-2',
        limite: deMascara('500000'),
        contaPagamentoId: f.cartoes[0]?.contaPagamentoId ?? '',
        diaFechamento: 10,
        diaVencimento: 20,
        saldoFaturaFechada: deMascara(saldo),
      },
    ),
  ];

const dialogo = (page: Page, nome: string) => page.getByRole('dialog', { name: nome });
const totais = (page: Page) => page.getByRole('region', { name: 'Totais da fatura' });

async function pagar(page: Page, valor: string) {
  await page.getByRole('button', { name: 'Pagar fatura', exact: true }).click();
  const d = dialogo(page, 'Pagar fatura');
  await d.getByRole('radio', { name: 'Outro valor' }).click();
  await d.getByRole('textbox', { name: 'Valor' }).pressSequentially(valor);
  return d;
}

test('R$ 600,00 numa fatura de R$ 1.000,00: restam R$ 400,00 e o chip "Paga parcialmente" (11.3)', async ({
  page,
}) => {
  const { u, d } = await preparar(page, comFaturaDe('100000'));
  const c = idDo(d.fatos, 'Cartão C');
  const fatura = (d.faturas.get(c) ?? []).find((f) => f.saldo > 0);
  if (!fatura) throw new Error('sem a fatura fechada');
  await entrar(page, u, `/cartoes/${c}`);
  const dlg = await pagar(page, '60000');
  // O destino padrão é a fatura vencida ou fechada mais antiga com saldo (3.5).
  await expect(dlg.getByRole('combobox', { name: 'Fatura de destino' })).toContainText(
    formatarMesCurto(fatura.competencia),
  );
  await expect(dlg.getByRole('note', { name: 'Antes de salvar' })).toContainText(
    `Restam ${formatarMoeda(menos(fatura.saldo, deMascara('60000')))} na fatura de ${formatarMesCurto(fatura.competencia)}`,
  );
  expect((await new AxeBuilder({ page }).include('[role="dialog"]').analyze()).violations).toEqual(
    [],
  );
  await dlg.getByRole('button', { name: 'Registrar pagamento' }).click();
  await expect(page.getByText('Fatura paga')).toBeVisible();
  await page.goto(`/#/cartoes/${c}?fatura=${fatura.competencia}`);
  await expect(totais(page)).toContainText('Paga parcialmente');
  await expect(totais(page).getByRole('definition').first()).toHaveText(
    formatarMoeda(deMascara('40000')),
  );
});

test('R$ 550,00 numa de R$ 500,00: crédito de R$ 50,00 e nenhuma receita reconhecida (11.3)', async ({
  page,
}) => {
  const { u, d } = await preparar(page, comFaturaDe('50000'));
  const c = idDo(d.fatos, 'Cartão C');
  const mes = competenciaDe(HOJE);
  const doMes = periodo(primeiroDia(mes), ultimaData(mes));
  await entrar(page, u, `/cartoes/${c}`);
  const dlg = await pagar(page, '55000');
  await expect(dlg.getByRole('note', { name: 'Antes de salvar' })).toContainText(
    `sobram ${formatarMoeda(deMascara('5000'))} de crédito para a próxima fatura`,
  );
  await dlg.getByRole('button', { name: 'Registrar pagamento' }).click();
  await expect(page.getByText('Fatura paga')).toBeVisible();
  const g = await gravadoEmHoje(u);
  const faturas = g.faturas.get(c) ?? [];
  const paga = faturas.find((f) => f.totalPago > 0);
  expect(paga?.status).toBe('paga');
  expect(receitas(g, doMes)).toBe(receitas(d, doMes));
});

test('mudar o fechamento vale a partir da fatura aberta e não move parcelas nem faturas fechadas (11.3)', async ({
  page,
}) => {
  const { u, d, ctx } = await preparar(page);
  const a = idDo(d.fatos, 'Cartão A');
  const cartao = d.fatos.cartoes.find((x) => x.id === a);
  if (!cartao) throw new Error('sem o Cartão A');
  const aberta = faturaAberta(cartao, d.fatos.cartaoCiclos, HOJE);
  await entrar(page, u, `/cartoes/${a}`);
  await page.getByRole('button', { name: 'Configurar ciclo', exact: true }).click();
  const dlg = dialogo(page, 'Configurar ciclo');
  await dlg.getByRole('spinbutton', { name: 'Dia de fechamento' }).fill('15');
  await dlg.getByRole('spinbutton', { name: 'Dia de vencimento' }).fill('25');
  const novas = datasDaFatura(
    cartao,
    aplicar(d.fatos, configurarCiclo(d.fatos, ctx, a, 15, 25).mudancas).cartaoCiclos,
    aberta,
  );
  await expect(dlg.getByRole('note', { name: 'Antes de salvar' })).toContainText(
    `Valem a partir da fatura de ${formatarMesCurto(aberta)}: fecha em ${formatarData(novas.fechamento)} e vence em ${formatarData(novas.vencimento)}`,
  );
  await dlg.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByText('Ciclo configurado')).toBeVisible();

  const g = await gravadoEmHoje(u);
  const parcelas = (f: Fatos) =>
    f.parcelas
      .map((p) => [p.id, p.competencia])
      .sort((x, y) => String(x[0]).localeCompare(String(y[0])));
  expect(parcelas(g.fatos)).toEqual(parcelas(d.fatos));
  const fechadas = (x: typeof d) =>
    (x.faturas.get(a) ?? [])
      .filter((f) => f.competencia < aberta)
      .map((f) => [f.competencia, f.fechamento, f.vencimento]);
  expect(fechadas(g)).toEqual(fechadas(d));
});

test('encargo de juros cai na fatura da data com "Juros e encargos"; o rotativo sugere "Lançar juros" (3.5)', async ({
  page,
}) => {
  // Cadastrado em 04/09 com fatura fechada a pagar: em 04/11 o saldo já foi transportado.
  const { u, d } = await preparar(page, comFaturaDe('30000', dataCivil('2026-09-04')));
  const c = idDo(d.fatos, 'Cartão C');
  const comTransporte = (d.faturas.get(c) ?? []).find((f) =>
    f.itens.some((i) => i.tipo === 'saldo_anterior_nao_pago'),
  );
  if (!comTransporte) throw new Error('sem transporte');
  await entrar(page, u, `/cartoes/${c}?fatura=${comTransporte.competencia}`);
  await page.getByRole('button', { name: 'Lançar juros' }).click();
  const dlg = dialogo(page, 'Lançar encargo ou estorno');
  await expect(dlg.getByRole('radio', { name: 'Juros' })).toBeChecked();
  await expect(dlg.getByRole('combobox', { name: 'Categoria' })).toHaveText('Juros e encargos');
  await dlg.getByRole('textbox', { name: 'Valor' }).pressSequentially('4500');
  // A data sugerida é a véspera do fechamento: os juros caem na própria fatura do rotativo.
  await expect(dlg.getByLabel('Data')).toHaveValue(somarDias(comTransporte.fechamento, -1));
  await expect(dlg).toContainText(
    `Cai na fatura de ${formatarMesCurto(comTransporte.competencia)}`,
  );
  await dlg.getByRole('button', { name: 'Lançar', exact: true }).click();
  await expect(page.getByText('Encargo lançado')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lançar juros' })).toHaveCount(0);
  const g = await gravadoEmHoje(u);
  const item = g.fatos.itensFatura.find((i) => i.cartaoId === c && i.tipo === 'encargo');
  expect(item).toMatchObject({
    valor: deMascara('4500'),
    descricao: 'Juros',
    competencia: comTransporte.competencia,
    categoriaId: d.fatos.categorias.find((x) => x.sistema === 'juros_encargos')?.id,
  });
});
