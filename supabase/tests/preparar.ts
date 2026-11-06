import { limparUsuariosDeTeste } from './limpar';

// Antes dos testes de banco: sem o Supabase local, para com uma mensagem clara. Depois, apaga os
// usuários de teste de rodadas antigas, para o banco não crescer a cada rodada (T00-14).
export default async function preparar(): Promise<void> {
  const arquivo = new URL('.env', import.meta.url);
  try {
    process.loadEnvFile(arquivo);
  } catch {
    // Sem arquivo: o apoio.ts diz qual variável falta.
  }
  const url = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
  const ok = await fetch(`${url}/auth/v1/health`, { signal: AbortSignal.timeout(3000) }).then(
    (r) => r.ok,
    () => false,
  );
  if (!ok) {
    console.error('\nSupabase local desligado: rode make db-start e make db-migrate.\n');
    throw new Error('Supabase local desligado: rode make db-start e make db-migrate.');
  }
  await limparUsuariosDeTeste();
}
