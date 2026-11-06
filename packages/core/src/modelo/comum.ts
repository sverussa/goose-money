import { z } from 'zod';
import type { Centavos } from '../dinheiro';
import { competencia, dataCivil, type Competencia, type DataCivil } from '../datas';

/** Tipos de base de MODELO-DADOS.md 1.1, na camada de domínio (PROMPT 9.1). */

export const idSchema = z.uuid();
export type Id = z.infer<typeof idSchema>;

/** `timestamptz` das colunas de controle, em ISO 8601 com fuso. */
export const instanteSchema = z.iso.datetime({ offset: true });

const inteiroSeguro = (v: unknown): v is Centavos =>
  typeof v === 'number' && Number.isSafeInteger(v);
export const centavosComSinalSchema = z.custom<Centavos>(inteiroSeguro, 'Centavos inteiros');
/** Sem sinal (`≥ 0`): o padrão do modelo, salvo onde ele diz "com sinal". */
export const centavosSchema = centavosComSinalSchema.refine((v) => v >= 0, 'Não pode ser negativo');
export const centavosPositivosSchema = centavosComSinalSchema.refine(
  (v) => v > 0,
  'Precisa ser > 0',
);

const aceito =
  (converter: (s: string) => unknown) =>
  (v: unknown): boolean => {
    if (typeof v !== 'string') return false;
    try {
      converter(v);
      return true;
    } catch {
      return false;
    }
  };
export const dataCivilSchema = z.custom<DataCivil>(aceito(dataCivil), 'Data inválida');
export const competenciaSchema = z.custom<Competencia>(aceito(competencia), 'Competência inválida');

export const diaSchema = z.number().int().min(1).max(31);
export const quantidadeSchema = z.number().int().min(1);
/** Fração ao mês, `≥ 0`, em texto para o `decimal.js` ("0.0149" = 1,49% a.m.). */
export const taxaSchema = z.string().regex(/^\d+(\.\d+)?$/, 'Taxa inválida');
export const textoSchema = z.string().refine((s) => s.trim() !== '', 'Não pode ser vazio');
/** Chave de cor do tema, nunca hex (D77). */
export const corSchema = z.string().regex(/^[a-z][a-z0-9-]*$/, 'Chave de cor inválida');
/** Nome de um ícone do lucide-react. */
export const iconeSchema = textoSchema;

/** Colunas de controle de PROMPT 9.4, presentes em toda entidade. */
export const controle = {
  id: idSchema,
  createdAt: instanteSchema,
  updatedAt: instanteSchema,
  createdBy: idSchema,
  isDeleted: z.boolean(),
};

/**
 * Campos "conforme o tipo" (MODELO-DADOS.md, coluna T): cada campo de `campos`
 * é obrigatório se estiver em `exigidos` e nulo caso contrário.
 */
export function conformeTipo<K extends string>(
  o: Record<K, unknown>,
  ctx: z.RefinementCtx,
  campos: readonly K[],
  exigidos: readonly K[],
): void {
  for (const campo of campos) {
    const exigido = exigidos.includes(campo);
    if (exigido !== (o[campo] !== null))
      ctx.addIssue({
        code: 'custom',
        path: [campo],
        message: exigido ? 'Obrigatório' : 'Deve ser nulo',
      });
  }
}

/** Acrescenta um erro em `campo` quando `ok` é falso. */
export function exigir(ctx: z.RefinementCtx, ok: boolean, campo: string, message: string): void {
  if (!ok) ctx.addIssue({ code: 'custom', path: [campo], message });
}
