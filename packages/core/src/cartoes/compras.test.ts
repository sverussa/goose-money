import { describe, expect, it } from 'vitest';
import { competencia, dataCivil, type Competencia } from '../datas';
import { centavos, somar } from '../dinheiro';
import type { Cartao, CartaoCiclo, Compra } from '../modelo';
import {
  anteciparParcelas,
  cancelarCompra,
  gerarParcelas,
  operacoesPermitidas,
  type ParcelaCompra,
  previaDaCompra,
  totalPelaParcela,
  validarInvariantes,
} from './compras';
import { limiteDisponivel } from './indicadores';

const c = competencia;
const r = centavos;
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const controle = {
  createdAt: '2026-11-04T12:00:00-03:00',
  updatedAt: '2026-11-04T12:00:00-03:00',
  createdBy: id(99),
  isDeleted: false,
};
const cartao: Cartao = {
  ...controle,
  id: id(1),
  nome: 'Cartão A',
  instituicao: null,
  cor: 'cartao-a',
  limite: r(500_000),
  contaPagamentoId: id(50),
  competenciaInicial: c('2026-11'),
  arquivado: false,
};
const ciclos: CartaoCiclo[] = [
  {
    ...controle,
    id: id(2),
    cartaoId: cartao.id,
    vigenteDesde: c('2026-01'),
    diaFechamento: 3,
    diaVencimento: 10,
  },
];
const compra = (valorTotal: number, numeroParcelas: number, data = '2026-11-02'): Compra => ({
  ...controle,
  id: id(10),
  cartaoId: cartao.id,
  data: dataCivil(data),
  descricao: 'Notebook',
  categoriaId: id(20),
  observacao: null,
  valorTotal: r(valorTotal),
  numeroParcelas,
  cancelada: false,
});

const total = (ps: readonly ParcelaCompra[]) => somar(ps.map((p) => p.valor));
const comps = (ps: readonly ParcelaCompra[]) => ps.map((p) => p.competencia);

describe('gerarParcelas (3.6)', () => {
  it('R$ 1.000,00 em 3x: 333,34 + 333,33 + 333,33 em faturas consecutivas (11.3)', () => {
    const ps = gerarParcelas(compra(100_000, 3), cartao, ciclos);
    expect(ps).toEqual([
      { numero: 1, valor: 33_334, competencia: '2026-11' },
      { numero: 2, valor: 33_333, competencia: '2026-12' },
      { numero: 3, valor: 33_333, competencia: '2027-01' },
    ]);
  });

  it('a 1ª parcela segue o ciclo: compra no dia do fechamento vai para a fatura seguinte', () => {
    expect(gerarParcelas(compra(100_000, 1, '2026-11-03'), cartao, ciclos)[0]?.competencia).toBe(
      '2026-12',
    );
  });

  it('entrada pelo valor da parcela: parcela × n = total, parcelas iguais', () => {
    const valorTotal = totalPelaParcela(r(42_000), 10);
    expect(valorTotal).toBe(420_000);
    const ps = gerarParcelas(compra(valorTotal, 10), cartao, ciclos);
    expect(ps.every((p) => p.valor === 42_000)).toBe(true);
  });
});

describe('validarInvariantes (3.6)', () => {
  const ok = gerarParcelas(compra(100_000, 3), cartao, ciclos);

  it('parcelas geradas não violam nada', () => {
    expect(validarInvariantes(compra(100_000, 3), ok)).toEqual([]);
  });

  it('1. soma diferente do total', () => {
    const ps = ok.map((p, i) => (i === 0 ? { ...p, valor: r(33_333) } : p));
    expect(validarInvariantes(compra(100_000, 3), ps)).toEqual(['soma']);
  });

  it('2. quantidade ou numeração errada', () => {
    expect(validarInvariantes(compra(100_000, 4), ok)).toContain('quantidade');
    const ps = ok.map((p, i) => (i === 2 ? { ...p, numero: 4 } : p));
    expect(validarInvariantes(compra(100_000, 3), ps)).toEqual(['quantidade']);
  });

  it('3. competências fora de ordem', () => {
    const ps = ok.map((p, i) => (i === 2 ? { ...p, competencia: c('2026-11') } : p));
    expect(validarInvariantes(compra(100_000, 3), ps)).toEqual(['ordem']);
  });

  it('4. descrição ou categoria na parcela', () => {
    const comDescricao = [{ ...ok[0], descricao: 'x' } as ParcelaCompra, ...ok.slice(1)];
    const comCategoria = [{ ...ok[0], categoriaId: id(20) } as ParcelaCompra, ...ok.slice(1)];
    expect(validarInvariantes(compra(100_000, 3), comDescricao)).toEqual(['descricaoCategoria']);
    expect(validarInvariantes(compra(100_000, 3), comCategoria)).toEqual(['descricaoCategoria']);
  });

  it('compra cancelada fica fora da soma e da quantidade', () => {
    const cancelada = { ...compra(100_000, 3), cancelada: true };
    expect(validarInvariantes(cancelada, ok.slice(0, 1))).toEqual([]);
  });
});

