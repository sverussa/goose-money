import { Eye, EyeOff, Wallet } from 'lucide-react';
import { type MouseEvent, type SubmitEvent, useRef, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router';

import { mensagens } from '@/app/mensagens';
import { useSessao } from '@/app/providers/useSessao';
import { rotaDeVolta } from '@/app/rotas';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { PedidoDeRedefinicao } from './EsqueciSenha';
import { mensagensAcesso } from './mensagens';

const m = mensagensAcesso.login;
const s = mensagens.sessao;

/** `#/login` (6.1, Login.dc.html): card centralizado com Supabase Auth (D2). */
export function LoginPagina() {
  const { usuario, carregando, entrar } = useSessao();
  const { search } = useLocation();
  const email = useRef<HTMLInputElement>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [verSenha, setVerSenha] = useState(false);
  const [esqueci, setEsqueci] = useState<string | null>(null);

  // Entrou: volta à rota pedida quando o usuário estiver preparado (T03-01).
  if (usuario) return <Navigate to={rotaDeVolta(search)} replace />;

  async function enviar(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    const texto = (campo: string) => {
      const v = dados.get(campo);
      return typeof v === 'string' ? v : '';
    };
    setEnviando(true);
    const falha = await entrar(texto('email'), texto('senha'), dados.has('manter'));
    setEnviando(false);
    // O texto de e-mail não confirmado vem de `src/data`; o do cadastro (T05-30) fica aqui.
    setErro(falha === s.emailNaoConfirmado ? m.emailNaoConfirmado : falha);
  }

  function abrirEsqueci(e: MouseEvent) {
    // Sem JavaScript o link leva à página; aqui, abre o diálogo sem sair do login.
    e.preventDefault();
    setEsqueci(email.current?.value ?? '');
  }

  const senhaInvalida = erro === s.credencialInvalida;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface-container px-4 py-8">
      <form
        onSubmit={(e) => void enviar(e)}
        className="flex w-full max-w-100 flex-col gap-5 rounded-xl bg-surface-container-lowest px-8 pt-10 pb-8"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-14 items-center justify-center rounded-lg bg-primary text-on-primary">
            <Wallet aria-hidden className="size-7.5" />
          </span>
          <h1 className="text-headline-md">{mensagens.app}</h1>
          <p className="text-body-md text-on-surface-variant">{m.apoio}</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">{s.email}</Label>
          <Input
            ref={email}
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="senha" data-erro={senhaInvalida}>
            {s.senha}
          </Label>
          <div className="relative flex">
            <Input
              id="senha"
              name="senha"
              type={verSenha ? 'text' : 'password'}
              autoComplete="current-password"
              required
              aria-invalid={senhaInvalida || undefined}
              aria-describedby={erro ? 'erro-login' : undefined}
              className="pr-14"
            />
            <Button
              type="button"
              variant="icon"
              className="absolute top-1 right-1"
              aria-label={verSenha ? m.ocultarSenha : m.mostrarSenha}
              onClick={() => {
                setVerSenha(!verSenha);
              }}
            >
              {verSenha ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
            </Button>
          </div>
          {erro && (
            <p id="erro-login" role="alert" className="text-body-md text-error">
              {erro}
            </p>
          )}
        </div>

        <div className="flex min-h-11 items-center gap-3">
          <Checkbox id="manter" name="manter" />
          <Label htmlFor="manter" className="text-body-md text-on-surface">
            {m.manterConectado}
          </Label>
        </div>

        <Button type="submit" className="h-12" disabled={enviando || carregando}>
          {enviando ? s.entrando : s.entrar}
        </Button>

        <Button asChild variant="outlined" className="h-12">
          <Link to="/criar-conta">{m.criarConta}</Link>
        </Button>

        <Link
          to="/esqueci-senha"
          onClick={abrirEsqueci}
          className="self-center text-label-lg text-primary underline-offset-4 hover:underline"
        >
          {mensagensAcesso.esqueciSenha}
        </Link>
      </form>

      <Dialog
        open={esqueci !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setEsqueci(null);
        }}
      >
        <DialogContent className="max-w-100">
          <DialogHeader>
            <DialogTitle>{mensagensAcesso.esqueci.titulo}</DialogTitle>
            <DialogDescription>{mensagensAcesso.esqueci.explicacao}</DialogDescription>
          </DialogHeader>
          <PedidoDeRedefinicao emailInicial={esqueci ?? ''} />
        </DialogContent>
      </Dialog>
    </main>
  );
}
