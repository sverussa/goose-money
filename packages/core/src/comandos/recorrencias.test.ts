import { describe, expect, it } from 'vitest';
import type { Fatos } from '../modelo';
import { editarCompra, excluirCompra } from './compras';
import { movimentacoes } from '../motor';
import { ocorrenciasDoMes } from '../recorrencias';
import {
  c,
  CARTAO,
  cenario,
  CONTA_A,
  contexto,
  d,
  HOJE,
  MERCADO,
  r$,
  recusa,
  SALARIO,
  verificar,
} from './cenario';
import {
  confirmarEmLote,
  confirmarOcorrencia,
  criarRecorrencia,
  editarRecorrencia,
  excluirRecorrencia,
  ignorarOcorrencia,
  type NovaRecorrencia,
  type NovaVersao,
  novaVersaoDaRecorrencia,
} from './recorrencias';

const salario: NovaRecorrencia = {
  natureza: 'renda',
  descricao: 'Salário',
  competenciaInicio: c('2026-09'),
  competenciaFim: null,
  autoConfirmar: true,
};
const naConta: NovaVersao = {
  valor: r$(6500),
  dia: 5,
  formaPagamento: 'conta',
  contaId: CONTA_A,
  cartaoId: null,
  categoriaId: SALARIO,
};
const streaming: NovaRecorrencia = {
  ...salario,
  natureza: 'gasto',
  descricao: 'Streaming',
  autoConfirmar: false,
};
const noCartao: NovaVersao = {
  valor: r$(55.9),
  dia: 1,
  formaPagamento: 'cartao',
  contaId: null,
  cartaoId: CARTAO,
  categoriaId: MERCADO,
};

function criar(r: NovaRecorrencia, v: NovaVersao, f: Fatos = cenario()): [Fatos, string] {
  const cmd = criarRecorrencia(f, contexto(), r, v);
  return [verificar(f, cmd), cmd.mudancas[0]?.id as string];
}

describe('criar e editar', () => {
  it('cria a recorrência com a primeira versão vigente desde o início', () => {
    const f = cenario();
    const cmd = criarRecorrencia(f, contexto(), salario, naConta);
    expect(cmd.descricao).toBe('Renda fixa criada');
    expect(cmd.mudancas[1]?.dados).toMatchObject({
      vigenteDesde: '2026-09',
      recorrenciaId: cmd.mudancas[0]?.id,
    });
    verificar(f, cmd);
    expect(criarRecorrencia(f, contexto(), streaming, noCartao).descricao).toBe(
      'Gasto fixo criado',
    );
    recusa(
      () => criarRecorrencia(f, contexto(), salario, noCartao),
      'Renda fixa é recebida em conta',
    );
    recusa(
      () => criarRecorrencia(f, contexto(), salario, { ...naConta, categoriaId: MERCADO }),
      /não é de receita/,
    );
  });

  it('nova versão "a partir de dezembro" não muda novembro (11.6)', () => {
    const [f0, id] = criar(salario, naConta);
    const f = verificar(f0, confirmarOcorrencia(f0, contexto(), id, c('2026-11'), { data: HOJE }));
    const cmd = novaVersaoDaRecorrencia(f, contexto(), id, c('2026-12'), {
      ...naConta,
      valor: r$(7000),
    });
    expect(cmd.mudancas[0]?.acao).toBe('inserir');
    const depois = verificar(f, cmd);
    const valor = (m: string) =>
      ocorrenciasDoMes(depois, c(m), HOJE).find((o) => o.recorrenciaId === id)?.valor;
    expect([valor('2026-10'), valor('2026-11'), valor('2026-12')]).toEqual([
      r$(6500),
      r$(6500),
      r$(7000),
    ]);
    const mesma = novaVersaoDaRecorrencia(depois, contexto(), id, c('2026-12'), {
      ...naConta,
      valor: r$(7100),
    });
    expect(mesma.mudancas).toEqual([
      {
        entidade: 'recorrenciaVersoes',
        acao: 'alterar',
        id: cmd.mudancas[0]?.id,
        dados: { valor: r$(7100) },
      },
    ]);
    verificar(depois, mesma);
    recusa(
      () => novaVersaoDaRecorrencia(f, contexto(), id, c('2026-08'), naConta),
      /antes da recorrência/,
    );
  });

  it('editar descrição, fim e confirmação automática', () => {
    const [f, id] = criar(salario, naConta);
    const cmd = editarRecorrencia(f, contexto(), id, {
      autoConfirmar: false,
      competenciaFim: c('2027-12'),
    });
    expect(cmd.mudancas[0]?.dados).toEqual({ autoConfirmar: false, competenciaFim: '2027-12' });
    verificar(f, cmd);
    recusa(
      () => editarRecorrencia(f, contexto(), id, { competenciaFim: c('2026-01') }),
      'Fim antes do início',
    );
  });
});

