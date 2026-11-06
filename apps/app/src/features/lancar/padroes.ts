import type { Categoria, Conta, Fatos, Id } from '@goose-money/core';

import type { TipoDoFormulario } from './formulario';

// Padrões do formulário (7.2): tipo e pré-seleção pela tela, última conta usada, categorias.

const CHAVE_ULTIMA_CONTA = 'goose-money:ultima-conta';

export function lerUltimaConta(): string | null {
  try {
    return localStorage.getItem(CHAVE_ULTIMA_CONTA);
  } catch {
    return null;
  }
}

export function guardarUltimaConta(id: string): void {
  try {
    localStorage.setItem(CHAVE_ULTIMA_CONTA, id);
  } catch {
    // Sem armazenamento (aba privada): fica o padrão da próxima vez.
  }
}

export interface PadraoDaTela {
  tipo: TipoDoFormulario;
  contaId: Id | null;
}

/** Tabela 7.2: na tela de uma conta, Despesa naquela conta; nas demais, Despesa. */
export function padraoDaTela(pathname: string): PadraoDaTela {
  const conta = /^\/contas\/([^/]+)$/.exec(pathname)?.[1];
  return { tipo: 'despesa', contaId: conta ?? null };
}

export const contasAtivas = (fatos: Fatos): Conta[] => fatos.contas.filter((c) => !c.arquivada);

/**
 * A conta já marcada: a da tela, senão a última usada neste aparelho, senão a do lançamento mais
 * recente (MODELO-DADOS, "última conta usada"), senão a primeira ativa.
 */
export function contaInicial(fatos: Fatos, daTela: Id | null, ultima: string | null): Id | null {
  const ativas = contasAtivas(fatos);
  const ativa = (id: string | null | undefined) => ativas.find((c) => c.id === id)?.id;
  const recente = fatos.lancamentos.reduce<(typeof fatos.lancamentos)[number] | null>(
    (r, l) => (r === null || l.createdAt > r.createdAt ? l : r),
    null,
  );
  return ativa(daTela) ?? ativa(ultima) ?? ativa(recente?.contaId) ?? ativas[0]?.id ?? null;
}

export interface OpcaoDeCategoria {
  id: Id;
  nome: string;
  cor: string | null;
}

/** Categorias que servem ao tipo (`ambos` serve aos dois), sem a de ajuste de saldo (3.4). */
export function opcoesDeCategoria(fatos: Fatos, tipo: 'receita' | 'despesa'): OpcaoDeCategoria[] {
  const porId = new Map(fatos.categorias.map((c) => [c.id, c]));
  const nome = (c: Categoria) => {
    const pai = c.categoriaPaiId ? porId.get(c.categoriaPaiId) : undefined;
    return pai ? `${pai.nome} › ${c.nome}` : c.nome;
  };
  return fatos.categorias
    .filter((c) => (c.tipo === tipo || c.tipo === 'ambos') && c.sistema !== 'ajuste_saldo')
    .map((c) => ({ id: c.id, nome: nome(c), cor: c.cor }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export const aClassificar = (fatos: Fatos): Id | null =>
  fatos.categorias.find((c) => c.sistema === 'a_classificar')?.id ?? null;
