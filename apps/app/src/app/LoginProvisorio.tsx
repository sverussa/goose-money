import { type SubmitEvent, useState } from 'react';
import { Navigate, useLocation } from 'react-router';

import { Button } from '@/components/ui/button';

import { mensagens } from './mensagens';
import { useSessao } from './providers/useSessao';
import { rotaDeVolta } from './rotas';

const m = mensagens.sessao;

/** Login mínimo para a sessão funcionar de ponta a ponta. A tela desenhada é a T05-01. */
export function LoginProvisorio() {
  const { usuario, carregando, entrar } = useSessao();
  const { search } = useLocation();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to={rotaDeVolta(search)} replace />;

  async function enviar(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    setEnviando(true);
    const texto = (campo: string) => {
      const v = dados.get(campo);
      return typeof v === 'string' ? v : '';
    };
    const falha = await entrar(texto('email'), texto('senha'), dados.has('manter'));
    setEnviando(false);
    // Entrou: o `Navigate` acima leva à rota pedida quando o usuário estiver preparado.
    setErro(falha);
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 p-6">
      <h1 className="text-xl font-medium">{mensagens.app}</h1>
      <form className="flex flex-col gap-3" onSubmit={(e) => void enviar(e)}>
        <label className="flex flex-col gap-1">
          {m.email}
          <input name="email" type="email" required autoFocus className="rounded border p-2" />
        </label>
        <label className="flex flex-col gap-1">
          {m.senha}
          <input name="senha" type="password" required className="rounded border p-2" />
        </label>
        <label className="flex items-center gap-2">
          <input name="manter" type="checkbox" />
          {m.manterConectado}
        </label>
        {erro && <p role="alert">{erro}</p>}
        <Button type="submit" disabled={enviando || carregando}>
          {enviando ? m.entrando : m.entrar}
        </Button>
      </form>
    </main>
  );
}
