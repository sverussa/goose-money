import {
  type Derivado,
  derivar,
  despesas,
  type Fatos,
  type Id,
  indicadoresDaBarra,
  type Periodo,
  receitas,
  resultado,
  taxaDePoupanca,
} from '@goose-money/core';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { mensagens } from '@/app/mensagens';
import { useSessao } from '@/app/providers/useSessao';
import { carregarTudo } from '@/data/carregar';

import { useHoje } from './relogio';

/** Estado padronizado das telas (T04-07): carregando, erro com "Tentar de novo" ou pronto. */
export type Carga<T> =
  | { estado: 'carregando' }
  | { estado: 'erro'; mensagem: string; tentarDeNovo: () => void }
  | { estado: 'pronto'; dados: T };

export const chaveDosFatos = (usuarioId: string) => ['fatos', usuarioId] as const;

/** Os fatos do usuário (D18): recarrega ao voltar o foco e a conexão (`clienteDeConsultas`). */
export function useFatos(): Carga<Fatos> {
  const { usuario } = useSessao();
  const q = useQuery({
    queryKey: chaveDosFatos(usuario?.id ?? ''),
    queryFn: carregarTudo,
    enabled: !!usuario,
  });
  const { data, isError, refetch } = q;
  // Com dados em cache, uma recarga que falha continua mostrando os últimos fatos.
  return useMemo(() => {
    if (data) return { estado: 'pronto', dados: data };
    if (isError)
      return { estado: 'erro', mensagem: mensagens.carga.erro, tentarDeNovo: () => void refetch() };
    return { estado: 'carregando' };
  }, [data, isError, refetch]);
}

/** Aplica `f` só quando a carga está pronta; carregando e erro passam adiante. */
function mapear<T, R>(c: Carga<T>, f: (dados: T) => R): Carga<R> {
  return c.estado === 'pronto' ? { estado: 'pronto', dados: f(c.dados) } : c;
}

/** A derivação única (D13), refeita só quando os fatos ou o dia mudam. */
export function useDerivado(): Carga<Derivado> {
  const fatos = useFatos();
  const hoje = useHoje();
  return useMemo(() => mapear(fatos, (f) => derivar(f, hoje)), [fatos, hoje]);
}

// Hooks finos: cada um só chama funções do core sobre a derivação; nenhum faz conta.

export function useBarraDeTotais() {
  const d = useDerivado();
  return useMemo(() => mapear(d, indicadoresDaBarra), [d]);
}

export function useIndicadoresDoPeriodo(p: Periodo) {
  const d = useDerivado();
  return useMemo(
    () =>
      mapear(d, (x) => ({
        receitas: receitas(x, p),
        despesas: despesas(x, p),
        resultado: resultado(x, p),
        taxaDePoupanca: taxaDePoupanca(x, p),
      })),
    [d, p],
  );
}

export function useFaturas(cartaoId: Id) {
  const d = useDerivado();
  return useMemo(() => mapear(d, (x) => x.faturas.get(cartaoId) ?? []), [d, cartaoId]);
}
