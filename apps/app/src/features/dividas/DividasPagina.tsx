import { Landmark } from 'lucide-react';

import { EmptyState, EstadoDaCarga } from '@/components/EstadosDaTela';
import { useDerivado } from '@/queries/fatos';

import { BotaoNovaDivida, CardsDasDividas, TotaisDasDividas } from './Comum';
import { mensagensDividas as m } from './mensagens';

/** `#/dividas` (6.6): totais e os cards das dívidas (T05-22). */
export function DividasPagina() {
  const derivado = useDerivado();
  if (derivado.estado !== 'pronto') return <EstadoDaCarga carga={derivado} />;
  const d = derivado.dados;
  return (
    <div className="flex flex-col gap-4">
      <TotaisDasDividas d={d} />
      {d.dividas.size === 0 ? (
        <EmptyState Icone={Landmark} frase={m.vazio} acao={<BotaoNovaDivida />} />
      ) : (
        <CardsDasDividas d={d} />
      )}
    </div>
  );
}
