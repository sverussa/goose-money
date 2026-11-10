import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import AxeBuilder from '@axe-core/playwright';
import {
  type Derivado,
  derivar,
  despesas,
  exportar,
  type Fatos,
  gerarSeed,
  indicadoresDaBarra,
  type Modo,
  periodoPreset,
  planejarImportacao,
  receitas,
  relatorio,
  resultado,
  taxaDePoupanca,
} from '@goose-money/core';
import { expect, type Page, test } from '@playwright/test';

import {
  nomeDoBackup,
  registrosGravados,
  resumoDoRelatorio,
} from '../../../src/features/configuracoes/dados';
import { mensagensConfiguracoes } from '../../../src/features/configuracoes/mensagens';
import { criarUsuario } from '../../../../../supabase/tests/apoio';
import { conferirBarra, entrar } from '../lancar/apoio';
import { gravadoEmHoje, HOJE, preparar } from '../painel/apoio';

// T05-29: Configurações › Dados (6.9, 9.2, 10, 11.7). Cada teste tem o seu usuário.

test.use({ viewport: { width: 1440, height: 1000 } });

const m = mensagensConfiguracoes.dados;
const i = m.importacao;
const a = m.apagarDialogo;
const secao = (page: Page) => page.getByRole('region', { name: m.titulo });
const dialogoImportar = (page: Page) => page.getByRole('dialog', { name: i.titulo });

/** Indicadores de 3.10 que a importação precisa reproduzir. */
function indicadores(d: Derivado) {
  return {
    barra: indicadoresDaBarra(d),
    ...Object.fromEntries(
      (['este-mes', 'mes-passado', 'ultimos-12-meses'] as const).map((preset) => {
        const p = periodoPreset(preset, HOJE);
        const x = {
          receitas: receitas(d, p),
          despesas: despesas(d, p),
          resultado: resultado(d, p),
          poupanca: taxaDePoupanca(d, p),
        };
        return [preset, x];
      }),
    ),
  };
}
const ids = (f: Fatos) =>
  Object.values(f)
    .flatMap((v) => (Array.isArray(v) ? (v as { id: string }[]) : v ? [v as { id: string }] : []))
    .map((x) => x.id)
    .sort();

async function exportarPelaTela(page: Page) {
  const baixou = page.waitForEvent('download');
  await secao(page).getByRole('button', { name: m.exportar }).click();
  const download = await baixou;
  expect(download.suggestedFilename()).toBe(nomeDoBackup(HOJE));
  await expect(page.getByText(m.exportado(nomeDoBackup(HOJE)))).toBeVisible();
  return readFile(await download.path(), 'utf8');
}

