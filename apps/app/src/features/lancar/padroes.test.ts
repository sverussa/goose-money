import { dataCivil, gerarSeed } from '@goose-money/core';
import { describe, expect, it } from 'vitest';

import { camposDoLancamento, esquemaDoFormulario, resolverZod } from './formulario';
import { aClassificar, contaInicial, opcoesDeCategoria, padraoDaTela } from './padroes';

const fatos = gerarSeed(dataCivil('2026-11-04'), '00000000-0000-4000-8000-000000000001');
const [corrente, poupanca] = fatos.contas;

describe('padrões do formulário de lançamento (7.2)', () => {
  it('na tela de uma conta, Despesa naquela conta; nas outras, Despesa sem conta', () => {
    expect(padraoDaTela('/contas/abc')).toEqual({ tipo: 'despesa', contaId: 'abc' });
    expect(padraoDaTela('/contas')).toEqual({ tipo: 'despesa', contaId: null });
    expect(padraoDaTela('/')).toEqual({ tipo: 'despesa', contaId: null });
  });

  it('conta inicial: a da tela, senão a última usada, senão a do lançamento mais recente', () => {
    expect(contaInicial(fatos, poupanca?.id ?? null, corrente?.id ?? null)).toBe(poupanca?.id);
    expect(contaInicial(fatos, null, poupanca?.id ?? null)).toBe(poupanca?.id);
    const recente = [...fatos.lancamentos].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    )[0];
    expect(contaInicial(fatos, null, 'apagada')).toBe(recente?.contaId);
    expect(contaInicial({ ...fatos, contas: [] }, null, null)).toBeNull();
  });

  it('categorias de despesa trazem "A classificar" e não a de ajuste de saldo', () => {
    const nomes = opcoesDeCategoria(fatos, 'despesa').map((c) => c.id);
    expect(nomes).toContain(aClassificar(fatos));
    const ajuste = fatos.categorias.find((c) => c.sistema === 'ajuste_saldo');
    expect(nomes).not.toContain(ajuste?.id);
    const receita = fatos.categorias.find((c) => c.tipo === 'receita');
    expect(nomes).not.toContain(receita?.id);
  });
});

describe('formulário de lançamento', () => {
  const validos = {
    tipo: 'despesa' as const,
    valor: 1590,
    descricao: '  ',
    categoriaId: 'cat',
    data: '2026-11-04',
    contaId: 'conta',
  };

  it('o adaptador devolve o primeiro erro de cada campo (D7)', async () => {
    const resolver = resolverZod(esquemaDoFormulario);
    const r = await resolver({ ...validos, valor: 0, contaId: '' }, undefined, {
      fields: {},
      shouldUseNativeValidation: false,
    });
    expect(Object.keys(r.errors).sort()).toEqual(['contaId', 'valor']);
    expect(r.errors.valor?.message).toBe('Informe um valor maior que zero');
  });

  it('descrição só com espaços vira nula; o lançamento sai efetivado', () => {
    expect(camposDoLancamento(validos)).toMatchObject({
      tipo: 'despesa',
      status: 'efetivado',
      valor: 1590,
      descricao: null,
    });
  });
});
