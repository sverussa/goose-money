import {
  aplicar,
  type Contexto,
  dataCivil,
  derivar,
  gerarSeed,
  somarDias,
} from '@goose-money/core';
import { describe, expect, it } from 'vitest';

import {
  comandoDoFormulario,
  contaComDataPosterior,
  esquemaDoFormulario,
  resolverZod,
} from './formulario';
import {
  aClassificar,
  cartaoInicial,
  contaInicial,
  destinoPadrao,
  opcoesDeCategoria,
  padraoDaTela,
} from './padroes';

const HOJE = dataCivil('2026-11-04');
const USUARIO = '00000000-0000-4000-8000-000000000001';
const fatos = gerarSeed(HOJE, USUARIO);
let n = 0;
const ctx: Contexto = {
  hoje: HOJE,
  agora: `${HOJE}T12:00:00Z`,
  usuario: USUARIO,
  novoId: () => `00000000-0000-4000-9000-${String(++n).padStart(12, '0')}`,
};
const [corrente, poupanca] = fatos.contas;

describe('padrões do formulário de lançamento (7.2)', () => {
  it('na tela de uma conta, Despesa naquela conta; nas outras, Despesa sem conta', () => {
    expect(padraoDaTela('/contas/abc')).toEqual({
      tipo: 'despesa',
      contaId: 'abc',
      cartaoId: null,
    });
    expect(padraoDaTela('/cartoes/x')).toEqual({ tipo: 'compra', contaId: null, cartaoId: 'x' });
    expect(padraoDaTela('/contas')).toEqual({ tipo: 'despesa', contaId: null, cartaoId: null });
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
  const cartao = fatos.cartoes[0];
  const validos = {
    tipo: 'despesa' as const,
    valor: 1590,
    descricao: '  ',
    categoriaId: aClassificar(fatos) ?? '',
    data: HOJE,
    contaId: corrente?.id ?? '',
    contaDestinoId: '',
    cartaoId: cartao?.id ?? '',
    faturaCompetencia: '',
    observacao: '',
    previsto: false,
    saldoInicial: 'manter' as const,
  };
  const tabelas = (v: typeof validos | Record<string, unknown>) =>
    comandoDoFormulario(fatos, ctx, { ...validos, ...v }).mudancas.map((x) => x.entidade);

  it('o adaptador devolve o primeiro erro de cada campo (D7)', async () => {
    const resolver = resolverZod(esquemaDoFormulario);
    const r = await resolver({ ...validos, valor: 0, contaId: '' }, undefined, {
      fields: {},
      shouldUseNativeValidation: false,
    });
    expect(Object.keys(r.errors).sort()).toEqual(['contaId', 'valor']);
    expect(r.errors.valor?.message).toBe('Informe um valor maior que zero');
  });

  it('transferência com origem igual ao destino é bloqueada no formulário', () => {
    const r = esquemaDoFormulario.safeParse({
      ...validos,
      tipo: 'transferencia',
      contaDestinoId: validos.contaId,
    });
    expect(r.error?.issues.map((i) => i.message)).toEqual([
      'Escolha uma conta de destino diferente da origem',
    ]);
  });

  it('cada tipo vira o comando do core certo', () => {
    expect(tabelas({})).toEqual(['lancamentos']);
    expect(tabelas({ tipo: 'compra' })).toEqual(['compras', 'parcelas']);
    expect(tabelas({ tipo: 'transferencia', contaDestinoId: poupanca?.id })).toEqual([
      'lancamentos',
    ]);
    const destino = destinoPadrao(derivar(fatos, HOJE), validos.cartaoId);
    expect(destino).not.toBeNull();
    const pagamento = comandoDoFormulario(fatos, ctx, {
      ...validos,
      tipo: 'pagamento',
      faturaCompetencia: destino ?? '',
    });
    expect(pagamento.mudancas[0]?.dados).toMatchObject({
      tipo: 'pagamento_fatura',
      descricao: null,
    });
  });

  it('cartão inicial: o da tela, senão o último usado, senão o primeiro ativo', () => {
    const [a, b] = fatos.cartoes;
    expect(cartaoInicial(fatos, b?.id ?? null, a?.id ?? null)).toBe(b?.id);
    expect(cartaoInicial(fatos, null, b?.id ?? null)).toBe(b?.id);
    expect(cartaoInicial(fatos, null, null)).toBe(a?.id);
  });

  it('data no saldo inicial ou antes: avisa; "Mudar a data" grava conta e lançamento juntos (3.4)', () => {
    const inicial = corrente?.dataSaldoInicial ?? HOJE;
    const antes = { ...validos, data: inicial };
    expect(contaComDataPosterior(fatos, antes)?.id).toBe(corrente?.id);
    expect(contaComDataPosterior(fatos, { ...antes, previsto: true })).toBeNull();
    expect(contaComDataPosterior(fatos, { ...antes, tipo: 'compra' })).toBeNull();
    expect(contaComDataPosterior(fatos, validos)).toBeNull();

    expect(tabelas(antes)).toEqual(['lancamentos']);
    const mudar = comandoDoFormulario(fatos, ctx, { ...antes, saldoInicial: 'mudar' });
    expect(mudar.mudancas.map((x) => x.entidade)).toEqual(['contas', 'lancamentos']);
    const depois = aplicar(fatos, mudar.mudancas);
    expect(depois.contas.find((c) => c.id === corrente?.id)?.dataSaldoInicial).toBe(
      somarDias(inicial, -1),
    );
    expect(aplicar(depois, mudar.inversas)).toEqual(fatos);
  });
});
