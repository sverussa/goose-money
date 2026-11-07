import { useSearchParams } from 'react-router';

/**
 * Ações da tela do cartão, na URL (`?acao=`): Nova compra (T05-13), o menu da compra e as
 * operações dela (T05-14, com `?compra=<id>`) e Pagar fatura, encargo ou estorno e ciclo
 * (T05-15). O menu da lista de cartões já abre `?acao=ciclo`.
 */
export const OPERACOES_DA_COMPRA = [
  'editar-compra',
  'editar-valor',
  'ajuste',
  'antecipar',
  'cancelar-compra',
  'excluir-compra',
] as const;
export type OperacaoDaFatura = (typeof OPERACOES_DA_COMPRA)[number];
export type AcaoDaFatura =
  'nova-compra' | 'pagar' | 'encargo' | 'ciclo' | 'compra' | OperacaoDaFatura;

export function useAcaoDaFatura() {
  const [busca, setBusca] = useSearchParams();
  /** `data`: a data sugerida do encargo ("Lançar juros" do rotativo, T05-15). */
  const abrir = (acao: AcaoDaFatura, compraId?: string, data?: string) => {
    setBusca((b) => {
      const x = new URLSearchParams(b);
      x.set('acao', acao);
      if (compraId) x.set('compra', compraId);
      else x.delete('compra');
      if (data) x.set('data', data);
      else x.delete('data');
      return x;
    });
  };
  const fechar = () => {
    setBusca(
      (b) => {
        const x = new URLSearchParams(b);
        x.delete('acao');
        x.delete('compra');
        x.delete('data');
        return x;
      },
      { replace: true },
    );
  };
  return {
    acao: busca.get('acao') as AcaoDaFatura | null,
    compraId: busca.get('compra'),
    data: busca.get('data'),
    abrir,
    fechar,
  };
}
