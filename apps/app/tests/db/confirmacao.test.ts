import {
  centavos,
  competencia,
  criarConta,
  criarRecorrencia,
  dataCivil,
  type Fatos,
} from '@goose-money/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { aplicarGravadas } from '../../src/data/gravacao';
import { confirmarPendentes } from '../../src/queries/confirmacaoAutomatica';
import {
  clienteAnonimo,
  type Cliente,
  criarUsuario,
  sqlComoPostgres,
  type Usuario,
} from '../../../../supabase/tests/apoio';
import { carregarCom, contexto, executarCom } from './apoio-app';

// T03-06 e 11.6: salário no dia 5, confirmação automática, app fechado de 01/11 a 10/11.
const em = (d: string) => dataCivil(d);
let u: Usuario;
let recorrenciaId: string;

async function preparar(): Promise<Fatos> {
  u = await criarUsuario();
  const r = await u.cliente.rpc('inicializar_usuario');
  if (r.error) throw new Error(r.error.message);
  let f = await carregarCom(u.cliente);
  const ctx = contexto(u.id, em('2026-10-31'));
  const conta = criarConta(f, ctx, {
    nome: 'Conta salário',
    instituicao: null,
    tipo: 'corrente',
    saldoInicial: centavos(0),
    dataSaldoInicial: em('2026-10-31'),
    cor: 'categorica-1',
    incluirNoTotal: true,
  });
  f = aplicarGravadas(f, await executarCom(u.cliente, conta.mudancas));
  const renda = f.categorias.find((c) => c.tipo === 'receita');
  const contaId = f.contas[0]?.id;
  if (!renda || !contaId) throw new Error('sem categoria de receita ou conta');
  const rec = criarRecorrencia(
    f,
    ctx,
    {
      natureza: 'renda',
      descricao: 'Salário',
      competenciaInicio: competencia('2026-11'),
      competenciaFim: null,
      autoConfirmar: true,
    },
    {
      valor: centavos(650_000),
      dia: 5,
      formaPagamento: 'conta',
      contaId,
      cartaoId: null,
      categoriaId: renda.id,
    },
  );
  recorrenciaId = String(rec.mudancas[0]?.id);
  aplicarGravadas(f, await executarCom(u.cliente, rec.mudancas));
  return carregarCom(u.cliente);
}

const lancamentosDoSalario = () => sqlComoPostgres<{ data: string; valor: number }[]>`
  select l.data::text, l.valor::int from lancamentos l
  join ocorrencias o on o.lancamento_id = l.id and not o.is_deleted
  where o.recorrencia_id = ${recorrenciaId} and not l.is_deleted`;

async function segundoAparelho(): Promise<Cliente> {
  const c = clienteAnonimo();
  const { error } = await c.auth.signInWithPassword({ email: u.email, password: u.senha });
  if (error) throw error;
  return c;
}

let fatos: Fatos;
beforeEach(async () => {
  fatos = await preparar();
});

describe('confirmação automática', () => {
  it('abrir em 10/11 cria um lançamento datado de 05/11; abrir de novo não duplica (11.6)', async () => {
    const ctx = contexto(u.id, em('2026-11-10'));
    const r = await confirmarPendentes(fatos, ctx, (m) => executarCom(u.cliente, m));
    expect(r.gravadas).toHaveLength(1);
    expect(await lancamentosDoSalario()).toEqual([{ data: '2026-11-05', valor: 650_000 }]);

    // Reabrir: os fatos novos já têm a ocorrência.
    const depois = await carregarCom(u.cliente);
    const de_novo = await confirmarPendentes(depois, ctx, (m) => executarCom(u.cliente, m));
    expect(de_novo).toEqual({ gravadas: [], conflitos: 0, recusadas: 0 });
    // Com os fatos antigos (outro aparelho já confirmou): conflito pulado, sem erro.
    const atrasado = await confirmarPendentes(fatos, ctx, (m) => executarCom(u.cliente, m));
    expect(atrasado).toEqual({ gravadas: [], conflitos: 1, recusadas: 0 });
    expect(await lancamentosDoSalario()).toHaveLength(1);
  });

  it('dois aparelhos ao mesmo tempo criam um lançamento só, sem erro', async () => {
    const outro = await segundoAparelho();
    const ctx = contexto(u.id, em('2026-11-10'));
    const [a, b] = await Promise.all([
      confirmarPendentes(fatos, ctx, (m) => executarCom(u.cliente, m)),
      confirmarPendentes(fatos, contexto(u.id, em('2026-11-10')), (m) => executarCom(outro, m)),
    ]);
    expect(a.gravadas.length + b.gravadas.length).toBe(1);
    expect(a.conflitos + b.conflitos).toBe(1);
    expect(await lancamentosDoSalario()).toEqual([{ data: '2026-11-05', valor: 650_000 }]);
  });

  it('antes do dia 5 não há nada a confirmar', async () => {
    const r = await confirmarPendentes(fatos, contexto(u.id, em('2026-11-04')), (m) =>
      executarCom(u.cliente, m),
    );
    expect(r.gravadas).toHaveLength(0);
  });
});
