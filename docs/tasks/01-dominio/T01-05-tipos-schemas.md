# T01-05 · Tipos e schemas Zod das entidades

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 1 · Domínio | Modelo | T01-01, T01-02, T01-03 | `feat/core-modelo` |

**Referências:** `docs/MODELO-DADOS.md` · PROMPT 9.1, 9.4

## Objetivo

Criar `packages/core/src/modelo/` com os tipos TypeScript e os schemas Zod de domínio de todas as entidades de T01-01.

## Escopo

- Um arquivo por contexto: `cadastros.ts` (Categoria, Conta, Cartao, CartaoCiclo, Preferencias), `lancamentos.ts`, `cartoes.ts` (Compra, Parcela, ItemFatura, AlocacaoPagamento), `dividas.ts`, `recorrencias.ts`.
- Schemas Zod da **camada de domínio** (9.1): centavos inteiros, `DataCivil`, `Competencia`, ids UUID e as colunas de controle (`id`, `createdAt`, `updatedAt`, `createdBy`, `isDeleted`).
- Tipos inferidos dos schemas (`z.infer`), sem duplicar a definição.
- Tipo `Fatos`: o conjunto de todas as entidades **não excluídas** de um usuário, que é a entrada do Motor.
- Invariantes que dependem de uma entidade só ficam no schema (`refine`): por exemplo, conta de pagamento obrigatória no cartão, dia de fechamento entre 1 e 31. Invariantes entre entidades (soma das parcelas = valor total) ficam nas tarefas de cada contexto.
- `fatosVazios()` para testes.

## Fora do escopo

Schemas de formulário (ficam no app, junto de cada tela) e de backup (T01-20).

## Passos

1. Transcrever o `MODELO-DADOS.md` para schemas.
2. Testar cada schema com um exemplo válido e um inválido por regra.

## Critérios de aceite

- [ ] Toda entidade do `MODELO-DADOS.md` tem schema e tipo.
- [ ] Nenhum tipo é escrito à mão em paralelo ao schema.
- [ ] Os enums do schema têm exatamente os valores do documento.
