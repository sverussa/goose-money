import { expect } from 'vitest';
import { validarInvariantesDosFatos, validarReferencias } from '../backup';
import { competencia, dataCivil } from '../datas';
import { centavos } from '../dinheiro';
import { type Categoria, type Fatos, fatosSchema, fatosVazios, type Id } from '../modelo';
import { aplicar, type Comando, type Contexto, ErroDeDominio } from './mudancas';

/** Cenário dos testes dos comandos (só os testes importam). Hoje = 04/11/2026. */

export const id = (n: number): Id => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const d = dataCivil;
export const c = competencia;
export const r$ = (reais: number) => centavos(Math.round(reais * 100));
export const HOJE = d('2026-11-04');
const USUARIO = id(99);
const controle = {
  createdAt: '2026-11-01T12:00:00-03:00',
  updatedAt: '2026-11-01T12:00:00-03:00',
  createdBy: USUARIO,
  isDeleted: false,
};

export const CONTA_A = id(1);
/** Poupança com saldo zero, incluída no total. */
export const CONTA_B = id(2);
/** Cartão A (fecha 3, vence 10), controlado desde 2026-10; a fatura aberta hoje é a de 2026-12. */
export const CARTAO = id(3);
export const MERCADO = id(10);
export const SALARIO = id(11);
export const A_CLASSIFICAR = id(20);
export const JUROS = id(21);
export const AJUSTE = id(23);

let n = 1000;
/** Ids em sequência, iguais a cada execução; únicos entre comandos encadeados no mesmo arquivo. */
export function contexto(): Contexto {
  return {
    hoje: HOJE,
    agora: '2026-11-04T12:00:00-03:00',
    usuario: USUARIO,
    novoId: () => id(n++),
  };
}

const categoria = (n: number, campos: Partial<Categoria>): Categoria => ({
  ...controle,
  id: id(n),
  nome: `Categoria ${String(n)}`,
  tipo: 'despesa',
  icone: 'tag',
  cor: null,
  categoriaPaiId: null,
  sistema: null,
  ...campos,
});

export function cenario(): Fatos {
  const f = fatosVazios();
  f.categorias.push(
    categoria(10, { nome: 'Mercado', cor: 'categorica-1' }),
    categoria(11, { nome: 'Salário', tipo: 'receita', cor: 'categorica-2' }),
    categoria(20, { nome: 'A classificar', tipo: 'ambos', sistema: 'a_classificar' }),
    categoria(21, { nome: 'Juros e encargos', sistema: 'juros_encargos' }),
    categoria(22, { nome: 'Tarifas', sistema: 'tarifas' }),
    categoria(23, { nome: 'Ajuste de saldo', tipo: 'ambos', sistema: 'ajuste_saldo' }),
  );
  const conta = {
    ...controle,
    instituicao: null,
    dataSaldoInicial: d('2026-07-31'),
    incluirNoTotal: true,
    arquivada: false,
  };
  f.contas.push(
    {
      ...conta,
      id: CONTA_A,
      nome: 'Conta corrente',
      tipo: 'corrente',
      saldoInicial: r$(1000),
      cor: 'categorica-1',
    },
    {
      ...conta,
      id: CONTA_B,
      nome: 'Poupança',
      tipo: 'poupanca',
      saldoInicial: r$(0),
      cor: 'categorica-2',
    },
  );
  f.cartoes.push({
    ...controle,
    id: CARTAO,
    nome: 'Cartão A',
    instituicao: null,
    cor: 'cartao-a',
    limite: r$(8000),
    contaPagamentoId: CONTA_A,
    competenciaInicial: c('2026-10'),
    arquivado: false,
  });
  f.cartaoCiclos.push({
    ...controle,
    id: id(4),
    cartaoId: CARTAO,
    vigenteDesde: c('2026-10'),
    diaFechamento: 3,
    diaVencimento: 10,
  });
  f.preferencias = {
    ...controle,
    id: id(5),
    limiteAlerta: r$(500),
    horizontePadrao: 12,
    ocultarValoresAoAbrir: false,
  };
  return f;
}

const ordenados = (f: Fatos) =>
  Object.fromEntries(
    Object.entries(f).map(([k, v]) => [
      k,
      Array.isArray(v) ? [...(v as { id: Id }[])].sort((a, b) => a.id.localeCompare(b.id)) : v,
    ]),
  );

/**
 * Critérios de aceite de T01-22: os fatos depois das mudanças são válidos (schemas, referências,
 * chaves únicas e invariantes de 3.6), nenhuma ação é apagar e as inversas devolvem os fatos.
 */
export function verificar(f: Fatos, cmd: Comando): Fatos {
  for (const m of [...cmd.mudancas, ...cmd.inversas])
    expect(['inserir', 'alterar']).toContain(m.acao);
  const depois = aplicar(f, cmd.mudancas);
  expect(fatosSchema.safeParse(depois).error?.issues).toBeUndefined();
  expect(validarReferencias(depois)).toEqual([]);
  expect(validarInvariantesDosFatos(depois)).toEqual([]);
  expect(ordenados(aplicar(depois, cmd.inversas))).toEqual(ordenados(f));
  return depois;
}

export function recusa(acao: () => unknown, mensagem: string | RegExp): void {
  expect(acao).toThrow(ErroDeDominio);
  expect(acao).toThrow(mensagem);
}