describe('confirmar e ignorar', () => {
  it('em conta cria a receita efetivada e a ocorrência com o retrato (3.8)', () => {
    const [f, id] = criar(salario, naConta);
    const cmd = confirmarOcorrencia(f, contexto(), id, c('2026-10'), { valor: r$(6400) });
    expect(cmd.descricao).toBe('Recebimento confirmado');
    const depois = verificar(f, cmd);
    expect(depois.lancamentos[0]).toMatchObject({
      tipo: 'receita',
      status: 'efetivado',
      valor: r$(6400),
      data: '2026-10-05',
    });
    expect(depois.ocorrencias[0]).toMatchObject({
      situacao: 'confirmada',
      valor: r$(6400),
      lancamentoId: depois.lancamentos[0]?.id,
    });
    recusa(
      () => confirmarOcorrencia(depois, contexto(), id, c('2026-10')),
      'Este mês já foi confirmado ou ignorado',
    );
    recusa(
      () => confirmarOcorrencia(f, contexto(), id, c('2026-11'), { data: d('2026-11-05') }),
      /data futura/,
    );
  });

  it('no cartão cria a compra à vista, que cai na fatura pelo ciclo', () => {
    const [f, id] = criar(streaming, noCartao);
    const cmd = confirmarOcorrencia(f, contexto(), id, c('2026-11'));
    expect(cmd.descricao).toBe('Pagamento confirmado');
    expect(cmd.mudancas.map((m) => m.entidade)).toEqual(['compras', 'parcelas', 'ocorrencias']);
    const depois = verificar(f, cmd);
    expect(depois.parcelas[0]?.competencia).toBe('2026-11');
    expect(depois.ocorrencias[0]).toMatchObject({
      cartaoId: CARTAO,
      compraId: depois.compras[0]?.id,
    });
  });

  it('gasto em conta vira despesa; editar ou excluir a compra do cartão leva o retrato e a ocorrência', () => {
    const [g, gid] = criar(streaming, { ...naConta, categoriaId: MERCADO });
    const pago = verificar(g, confirmarOcorrencia(g, contexto(), gid, c('2026-10')));
    expect(pago.lancamentos[0]?.tipo).toBe('despesa');

    const [f, id] = criar(streaming, noCartao);
    const conf = verificar(f, confirmarOcorrencia(f, contexto(), id, c('2026-11'), { data: HOJE }));
    const compraId = conf.compras[0]?.id as string;
    const editada = verificar(
      conf,
      editarCompra(conf, contexto(), compraId, { valorTotal: r$(60) }),
    );
    expect(editada.ocorrencias[0]?.valor).toBe(r$(60));
    expect(verificar(conf, excluirCompra(conf, contexto(), compraId)).ocorrencias).toEqual([]);
  });

  it('ignorar grava a ocorrência sem retrato; só uma vez por mês', () => {
    const [f, id] = criar(salario, naConta);
    const cmd = ignorarOcorrencia(f, contexto(), id, c('2026-11'));
    expect(cmd.descricao).toBe('Ignorado este mês');
    const depois = verificar(f, cmd);
    recusa(
      () => ignorarOcorrencia(depois, contexto(), id, c('2026-11')),
      /já foi confirmado ou ignorado/,
    );
    recusa(
      () => ignorarOcorrencia(f, contexto(), id, c('2026-08')),
      'Nada previsto nesta competência',
    );
    const inativa = verificar(f, editarRecorrencia(f, contexto(), id, { ativa: false }));
    recusa(() => ignorarOcorrencia(inativa, contexto(), id, c('2026-11')), 'Recorrência inativa');
    recusa(() => ignorarOcorrencia(f, contexto(), 'x', c('2026-11')), 'Recorrência não encontrada');
  });
});

