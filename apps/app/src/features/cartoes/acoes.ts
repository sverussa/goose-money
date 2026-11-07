import { useSearchParams } from 'react-router';

/**
 * Ações da tela do cartão, na URL (`?acao=`): os diálogos chegam em T05-13 (`nova-compra`),
 * T05-14 (`compra`, com `?compra=<id>`) e T05-15 (`pagar`, `encargo`, `ciclo`). O menu da lista
 * de cartões já abre `?acao=ciclo`.
 */
export type AcaoDaFatura = 'nova-compra' | 'pagar' | 'encargo' | 'ciclo' | 'compra';

export function useAcaoDaFatura() {
  const [busca, setBusca] = useSearchParams();
  const abrir = (acao: AcaoDaFatura, compraId?: string) => {
    setBusca((b) => {
      const x = new URLSearchParams(b);
      x.set('acao', acao);
      if (compraId) x.set('compra', compraId);
      else x.delete('compra');
      return x;
    });
  };
  const fechar = () => {
    setBusca(
      (b) => {
        const x = new URLSearchParams(b);
        x.delete('acao');
        x.delete('compra');
        return x;
      },
      { replace: true },
    );
  };
  return {
    acao: busca.get('acao') as AcaoDaFatura | null,
    compraId: busca.get('compra'),
    abrir,
    fechar,
  };
}
