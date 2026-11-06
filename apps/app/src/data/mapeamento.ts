import { type Entidade, type Fatos, fatosSchema, type Registros } from '@goose-money/core';

import type { Database } from './database.types';

/**
 * Banco ↔ domínio (T03-02, PROMPT 9.4, D25): o único lugar do app que conhece os nomes
 * `snake_case`. Tabela e coluna são os nomes do domínio em `snake_case`.
 */

type Tabelas = Database['public']['Tables'];
export type Tabela = keyof Tabelas;
export type Linha = Record<string, unknown>;

type Camel<S extends string> = S extends `${infer A}_${infer B}`
  ? `${A}${Capitalize<Camel<B>>}`
  : S;
type Exato<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

// Uma coluna (ou tabela) nova no banco sem campo igual no domínio, ou o contrário, quebra o
// `tsc` aqui: regenere `database.types.ts` (make db-types) e confira o core.
type Confere = {
  [T in Tabela]: Camel<T> extends Entidade
    ? Exato<Camel<keyof Tabelas[T]['Row'] & string>, keyof Registros[Camel<T>][number]>
    : false;
};
export const confere: Confere & { todas: Exato<Camel<Tabela>, Entidade> } = {
  todas: true,
  categorias: true,
  contas: true,
  cartoes: true,
  cartao_ciclos: true,
  lancamentos: true,
  compras: true,
  parcelas: true,
  itens_fatura: true,
  dividas: true,
  parcelas_divida: true,
  recorrencias: true,
  recorrencia_versoes: true,
  ocorrencias: true,
  preferencias: true,
};

const paraCamel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
const paraSnake = (s: string) => s.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);

export const tabelaDe = (e: Entidade): Tabela => paraSnake(e) as Tabela;
export const entidadeDe = (t: string): Entidade => paraCamel(t) as Entidade;

/** Colunas que o banco preenche: o `gravar` ignora e o app não manda. */
const CONTROLE_DO_BANCO = new Set(['id', 'created_at', 'updated_at', 'created_by']);

// `numeric` chega como número no JSON; o core lê a taxa como texto (decimal.js). 15 dígitos
// significativos devolvem o texto gravado sem o ruído do binário e sem notação "1e-7".
const textoDaTaxa = new Intl.NumberFormat('en-US', {
  useGrouping: false,
  maximumSignificantDigits: 15,
});

/** Uma linha do banco como registro do domínio (ainda sem validar). */
export function deBanco(tabela: string, linha: Linha): Linha {
  return Object.fromEntries(
    Object.entries(linha).map(([coluna, v]) => {
      if (typeof v === 'number') {
        if (coluna === 'taxa_mensal') return [paraCamel(coluna), textoDaTaxa.format(v)];
        // bigint passa pelo JSON como número: acima de 2^53 já perdeu precisão.
        if (!Number.isSafeInteger(v))
          throw new RangeError(`${tabela}.${coluna}: ${String(v)} não é um inteiro seguro`);
      }
      return [paraCamel(coluna), v];
    }),
  );
}

/** Campos do domínio (registro inteiro ou só os que mudam) como colunas do banco. */
export function paraBanco(dados: Readonly<Linha>): Linha {
  return Object.fromEntries(
    Object.entries(dados)
      .map(([campo, v]) => [paraSnake(campo), v] as const)
      .filter(([coluna]) => !CONTROLE_DO_BANCO.has(coluna)),
  );
}

export class DadosInvalidos extends Error {
  override name = 'DadosInvalidos';
}

/**
 * Resultado de `carregar_tudo()` como `Fatos`, validado pelos schemas do core sempre (D42):
 * dado inválido não chega ao Motor.
 */
export function lerFatos(json: unknown): Fatos {
  if (typeof json !== 'object' || json === null) throw new DadosInvalidos('Resposta vazia');
  const fatos: Linha = Object.fromEntries(
    Object.entries(json as Record<string, Linha[]>).map(([tabela, linhas]) => [
      entidadeDe(tabela),
      linhas.map((l) => deBanco(tabela, l)),
    ]),
  );
  // `preferencias` vem como lista (T02-09): uma por usuário, ou nenhuma antes da inicialização.
  fatos.preferencias = (fatos.preferencias as Linha[] | undefined)?.[0] ?? null;
  const r = fatosSchema.safeParse(fatos);
  if (!r.success) {
    const i = r.error.issues[0];
    throw new DadosInvalidos(`${i?.path.join('.') ?? ''}: ${i?.message ?? ''}`);
  }
  return r.data;
}
