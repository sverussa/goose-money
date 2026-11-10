import { z } from 'zod';

import { mensagensAcesso, SENHA_MINIMA } from './mensagens';

const c = mensagensAcesso.criar;
const r = mensagensAcesso.redefinir;

/** Formulário de "Criar conta" (T05-30): validado antes de chamar o Supabase. */
const esquemaCadastro = z
  .object({
    email: z.email(c.emailInvalido),
    senha: z.string().min(SENHA_MINIMA, r.curta),
    confirmar: z.string(),
  })
  // `when`: confere as duas mesmo com o e-mail inválido, para mostrar todos os erros juntos.
  .refine((d) => d.senha === d.confirmar, {
    message: r.diferentes,
    path: ['confirmar'],
    when: (p) => typeof p.value === 'object',
  });

export type ErrosDoCadastro = Partial<Record<'email' | 'senha' | 'confirmar', string>>;

/** Erro de cada campo (o primeiro), ou `null` se o cadastro pode ir ao Supabase. */
export function validarCadastro(dados: Record<string, unknown>): ErrosDoCadastro | null {
  const r = esquemaCadastro.safeParse(dados);
  if (r.success) return null;
  const { fieldErrors } = z.flattenError(r.error);
  return {
    email: fieldErrors.email?.[0],
    senha: fieldErrors.senha?.[0],
    confirmar: fieldErrors.confirmar?.[0],
  };
}

/** Código de erro de `cadastrar` → texto do formulário. */
export function mensagemDoErroDoCadastro(codigo: string): string {
  if (codigo === 'sem_conexao') return c.semConexao;
  if (codigo === 'weak_password') return r.fraca;
  return c.erro;
}