describe('confirmarEmLote', () => {
  it('app fechado: cria os lançamentos com a data prevista original; de novo não duplica (11.6)', () => {
    const [f0] = criar(salario, naConta);
    const [f] = criar(streaming, noCartao, f0); // sem confirmação automática
    const cmd = confirmarEmLote(f, contexto());
    expect(cmd.descricao).toBe('2 lançamentos automáticos registrados');
    const depois = verificar(f, cmd);
    expect(depois.lancamentos.map((l) => l.data)).toEqual(['2026-09-05', '2026-10-05']);
    expect(confirmarEmLote(depois, contexto()).mudancas).toEqual([]);
    const um = verificar(depois, confirmarEmLote(depois, { ...contexto(), hoje: d('2026-11-05') }));
    expect(confirmarEmLote(depois, { ...contexto(), hoje: d('2026-11-05') }).descricao).toBe(
      '1 lançamento automático registrado',
    );
    expect(um.ocorrencias).toHaveLength(3);
  });

  it('gasto no cartão em lote vira compra à vista', () => {
    const [f] = criar({ ...streaming, autoConfirmar: true }, noCartao);
    const depois = verificar(f, confirmarEmLote(f, contexto()));
    expect(depois.compras.map((x) => x.data)).toEqual(['2026-09-01', '2026-10-01', '2026-11-01']);
  });
});

describe('excluirRecorrencia', () => {
  it('leva as versões e as ocorrências; os lançamentos ficam, com origem manual (D68)', () => {
    const [f0, id] = criar(salario, naConta);
    const f1 = verificar(f0, confirmarOcorrencia(f0, contexto(), id, c('2026-10')));
    const f2 = verificar(f1, ignorarOcorrencia(f1, contexto(), id, c('2026-11')));
    const f = verificar(
      f2,
      novaVersaoDaRecorrencia(f2, contexto(), id, c('2026-12'), { ...naConta, valor: r$(7000) }),
    );
    const cmd = excluirRecorrencia(f, contexto(), id);
    expect(cmd.descricao).toBe('Renda fixa excluída');
    expect(cmd.mudancas.every((m) => m.dados.isDeleted === true)).toBe(true);
    const depois = verificar(f, cmd);
    expect([depois.recorrencias, depois.recorrenciaVersoes, depois.ocorrencias]).toEqual([
      [],
      [],
      [],
    ]);
    expect(depois.lancamentos).toEqual(f.lancamentos);
    const outubro = { de: d('2026-10-01'), ate: d('2026-10-31') };
    expect(movimentacoes(f, HOJE, outubro).map((i) => i.origem)).toEqual(['recorrencia']);
    expect(movimentacoes(depois, HOJE, outubro).map((i) => i.origem)).toEqual(['manual']);
    recusa(() => excluirRecorrencia(depois, contexto(), id), 'Recorrência não encontrada');
  });

  it('gasto no cartão: a compra continua na fatura', () => {
    const [f0, id] = criar(streaming, noCartao);
    const f = verificar(f0, confirmarOcorrencia(f0, contexto(), id, c('2026-11'), { data: HOJE }));
    const cmd = excluirRecorrencia(f, contexto(), id);
    expect(cmd.descricao).toBe('Gasto fixo excluído');
    const depois = verificar(f, cmd);
    expect([depois.compras, depois.parcelas]).toEqual([f.compras, f.parcelas]);
    expect(depois.ocorrencias).toEqual([]);
  });
});
