import { type SubmitEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { toast } from 'sonner';

import { useSessao } from '@/app/providers/useSessao';
import { Button } from '@/components/ui/button';
import { redefinirSenha, sessaoAtual } from '@/data/auth';

import { mensagensAcesso } from './mensagens';
import { mensagemDoErroDaSenha, validarNovaSenha } from './senha';

const m = mensagensAcesso.redefinir;

/**
 * `#/redefinir-senha` (T03-08): o link do e-mail chega com `?code=` e o Supabase troca o código
 * pela sessão ao carregar (PKCE); no Tauri, o deep link faz a troca (`OuvinteDeLinks`).
 */
export function RedefinirSenha() {
  const [busca] = useSearchParams();
  const { sair } = useSessao();
  const [estado, setEstado] = useState<'verificando' | 'invalido' | 'form' | 'salvando'>(
    'verificando',
  );
  const [erro, setErro] = useState<string | null>(null);
  const invalidoNaUrl = busca.has('invalido');

  useEffect(() => {
    let vivo = true;
    // `sessaoAtual` espera o Supabase terminar a troca do código da URL.
    void sessaoAtual().then((u) => {
      if (vivo) setEstado(u && !invalidoNaUrl ? 'form' : 'invalido');
    });
    return () => {
      vivo = false;
    };
  }, [invalidoNaUrl]);

  async function salvar(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    const nova = dados.get('nova');
    const confirmar = dados.get('confirmar');
    if (typeof nova !== 'string' || typeof confirmar !== 'string') return;
    const invalida = validarNovaSenha(nova, confirmar);
    setErro(invalida);
    if (invalida) return;
    setEstado('salvando');
    const codigo = await redefinirSenha(nova);
    if (codigo) {
      setErro(mensagemDoErroDaSenha(codigo));
      setEstado('form');
      return;
    }
    // Entrar de novo confirma a senha nova; o link já não serve para outra troca.
    await sair();
    toast(m.alterada);
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 p-6">
      <h1 className="text-xl font-medium">{m.titulo}</h1>
      {estado === 'verificando' && <p role="status">{m.verificando}</p>}
      {estado === 'invalido' && (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p>{m.invalido}</p>
          <Button asChild>
            <Link to="/esqueci-senha">{m.pedirNovo}</Link>
          </Button>
        </div>
      )}
      {(estado === 'form' || estado === 'salvando') && (
        <form className="flex flex-col gap-3" onSubmit={(e) => void salvar(e)}>
          <label className="flex flex-col gap-1">
            {m.nova}
            <input
              name="nova"
              type="password"
              required
              autoFocus
              autoComplete="new-password"
              className="rounded border p-2"
            />
          </label>
          <label className="flex flex-col gap-1">
            {m.confirmar}
            <input
              name="confirmar"
              type="password"
              required
              autoComplete="new-password"
              className="rounded border p-2"
            />
          </label>
          {erro && <p role="alert">{erro}</p>}
          <Button type="submit" disabled={estado === 'salvando'}>
            {estado === 'salvando' ? m.salvando : m.salvar}
          </Button>
        </form>
      )}
      <Link to="/login" className="text-primary underline-offset-4 hover:underline">
        {mensagensAcesso.voltarAoLogin}
      </Link>
    </main>
  );
}
