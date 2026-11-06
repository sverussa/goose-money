import { mensagens } from './mensagens';

/** Conteúdo de uma rota até a tela dela chegar (etapa 5); o título fica na top app bar. */
export function PaginaProvisoria() {
  return (
    <p className="text-body-lg text-on-surface-variant">{mensagens.navegacao.paginaProvisoria}</p>
  );
}
