import { beforeAll, describe, expect, it } from 'vitest';

import {
  alterar,
  clienteAnonimo,
  criarUsuario,
  emailUnico,
  gravar,
  gravarOk,
  inserir,
  type Op,
  type Usuario,
} from './apoio';
import { conferirChecklist } from './checklist';

// T02-07: recorrências, versões e ocorrências.
let a: Usuario;
const corrente = inserir('contas', {
  nome: 'Corrente',
  tipo: 'corrente',
  saldo_inicial: 0,
  data_saldo_inicial: '2026-01-31',
  cor: 'categorica-1',
});
const renda = inserir('categorias', { nome: 'Renda', tipo: 'receita', icone: 'banknote' });
const salario = inserir('recorrencias', {
  natureza: 'renda',
  descricao: 'Salário',
  competencia_inicio: '2026-11',
});

beforeAll(async () => {
  a = await criarUsuario(emailUnico('recorrencias'));
  await gravarOk(a.cliente, [
    corrente,
    renda,
    salario,
    inserir('recorrencia_versoes', {
      recorrencia_id: salario.id,
      vigente_desde: '2026-11',
      valor: 650000,
      dia: 31,
      conta_id: corrente.id,
      categoria_id: renda.id,
    }),
  ]);
});

/** Confirmar a ocorrência de `competencia`: a receita e o retrato, na mesma chamada. */
function confirmar(competencia: string, valor = 650000): [Op, Op] {
  const lancamento = inserir('lancamentos', {
    tipo: 'receita',
    data: '2026-10-30',
    valor,
    conta_id: corrente.id,
    categoria_id: renda.id,
  });
  return [
    lancamento,
    inserir('ocorrencias', {
      recorrencia_id: salario.id,
      competencia,
      situacao: 'confirmada',
      valor,
      data: '2026-10-30',
      conta_id: corrente.id,
      categoria_id: renda.id,
      lancamento_id: lancamento.id,
    }),
  ];
}

describe.each(['recorrencias', 'recorrencia_versoes', 'ocorrencias'])(
  'checklist de 12.2: %s',
  (tabela) => {
    it('RLS, colunas de controle, trigger, delete revogado, nada para anon', async () => {
      await conferirChecklist(tabela);
    });
  },
);

describe('ocorrências', () => {
  it('duas ocorrências ativas para a mesma recorrência e competência são recusadas (23505)', async () => {
    await gravarOk(a.cliente, confirmar('2026-08'));
    const { erro } = await gravar(a.cliente, confirmar('2026-08'));
    expect(erro?.code).toBe('23505');
    const ignorar = inserir('ocorrencias', {
      recorrencia_id: salario.id,
      competencia: '2026-08',
      situacao: 'ignorada',
    });
    expect((await gravar(a.cliente, [ignorar])).erro?.code).toBe('23505');
  });

  it('depois de excluir logicamente uma ocorrência, uma nova para a mesma competência é aceita', async () => {
    const [l, o] = confirmar('2026-09');
    await gravarOk(a.cliente, [l, o]);
    await gravarOk(a.cliente, [
      alterar('ocorrencias', o.id, { is_deleted: true }),
      alterar('lancamentos', l.id, { is_deleted: true }),
    ]);
    await gravarOk(a.cliente, confirmar('2026-09', 700000));
  });

  it('dois clientes confirmando ao mesmo tempo: um grava, o outro recebe 23505', async () => {
    // Duas sessões do mesmo usuário (dois aparelhos).
    const outro = clienteAnonimo();
    const { data } = await a.cliente.auth.getSession();
    await outro.auth.setSession({
      access_token: data.session?.access_token ?? '',
      refresh_token: data.session?.refresh_token ?? '',
    });
    const resultados = await Promise.all([
      gravar(a.cliente, confirmar('2026-10')),
      gravar(outro, confirmar('2026-10')),
    ]);
    const codigos = resultados.map((r) => r.erro?.code ?? 'ok').sort();
    expect(codigos).toEqual(['23505', 'ok']);
    // O lote recusado não deixou receita duplicada.
    const { data: receitas } = await a.cliente
      .from('ocorrencias')
      .select('lancamento_id')
      .eq('competencia', '2026-10')
      .eq('is_deleted', false);
    expect(receitas).toHaveLength(1);
  });

  it('retrato: confirmada exige um par conta + lançamento ou cartão + compra; ignorada não tem retrato', async () => {
    const [, o] = confirmar('2026-07');
    const semPar = { ...o, dados: { ...o.dados, lancamento_id: null } };
    expect((await gravar(a.cliente, [semPar])).erro?.details).toContain('ocorrencias_retrato');
    const ignoradaComValor = inserir('ocorrencias', {
      recorrencia_id: salario.id,
      competencia: '2026-06',
      situacao: 'ignorada',
      valor: 1,
    });
    expect((await gravar(a.cliente, [ignoradaComValor])).erro?.details).toContain(
      'ocorrencias_retrato',
    );
  });
});

describe('versões e recorrências', () => {
  it('forma de pagamento exige a conta ou o cartão certo; vigência única; fim depois do início', async () => {
    const versao = (dados: Record<string, unknown>) =>
      inserir('recorrencia_versoes', {
        recorrencia_id: salario.id,
        vigente_desde: '2027-01',
        valor: 700000,
        dia: 5,
        categoria_id: renda.id,
        ...dados,
      });
    expect(
      (await gravar(a.cliente, [versao({ forma_pagamento: 'cartao', conta_id: corrente.id })])).erro
        ?.details,
    ).toContain('recorrencia_versoes_forma_pagamento');
    expect((await gravar(a.cliente, [versao({})])).erro?.details).toContain(
      'recorrencia_versoes_forma_pagamento',
    );
    await gravarOk(a.cliente, [versao({ conta_id: corrente.id })]);
    expect((await gravar(a.cliente, [versao({ conta_id: corrente.id })])).erro?.code).toBe('23505');
    const invertida = inserir('recorrencias', {
      natureza: 'gasto',
      descricao: 'Academia',
      competencia_inicio: '2026-11',
      competencia_fim: '2026-10',
    });
    expect((await gravar(a.cliente, [invertida])).erro?.details).toContain('recorrencias_vigencia');
  });
});
