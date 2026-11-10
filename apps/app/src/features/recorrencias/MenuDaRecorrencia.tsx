import {
  type Derivado,
  excluirRecorrencia,
  ignorarOcorrencia,
  type OcorrenciaDoMes,
} from '@goose-money/core';
import { EllipsisVertical } from 'lucide-react';
import { useRef } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ItemDoMenu } from '@/features/cartoes/menu';
import { useRodar } from '@/features/cartoes/rodar';
import { permissaoDe } from '@/features/dividas/tabela';
import { useContexto } from '@/queries/useComando';

import type { mensagensRecorrencias } from './mensagens';

/** "Ignorar este mês", "Editar" e "Excluir" de uma renda ou gasto fixo (3.8, D68). */
export function MenuDaRecorrencia({
  d,
  o,
  textos: m,
  editar,
}: {
  d: Derivado;
  o: OcorrenciaDoMes;
  textos: typeof mensagensRecorrencias.menu & { detalheExcluir: string };
  editar: () => void;
}) {
  const rodar = useRodar();
  const contexto = useContexto();
  // O diálogo só abre depois que o menu fecha e devolve o foco ao botão (como em Cartões).
  const editarAoFechar = useRef(false);
  const { recorrenciaId, competencia, recorrencia } = o;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="icon" aria-label={m.rotulo(recorrencia.descricao)}>
          <EllipsisVertical aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onCloseAutoFocus={() => {
          if (!editarAoFechar.current) return;
          editarAoFechar.current = false;
          editar();
        }}
      >
        <ItemDoMenu
          rotulo={m.ignorar}
          detalhe={m.detalheIgnorar}
          permissao={permissaoDe(() =>
            ignorarOcorrencia(d.fatos, contexto(), recorrenciaId, competencia),
          )}
          aoEscolher={() => {
            rodar((ctx) => ignorarOcorrencia(d.fatos, ctx, recorrenciaId, competencia));
          }}
        />
        <ItemDoMenu
          rotulo={m.editar}
          aoEscolher={() => {
            editarAoFechar.current = true;
          }}
        />
        <ItemDoMenu
          rotulo={m.excluir}
          detalhe={m.detalheExcluir}
          aoEscolher={() => {
            rodar((ctx) => excluirRecorrencia(d.fatos, ctx, recorrenciaId));
          }}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
