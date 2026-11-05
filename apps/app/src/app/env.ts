import { z } from 'zod';

const esquema = z.object({
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_ANON_KEY: z.string().trim().min(1),
});

export type Env = z.infer<typeof esquema>;

export type ResultadoEnv = { ok: true; env: Env } | { ok: false; invalidas: string[] };

export function lerEnv(fonte: Record<string, unknown>): ResultadoEnv {
  const r = esquema.safeParse(fonte);
  if (r.success) return { ok: true, env: r.data };
  return { ok: false, invalidas: [...new Set(r.error.issues.map((i) => String(i.path[0])))] };
}

export const resultadoEnv = lerEnv(import.meta.env);

/** Para quem só roda depois que main.tsx confirmou a configuração. */
export function exigirEnv(): Env {
  if (!resultadoEnv.ok) {
    throw new Error(`Configuração incompleta: ${resultadoEnv.invalidas.join(', ')}`);
  }
  return resultadoEnv.env;
}
