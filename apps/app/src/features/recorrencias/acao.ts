import { useSearchParams } from 'react-router';

/**
 * Ações de Rendas e Gastos fixos na URL (`?acao=`): nova, editar e confirmar, com
 * `?recorrencia=`. As pendências do Painel chegam com `?mes=&acao=confirmar&recorrencia=`.
 */
export type AcaoDaRecorrencia = 'nova' | 'editar' | 'confirmar';

export function useAcaoDaRecorrencia() {
  const [busca, setBusca] = useSearchParams();
  const abrir = (acao: AcaoDaRecorrencia, recorrenciaId?: string) => {
    setBusca((b) => {
      const x = new URLSearchParams(b);
      x.set('acao', acao);
      if (recorrenciaId) x.set('recorrencia', recorrenciaId);
      else x.delete('recorrencia');
      return x;
    });
  };
  const fechar = () => {
    setBusca(
      (b) => {
        const x = new URLSearchParams(b);
        x.delete('acao');
        x.delete('recorrencia');
        return x;
      },
      { replace: true },
    );
  };
  return {
    acao: busca.get('acao') as AcaoDaRecorrencia | null,
    recorrenciaId: busca.get('recorrencia'),
    abrir,
    fechar,
  };
}

export type AbrirAcao = ReturnType<typeof useAcaoDaRecorrencia>['abrir'];
