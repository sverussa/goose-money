import { randomUUID } from 'node:crypto';

import {
  type Contexto,
  type DataCivil,
  derivar,
  type Fatos,
  indicadoresDaBarra,
  type Mudanca,
} from '@goose-money/core';

import { gravarCom } from '../../src/data/gravacao';
import { lerFatos } from '../../src/data/mapeamento';
import { type Cliente } from '../../../../supabase/tests/apoio';

// O que `carregarTudo` e `executar` fazem no app, com o cliente de um usuário de teste.

export async function carregarCom(cliente: Cliente): Promise<Fatos> {
  const r = await cliente.rpc('carregar_tudo');
  if (r.error) throw new Error(r.error.message);
  return lerFatos(r.data);
}

export const executarCom = (cliente: Cliente, mudancas: readonly Mudanca[]) =>
  gravarCom((ops) => cliente.rpc('gravar', { ops }), mudancas);

export const contexto = (usuario: string, hoje: DataCivil): Contexto => ({
  hoje,
  agora: new Date().toISOString(),
  usuario,
  novoId: randomUUID,
});

export const barra = (f: Fatos, hoje: DataCivil) => indicadoresDaBarra(derivar(f, hoje));

/** Listas ordenadas por id: a ordem das linhas não importa para o Motor. */
export const ordenados = (f: Fatos, ignorar: string[] = []) =>
  Object.fromEntries(
    Object.entries(f).map(([e, v]) => [
      e,
      (Array.isArray(v) ? (v as Record<string, unknown>[]) : [v])
        .map((r) =>
          r ? Object.fromEntries(Object.entries(r).filter(([k]) => !ignorar.includes(k))) : r,
        )
        .sort((a, b) => String(a?.id).localeCompare(String(b?.id))),
    ]),
  );
