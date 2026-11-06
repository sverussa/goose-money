import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

// T03-07: o adaptador no navegador, importado direto do servidor do Vite (ainda sem tela).
const modulo = '/src/plataforma/arquivos.ts';
type Arquivos = typeof import('../../src/plataforma/arquivos');

test.beforeEach(async ({ page }) => {
  await page.goto('/#/login');
});

test('salvar um CSV baixa o arquivo com o nome sugerido', async ({ page }) => {
  const baixou = page.waitForEvent('download');
  const nome = await page.evaluate(async (m) => {
    const { salvarArquivo } = (await import(/* @vite-ignore */ m)) as Arquivos;
    return salvarArquivo({
      nomeSugerido: 'lancamentos-2026-11.csv',
      tipo: 'text/csv',
      conteudo: 'data;valor\n2026-11-04;89,90\n',
    });
  }, modulo);
  const download = await baixou;
  expect(nome).toBe('lancamentos-2026-11.csv');
  expect(download.suggestedFilename()).toBe('lancamentos-2026-11.csv');
  expect(await readFile(await download.path(), 'utf8')).toBe('data;valor\n2026-11-04;89,90\n');
});

test('salvar um Blob (PNG) também baixa', async ({ page }) => {
  const baixou = page.waitForEvent('download');
  await page.evaluate(async (m) => {
    const { salvarArquivo } = (await import(/* @vite-ignore */ m)) as Arquivos;
    const png = new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' });
    return salvarArquivo({ nomeSugerido: 'grafico.png', tipo: 'image/png', conteudo: png });
  }, modulo);
  const download = await baixou;
  expect(download.suggestedFilename()).toBe('grafico.png');
  expect([...(await readFile(await download.path()))]).toEqual([137, 80, 78, 71]);
});

test('abrir lê o arquivo escolhido', async ({ page }) => {
  const escolha = page.waitForEvent('filechooser');
  const aberto = page.evaluate(async (m) => {
    const { abrirArquivo } = (await import(/* @vite-ignore */ m)) as Arquivos;
    return abrirArquivo({ tipos: ['json'] });
  }, modulo);
  const seletor = await escolha;
  expect(seletor.isMultiple()).toBe(false);
  await seletor.setFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"app":"goose-money"}'),
  });
  expect(await aberto).toEqual({ nome: 'backup.json', conteudo: '{"app":"goose-money"}' });
});

test('fora do Tauri, nenhum plugin do Tauri é carregado', async ({ page }) => {
  const plugins: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('plugin-dialog') || r.url().includes('plugin-fs')) plugins.push(r.url());
  });
  const baixou = page.waitForEvent('download');
  await page.evaluate(async (m) => {
    const { salvarArquivo } = (await import(/* @vite-ignore */ m)) as Arquivos;
    return salvarArquivo({ nomeSugerido: 'a.csv', tipo: 'text/csv', conteudo: 'x' });
  }, modulo);
  await baixou;
  expect(plugins).toEqual([]);
});
