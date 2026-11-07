import {
  aplicar,
  type Comando,
  type Contexto,
  criarConta,
  dataCivil,
  deMascara,
  negar,
  somar,
  type Fatos,
} from '@goose-money/core';
import { expect, type Page } from '@playwright/test';

import { lerFatos } from '../../../src/data/mapeamento';
import { criarUsuario, gravarOk, opsDosFatos } from '../../../../../supabase/tests/apoio';
import { HOJE } from '../cartoes/apoio';

export { gravadoEmHoje, HOJE, idDo, preparar } from '../cartoes/apoio';

/**
 * Usuário sem o seed: só as categorias iniciais (do banco), uma conta e os comandos de
 * `extras`; o navegador vive em 04/11/2026.
 */
export async function semSeed(
  page: Page,
  extras: (f: Fatos, ctx: Contexto, contaId: string) => Comando[] = () => [],
) {
  const u = await criarUsuario();
  const ini = await u.cliente.rpc('inicializar_usuario');
  if (ini.error) throw new Error(ini.error.message);
  const tudo = await u.cliente.rpc('carregar_tudo');
  if (tudo.error) throw new Error(tudo.error.message);
  const base = lerFatos(tudo.data);
  const ctx: Contexto = {
    hoje: HOJE,
    agora: `${HOJE}T12:00:00Z`,
    usuario: u.id,
    novoId: () => crypto.randomUUID(),
  };
  const conta = criarConta(base, ctx, {
    nome: 'Conta corrente',
    instituicao: null,
    tipo: 'corrente',
    saldoInicial: deMascara('100000'),
    dataSaldoInicial: dataCivil('2026-01-01'),
    cor: 'categorica-1',
    incluirNoTotal: true,
  });
  let f = aplicar(base, conta.mudancas);
  const contaId = f.contas[0]?.id ?? '';
  for (const c of extras(f, ctx, contaId)) f = aplicar(f, c.mudancas);
  // Só o que não veio do banco: as categorias e as preferências já estão lá.
  await gravarOk(u.cliente, opsDosFatos({ ...f, categorias: [], preferencias: null }));
  await page.clock.install({ time: new Date(2026, 10, 4, 10) });
  return { u, f, contaId };
}

/** "−R$ 1.234,56" ou "+R$ 12,00" em centavos com sinal (despesa positiva, estorno negativo). */
export const centavosDe = (texto: string) => {
  const c = deMascara(texto.replace(/\D/g, ''));
  return texto.startsWith('+') ? negar(c) : c;
};

/**
 * Lançamentos aberto por um gráfico: a soma dos valores da lista. A lista é virtualizada (D9):
 * a janela cresce para todas as linhas existirem ao mesmo tempo.
 */
export async function somaDaLista(page: Page, itens: number) {
  const tamanho = page.viewportSize();
  await page.setViewportSize({ width: tamanho?.width ?? 1440, height: 200 * itens + 1000 });
  const valores = page
    .getByRole('list', { name: 'Lançamentos' })
    .getByRole('listitem')
    .filter({ hasNot: page.getByRole('heading') })
    .locator('span.tabular-nums');
  await expect(valores).toHaveCount(itens);
  const soma = somar((await valores.allTextContents()).map(centavosDe));
  if (tamanho) await page.setViewportSize(tamanho);
  return soma;
}