describe('operacoesPermitidas (3.6, 6.5)', () => {
  const ps = gerarParcelas(compra(100_000, 3), cartao, ciclos); // 2026-11 a 2027-01

  it('sem parcela em fatura fechada', () => {
    const ops = operacoesPermitidas(compra(100_000, 3), ps, c('2026-11'));
    expect(ops.editarDescricao).toEqual({ permitida: true });
    expect(ops.editarValor).toEqual({ permitida: true });
    expect(ops.lancarAjuste.permitida).toBe(false);
    expect(ops.lancarAjuste.motivo).toBeTruthy();
    expect(ops.anteciparParcelas).toEqual({ permitida: true });
    expect(ops.cancelar).toEqual({ permitida: true });
    expect(ops.excluir).toEqual({ permitida: true });
  });

  it('com parcela em fatura fechada: editarValor e excluir bloqueados com motivo (11.3)', () => {
    const ops = operacoesPermitidas(compra(100_000, 3), ps, c('2026-12'));
    expect(ops.editarDescricao.permitida).toBe(true);
    expect(ops.editarValor.permitida).toBe(false);
    expect(ops.editarValor.motivo).toMatch(/fatura fechada/);
    expect(ops.lancarAjuste).toEqual({ permitida: true });
    expect(ops.cancelar).toEqual({ permitida: true });
    expect(ops.excluir.permitida).toBe(false);
    expect(ops.excluir.motivo).toMatch(/fatura fechada/);
    expect(total(ps)).toBe(100_000);
  });

  it('sem parcela em fatura futura não antecipa', () => {
    const ops = operacoesPermitidas(compra(100_000, 3), ps, c('2027-01'));
    expect(ops.anteciparParcelas.permitida).toBe(false);
    expect(ops.anteciparParcelas.motivo).toBeTruthy();
  });

  it('compra cancelada: só descrição e, se nada foi faturado, excluir', () => {
    const cancelada = { ...compra(100_000, 3), cancelada: true };
    const ops = operacoesPermitidas(cancelada, ps.slice(0, 1), c('2026-12'));
    expect(ops.editarDescricao.permitida).toBe(true);
    for (const op of ['editarValor', 'lancarAjuste', 'anteciparParcelas', 'cancelar'] as const)
      expect(ops[op]).toEqual({ permitida: false, motivo: 'Compra cancelada.' });
    expect(ops.excluir.permitida).toBe(false);
    expect(operacoesPermitidas(cancelada, [], c('2026-12')).excluir.permitida).toBe(true);
  });
});

