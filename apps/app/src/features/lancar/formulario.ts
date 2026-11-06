import { type CamposDe, type Centavos, dataCivil, type Lancamento } from '@goose-money/core';
import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form';
import { z } from 'zod';

import { mensagensLancar } from './mensagens';

// Camada de formulário (9.1): o que a pessoa digita, separado do modelo do core e do backup.

export const TIPOS = ['despesa', 'receita', 'compra', 'transferencia', 'pagamento'] as const;
export type TipoDoFormulario = (typeof TIPOS)[number];
/** Tipos que já gravam; os outros chegam na T05-03. */
export const TIPOS_PRONTOS: readonly TipoDoFormulario[] = ['despesa', 'receita'];

const e = mensagensLancar.erros;
const dataValida = (s: string) => {
  try {
    dataCivil(s);
    return true;
  } catch {
    return false;
  }
};

export const esquemaDoFormulario = z.object({
  tipo: z.enum(TIPOS),
  valor: z.number().int().positive(e.valor),
  descricao: z.string(),
  categoriaId: z.string().min(1, e.categoria),
  data: z.string().refine(dataValida, e.data),
  contaId: z.string().min(1, e.conta),
});
export type ValoresDoFormulario = z.infer<typeof esquemaDoFormulario>;

/** Adaptador Zod → React Hook Form (D7), sem `@hookform/resolvers`: o primeiro erro de cada campo. */
export function resolverZod<T extends FieldValues>(schema: z.ZodType<T>): Resolver<T> {
  return (valores) => {
    const r = schema.safeParse(valores);
    if (r.success) return { values: r.data, errors: {} };
    const errors: Record<string, { type: string; message: string }> = {};
    for (const i of r.error.issues)
      errors[i.path.join('.')] ??= { type: i.code, message: i.message };
    return { values: {}, errors: errors as FieldErrors<T> };
  };
}

/** Despesa ou receita avulsa, efetivada (o "Previsto" de "Mais opções" chega na T05-04). */
export function camposDoLancamento(v: ValoresDoFormulario): CamposDe<Lancamento> {
  if (v.tipo !== 'despesa' && v.tipo !== 'receita')
    throw new Error(`Tipo ainda sem gravação: ${v.tipo}`);
  return {
    tipo: v.tipo,
    status: 'efetivado',
    data: dataCivil(v.data),
    valor: v.valor as Centavos,
    descricao: v.descricao.trim() || null,
    observacao: null,
    contaId: v.contaId,
    contaDestinoId: null,
    categoriaId: v.categoriaId,
    cartaoId: null,
    faturaCompetencia: null,
    dividaId: null,
    parcelaDividaId: null,
  };
}
