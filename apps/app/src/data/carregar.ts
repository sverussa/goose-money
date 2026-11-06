import type { Fatos } from '@goose-money/core';

import { lerFatos } from './mapeamento';
import { supabase } from './supabase';

/** Todos os fatos do usuário numa chamada (T02-09, D41), mapeados e validados (D42). */
export async function carregarTudo(): Promise<Fatos> {
  const { data, error } = await supabase.rpc('carregar_tudo');
  if (error) throw error;
  return lerFatos(data);
}
