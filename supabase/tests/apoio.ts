import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';

import { createClient } from '@supabase/supabase-js';
import postgres, { type TransactionSql } from 'postgres';

// Utilitários dos testes de banco (T02-01). A chave service_role só existe aqui e em
// supabase/tests/.env (PROMPT 12.1): nunca no app.
const arquivo = new URL('.env', import.meta.url);
if (existsSync(arquivo)) process.loadEnvFile(arquivo);

const env = (nome: string, padrao?: string): string => {
  const valor = process.env[nome] ?? padrao;
  if (!valor)
    throw new Error(
      `Falta ${nome} em supabase/tests/.env: copie de .env.example e preencha com make db-status.`,
    );
  return valor;
};

export const URL_SUPABASE = env('SUPABASE_URL', 'http://127.0.0.1:54321');
const CHAVE_ANON = env('SUPABASE_ANON_KEY');
const CHAVE_SERVICE_ROLE = env('SUPABASE_SERVICE_ROLE_KEY');
const URL_BANCO = env('DATABASE_URL', 'postgresql://postgres:postgres@127.0.0.1:54322/postgres');

const semSessao = { auth: { persistSession: false, autoRefreshToken: false } };

/** Conexão direta como `postgres`, que ignora o RLS: só para conferir o que está gravado. */
export const sqlComoPostgres = postgres(URL_BANCO, { max: 2, idle_timeout: 5, onnotice: () => {} });

export const clienteAnonimo = () => createClient(URL_SUPABASE, CHAVE_ANON, semSessao);
export type Cliente = ReturnType<typeof clienteAnonimo>;

const admin = createClient(URL_SUPABASE, CHAVE_SERVICE_ROLE, semSessao);

/** E-mail que nenhum outro teste usa: cada arquivo cria os próprios usuários. */
export const emailUnico = (prefixo = 'teste'): string => `${prefixo}-${randomUUID()}@teste.local`;

export interface Usuario {
  id: string;
  /** Cliente da API autenticado como o usuário, com a chave anon (como o app). */
  cliente: Cliente;
}

/** Cria o usuário pela API admin (service_role) e entra com ele. */
export async function criarUsuario(email = emailUnico()): Promise<Usuario> {
  const senha = randomUUID();
  const criado = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true });
  if (criado.error) throw criado.error;
  const cliente = clienteAnonimo();
  const { error } = await cliente.auth.signInWithPassword({ email, password: senha });
  if (error) throw error;
  return { id: criado.data.user.id, cliente };
}

export type Sql = TransactionSql;
class Desfazer extends Error {}

/**
 * Roda `preparar` como `postgres` e `f` como o usuário (papel `authenticated`, com o RLS), numa
 * transação sempre desfeita: nada fica no banco e nenhum outro teste vê os objetos criados.
 */
export async function numaTransacaoDesfeita(
  usuario: string,
  preparar: (sql: Sql) => Promise<unknown>,
  f: (sql: Sql) => Promise<void>,
): Promise<void> {
  try {
    await sqlComoPostgres.begin(async (sql) => {
      await preparar(sql);
      const claims = JSON.stringify({ sub: usuario, role: 'authenticated' });
      await sql`select set_config('request.jwt.claims', ${claims}, true)`;
      await sql`set local role authenticated`;
      await f(sql);
      throw new Desfazer();
    });
  } catch (e) {
    if (!(e instanceof Desfazer)) throw e;
  }
}
