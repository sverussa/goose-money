import { gerarSeed } from '@goose-money/core';
import { describe, expect, it } from 'vitest';

import {
  criarUsuario,
  emailUnico,
  gravarOk,
  hojeEmBrasilia,
  opsDosFatos,
  sqlComoPostgres,
} from './apoio';
import { exigirBancoLocal, limparUsuariosDeTeste } from './limpar';

// T00-14: limpeza dos usuários de teste.
const envelhecer = (id: string) =>
  sqlComoPostgres`update auth.users set created_at = now() - interval '2 hours' where id = ${id}`;
const linhasDe = async (id: string) => {
  const [{ n }] = await sqlComoPostgres<[{ n: number }]>`
    select ((select count(*) from public.contas where created_by = ${id})
      + (select count(*) from public.lancamentos where created_by = ${id})
      + (select count(*) from public.parcelas where created_by = ${id}))::int as n`;
  return n;
};
const existe = async (id: string) =>
  (await sqlComoPostgres`select 1 from auth.users where id = ${id}`).length === 1;

describe('limpar os usuários de teste', () => {
  it('recusa um banco que não seja local, antes de conectar', async () => {
    for (const url of [
      'postgresql://postgres:senha@db.exemplo.com.br:5432/postgres',
      'postgresql://postgres:senha@10.0.0.5:5432/postgres',
      'não é uma URL',
    ])
      await expect(limparUsuariosDeTeste(url)).rejects.toThrow('o banco não é local');
    expect(() => {
      exigirBancoLocal('postgresql://postgres:postgres@localhost:54322/postgres');
    }).not.toThrow();
  });

  it('apaga o usuário @teste.local antigo e as linhas dele; os demais ficam', async () => {
    const [velho, novo, outro] = await Promise.all([
      criarUsuario(),
      criarUsuario(),
      criarUsuario(emailUnico('teste').replace('@teste.local', '@outro.local')),
    ]);
    const hoje = hojeEmBrasilia();
    await Promise.all(
      [velho, novo, outro].map((u) => gravarOk(u.cliente, opsDosFatos(gerarSeed(hoje, u.id)))),
    );
    await envelhecer(velho.id);
    await envelhecer(outro.id);

    expect(await limparUsuariosDeTeste()).toBeGreaterThanOrEqual(1);

    expect(await existe(velho.id)).toBe(false);
    expect(await linhasDe(velho.id)).toBe(0);
    // Com menos de 1 hora (outra rodada em andamento) ou de outro domínio: intactos.
    for (const u of [novo, outro]) {
      expect(await existe(u.id)).toBe(true);
      expect(await linhasDe(u.id)).toBeGreaterThan(0);
    }

    // O usuário de outro domínio passa a ser de teste só para a limpeza levá-lo.
    await sqlComoPostgres`update auth.users set email = ${emailUnico()} where id = ${outro.id}`;
    await limparUsuariosDeTeste();
    expect(await existe(outro.id)).toBe(false);
  }, 30_000);
});