describe('anteciparParcelas (3.6)', () => {
  // 10x de R$ 420,00 a partir de 2026-11; aberta 2027-01 (parcelas 1 e 2 fechadas).
  const ps = gerarParcelas(compra(420_000, 10), cartao, ciclos);
  const aberta = c('2027-01');

  it('as 3 últimas de 10 vão para a aberta, sem mudar a soma, renumeradas em ordem', () => {
    const { parcelas, estorno } = anteciparParcelas(compra(420_000, 10), ps, 3, aberta);
    const naAberta = parcelas.filter((p) => p.competencia === aberta);
    expect(naAberta).toHaveLength(4); // a 3ª, que já estava, e as 3 antecipadas
    expect(total(parcelas)).toBe(420_000);
    expect(comps(parcelas)).toEqual([
      '2026-11',
      '2026-12',
      '2027-01',
      '2027-01',
      '2027-01',
      '2027-01',
      '2027-02',
      '2027-03',
      '2027-04',
      '2027-05',
    ]);
    expect(parcelas.map((p) => p.numero)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(estorno).toBeNull();
    expect(validarInvariantes(compra(420_000, 10), parcelas)).toEqual([]);
  });

  it('desconto vira estorno negativo; a soma das parcelas não muda', () => {
    const r1 = anteciparParcelas(compra(420_000, 10), ps, 3, aberta, r(5_000));
    expect(r1.estorno).toBe(-5_000);
    expect(total(r1.parcelas)).toBe(420_000);
  });

  it('rejeita k fora de 1..futuras e desconto acima do antecipado', () => {
    const cp = compra(420_000, 10);
    expect(() => anteciparParcelas(cp, ps, 0, aberta)).toThrow(RangeError);
    expect(() => anteciparParcelas(cp, ps, 8, aberta)).toThrow(RangeError);
    expect(() => anteciparParcelas(cp, ps, 1, aberta, r(42_001))).toThrow(RangeError);
    expect(() => anteciparParcelas(cp, ps, 1, aberta, r(-1))).toThrow(RangeError);
  });
});

describe('cancelarCompra (3.6)', () => {
  const ps = gerarParcelas(compra(100_000, 3), cartao, ciclos); // 2026-11 a 2027-01
  const comp = (s: string): Competencia => c(s);

  it('remove as parcelas de faturas não fechadas; sem estorno se o banco não estornou', () => {
    expect(cancelarCompra(compra(100_000, 3), ps, cartao, comp('2026-12'), false)).toEqual({
      remover: [2, 3],
      estorno: null,
    });
  });

  it('banco estornou: estorno da soma das já faturadas', () => {
    expect(cancelarCompra(compra(100_000, 3), ps, cartao, comp('2027-01'), true)).toEqual({
      remover: [3],
      estorno: -66_667,
    });
  });

  it('nada faturado: estorno nulo mesmo se o banco estornou', () => {
    expect(
      cancelarCompra(compra(100_000, 3), ps, cartao, comp('2026-11'), true).estorno,
    ).toBeNull();
  });

  it('parcelas "Paga antes do cadastro" não entram no estorno', () => {
    const antigo = { ...cartao, competenciaInicial: c('2026-12') };
    expect(cancelarCompra(compra(100_000, 3), ps, antigo, comp('2027-01'), true).estorno).toBe(
      -33_333,
    );
  });

  it('compra já cancelada é erro', () => {
    const cancelada = { ...compra(100_000, 3), cancelada: true };
    expect(() => cancelarCompra(cancelada, ps, cartao, comp('2026-12'), true)).toThrow(RangeError);
  });
});

describe('previaDaCompra (6.5)', () => {
  it('lista as parcelas com a fatura e o novo Limite disponível', () => {
    const p = previaDaCompra(compra(420_000, 10, '2026-11-04'), cartao, ciclos, r(10_000));
    expect(p.parcelas[0]).toEqual({ numero: 1, de: 10, valor: 42_000, competencia: '2026-12' });
    expect(p.parcelas).toHaveLength(10);
    expect(p.limiteDisponivel).toBe(500_000 - 10_000 - 420_000);
  });

  it('R$ 1.000,00 reduz o Limite disponível em R$ 1.000,00 (11.3)', () => {
    const antes = limiteDisponivel(cartao, r(0));
    const p = previaDaCompra(compra(100_000, 3), cartao, ciclos, r(0));
    expect(antes - p.limiteDisponivel).toBe(100_000);
  });

  it('parcelas "Paga antes do cadastro" não consomem limite', () => {
    const novo = { ...cartao, competenciaInicial: c('2026-12') };
    const p = previaDaCompra(compra(100_000, 3), novo, ciclos, r(0));
    expect(p.limiteDisponivel).toBe(500_000 - 66_666);
  });

  it('crédito na fatura (obrigações negativas) não aumenta o limite', () => {
    expect(limiteDisponivel(cartao, r(-5_000))).toBe(500_000);
  });
});
