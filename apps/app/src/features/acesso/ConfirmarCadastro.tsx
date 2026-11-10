import { useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router';

import { Button } from '@/components/ui/button';
import { sessaoAtual } from '@/data/auth';

import { mensagensAcesso } from './mensagens';

const m = mensagensAcesso.confirmar;

/**
 * `#/confirmar` (T05-30): o link de confirmação chega com `?code=` e o Supabase troca o código
 * pela sessão ao carregar (PKCE); no Tauri, o deep link faz a troca (`OuvinteDeLinks`). Com a
 * sessão, o Painel abre no primeiro uso: a `RotaProtegida` espera o `SessaoProvider` chamar
 * `inicializar_usuario()` (T02-08).
 */
export function ConfirmarCadastro() {
  const [busca] = useSearchParams();
  const [estado, setEstado] = useState<'verificando' | 'invalido' | 'confirmado'>('verificando');
  const invalidoNaUrl = busca.has('invalido');

  useEffect(() => {
    let vivo = true;
    // `sessaoAtual` espera o Supabase terminar a troca do código da URL.
    void sessaoAtual().then((u) => {
      if (vivo) setEstado(u && !invalidoNaUrl ? 'confirmado' : 'invalido');
    });
    return () => {
      vivo = false;
    };
  }, [invalidoNaUrl]);

  if (estado === 'confirmado') return <Navigate to="/" replace />;
  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface-container px-4 py-8">
      <div className="flex w-full max-w-100 flex-col gap-5 rounded-xl bg-surface-container-lowest px-8 pt-10 pb-8">
        <h1 className="text-headline-md">{m.titulo}</h1>
        {estado === 'verificando' ? (
          <p role="status">{m.verificando}</p>
        ) : (
          <div role="alert" className="flex flex-col gap-5">
            <p className="text-body-md">{m.invalido}</p>
            <Button asChild className="h-12">
              <Link to="/login">{m.voltar}</Link>
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
