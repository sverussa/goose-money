import { randomUUID } from 'node:crypto';

import {
  centavos,
  competenciaDe,
  type Contexto,
  criarConta,
  criarRecorrencia,
  primeiroDia,
  somarDias,
} from '@goose-money/core';
import { expect, test } from '@playwright/test';

import {
  criarUsuario,
  fatosDe,
  gravarOk,
  hojeEmBrasilia,
  opsDe,
  sqlComoPostgres,
} from '../../../../supabase/tests/apoio';

// T03-06: a confirmação automática roda ao abrir o app e mostra a quantidade no snackbar.

test('ao entrar, confirma a renda pendente e mostra "1 lançamento automático registrado"', async ({
  page,
}) => {
  const u = await criarUsuario();
  await u.cliente.rpc('inicializar_usuario');
  const tudo = await u.cliente.rpc('carregar_tudo');
  const f = fatosDe(tudo.data as Record<string, Record<string, unknown>[]>);
  const hoje = hojeEmBrasilia();
  const inicioDoMes = primeiroDia(competenciaDe(hoje));
  const ctx: Contexto = {
    hoje,
    agora: new Date().toISOString(),
    usuario: u.id,
    novoId: randomUUID,
  };
  const conta = criarConta(f, ctx, {
    nome: 'Conta',
    instituicao: null,
    tipo: 'corrente',
    saldoInicial: centavos(0),
    dataSaldoInicial: somarDias(inicioDoMes, -1),
    cor: 'categorica-1',
    incluirNoTotal: true,
  });
  const contaId = String(conta.mudancas[0]?.id);
  const comConta = { ...f, contas: [conta.mudancas[0]?.dados as (typeof f.contas)[number]] };
  const renda = f.categorias.find((c) => c.tipo === 'receita');
  if (!renda) throw new Error('sem categoria de receita');
  const rec = criarRecorrencia(
    comConta,
    ctx,
    {
      natureza: 'renda',
      descricao: 'Salário',
      competenciaInicio: competenciaDe(hoje),
      competenciaFim: null,
      autoConfirmar: true,
    },
    // Dia 1: a ocorrência do mês já venceu em qualquer data.
    {
      valor: centavos(650_000),
      dia: 1,
      formaPagamento: 'conta',
      contaId,
      categoriaId: renda.id,
      cartaoId: null,
    },
  );
  await gravarOk(
    u.cliente,
    [...conta.mudancas, ...rec.mudancas].flatMap((m) => opsDe(m.entidade, [m.dados])),
  );

  await page.goto('/#/login');
  await page.getByLabel('E-mail').fill(u.email);
  await page.getByLabel('Senha', { exact: true }).fill(u.senha);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByText('1 lançamento automático registrado')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Revisar' })).toBeVisible();

  const [{ n }] = await sqlComoPostgres<[{ n: number }]>`
    select count(*)::int as n from lancamentos where created_by = ${u.id} and not is_deleted`;
  expect(n).toBe(1);

  // Reabrir não confirma de novo.
  await page.reload();
  await expect(page.getByRole('link', { name: /^Saldo em contas/ })).toBeVisible();
  await expect(page.getByText('lançamento automático registrado')).toHaveCount(0);
  const [{ n: depois }] = await sqlComoPostgres<[{ n: number }]>`
    select count(*)::int as n from lancamentos where created_by = ${u.id} and not is_deleted`;
  expect(depois).toBe(1);
});
