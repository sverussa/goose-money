import { type SubmitEvent, useState } from 'react';
import { Link } from 'react-router';

import { mensagens } from '@/app/mensagens';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { pedirRedefinicao } from '@/data/auth';
import { urlDeRetorno } from '@/plataforma/ambiente';

import { mensagensAcesso } from './mensagens';

const m = mensagensAcesso.esqueci;

/**
 * Pede o e-mail de redefinição (PKCE): o link volta para `#/redefinir-senha` (T03-08). A mensagem
 * depois do envio é neutra e não revela se o e-mail tem conta (6.1). Usado no diálogo do login e
 * na página `#/esqueci-senha`.
 */
export function PedidoDeRedefinicao({ emailInicial = '' }: { emailInicial?: string }) {
  const [estado, setEstado] = useState<'form' | 'enviando' | 'enviado'>('form');
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    // O formulário do diálogo fica dentro do do login no React: não deixa o envio subir.
    e.stopPropagation();
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

  if (estado === 'enviado') return <p role="status">{m.enviado}</p>;
  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => void enviar(e)}>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email-redefinicao">{mensagens.sessao.email}</Label>
        <Input
          id="email-redefinicao"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          defaultValue={emailInicial}
        />
      </div>
      {erro && (
        <p role="alert" className="text-body-md text-error">
          {erro}
        </p>
      )}
      <Button type="submit" className="self-end" disabled={estado === 'enviando'}>
        {estado === 'enviando' ? m.enviando : m.enviar}
      </Button>
    </form>
  );
}

/** `#/esqueci-senha`: a mesma coisa em página, para o link aberto sem o login. */
export function EsqueciSenha() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface-container px-4 py-8">
      <div className="flex w-full max-w-100 flex-col gap-5 rounded-xl bg-surface-container-lowest px-8 pt-10 pb-8">
        <h1 className="text-headline-md">{m.titulo}</h1>
        <p className="text-body-md text-on-surface-variant">{m.explicacao}</p>
        <PedidoDeRedefinicao />
        <Link
          to="/login"
          className="self-center text-label-lg text-primary underline-offset-4 hover:underline"
        >
          {mensagensAcesso.voltarAoLogin}
        </Link>
      </div>
    </main>
  );
}
