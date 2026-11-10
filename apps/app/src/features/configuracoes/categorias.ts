import type { Categoria, Comando, Entidade, Fatos, Id, NovaCategoria } from '@goose-money/core';
import {
  Baby,
  Banknote,
  Briefcase,
  Bus,
  Car,
  CircleHelp,
  Droplet,
  Dumbbell,
  Ellipsis,
  Fuel,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  type LucideIcon,
  PartyPopper,
  PawPrint,
  Percent,
  PiggyBank,
  Pill,
  Plane,
  Receipt,
  Repeat,
  Scale,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Tag,
  TrendingUp,
  Utensils,
  Wifi,
  Zap,
} from 'lucide-react';
import { z } from 'zod';

import { mensagensConfiguracoes } from './mensagens';

// Cadastro de categorias (6.9): a lista na ordem da tela, o formulário e o que a exclusão move.

/** Ícones lucide que a categoria pode escolher (os do seed incluídos); a chave é o nome gravado. */
export const ICONES: Record<string, LucideIcon> = {
  house: House,
  car: Car,
  fuel: Fuel,
  bus: Bus,
  plane: Plane,
  utensils: Utensils,
  'shopping-cart': ShoppingCart,
  'shopping-bag': ShoppingBag,
  shirt: Shirt,
  'heart-pulse': HeartPulse,
  pill: Pill,
  dumbbell: Dumbbell,
  repeat: Repeat,
  smartphone: Smartphone,
  wifi: Wifi,
  zap: Zap,
  droplet: Droplet,
  'graduation-cap': GraduationCap,
  baby: Baby,
  'paw-print': PawPrint,
  gift: Gift,
  'party-popper': PartyPopper,
  ellipsis: Ellipsis,
  banknote: Banknote,
  briefcase: Briefcase,
  'piggy-bank': PiggyBank,
  'trending-up': TrendingUp,
};
/** Os das categorias de sistema não aparecem na escolha. */
const DO_SISTEMA: Record<string, LucideIcon> = {
  'circle-help': CircleHelp,
  percent: Percent,
  receipt: Receipt,
  scale: Scale,
};
export const iconeDe = (nome: string): LucideIcon => ICONES[nome] ?? DO_SISTEMA[nome] ?? Tag;

/** Paleta categórica (4.3, D77): 8 cores. */
export const CORES = Array.from({ length: 8 }, (_, i) => `categorica-${String(i + 1)}`);

const ORDEM_DO_SISTEMA = ['a_classificar', 'juros_encargos', 'tarifas', 'ajuste_saldo'];
const ORDEM_DO_TIPO = { despesa: 0, receita: 1, ambos: 2 };
const porNome = (a: Categoria, b: Categoria) => a.nome.localeCompare(b.nome, 'pt-BR');

export interface LinhaDaCategoria {
  categoria: Categoria;
  /** Só nas principais. */
  filhas: Categoria[];
  pai: Categoria | null;
}

/** Despesas e depois receitas, cada pai seguido das subcategorias; as de sistema no fim. */
export function linhasDasCategorias(categorias: readonly Categoria[]): LinhaDaCategoria[] {
  const filhasDe = (id: Id) => categorias.filter((c) => c.categoriaPaiId === id).sort(porNome);
  const comuns = categorias
    .filter((c) => c.sistema === null && c.categoriaPaiId === null)
    .sort((a, b) => ORDEM_DO_TIPO[a.tipo] - ORDEM_DO_TIPO[b.tipo] || porNome(a, b));
  const sistema = categorias
    .filter((c) => c.sistema !== null)
    .sort(
      (a, b) =>
        ORDEM_DO_SISTEMA.indexOf(a.sistema ?? '') - ORDEM_DO_SISTEMA.indexOf(b.sistema ?? ''),
    );
  return [
    ...comuns.flatMap((c) => {
      const filhas = filhasDe(c.id);
      return [
        { categoria: c, filhas, pai: null },
        ...filhas.map((f) => ({ categoria: f, filhas: [], pai: c })),
      ];
    }),
    ...sistema.map((c) => ({ categoria: c, filhas: [], pai: null })),
  ];
}

