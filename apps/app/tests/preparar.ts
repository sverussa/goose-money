import { limparUsuariosDeTeste } from '../../../supabase/tests/limpar';

// Antes dos testes Playwright: apaga os usuários de teste de rodadas antigas (T00-14).
export default async function preparar(): Promise<void> {
  await limparUsuariosDeTeste();
}
