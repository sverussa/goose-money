import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';

import { dataCivil, type DataCivil } from '@goose-money/core';
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

export interface Op {
  tabela: string;
  acao: 'inserir' | 'alterar';
  id: string;
  dados: Record<string, unknown>;
}

export const inserir = (
  tabela: string,
  dados: Record<string, unknown>,
  id: string = randomUUID(),
): Op => ({
  tabela,
  acao: 'inserir',
  id,
  dados,
});
export const alterar = (tabela: string, id: string, dados: Record<string, unknown>): Op => ({
  tabela,
  acao: 'alterar',
  id,
  dados,
});

/** `gravar(ops)` pela API, como o app. */
export async function gravar(cliente: Cliente, ops: Op[]) {
  const r = await cliente.rpc('gravar', { ops });
  return { linhas: r.data as Record<string, Record<string, unknown>[]> | null, erro: r.error };
}

/** Grava e falha o teste se o banco recusar. */
export async function gravarOk(cliente: Cliente, ops: Op[]) {
  const { linhas, erro } = await gravar(cliente, ops);
  if (erro) throw new Error(`gravar recusou: ${erro.code} ${erro.message} ${erro.details}`);
  return linhas ?? {};
}

/** "Hoje" do produto, no fuso de Brasília (D79), como texto `AAAA-MM-DD`. */
export const hojeEmBrasilia = (): DataCivil =>
  dataCivil(new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }));

const paraSnake = (s: string) => s.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);

/** Registros do domínio (camelCase, como o core os gera) como inserções de `gravar`. */
export const opsDe = (entidade: string, registros: readonly object[]): Op[] =>
  registros.map((r) => {
    const dados = Object.fromEntries(Object.entries(r).map(([k, v]) => [paraSnake(k), v]));
    return inserir(paraSnake(entidade), dados, String(dados.id));
  });

/** Todas as entidades dos fatos do core como inserções, na ordem do modelo. */
export const opsDosFatos = (fatos: Record<string, unknown>): Op[] =>
  Object.entries(fatos).flatMap(([entidade, registros]) =>
    opsDe(
      entidade,
      Array.isArray(registros) ? (registros as object[]) : registros ? [registros] : [],
    ),
  );
