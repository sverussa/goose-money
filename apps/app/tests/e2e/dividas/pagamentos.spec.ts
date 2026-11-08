import AxeBuilder from '@axe-core/playwright';
import {
  amortizarDivida,
  competenciaDe,
  contratarDivida,
  dataCivil,
  deMascara,
  type Derivado,
  despesas,
  indicadoresDaBarra,
  menos,
  pendencias,
  periodo,
  primeiroDia,
  somar,
  type TabelaDaDivida,
  ultimaData,
} from '@goose-money/core';
import { expect, type Page, test } from '@playwright/test';

import { formatarData, formatarMesCurto, formatarMoeda } from '../../../src/app/formatacao';
import { mensagensDividas } from '../../../src/features/dividas/mensagens';
import { parcelaPadrao, previaDaAmortizacao } from '../../../src/features/dividas/pagamentos';
import { mensagensPainel } from '../../../src/features/painel/mensagens';
import { conferirBarra, entrar } from '../lancar/apoio';
import { gravadoEmHoje, HOJE, preparar } from '../painel/apoio';

// T05-24: Registrar pagamento e Amortizar (3.3, 3.7, 7.4, 11.4), com o seed de 04/11/2026.

test.use({ viewport: { width: 1440, height: 1000 } });

const mp = mensagensDividas.pagamento;
const ma = mensagensDividas.amortizacao;
const doMes = periodo(primeiroDia(competenciaDe(HOJE)), ultimaData(competenciaDe(HOJE)));
const doSistema = (d: Derivado, s: string) => {
  const t = [...d.dividas.values()].find((x) => x.divida.sistemaAmortizacao === s);
  if (!t) throw new Error(`seed sem dívida ${s}`);
  return t;
};
const tabela = (page: Page) => page.getByRole('table', { name: 'Tabela de amortização' });
const linhaDa = (page: Page, numero: number) =>
  tabela(page)
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name: String(numero), exact: true }) })
    .first();
const opcaoDa = (p: TabelaDaDivida['parcelas'][number]) =>
  mp.opcao(p.numero, formatarData(p.vencimento), formatarMoeda(p.valor), p.status === 'vencida');
const categoriaDa = (d: Derivado, t: TabelaDaDivida) =>
  d.porId.categorias.get(t.divida.categoriaId ?? '')?.nome ?? '';
const despesaDa = (d: Derivado, parcelaId: string) =>
  d.reconhecidos.find((i) => i.registro.entidade === 'parcelaDivida' && i.registro.id === parcelaId)
    ?.valor;

