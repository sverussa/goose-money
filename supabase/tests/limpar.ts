import { existsSync } from 'node:fs';

import postgres from 'postgres';

// Limpeza dos usuários de teste (T00-14): apaga fisicamente os usuários `@teste.local` criados há
// mais de 1 hora e todas as linhas deles. O limite de 1 hora existe porque o Supabase local é
// compartilhado entre worktrees: uma rodada nunca apaga os usuários de outra que está em andamento.
// Roda no globalSetup do Vitest e do Playwright e em `make db-limpar-testes`.

const URL_PADRAO = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

/** Só o banco desta máquina: qualquer outro endereço para com erro, antes de conectar. */
export function exigirBancoLocal(url: string): void {
  const host = URL.parse(url)?.hostname;
  if (host !== '127.0.0.1' && host !== 'localhost')
    throw new Error(`limpar: recusado, o banco não é local (${host ?? 'URL inválida'}).`);
}

/** Apaga os usuários de teste antigos e as linhas deles; devolve quantos usuários saíram. */
export async function limparUsuariosDeTeste(
  url = process.env.DATABASE_URL ?? URL_PADRAO,
): Promise<number> {
  exigirBancoLocal(url);
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    return await sql.begin(async (tx) => {
      const usuarios = await tx<{ id: string }[]>`
        select id from auth.users
        where email like '%@teste.local' and created_at < now() - interval '1 hour'`;
      const ids = usuarios.map((u) => u.id);
      if (ids.length === 0) return 0;
      const [{ tabelas }] = await tx<[{ tabelas: string[] }]>`
        select public.tabelas_de_negocio() as tabelas`;
      // As chaves estrangeiras são `on delete restrict`, que não espera o fim da transação, e a
      // lista não está em ordem de dependência (lancamentos aponta para parcelas_divida). Sem os
      // gatilhos (chaves e regras), cada tabela sai inteira; como toda chave leva o dono junto
      // (D71), apagar todas as linhas dos mesmos usuários não deixa referência solta.
      await tx`set local session_replication_role = replica`;
      for (const tabela of [...tabelas].reverse())
        await tx`delete from ${tx('public.' + tabela)} where created_by = any(${ids}::uuid[])`;
      // De volta aos gatilhos: o `on delete cascade` do auth leva sessões e identidades junto.
      await tx`set local session_replication_role = origin`;
      await tx`delete from auth.users where id = any(${ids}::uuid[])`;
      return ids.length;
    });
  } finally {
    await sql.end();
  }
}

if (import.meta.main) {
  const arquivo = new URL('.env', import.meta.url);
  if (existsSync(arquivo)) process.loadEnvFile(arquivo);
  const n = await limparUsuariosDeTeste();
  console.log(`Usuários de teste apagados: ${String(n)}.`);
}