/** Pais possíveis (D35): comuns, de primeiro nível, sem ser a própria. */
export const paisPossiveis = (categorias: readonly Categoria[], id?: Id): Categoria[] =>
  categorias
    .filter((c) => c.sistema === null && c.categoriaPaiId === null && c.id !== id)
    .sort(porNome);

const e = mensagensConfiguracoes.categorias.formulario.erros;

export const esquemaDaCategoria = z.object({
  nome: z.string().trim().min(1, e.nome),
  tipo: z.enum(['despesa', 'receita']),
  icone: z.string(),
  cor: z.string(),
  /** Vazio: categoria principal. */
  pai: z.string(),
});
export type ValoresDaCategoria = z.infer<typeof esquemaDaCategoria>;

export function valoresIniciais(
  categorias: readonly Categoria[],
  c?: Categoria,
): ValoresDaCategoria {
  if (c)
    return {
      nome: c.nome,
      tipo: c.tipo === 'receita' ? 'receita' : 'despesa',
      icone: c.icone,
      cor: c.cor ?? CORES[0] ?? '',
      pai: c.categoriaPaiId ?? '',
    };
  // A primeira cor que nenhuma categoria principal usa.
  const usadas = new Set(categorias.filter((x) => x.categoriaPaiId === null).map((x) => x.cor));
  return {
    nome: '',
    tipo: 'despesa',
    icone: 'ellipsis',
    cor: CORES.find((x) => !usadas.has(x)) ?? CORES[0] ?? '',
    pai: '',
  };
}

export const camposDaCategoria = (v: ValoresDaCategoria): NovaCategoria => ({
  nome: v.nome.trim(),
  tipo: v.tipo,
  icone: v.icone,
  cor: v.cor,
  categoriaPaiId: v.pai || null,
});

export interface ItensMovidos {
  lancamentos: number;
  compras: number;
  itensFatura: number;
  dividas: number;
  recorrencias: number;
  total: number;
}

/**
 * O que o `excluirCategoria` do core leva para "A classificar" (D49), contado nas mudanças do
 * próprio comando: versões e ocorrências contam uma vez por recorrência.
 */
export function itensMovidos(fatos: Fatos, comando: Comando): ItensMovidos {
  const movidas = (entidade: Entidade) =>
    comando.mudancas
      .filter((x) => x.entidade === entidade && 'categoriaId' in x.dados)
      .map((x) => x.id);
  const recorrenciaDe = new Map<Id, Id>([
    ...fatos.recorrenciaVersoes.map((v) => [v.id, v.recorrenciaId] as const),
    ...fatos.ocorrencias.map((o) => [o.id, o.recorrenciaId] as const),
  ]);
  const recorrencias = new Set(
    [...movidas('recorrenciaVersoes'), ...movidas('ocorrencias')].map((id) =>
      recorrenciaDe.get(id),
    ),
  ).size;
  const n = {
    lancamentos: movidas('lancamentos').length,
    compras: movidas('compras').length,
    itensFatura: movidas('itensFatura').length,
    dividas: movidas('dividas').length,
    recorrencias,
  };
  return { ...n, total: Object.values(n).reduce((a, b) => a + b, 0) };
}

/** "3 lançamentos, 1 compra e 2 recorrências". */
export function listaDosItens(n: ItensMovidos): string {
  const textos = mensagensConfiguracoes.categorias.itens;
  const partes = (Object.keys(textos) as (keyof typeof textos)[])
    .filter((k) => n[k] > 0)
    .map((k) => textos[k](n[k]));
  const ultima = partes.pop() ?? '';
  return partes.length ? `${partes.join(', ')} e ${ultima}` : ultima;
}
