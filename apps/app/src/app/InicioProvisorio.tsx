import { VERSAO_CORE } from '@goose-money/core';

import { Button } from '@/components/ui/button';

import { mensagens } from './mensagens';
import { useSessao } from './providers/useSessao';

/** Página de toda rota autenticada até a casca (T04-05) e as telas (etapa 5). */
export function InicioProvisorio() {
  const { usuario, sair } = useSessao();
  return (
    <main className="flex flex-col items-start gap-3 p-6">
      <h1 className="text-xl font-medium">{mensagens.app}</h1>
      <p>Core {VERSAO_CORE}</p>
      <p>{usuario?.email}</p>
      <Button onClick={() => void sair()}>{mensagens.sessao.sair}</Button>
    </main>
  );
}
