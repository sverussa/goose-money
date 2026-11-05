import { createClient } from '@supabase/supabase-js';

import { exigirEnv } from '@/app/env';

import { criarArmazenamentoSessao } from './armazenamento';
import type { Database } from './database.types';

// Único ponto do app que fala com o Supabase (D15). Só a chave anon; nunca a service_role.
const env = exigirEnv();

export const supabase = createClient<Database>(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: {
    // PKCE devolve ?code= em vez de token no #, que conflita com o HashRouter (D20).
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: criarArmazenamentoSessao(localStorage, sessionStorage),
  },
});
