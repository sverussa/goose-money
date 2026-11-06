import { Button } from '@/components/ui/button';
import { useBarraDeTotais } from '@/queries/fatos';
import { useHoje } from '@/queries/relogio';

import { mensagens } from '../mensagens';

/**
 * Lugar da Barra de Totais até a T04-06: "hoje" e os indicadores em centavos, sem formatação,
 * para conferir a carga de ponta a ponta (testes de T03-03 a T03-06).
 */
export function BarraProvisoria() {
  const hoje = useHoje();
  const barra = useBarraDeTotais();
  return (
    <section
      aria-label="Barra de Totais"
      className="flex flex-wrap items-center gap-4 border-b border-surface-container-highest bg-surface-container-lowest px-4 py-2 text-body-md medium:px-6"
    >
      <p>Hoje: {hoje}</p>
      {barra.estado === 'carregando' && <p role="status">{mensagens.carregando}</p>}
      {barra.estado === 'erro' && (
        <div role="alert" className="flex items-center gap-3">
          <p>{barra.mensagem}</p>
          <Button variant="text" onClick={barra.tentarDeNovo}>
            {mensagens.tentarDeNovo}
          </Button>
        </div>
      )}
      {barra.estado === 'pronto' && (
        <dl aria-label="Barra de Totais (centavos)" className="flex flex-wrap gap-4">
          {Object.entries(barra.dados).map(([nome, valor]) => (
            <div key={nome} className="flex gap-2">
              <dt>{nome}</dt>
              <dd>{valor}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
