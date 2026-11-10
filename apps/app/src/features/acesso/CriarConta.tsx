import { Eye, EyeOff } from 'lucide-react';
import { type SubmitEvent, useState } from 'react';
import { Link } from 'react-router';

import { mensagens } from '@/app/mensagens';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cadastrar } from '@/data/auth';

import { type ErrosDoCadastro, mensagemDoErroDoCadastro, validarCadastro } from './cadastro';
import { mensagensAcesso } from './mensagens';

const m = mensagensAcesso.criar;
const s = mensagens.sessao;
const l = mensagensAcesso.login;

type Campo = keyof ErrosDoCadastro;

/**
 * `#/criar-conta` (6.1, D28, T05-30), no card do login. A validação vem antes do Supabase; depois
 * do envio, a mesma mensagem neutra para e-mail novo ou já cadastrado.
 */
export function CriarConta() {
  const [estado, setEstado] = useState<'form' | 'salvando' | 'enviado'>('form');
  const [erros, setErros] = useState<ErrosDoCadastro>({});
  const [erro, setErro] = useState<string | null>(null);
  const [verSenha, setVerSenha] = useState(false);

  async function enviar(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const texto = (c: Campo) => {
      const v = form.get(c);
      return typeof v === 'string' ? v : '';
    };
    const dados = { email: texto('email'), senha: texto('senha'), confirmar: texto('confirmar') };
    const invalidos = validarCadastro(dados);
    setErros(invalidos ?? {});
    setErro(null);
    if (invalidos) return;
    setEstado('salvando');
    const codigo = await cadastrar(dados.email, dados.senha);
    if (codigo) {
      setErro(mensagemDoErroDoCadastro(codigo));
      setEstado('form');
      return;
    }
    setEstado('enviado');
  }

  // Cada campo com o erro inline dele, ligado pelo `aria-describedby`.
  const campo = (c: Campo) => ({
    id: `cadastro-${c}`,
    name: c,
    'aria-invalid': erros[c] ? true : undefined,
    'aria-describedby': erros[c] ? `cadastro-${c}-erro` : undefined,
  });
  const rotulo = (c: Campo, texto: string) => (
    <Label htmlFor={`cadastro-${c}`} data-erro={!!erros[c]}>
      {texto}
    </Label>
  );
  const erroDo = (c: Campo) =>
    erros[c] && (
      <p id={`cadastro-${c}-erro`} role="alert" className="text-body-md text-error">
        {erros[c]}
      </p>
    );

  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface-container px-4 py-8">
      <div className="flex w-full max-w-100 flex-col gap-5 rounded-xl bg-surface-container-lowest px-8 pt-10 pb-8">
        <h1 className="text-headline-md">{m.titulo}</h1>
        {estado === 'enviado' ? (
          <p role="status" className="text-body-md">
            {m.enviado}
          </p>
        ) : (
          <>
            <p className="text-body-md text-on-surface-variant">{m.explicacao}</p>
            <form noValidate className="flex flex-col gap-5" onSubmit={(e) => void enviar(e)}>
              <div className="flex flex-col gap-1.5">
                {rotulo('email', s.email)}
                <Input {...campo('email')} type="email" autoComplete="username" autoFocus />
                {erroDo('email')}
              </div>
              <div className="flex flex-col gap-1.5">
                {rotulo('senha', s.senha)}
                <div className="relative flex">
                  <Input
                    {...campo('senha')}
                    type={verSenha ? 'text' : 'password'}
                    autoComplete="new-password"
                    className="pr-14"
                  />
                  <Button
                    type="button"
                    variant="icon"
                    className="absolute top-1 right-1"
                    aria-label={verSenha ? l.ocultarSenha : l.mostrarSenha}
                    onClick={() => {
                      setVerSenha(!verSenha);
                    }}
                  >
                    {verSenha ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                  </Button>
                </div>
                {erroDo('senha')}
              </div>
              <div className="flex flex-col gap-1.5">
                {rotulo('confirmar', m.confirmar)}
                <Input {...campo('confirmar')} type="password" autoComplete="new-password" />
                {erroDo('confirmar')}
              </div>
              {erro && (
                <p role="alert" className="text-body-md text-error">
                  {erro}
                </p>
              )}
              <Button type="submit" className="h-12" disabled={estado === 'salvando'}>
                {estado === 'salvando' ? m.salvando : m.criar}
              </Button>
            </form>
          </>
        )}
        <Link
          to="/login"
          className="self-center text-label-lg text-primary underline-offset-4 hover:underline"
        >
          {estado === 'enviado' ? mensagensAcesso.voltarAoLogin : m.jaTenhoConta}
        </Link>
      </div>
    </main>
  );
}