for (const [sistema, destino] of [
  ['price', 'pago a terceiro: a parcela inteira é despesa'],
  ['parcela_informada', 'creditado em conta: só os juros são despesa'],
] as const)
  test(`pagar a próxima parcela (${destino}): Saldo −v, Resultado igual, Patrimônio −juros (7.4, 11.4)`, async ({
    page,
  }) => {
    const { u, d } = await preparar(page);
    const t = doSistema(d, sistema);
    const parcela = parcelaPadrao(t, null);
    if (!parcela) throw new Error('sem parcela em aberto');
    const conta = d.porId.contas.get(t.divida.contaDebitoId);
    await entrar(page, u, `/dividas/${t.divida.id}`);
    await page.getByRole('button', { name: 'Registrar pagamento' }).click();
    await expect(page).toHaveURL(/\?acao=pagar$/);
    const dlg = page.getByRole('dialog', { name: mp.titulo });
    // Padrões: a próxima parcela, a conta de débito, o valor da parcela e hoje.
    await expect(dlg.getByRole('combobox', { name: mp.parcela })).toHaveText(opcaoDa(parcela));
    await expect(dlg.getByRole('combobox', { name: mp.conta })).toHaveText(
      mp.padrao(conta?.nome ?? ''),
    );
    await expect(dlg.getByRole('textbox', { name: mp.valor })).toHaveValue(
      formatarMoeda(parcela.valor),
    );
    await expect(dlg.getByLabel(mp.data)).toHaveValue(HOJE);
    const mes = formatarMesCurto(competenciaDe(parcela.vencimento));
    await expect(dlg.getByRole('note', { name: mp.previa })).toContainText(
      t.divida.destinoDoValor === 'creditado_em_conta'
        ? mp.naoEDespesa.creditado_em_conta(formatarMoeda(parcela.juros), mes)
        : mp.naoEDespesa.pago_a_terceiro(formatarMoeda(parcela.valor), categoriaDa(d, t), mes),
    );
    expect(
      (await new AxeBuilder({ page }).include('[role="dialog"]').analyze()).violations,
    ).toEqual([]);
    await dlg.getByRole('button', { name: 'Registrar pagamento' }).click();
    await expect(page.getByText('Pagamento registrado')).toBeVisible();
    await expect(dlg).toBeHidden();
    await expect(page).not.toHaveURL(/acao=/);
    await expect(linhaDa(page, parcela.numero)).toContainText('Paga');

    const g = await gravadoEmHoje(u);
    const antes = indicadoresDaBarra(d);
    const depois = indicadoresDaBarra(g);
    expect(depois.saldoEmContas).toBe(menos(antes.saldoEmContas, parcela.valor));
    expect(depois.resultadoDoMes).toBe(antes.resultadoDoMes);
    expect(depois.previstoAteOFimDoMes).toBe(antes.previstoAteOFimDoMes);
    expect(depois.patrimonioLiquido).toBe(menos(antes.patrimonioLiquido, parcela.juros));
    // 3.3: a despesa da parcela é a mesma antes e depois de pagar.
    const esperada =
      t.divida.destinoDoValor === 'creditado_em_conta' ? parcela.juros : parcela.valor;
    expect(despesaDa(d, parcela.id)).toBe(esperada);
    expect(despesaDa(g, parcela.id)).toBe(esperada);
    expect(despesas(g, doMes)).toBe(despesas(d, doMes));
    await conferirBarra(page, depois);
  });

test('amortizar com "Reduzir prazo": a prévia e a tabela mostram menos parcelas; pago a terceiro vira despesa (3.3, 3.7)', async ({
  page,
}) => {
  const { u, d, ctx } = await preparar(page);
  const t = doSistema(d, 'price');
  const valor = deMascara('500000');
  const previa = previaDaAmortizacao(
    d,
    t,
    amortizarDivida(d.fatos, ctx, t.divida.id, { valor, data: HOJE, modo: 'reduzirPrazo' }),
    HOJE,
  );
  expect(previa.depois.restantes).toBeLessThan(previa.antes.restantes);
  await entrar(page, u, `/dividas/${t.divida.id}`);
  await page.getByRole('button', { name: 'Amortizar' }).click();
  const dlg = page.getByRole('dialog', { name: ma.titulo });
  await expect(dlg.getByRole('radio', { name: ma.modos.reduzirPrazo })).toBeChecked();
  await dlg.getByRole('textbox', { name: ma.valor }).pressSequentially('500000');
  const nota = dlg.getByRole('note', { name: ma.previa });
  const itens = nota.getByRole('definition');
  await expect(itens.nth(0)).toHaveText(
    ma.dePara(String(previa.antes.restantes), String(previa.depois.restantes)),
  );
  await expect(itens.nth(1)).toHaveText(
    ma.dePara(
      formatarMoeda(previa.antes.parcela?.valor ?? deMascara('0')),
      formatarMoeda(previa.depois.parcela?.valor ?? deMascara('0')),
    ),
  );
  await expect(itens.nth(2)).toHaveText(
    ma.dePara(formatarMoeda(previa.antes.saldoDevedor), formatarMoeda(previa.depois.saldoDevedor)),
  );
  await expect(nota).toContainText(
    ma.comoConta.pago_a_terceiro(categoriaDa(d, t), formatarData(HOJE)),
  );
  expect((await new AxeBuilder({ page }).include('[role="dialog"]').analyze()).violations).toEqual(
    [],
  );

  // "Reduzir valor" mantém o número de parcelas na prévia.
  await dlg.getByRole('radio', { name: ma.modos.reduzirValor }).click();
  await expect(itens.nth(0)).toHaveText(
    ma.dePara(String(previa.antes.restantes), String(previa.antes.restantes)),
  );
  await dlg.getByRole('radio', { name: ma.modos.reduzirPrazo }).click();

  await dlg.getByRole('button', { name: ma.salvar }).click();
  await expect(page.getByText('Amortização registrada')).toBeVisible();
  await expect(dlg).toBeHidden();
  const removidas = previa.antes.restantes - previa.depois.restantes;
  await expect(tabela(page).getByRole('row')).toHaveCount(t.parcelas.length - removidas + 1);

  const g = await gravadoEmHoje(u);
  expect(g.dividas.get(t.divida.id)?.parcelas).toHaveLength(t.parcelas.length - removidas);
  expect(g.dividas.get(t.divida.id)?.resumo.saldoDevedor).toBe(previa.depois.saldoDevedor);
  expect(despesas(g, doMes)).toBe(somar([despesas(d, doMes), valor]));

  // Desfazer devolve a tabela original.
  await page.getByRole('button', { name: 'Desfazer' }).click();
  await expect(page.getByText('Desfeito')).toBeVisible();
  await expect(tabela(page).getByRole('row')).toHaveCount(t.parcelas.length + 1);
});