async function apagarPelaTela(page: Page) {
  await secao(page).getByRole('button', { name: m.apagar }).click();
  const dialogo = page.getByRole('dialog', { name: a.titulo });
  await dialogo.getByLabel(a.campo).fill(a.palavra);
  await dialogo.getByRole('button', { name: a.confirmar }).click();
  await expect(page.getByText(a.apagado)).toBeVisible();
  await expect(page).toHaveURL(/#\/$/);
  await page.goto('/#/configuracoes');
}

/** Abre o diálogo, escolhe o modo e o arquivo; devolve o relatório. */
async function escolherArquivo(page: Page, modo: Modo, conteudo: string, nome = 'backup.json') {
  await secao(page).getByRole('button', { name: m.importar }).click();
  const dialogo = dialogoImportar(page);
  const radio = dialogo.getByRole('radio', { name: i.modos[modo] });
  await radio.click();
  await expect(radio).toHaveAttribute('aria-checked', 'true');
  const escolha = page.waitForEvent('filechooser');
  await dialogo.getByRole('button', { name: i.escolher }).click();
  await (
    await escolha
  ).setFiles({ name: nome, mimeType: 'application/json', buffer: Buffer.from(conteudo) });
  const rel = dialogo.getByRole('region', { name: i.relatorio(nome) });
  await expect(rel).toBeVisible();
  return rel;
}

test('exportar, apagar tudo (só com APAGAR) e importar em Substituir reproduz os indicadores (11.7)', async ({
  page,
}) => {
  const { u } = await preparar(page);
  await entrar(page, u, '/configuracoes');
  const antes = await gravadoEmHoje(u);
  // Com dados, o exemplo fica bloqueado com o motivo (D50).
  await expect(secao(page).getByRole('button', { name: m.exemplo })).toBeDisabled();
  await expect(secao(page).getByText(m.exemploBloqueado)).toBeVisible();

  const conteudo = await exportarPelaTela(page);
  expect(ids((JSON.parse(conteudo) as { dados: Fatos }).dados)).toEqual(ids(antes.fatos));

  // "Apagar tudo" só roda depois de digitar APAGAR.
  await secao(page).getByRole('button', { name: m.apagar }).click();
  const dialogo = page.getByRole('dialog', { name: a.titulo });
  const confirmar = dialogo.getByRole('button', { name: a.confirmar });
  await expect(confirmar).toBeDisabled();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await dialogo.getByLabel(a.campo).fill('apagar');
  await expect(confirmar).toBeDisabled();
  await dialogo.getByLabel(a.campo).press('Enter');
  await expect(dialogo).toBeVisible();
  expect((await gravadoEmHoje(u)).fatos.lancamentos).toHaveLength(antes.fatos.lancamentos.length);
  await dialogo.getByLabel(a.campo).fill(a.palavra);
  await confirmar.click();
  await expect(page.getByText(a.apagado)).toBeVisible();
  await expect(page).toHaveURL(/#\/$/);
  const vazio = await gravadoEmHoje(u);
  expect(vazio.fatos.lancamentos).toEqual([]);
  expect(vazio.fatos.contas).toEqual([]);
  expect(vazio.fatos.categorias.every((c) => c.sistema !== null)).toBe(true);
  await conferirBarra(page, indicadoresDaBarra(vazio));

  await page.goto('/#/configuracoes');
  await expect(secao(page).getByRole('button', { name: m.exemplo })).toBeEnabled();
  const rel = await escolherArquivo(page, 'substituir', conteudo, nomeDoBackup(HOJE));
  const r = relatorio(planejarImportacao(JSON.parse(conteudo), vazio.fatos, 'substituir'));
  expect(r.valido).toBe(true);
  await expect(rel).toContainText(i.resumo.registros(resumoDoRelatorio(r).noArquivo));
  await expect(rel).toContainText(i.resumo.novos(resumoDoRelatorio(r).novos));
  await expect(rel).toContainText(i.integridadeOk);
  await expect(rel).toContainText(i.invariantesOk);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  // Substituir baixa antes o backup do estado atual.
  const backupAtual = page.waitForEvent('download');
  await dialogoImportar(page).getByRole('button', { name: i.importar }).click();
  expect((await backupAtual).suggestedFilename()).toBe(nomeDoBackup(HOJE));
  await expect(page.getByText(i.importados(registrosGravados(r)))).toBeVisible();
  await expect(dialogoImportar(page)).toBeHidden();

  const depois = await gravadoEmHoje(u);
  expect(ids(depois.fatos)).toEqual(ids(antes.fatos));
  expect(indicadores(depois)).toEqual(indicadores(antes));
  await conferirBarra(page, indicadoresDaBarra(antes));
});

test('importar o mesmo arquivo duas vezes em Mesclar não cria duplicatas (11.7)', async ({
  page,
}) => {
  const { u } = await preparar(page);
  await entrar(page, u, '/configuracoes');
  const antes = await gravadoEmHoje(u);
  const conteudo = await exportarPelaTela(page);
  await apagarPelaTela(page);

  const vazio = (await gravadoEmHoje(u)).fatos;
  const primeira = relatorio(planejarImportacao(JSON.parse(conteudo), vazio, 'mesclar'));
  await escolherArquivo(page, 'mesclar', conteudo);
  let baixou = false;
  page.on('download', () => (baixou = true));
  await dialogoImportar(page).getByRole('button', { name: i.importar }).click();
  await expect(page.getByText(i.importados(registrosGravados(primeira)))).toBeVisible();
  await expect(dialogoImportar(page)).toBeHidden();
  expect(baixou).toBe(false);

  // A segunda vez: tudo sem mudança, nada a importar.
  const segunda = relatorio(
    planejarImportacao(JSON.parse(conteudo), (await gravadoEmHoje(u)).fatos, 'mesclar'),
  );
  expect(registrosGravados(segunda)).toBe(0);
  const rel = await escolherArquivo(page, 'mesclar', conteudo);
  const s = resumoDoRelatorio(segunda);
  await expect(rel).toContainText(
    [i.modos.mesclar, i.resumo.registros(s.noArquivo), i.resumo.mantidos(s.mantidos)].join(' · '),
  );
  await expect(dialogoImportar(page).getByRole('button', { name: i.importar })).toBeDisabled();
  await expect(dialogoImportar(page).getByText(i.semMudanca)).toBeVisible();

  const depois = await gravadoEmHoje(u);
  expect(ids(depois.fatos)).toEqual(ids(antes.fatos));
  expect(indicadores(depois)).toEqual(indicadores(antes));
});

test('arquivo com referência quebrada não grava nada e o relatório aponta a entidade (11.7)', async ({
  page,
}) => {
  const { u } = await preparar(page);
  await entrar(page, u, '/configuracoes');
  const antes = await gravadoEmHoje(u);
  const backup = exportar(antes.fatos, new Date().toISOString());
  const [primeira, ...resto] = backup.dados.parcelas;
  if (!primeira) throw new Error('o seed tem parcelas');
  const conteudo = JSON.stringify({
    ...backup,
    dados: { ...backup.dados, parcelas: [{ ...primeira, compraId: randomUUID() }, ...resto] },
  });
  const r = relatorio(planejarImportacao(JSON.parse(conteudo), antes.fatos, 'substituir'));
  expect(r.valido).toBe(false);

  let baixou = false;
  page.on('download', () => (baixou = true));
  const rel = await escolherArquivo(page, 'substituir', conteudo);
  await expect(rel).toContainText(i.integridadeErro(resumoDoRelatorio(r).referencias));
  const erros = rel.getByRole('list', { name: i.errosTitulo });
  for (const e of r.erros)
    await expect(erros).toContainText(`${m.entidades[e.entidade ?? 'parcelas']}: ${e.mensagem}`);
  expect(r.erros.some((e) => e.entidade === 'parcelas')).toBe(true);
  const importar = dialogoImportar(page).getByRole('button', { name: i.importar });
  await expect(importar).toBeDisabled();
  await expect(dialogoImportar(page).getByText(i.invalido)).toBeVisible();
  await dialogoImportar(page).getByRole('button', { name: i.cancelar }).click();

  expect(baixou).toBe(false);
  const depois = await gravadoEmHoje(u);
  expect(ids(depois.fatos)).toEqual(ids(antes.fatos));
  expect(indicadores(depois)).toEqual(indicadores(antes));
});

test('dados de exemplo só com a base vazia, num comando; Desfazer volta (D50)', async ({
  page,
}) => {
  const u = await criarUsuario();
  await page.clock.install({ time: new Date(2026, 10, 4, 10) });
  await entrar(page, u, '/configuracoes');
  const exemplo = secao(page).getByRole('button', { name: m.exemplo });
  await expect(exemplo).toBeEnabled();
  await expect(secao(page).getByText(m.exemploBloqueado)).toHaveCount(0);

  await exemplo.click();
  await expect(page.getByText(m.exemploCarregado)).toBeVisible();
  await expect(exemplo).toBeDisabled();
  await expect(secao(page).getByText(m.exemploBloqueado)).toBeVisible();
  const esperado = indicadoresDaBarra(derivar(gerarSeed(HOJE, u.id), HOJE));
  await expect.poll(async () => indicadoresDaBarra(await gravadoEmHoje(u))).toEqual(esperado);
  await conferirBarra(page, esperado);

  await page.getByRole('button', { name: 'Desfazer' }).click();
  await expect(exemplo).toBeEnabled();
  await expect.poll(async () => (await gravadoEmHoje(u)).fatos.lancamentos).toEqual([]);
});
