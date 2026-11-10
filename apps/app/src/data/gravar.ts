import type { Mudanca } from '@goose-money/core';

import { type Gravadas, gravarCom } from './gravacao';
import { supabase } from './supabase';

/** Executa as mudanças de um comando do core numa transação (`gravar(ops)`, T02-02). */
export const executar = (mudancas: readonly Mudanca[]): Promise<Gravadas> =>
  gravarCom((ops) => supabase.rpc('gravar', { ops: ops as never }), mudancas);

/** "Apagar tudo" (6.9, 9.4): exclusão lógica de tudo do usuário, menos as categorias de sistema e as preferências. */
export async function apagarTudo(): Promise<void> {
  const { error } = await supabase.rpc('apagar_tudo');
  if (error) throw error;
}
