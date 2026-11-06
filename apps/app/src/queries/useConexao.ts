import { useSyncExternalStore } from 'react';

import { conexao } from '@/data/supabase';

/** `true` com conexão com o Supabase (navegador online e sem falha de rede recente). */
export const useConexao = (): boolean => useSyncExternalStore(conexao.assinar, conexao.online);