test('a pendência "Registrar pagamento" do Painel abre o diálogo com a parcela escolhida', async ({
  page,
}) => {
  const credor = 'Empréstimo da família';
  const { u, d } = await preparar(page, (f, ctx) => [
    contratarDivida(
      f,
      ctx,
      {
        tipo: 'emprestimo',
        credor,
        valorContratado: deMascara('120000'),
        dataContratacao: dataCivil('2026-08-20'),
        destinoDoValor: 'creditado_em_conta',
        sistemaAmortizacao: 'price',
        taxaMensal: '0',
        valorParcelaInformada: null,
        numeroParcelas: 12,
        dataPrimeiraParcela: dataCivil('2026-09-20'),
        contaDebitoId: f.contas[0]?.id ?? '',
        categoriaId: null,
      },
      { parcelasPagas: 0, contaCaptacaoId: null },
    ),
  ]);
  const t = [...d.dividas.values()].find((x) => x.divida.credor === credor);
  if (!t) throw new Error('dívida não preparada');
  const vencidas = pendencias(d).filter(
    (p) => p.tipo === 'parcela_divida' && p.dividaId === t.divida.id,
  );
  expect(vencidas).toHaveLength(2);
  const segunda = t.parcelas.find((p) => p.numero === 2);
  const primeira = t.parcelas.find((p) => p.numero === 1);
  if (!segunda || !primeira) throw new Error('sem as parcelas vencidas');

  await entrar(page, u, '/');
  const pm = mensagensPainel.pendencias;
  await page
    .getByRole('link', { name: pm.acao('Registrar pagamento', pm.parcela(credor, 2)) })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/dividas/${t.divida.id}\\?acao=pagar&parcela=${segunda.id}$`),
  );
  const dlg = page.getByRole('dialog', { name: mp.titulo });
  await expect(dlg.getByRole('combobox', { name: mp.parcela })).toHaveText(opcaoDa(segunda));
  await dlg.getByRole('button', { name: 'Registrar pagamento' }).click();
  await expect(page.getByText('Pagamento registrado')).toBeVisible();
  await expect(page).not.toHaveURL(/parcela=/);
  await expect(linhaDa(page, 2)).toContainText('Paga');
  await expect(linhaDa(page, 1)).toContainText('Vencida');

  // Sem escolha, o padrão é a vencida mais antiga.
  await page.getByRole('button', { name: 'Registrar pagamento' }).click();
  await expect(dlg.getByRole('combobox', { name: mp.parcela })).toHaveText(opcaoDa(primeira));
});
