import { EstadoDaCarga } from '@/components/EstadosDaTela';
import { useDerivado } from '@/queries/fatos';

import { Acesso, Aparencia, Preferencias } from './SecaoAjustes';
import { Categorias } from './SecaoCategorias';

/**
 * `#/configuracoes` (6.9, Configuracoes.dc.html): Categorias à esquerda; Aparência, Preferências,
 * Acesso e Dados na coluna da direita (T05-28, T05-29).
 */
export function ConfiguracoesPagina() {
  const derivado = useDerivado();
  if (derivado.estado !== 'pronto') return <EstadoDaCarga carga={derivado} />;
  return (
    <div className="grid max-w-7xl items-start gap-4 expanded:grid-cols-2">
      <Categorias d={derivado.dados} />
      <div className="flex min-w-0 flex-col gap-4">
        <Aparencia d={derivado.dados} />
        <Preferencias d={derivado.dados} />
        <Acesso />
      </div>
    </div>
  );
}
