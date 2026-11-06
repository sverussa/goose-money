import { VERSAO_CORE } from '@goose-money/core';

import { Button } from '@/components/ui/button';
import { useBarraDeTotais } from '@/queries/fatos';
import { useHoje } from '@/queries/relogio';

import { mensagens } from './mensagens';
import { useSessao } from './providers/useSessao';

/**
 * Página de toda rota autenticada até a casca (T04-05) e as telas (etapa 5). Mostra "hoje" e a
 * Barra de Totais em centavos, sem formatação (T04-04), para conferir a carga de ponta a ponta.
 */
export function InicioProvisorio() {
  const { usuario, sair } = useSessao();
  const hoje = useHoje();
  const barra = useBarraDeTotais();
  return (
    <main className="flex flex-col items-start gap-3 p-6">
      <h1 className="text-xl font-medium">{mensagens.app}</h1>
      <p>Core {VERSAO_CORE}</p>
      <p>{usuario?.email}</p>
      <p>Hoje: {hoje}</p>
      {barra.estado === 'carregando' && <p role="status">{mensagens.carregando}</p>}
      {barra.estado === 'erro' && (
        <div role="alert">
          <p>{barra.mensagem}</p>
          <Button onClick={barra.tentarDeNovo}>{mensagens.tentarDeNovo}</Button>
        </div>
      )}
      {barra.estado === 'pronto' && (
        <dl aria-label="Barra de Totais (centavos)">
          {Object.entries(barra.dados).map(([nome, valor]) => (
            <div key={nome} className="flex gap-2">
              <dt>{nome}</dt>
              <dd>{valor}</dd>
            </div>
          ))}
        </dl>
      )}
      <Button onClick={() => void sair()}>{mensagens.sessao.sair}</Button>
    </main>
  );
}
