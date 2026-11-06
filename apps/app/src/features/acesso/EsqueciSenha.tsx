import { type SubmitEvent, useState } from 'react';
import { Link } from 'react-router';

import { mensagens } from '@/app/mensagens';
import { Button } from '@/components/ui/button';
import { pedirRedefinicao } from '@/data/auth';
import { urlDeRetorno } from '@/plataforma/ambiente';

import { mensagensAcesso } from './mensagens';

const m = mensagensAcesso.esqueci;

/** Pede o e-mail de redefinição (PKCE): o link volta para `#/redefinir-senha` (T03-08). */
export function EsqueciSenha() {
  const [estado, setEstado] = useState<'form' | 'enviando' | 'enviado'>('form');
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = new FormData(e.currentTarget).get('email');
    if (typeof email !== 'string') return;
    setEstado('enviando');
    setErro(null);
    try {
      await pedirRedefinicao(email, urlDeRetorno('redefinir-senha'));
      setEstado('enviado');
    } catch {
      setErro(navigator.onLine ? m.erro : m.semConexao);
      setEstado('form');
    }
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 p-6">
      <h1 className="text-xl font-medium">{m.titulo}</h1>
      {estado === 'enviado' ? (
        <p role="status">{m.enviado}</p>
      ) : (
        <form className="flex flex-col gap-3" onSubmit={(e) => void enviar(e)}>
          <p>{m.explicacao}</p>
          <label className="flex flex-col gap-1">
            {mensagens.sessao.email}
            <input name="email" type="email" required autoFocus className="rounded border p-2" />
          </label>
          {erro && <p role="alert">{erro}</p>}
          <Button type="submit" disabled={estado === 'enviando'}>
            {estado === 'enviando' ? m.enviando : m.enviar}
          </Button>
        </form>
      )}
      <Link to="/login" className="text-primary underline-offset-4 hover:underline">
        {mensagensAcesso.voltarAoLogin}
      </Link>
    </main>
  );
}
