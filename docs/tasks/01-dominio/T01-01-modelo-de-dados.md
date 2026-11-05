# T01-01 · Modelo de dados

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 1 · Domínio | Modelo | — | `docs/modelo-dados` |

**Referências:** PROMPT 2.1, 3, 6, 9.1, 9.4 · DECISOES D3, D21, D22, D25

## Objetivo

Escrever `docs/MODELO-DADOS.md`, a lista única de entidades, campos, tipos e relações. Os tipos do core (T01-05) e as migrações (etapa 2) seguem esse documento. A spec descreve as regras, mas nunca lista as entidades num lugar só.

## Escopo

Para cada entidade: nome no domínio e no banco, campos (domínio `camelCase` ↔ banco `snake_case`), tipo, obrigatoriedade, padrão, relações, chaves únicas e as regras de 3.x que valem para ela. Todas têm as colunas de controle de 9.4.

Entidades a cobrir:

| Entidade | Origem na spec |
| --- | --- |
| `Categoria` (`categoriaPaiId` opcional para subcategoria, um nível; tipo receita/despesa, ícone, cor, `sistema`) | 6.9, 3.3 |
| `Conta` (tipo: corrente, poupança, investimento, dinheiro, outra; `arquivada`) | 3.4, 6.4, D21 |
| `Cartao` e `CartaoCiclo` (versões do ciclo com `vigenteDesde`) | 3.5, 6.5, D21 |
| `Lancamento` com `tipo`: `receita`, `despesa`, `transferencia`, `ajuste`, `pagamento_fatura`, `captacao`, `pagamento_divida`, `amortizacao`; `status`: `previsto`, `efetivado` | 3.1–3.3, 3.4, 7 |
| `Compra` (com marca de cancelada) e `Parcela` (competência gravada, status "Paga antes do cadastro") | 3.5, 3.6 |
| `ItemFatura`: `encargo`, `estorno`, `ajuste_compra`, `saldo_anterior_cadastro` | 3.5, 3.6 |
| `AlocacaoPagamento` (pagamento de fatura → fatura de destino) | 3.5 |
| `Divida` e `ParcelaDivida` (gravadas, D3) | 3.7 |
| `Recorrencia`, `RecorrenciaVersao`, `Ocorrencia` | 3.8 |
| `Preferencias` (limite de alerta, horizonte padrão, ocultar valores ao abrir, tema) | 5.3, 6.9, D20 |

Também definir:

- Como identificar uma fatura: pelo par (cartão, competência), sem tabela (D33).
- Que campos de "retrato" a `Ocorrencia` guarda (3.8).
- O vínculo de origem de cada lançamento (manual, recorrência, cartão, dívida), usado no filtro "origem" de 6.3.
- Os valores de enumeração exatos, em português, como vão para o banco.

## Fora do escopo

Código. Esta tarefa só produz o documento, por isso não depende da base de código e começa no primeiro dia (D56). O documento é o contrato entre core, banco e interface: precisa da aprovação do Saulo antes de T01-05 e T02-03 começarem.

## Passos

1. Percorrer PROMPT 3 e 6 e listar todo campo citado.
2. Escrever o documento com uma tabela por entidade e um diagrama de relações em lista (sem imagem).
3. Revisar contra os critérios de 11.2–11.8: cada cenário precisa ser representável.
4. Listar na descrição do PR qualquer outra escolha feita aqui, para o coordenador registrar no `DECISOES.md`.

## Critérios de aceite

- [ ] Toda entidade e campo citado na spec aparece no documento.
- [ ] Cada cenário de 11.2 a 11.8 pode ser montado com essas entidades.
- [ ] O documento segue as decisões D32 a D35.

## Decisões tomadas

Respondidas pelo Saulo em 05/11/2026, todas na opção A. Registradas em `DECISOES.md`.

- **D1. Transferência** (D32): um único `Lancamento` do tipo `transferencia` com `contaOrigemId` e `contaDestinoId`.
- **D2. Fatura** (D33): sem tabela. A fatura é derivada pelo par (cartão, competência) e pelo ciclo vigente; itens e alocações referenciam esse par.
- **D3. Tags** (D34): fora do MVP. O lançamento tem só observação (texto livre).
- **D4. Subcategorias** (D35): `Categoria` com `categoriaPaiId` opcional, um nível só. O lançamento aponta para a categoria ou a subcategoria; os gráficos agrupam pela categoria pai.
