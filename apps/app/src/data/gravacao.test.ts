import { dataCivil, ErroDeDominio, type Fatos, gerarSeed } from '@goose-money/core';
import { describe, expect, it } from 'vitest';

import {
  aplicarGravadas,
  ErroDeGravacao,
  gravarCom,
  mensagemDoErroAoGravar,
  paraOps,
} from './gravacao';

const seed = gerarSeed(dataCivil('2026-11-04'), '00000000-0000-4000-8000-000000000001');
const [l1, l2] = seed.lancamentos;
if (!l1 || !l2) throw new Error('seed sem lançamentos');

describe('paraOps', () => {
  it('mudanças do core no formato do gravar, com nomes do banco', () => {
    const ops = paraOps([
      {
        entidade: 'parcelasDivida',
        acao: 'alterar',
        id: 'x',
        dados: { pagaAntesDoCadastro: true },
      },
    ]);
    expect(ops).toEqual([
      {
        tabela: 'parcelas_divida',
        acao: 'alterar',
        id: 'x',
        dados: { paga_antes_do_cadastro: true },
      },
    ]);
  });
});

describe('aplicarGravadas', () => {
  it('troca, remove os excluídos, acrescenta os novos e não mexe no resto', () => {
    const novo = { ...l1, id: 'novo' };
    const f = aplicarGravadas(seed, {
      lancamentos: [{ ...l1, valor: l1.valor }, { ...l2, isDeleted: true }, novo],
    });
    expect(f.lancamentos.map((l) => l.id)).toEqual([
      l1.id,
      ...seed.lancamentos.slice(2).map((l) => l.id),
      'novo',
    ]);
    expect(f.contas).toBe(seed.contas);
    expect(seed.lancamentos[1]).toBe(l2); // os fatos de antes não mudam
  });

  it('preferências: a única linha', () => {
    const p = seed.preferencias;
    if (!p) throw new Error('seed sem preferências');
    const f: Fatos = aplicarGravadas(seed, { preferencias: [{ ...p, limiteAlerta: 1 as never }] });
    expect(f.preferencias?.limiteAlerta).toBe(1);
  });
});

describe('gravarCom', () => {
  it('erro do banco vira ErroDeGravacao com código e status', async () => {
    const chamar = () =>
      Promise.resolve({ data: null, error: { message: 'dup', code: '23505' }, status: 409 });
    await expect(gravarCom(chamar, [])).rejects.toMatchObject({ codigo: '23505', status: 409 });
  });
});

describe('mensagemDoErroAoGravar', () => {
  const erro = (codigo: string, status = 400) => new ErroDeGravacao('x', codigo, status);
  it.each([
    [erro('23505'), 'Já existe um registro com esses dados.'],
    [erro('23503'), 'Um item ligado a este não existe mais. Atualize a página e tente de novo.'],
    [erro('23514'), 'Os dados não passaram nas regras de gravação.'],
    [erro('P0002'), 'Este item não existe mais; talvez tenha sido excluído em outro aparelho.'],
    [erro('', 0), 'Sem conexão: tente de novo quando a internet voltar'],
    [erro('PGRST303', 401), 'Sua sessão expirou. Entre de novo para salvar.'],
    [new ErroDeDominio('A conta "X" está arquivada'), 'A conta "X" está arquivada'],
    [new Error('?'), 'Não foi possível salvar. Tente de novo.'],
  ])('%s', (e, texto) => {
    expect(mensagemDoErroAoGravar(e)).toBe(texto);
  });

  it('navegador offline', () => {
    expect(mensagemDoErroAoGravar(erro('23505'), false)).toBe(
      'Sem conexão: tente de novo quando a internet voltar',
    );
  });
});
