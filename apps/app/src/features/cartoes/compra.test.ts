import { dataCivil, deMascara, totalPelaParcela } from '@goose-money/core';
import { describe, expect, it } from 'vitest';

import { camposDaCompra, errosDaCompra, MAX_PARCELAS, valoresIniciaisDaCompra } from './compra';

const base = {
  ...valoresIniciaisDaCompra('c', dataCivil('2026-11-04'), 'cat'),
  valor: deMascara('42000'),
};

describe('Nova compra (6.5)', () => {
  it('"Valor da parcela" grava parcela × n; à vista grava o digitado com 1 parcela', () => {
    expect(
      camposDaCompra({ ...base, parcelado: true, modo: 'parcela', parcelas: 10 }),
    ).toMatchObject({
      valorTotal: totalPelaParcela(deMascara('42000'), 10),
      numeroParcelas: 10,
    });
    expect(camposDaCompra({ ...base, modo: 'parcela' })).toMatchObject({
      valorTotal: deMascara('42000'),
      numeroParcelas: 1,
      descricao: null,
    });
  });

  it('recusa valor zero, data inválida e parcelas fora de 2 a MAX_PARCELAS', () => {
    expect(Object.keys(errosDaCompra({ ...base, valor: deMascara('0'), data: '' }))).toEqual([
      'valor',
      'data',
    ]);
    for (const parcelas of [1, MAX_PARCELAS + 1, 2.5])
      expect(errosDaCompra({ ...base, parcelado: true, parcelas }).parcelas).toBeDefined();
    expect(camposDaCompra({ ...base, parcelado: true, parcelas: 0 })).toBeNull();
  });
});
