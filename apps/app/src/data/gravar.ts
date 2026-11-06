import type { Mudanca } from '@goose-money/core';

import { type Gravadas, gravarCom } from './gravacao';
import { supabase } from './supabase';

/** Executa as mudanças de um comando do core numa transação (`gravar(ops)`, T02-02). */
export const executar = (mudancas: readonly Mudanca[]): Promise<Gravadas> =>
  gravarCom((ops) => supabase.rpc('gravar', { ops: ops as never }), mudancas);
