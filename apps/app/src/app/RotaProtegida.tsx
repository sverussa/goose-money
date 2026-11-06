import { Navigate, Outlet, useLocation } from 'react-router';

import { Button } from '@/components/ui/button';

import { mensagens } from './mensagens';
import { useSessao } from './providers/useSessao';
import { urlDoLogin } from './rotas';

/** Sem sessão, vai para o login e volta à rota pedida depois de entrar (PROMPT 6.1). */
export function RotaProtegida() {
  const { usuario, carregando, erro, tentarDeNovo } = useSessao();
  const local = useLocation();

  if (carregando)
    return (
      <p role="status" className="p-6">
        {mensagens.carregando}
      </p>
    );
  if (erro)
    return (
      <div role="alert" className="flex flex-col items-start gap-3 p-6">
        <p>{erro}</p>
        <Button onClick={tentarDeNovo}>{mensagens.tentarDeNovo}</Button>
      </div>
    );
  if (!usuario) return <Navigate to={urlDoLogin(local.pathname + local.search)} replace />;
  return <Outlet />;
}
