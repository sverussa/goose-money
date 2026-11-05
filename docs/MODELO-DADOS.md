# Modelo de dados

Lista única das entidades gravadas do Goose Money: campos, tipos, obrigatoriedade, padrões, relações e chaves únicas. É o contrato entre `packages/core` (tipos e schemas de domínio, T01-05), o banco (migrações da etapa 2) e a interface. Tudo o que não está aqui é **derivado** pelo Motor a partir destes fatos e nunca é gravado.

Fontes: `PROMPT.md` 2.1, 3, 6, 7, 9.1, 9.4 e 11; `DECISOES.md` D3, D20, D21, D22, D25 e D32 a D35. Em conflito, vale `PROMPT.md` seção 3.

**Status:** aguardando aprovação do Saulo. Depois de aprovado, só muda por PR do coordenador (`docs/tasks/tasks-agents-estrategies.md`).

## 1. Convenções

### 1.1 Tipos

| Tipo no domínio | Tipo no banco | Formato |
| --- | --- | --- |
| `Id` | `uuid` | UUID. Gerado pelo core ao montar as mudanças (uma compra e suas parcelas se referenciam na mesma chamada de `gravar(ops)`); o `default gen_random_uuid()` do banco só vale para inserts diretos |
| `Centavos` | `bigint` | Inteiro em centavos (`R$ 15,90` = `1590`). Sem sinal, salvo onde a tabela disser "com sinal" |
| `DataCivil` | `date` | Texto `AAAA-MM-DD` no domínio. Sem hora nem fuso (3.11) |
| `Competencia` | `text` | Mês `AAAA-MM`, igual nos dois lados, com `check (x ~ '^\d{4}-(0[1-9]\|1[0-2])$')`. A ordem do texto é a ordem cronológica |
| `Dia` | `smallint` | 1 a 31, `check (x between 1 and 31)`. Dia inexistente no mês vira o último dia (3.11), no core |
| `Taxa` | `numeric` | Fração ao mês (1,49% a.m. = `0.0149`). No domínio, texto lido com `decimal.js` |
| `Texto` | `text` | Texto livre. Campos obrigatórios não aceitam texto vazio (`check (btrim(x) <> '')`) |
| `Booleano` | `boolean` | `not null`, sempre com padrão |
| `Cor` | `text` | Chave de uma cor do tema (`design/theme-tokens.ts`), nunca hex. O core valida a chave |
| `Icone` | `text` | Nome de um ícone do lucide-react |

### 1.2 Regras gerais

- **Colunas de controle** (9.4): toda tabela tem `id`, `createdAt`/`created_at`, `updatedAt`/`updated_at`, `createdBy`/`created_by` e `isDeleted`/`is_deleted`, com os tipos e padrões de 9.4. As tabelas abaixo não as repetem.
- **Nomes:** `camelCase` no domínio, `snake_case` no banco; tabelas no plural. O mapeamento fica só em `apps/app/src/data`.
- **Enumerações:** coluna `text` com `check (x in (...))` usando os valores exatos da seção 7, sem acento, em minúsculas. Não usar `enum` do Postgres (acrescentar um valor vira uma migração mais delicada).
- **Chaves únicas:** sempre índice parcial `where not is_deleted` e sempre com `created_by` na frente, porque cada usuário tem os seus dados.
- **Chaves estrangeiras:** `on delete restrict` (nada é apagado, 9.4). Toda referência é ao mesmo dono: a chave estrangeira é composta, `(x_id, created_by) references tabela (id, created_by)`, com `unique (id, created_by)` em cada tabela. A checagem de chave estrangeira do Postgres ignora o RLS; sem isso, um usuário poderia apontar para o id de um registro de outro.
- **Obrigatoriedade por tipo:** quando um campo só vale para alguns valores de `tipo`, a tabela da entidade diz quando é obrigatório e quando deve ser nulo. O banco garante com `check`; o core também valida (9.1).
- **Unicidade de nome** (6.4, 6.5, 9.4): comparação sem diferenciar maiúsculas e sem espaços nas pontas (`lower(btrim(nome))`).

## 2. Relações

`→` lê-se "referencia". Toda referência é obrigatória, salvo `(opcional)` ou "conforme o tipo".

- `Categoria` → `Categoria` (`categoriaPaiId`, opcional; um nível só)
- `Conta` (sem referências)
- `Cartao` → `Conta` (`contaPagamentoId`)
- `CartaoCiclo` → `Cartao`
- `Lancamento` → `Conta` (`contaId`); → `Conta` (`contaDestinoId`, só transferência); → `Categoria` (conforme o tipo); → `Cartao` (só pagamento de fatura); → `Divida` (só captação, pagamento de dívida e amortização); → `ParcelaDivida` (só pagamento de dívida)
- `Compra` → `Cartao`; → `Categoria`
- `Parcela` → `Compra`
- `ItemFatura` → `Cartao`; → `Compra` (opcional); → `Categoria` (conforme o tipo)
- `Divida` → `Conta` (`contaDebitoId`); → `Categoria` (só pago a terceiro)
- `ParcelaDivida` → `Divida`
- `Recorrencia` (sem referências)
- `RecorrenciaVersao` → `Recorrencia`; → `Conta` ou `Cartao` (pela forma de pagamento); → `Categoria`
- `Ocorrencia` → `Recorrencia`; → `Conta` ou `Cartao`, `Categoria`, `Lancamento` ou `Compra` (retrato, só quando confirmada)
- `Preferencias` (uma por usuário)
- **Fatura** (sem tabela, D33): par (`cartaoId`, `competencia`), referenciado por `Parcela` (via `Compra`), `ItemFatura` e `Lancamento` do tipo `pagamento_fatura` (seção 4)

## 3. Entidades

Coluna "Obr.": **S** = obrigatório, **N** = opcional, **T** = conforme o tipo (ver regra).

### 3.1 `Categoria` · `categorias`

Origem: 6.9, 3.3, D35, D40, D49.

| Domínio | Banco | Tipo | Obr. | Padrão | Regra |
| --- | --- | --- | --- | --- | --- |
| `nome` | `nome` | `Texto` | S | — | |
| `tipo` | `tipo` | enum `TipoCategoria` | S | — | `receita`, `despesa` ou `ambos`. `ambos` só em categoria de sistema. Subcategoria tem o tipo da pai |
| `icone` | `icone` | `Icone` | S | — | |
| `cor` | `cor` | `Cor` | N | — | Paleta categórica. Nula nas categorias de sistema, que usam a cor neutra do tema |
| `categoriaPaiId` | `categoria_pai_id` | `Id` | N | `null` | Nula = categoria; preenchida = subcategoria. A pai não pode ter pai (um nível) |
| `sistema` | `sistema` | enum `CategoriaSistema` | N | `null` | Nula = categoria do usuário. Preenchida = categoria de sistema, que não pode ser editada nem excluída |

Categorias de sistema (criadas na inicialização do usuário, D39, junto com as 8 categorias padrão de D40):

| `sistema` | Nome | `tipo` | Uso |
| --- | --- | --- | --- |
| `a_classificar` | A classificar | `ambos` | Padrão de todo lançamento e compra (7.2) |
| `juros_encargos` | Juros e encargos | `despesa` | Encargos no cartão; juros de empréstimo creditado em conta (3.3) |
| `tarifas` | Tarifas | `despesa` | Encargos no cartão, como anuidade (3.3) |
| `ajuste_saldo` | Ajuste de saldo | `ambos` | Lançamentos `ajuste` (3.4) |

**Chaves únicas:** (`created_by`, `sistema`) onde `sistema is not null`. O core acha as categorias de sistema por essa chave, nunca pelo nome.

**Regras:** os gráficos agrupam pela categoria pai (D35). Excluir categoria em uso move os itens para "A classificar"; excluir uma pai exclui as subcategorias (D49).

### 3.2 `Conta` · `contas`

Origem: 3.4, 3.10, 6.4, D21.

| Domínio | Banco | Tipo | Obr. | Padrão | Regra |
| --- | --- | --- | --- | --- | --- |
| `nome` | `nome` | `Texto` | S | — | Único entre as contas não arquivadas |
| `instituicao` | `instituicao` | `Texto` | N | `null` | |
| `tipo` | `tipo` | enum `TipoConta` | S | — | `corrente`, `poupanca`, `investimento`, `dinheiro`, `outra`. Só muda ícone e rótulo |
| `saldoInicial` | `saldo_inicial` | `Centavos` com sinal | S | — | Saldo no fim do dia `dataSaldoInicial`; pode ser negativo |
| `dataSaldoInicial` | `data_saldo_inicial` | `DataCivil` | S | hoje (no formulário) | |
| `cor` | `cor` | `Cor` | S | — | Paleta categórica |
| `incluirNoTotal` | `incluir_no_total` | `Booleano` | S | `true` | O formulário propõe `false` para `investimento`. Não pode ser `false` na conta de pagamento de cartão ativo (3.9) |
| `arquivada` | `arquivada` | `Booleano` | S | `false` | Arquivar exige saldo atual zero e nenhum vínculo ativo (6.4) |

**Chaves únicas:** (`created_by`, `lower(btrim(nome))`) onde `not arquivada`. Desarquivar uma conta cujo nome já foi reutilizado é rejeitado até renomear.

**Derivados:** saldo em uma data, extrato, marca "Anterior ao saldo inicial" (movimento com data ≤ `dataSaldoInicial`), se pode excluir (nenhum movimento nem vínculo).

### 3.3 `Cartao` · `cartoes`

Origem: 3.5, 6.5, D21.

| Domínio | Banco | Tipo | Obr. | Padrão | Regra |
| --- | --- | --- | --- | --- | --- |
| `nome` | `nome` | `Texto` | S | — | Único entre os cartões não arquivados |
| `instituicao` | `instituicao` | `Texto` | N | `null` | |
| `cor` | `cor` | `Cor` | S | — | Face do cartão e gráficos |
| `limite` | `limite` | `Centavos` | S | — | `> 0` |
| `contaPagamentoId` | `conta_pagamento_id` | `Id` | S | — | Conta ativa e incluída no total (3.9); padrão do "Pagar fatura" |
| `competenciaInicial` | `competencia_inicial` | `Competencia` | S | — | Competência da fatura aberta na data do cadastro: a primeira fatura controlada. Não muda depois do cadastro |
| `arquivado` | `arquivado` | `Booleano` | S | `false` | Arquivar exige **Obrigações do cartão** zero e nenhuma recorrência ativa no cartão (6.5) |

**Chaves únicas:** (`created_by`, `lower(btrim(nome))`) onde `not arquivado`.

**Não é campo:** dias de fechamento e vencimento ficam em `CartaoCiclo`. O "Saldo da fatura fechada a pagar" do cadastro vira um `ItemFatura` do tipo `saldo_anterior_cadastro`.

### 3.4 `CartaoCiclo` · `cartao_ciclos`

Origem: 3.5, 3.11.

| Domínio | Banco | Tipo | Obr. | Padrão | Regra |
| --- | --- | --- | --- | --- | --- |
| `cartaoId` | `cartao_id` | `Id` | S | — | |
| `vigenteDesde` | `vigente_desde` | `Competencia` | S | — | No cadastro, igual a `competenciaInicial`. Em "Configurar ciclo", a primeira fatura ainda não fechada |
| `diaFechamento` | `dia_fechamento` | `Dia` | S | — | |
| `diaVencimento` | `dia_vencimento` | `Dia` | S | — | |

**Chaves únicas:** (`created_by`, `cartao_id`, `vigente_desde`).

**Regra:** a fatura de competência M usa a versão com maior `vigenteDesde` ≤ M. Competências anteriores à primeira versão (compras lançadas com data anterior ao cadastro) usam a primeira versão.

### 3.5 `Lancamento` · `lancamentos`

Origem: 3.1 a 3.4, 3.7, 6.3, 7, D32.

| Domínio | Banco | Tipo | Obr. | Padrão | Regra |
| --- | --- | --- | --- | --- | --- |
| `tipo` | `tipo` | enum `TipoLancamento` | S | — | Seção 7 |
| `status` | `status` | enum `StatusLancamento` | S | `efetivado` | `previsto` só para `receita` e `despesa` (7.3) |
| `data` | `data` | `DataCivil` | S | hoje (no formulário) | Data do evento e de caixa (3.2) |
| `valor` | `valor` | `Centavos` | S | — | `> 0`. Exceção: no `ajuste`, com sinal e `≠ 0` (+ aumenta o saldo) |
| `descricao` | `descricao` | `Texto` | N | `null` | Vazia: a lista mostra o nome da categoria |
| `observacao` | `observacao` | `Texto` | N | `null` | Texto livre (sem tags, D34) |
| `contaId` | `conta_id` | `Id` | S | — | Conta movimentada. Na transferência, a conta de origem |
| `contaDestinoId` | `conta_destino_id` | `Id` | T | `null` | Só `transferencia`, e diferente de `contaId` |
| `categoriaId` | `categoria_id` | `Id` | T | `null` | `receita` e `despesa`: obrigatória (padrão "A classificar"); `ajuste`: a categoria `ajuste_saldo`; demais: nula |
| `cartaoId` | `cartao_id` | `Id` | T | `null` | Só `pagamento_fatura` |
| `faturaCompetencia` | `fatura_competencia` | `Competencia` | T | `null` | Só `pagamento_fatura`: a fatura de destino (alocação, 3.5) |
| `dividaId` | `divida_id` | `Id` | T | `null` | Só `captacao`, `pagamento_divida` e `amortizacao` |
| `parcelaDividaId` | `parcela_divida_id` | `Id` | T | `null` | Só `pagamento_divida`: a parcela paga |

Campos por tipo (✓ obrigatório, — nulo):

| `tipo` | `contaDestinoId` | `categoriaId` | `cartaoId` e `faturaCompetencia` | `dividaId` | `parcelaDividaId` | Pode ser previsto | Sinal de `valor` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `receita` | — | ✓ | — | — | — | Sim | `> 0` |
| `despesa` | — | ✓ | — | — | — | Sim | `> 0` |
| `transferencia` | ✓ | — | — | — | — | Não | `> 0` |
| `ajuste` | — | ✓ (`ajuste_saldo`) | — | — | — | Não | `≠ 0` |
| `pagamento_fatura` | — | — | ✓ | — | — | Não | `> 0` |
| `captacao` | — | — | — | ✓ | — | Não | `> 0` |
| `pagamento_divida` | — | — | — | ✓ | ✓ | Não | `> 0` |
| `amortizacao` | — | — | — | ✓ | — | Não | `> 0` |

**Alocação de pagamento** (`AlocacaoPagamento` da tarefa): são os campos `cartaoId` e `faturaCompetencia` do pagamento de fatura. Um pagamento vai para uma fatura só (3.5); o excedente vira "Crédito de pagamento" na fatura seguinte, derivado (D38). Por isso não há tabela própria.

**Regras:** transferência é um lançamento só (D32). Antecipação de parcelas de dívida é gravada como `amortizacao`, porque 3.7 trata as duas do mesmo jeito (regeneram as parcelas não pagas). Excluir um `pagamento_divida` volta a parcela para não paga.

**Derivados:** reconhecimento (3.3), marca "Anterior ao saldo inicial", origem (seção 5), estado de 3.1.

### 3.6 `Compra` · `compras`

Origem: 3.5, 3.6, 6.5.

| Domínio | Banco | Tipo | Obr. | Padrão | Regra |
| --- | --- | --- | --- | --- | --- |
| `cartaoId` | `cartao_id` | `Id` | S | — | |
| `data` | `data` | `DataCivil` | S | hoje (no formulário) | Data da compra (evento); define a fatura da 1ª parcela pelo ciclo |
| `descricao` | `descricao` | `Texto` | N | `null` | Da compra, não da parcela |
| `categoriaId` | `categoria_id` | `Id` | S | "A classificar" | Da compra, não da parcela |
| `observacao` | `observacao` | `Texto` | N | `null` | |
| `valorTotal` | `valor_total` | `Centavos` | S | — | `> 0` |
| `numeroParcelas` | `numero_parcelas` | `smallint` | S | `1` | `≥ 1`. À vista = 1 |
| `cancelada` | `cancelada` | `Booleano` | S | `false` | "Cancelar compra" (3.6): parcelas em faturas não fechadas são excluídas; o estorno, se houver, é um `ItemFatura` |

**Invariantes** (3.6), checados no core: soma das parcelas não excluídas = `valorTotal`; parcelas numeradas de 1 a `numeroParcelas`; competências em ordem não decrescente. Compra cancelada fica fora dos dois primeiros (as parcelas não faturadas foram excluídas). Valor efetivo = `valorTotal` + soma dos `ItemFatura` do tipo `ajuste_compra` da compra.

### 3.7 `Parcela` · `parcelas`

Origem: 3.5, 3.6.

| Domínio | Banco | Tipo | Obr. | Padrão | Regra |
| --- | --- | --- | --- | --- | --- |
| `compraId` | `compra_id` | `Id` | S | — | |
| `numero` | `numero` | `smallint` | S | — | 1 a `numeroParcelas` da compra |
| `valor` | `valor` | `Centavos` | S | — | `> 0`. Rateio de 3.6 (resto na 1ª) |
| `competencia` | `competencia` | `Competencia` | S | — | Fatura em que a parcela cai. **Gravada**: mudança de ciclo não a altera; "Antecipar parcelas" a muda para a fatura aberta |

**Chaves únicas:** (`created_by`, `compra_id`, `numero`).

**Derivados:** status "Paga antes do cadastro" = `competencia` < `competenciaInicial` do cartão (sem reconhecimento, fora do saldo da fatura e dos indicadores, 3.5). Como as duas competências nunca mudam depois de gravadas, não há coluna. Descrição e categoria vêm da compra.

### 3.8 `ItemFatura` · `itens_fatura`

Origem: 3.3, 3.5, 3.6.

| Domínio | Banco | Tipo | Obr. | Padrão | Regra |
| --- | --- | --- | --- | --- | --- |
| `cartaoId` | `cartao_id` | `Id` | S | — | |
| `competencia` | `competencia` | `Competencia` | S | — | Fatura do item. Gravada, como na parcela |
| `tipo` | `tipo` | enum `TipoItemFatura` | S | — | Seção 7 |
| `data` | `data` | `DataCivil` | S | — | Data do lançamento no cartão (evento) |
| `valor` | `valor` | `Centavos` com sinal | S | — | Efeito no saldo da fatura. `encargo` e `saldo_anterior_cadastro`: `> 0`; `estorno`: `< 0`; `ajuste_compra`: `≠ 0` |
| `descricao` | `descricao` | `Texto` | N | `null` | |
| `compraId` | `compra_id` | `Id` | T | `null` | `ajuste_compra`: obrigatória; `estorno`: opcional (a compra original, quando houver); demais: nula |
| `categoriaId` | `categoria_id` | `Id` | T | `null` | `encargo`: obrigatória (`juros_encargos` ou `tarifas`); `estorno` sem compra: obrigatória; com compra: nula (vale a da compra); `saldo_anterior_cadastro`: nula |

**Chaves únicas:** (`created_by`, `cartao_id`) onde `tipo = 'saldo_anterior_cadastro'`: no máximo um por cartão.

**Reconhecimento** (3.3): `encargo`, `estorno` e `ajuste_compra` são despesa (positiva ou negativa) na competência; `saldo_anterior_cadastro` não é despesa, mas entra no saldo da fatura, em **A pagar no cartão** e em **Obrigações do cartão**.

**Não gravados** (D38): "Saldo anterior não pago" e "Crédito de pagamento" são derivados pelo Motor.

### 3.9 `Divida` · `dividas`

Origem: 3.3, 3.7, 6.6, D3.

| Domínio | Banco | Tipo | Obr. | Padrão | Regra |
| --- | --- | --- | --- | --- | --- |
| `tipo` | `tipo` | enum `TipoDivida` | S | — | `emprestimo` ou `financiamento`. Só rótulo; o cálculo usa `destinoDoValor` |
| `credor` | `credor` | `Texto` | S | — | |
| `valorContratado` | `valor_contratado` | `Centavos` | S | — | PV, `> 0` |
| `dataContratacao` | `data_contratacao` | `DataCivil` | S | — | Data da captação, quando registrada |
| `destinoDoValor` | `destino_do_valor` | enum `DestinoDoValor` | S | — | `creditado_em_conta` ou `pago_a_terceiro` |
| `sistemaAmortizacao` | `sistema_amortizacao` | enum `SistemaAmortizacao` | S | — | `price`, `sac` ou `parcela_informada` |
| `taxaMensal` | `taxa_mensal` | `Taxa` | T | — | `price` e `sac`: obrigatória, `≥ 0`; `parcela_informada`: nula (a taxa implícita é derivada) |
| `valorParcelaInformada` | `valor_parcela_informada` | `Centavos` | T | — | Só `parcela_informada`, `> 0`, com `valor × n ≥ PV` |
| `numeroParcelas` | `numero_parcelas` | `smallint` | S | — | `≥ 1` |
| `dataPrimeiraParcela` | `data_primeira_parcela` | `DataCivil` | S | — | |
| `contaDebitoId` | `conta_debito_id` | `Id` | S | — | Conta dos pagamentos |
| `categoriaId` | `categoria_id` | `Id` | T | — | `pago_a_terceiro`: obrigatória, "categoria da dívida" (3.3), padrão "A classificar"; `creditado_em_conta`: nula (juros vão para `juros_encargos`) |

**Não é campo:** a conta de crédito é a `contaId` do lançamento `captacao` da dívida, opcional para dívidas antigas (3.7).

**Derivados:** taxa implícita (bisseção, 3.7), saldo devedor (PV − amortizações das parcelas pagas − lançamentos `amortizacao`), total pago, juros pagos e a pagar, progresso, quitação prevista.

### 3.10 `ParcelaDivida` · `parcelas_divida`

Origem: 3.7, D3.

| Domínio | Banco | Tipo | Obr. | Padrão | Regra |
| --- | --- | --- | --- | --- | --- |
| `dividaId` | `divida_id` | `Id` | S | — | |
| `numero` | `numero` | `smallint` | S | — | 1 a n |
| `vencimento` | `vencimento` | `DataCivil` | S | — | Data do evento e da competência (3.2) |
| `valor` | `valor` | `Centavos` | S | — | `= juros + amortizacao` |
| `juros` | `juros` | `Centavos` | S | — | `≥ 0` |
| `amortizacao` | `amortizacao` | `Centavos` | S | — | `≥ 0` |
| `pagaAntesDoCadastro` | `paga_antes_do_cadastro` | `Booleano` | S | `false` | Passo 4 do cadastro (6.6): sem caixa e sem reconhecimento. Não pode ter `pagamento_divida` |

**Chaves únicas:** (`created_by`, `divida_id`, `numero`).

**Regras:** gravadas na contratação (D3). Amortização e antecipação excluem as parcelas não pagas e gravam as novas na mesma chamada; parcela paga nunca é regenerada. Invariantes de D3: soma das amortizações (parcelas + lançamentos `amortizacao`) = PV; saldo devedor final = 0.

**Derivados:** status `a vencer`, `vencida` ou `paga` (paga = `pagaAntesDoCadastro` ou com `pagamento_divida` não excluído).

### 3.11 `Recorrencia` · `recorrencias`

Origem: 3.8, 6.7, 6.8.

| Domínio | Banco | Tipo | Obr. | Padrão | Regra |
| --- | --- | --- | --- | --- | --- |
| `natureza` | `natureza` | enum `NaturezaRecorrencia` | S | — | `renda` ou `gasto` |
| `descricao` | `descricao` | `Texto` | S | — | |
| `competenciaInicio` | `competencia_inicio` | `Competencia` | S | — | |
| `competenciaFim` | `competencia_fim` | `Competencia` | N | `null` | `≥ competenciaInicio` |
| `autoConfirmar` | `auto_confirmar` | `Booleano` | S | `false` | Confirmação automática (3.8) |
| `ativa` | `ativa` | `Booleano` | S | `true` | |

### 3.12 `RecorrenciaVersao` · `recorrencia_versoes`

Origem: 3.8.

| Domínio | Banco | Tipo | Obr. | Padrão | Regra |
| --- | --- | --- | --- | --- | --- |
| `recorrenciaId` | `recorrencia_id` | `Id` | S | — | |
| `vigenteDesde` | `vigente_desde` | `Competencia` | S | — | Na criação, `competenciaInicio`; na edição, "Aplicar a partir de" |
| `valor` | `valor` | `Centavos` | S | — | `> 0` |
| `dia` | `dia` | `Dia` | S | — | |
| `formaPagamento` | `forma_pagamento` | enum `FormaPagamento` | S | `conta` | `conta` ou `cartao`. Renda só `conta` |
| `contaId` | `conta_id` | `Id` | T | `null` | Obrigatória com `conta`; nula com `cartao` |
| `cartaoId` | `cartao_id` | `Id` | T | `null` | Obrigatória com `cartao`; nula com `conta` |
| `categoriaId` | `categoria_id` | `Id` | S | — | |

**Chaves únicas:** (`created_by`, `recorrencia_id`, `vigente_desde`).

**Regra:** a previsão da competência C usa a versão com maior `vigenteDesde` ≤ C.

### 3.13 `Ocorrencia` · `ocorrencias`

Origem: 3.8.

| Domínio | Banco | Tipo | Obr. | Padrão | Regra |
| --- | --- | --- | --- | --- | --- |
| `recorrenciaId` | `recorrencia_id` | `Id` | S | — | |
| `competencia` | `competencia` | `Competencia` | S | — | |
| `situacao` | `situacao` | enum `SituacaoOcorrencia` | S | — | `confirmada` ou `ignorada` |
| `valor` | `valor` | `Centavos` | T | `null` | Retrato: valor real |
| `data` | `data` | `DataCivil` | T | `null` | Retrato: data real |
| `contaId` | `conta_id` | `Id` | T | `null` | Retrato: conta, quando paga ou recebida em conta |
| `cartaoId` | `cartao_id` | `Id` | T | `null` | Retrato: cartão, quando paga no cartão |
| `categoriaId` | `categoria_id` | `Id` | T | `null` | Retrato: categoria |
| `lancamentoId` | `lancamento_id` | `Id` | T | `null` | Retrato: `receita` ou `despesa` criada (em conta) |
| `compraId` | `compra_id` | `Id` | T | `null` | Retrato: compra à vista criada (no cartão) |

Retrato: `confirmada` exige `valor`, `data`, `categoriaId` e exatamente um dos pares (`contaId` + `lancamentoId`) ou (`cartaoId` + `compraId`); `ignorada` tem todos os campos do retrato nulos.

**Chaves únicas:** (`created_by`, `recorrencia_id`, `competencia`): impede confirmação duplicada e torna a confirmação automática idempotente (3.8).

**Regras:** só existe ao confirmar ou ignorar; nunca é recalculada a partir das versões. Ocorrência prevista, atrasada ou vencida é derivada (não gravada). Excluir o lançamento ou a compra de uma ocorrência exclui a ocorrência na mesma chamada, e ela volta a ser prevista.

### 3.14 `Preferencias` · `preferencias`

Origem: 5.3, 6.2, 6.9, D20.

| Domínio | Banco | Tipo | Obr. | Padrão | Regra |
| --- | --- | --- | --- | --- | --- |
| `limiteAlerta` | `limite_alerta` | `Centavos` | S | `50000` | Limite de alerta do **Previsto até o fim do mês** (R$ 500,00), `≥ 0` |
| `horizontePadrao` | `horizonte_padrao` | `smallint` | S | `12` | Meses da aba Projeções: 3, 6, 12 ou 24 |
| `ocultarValoresAoAbrir` | `ocultar_valores_ao_abrir` | `Booleano` | S | `false` | |

**Chaves únicas:** (`created_by`): uma linha por usuário, criada na inicialização (D39).

**Fora da tabela:** o tema e o estado atual do botão de olho são do aparelho e ficam em `localStorage` (D20). A confirmação automática é o `autoConfirmar` de cada recorrência. A "última conta usada" (7.2) é derivada do lançamento mais recente.

## 4. Fatura (sem tabela)

Uma fatura é identificada pelo par (`cartaoId`, `competencia`), a competência M sendo o mês em que ela vence (D33, 3.5). Nada da fatura é gravado; o Motor deriva:

- **Datas:** vencimento no dia `diaVencimento` de M; fechamento no dia `diaFechamento` de M se F < V, ou de M−1 se F ≥ V, com o ciclo da seção 3.4.
- **Composição de M:** parcelas não excluídas de compras do cartão com `competencia` = M e que não sejam "Paga antes do cadastro"; `ItemFatura` com (`cartaoId`, `competencia`) = (cartão, M); transporte de saldo ou de crédito de M−1 (D38); menos os `Lancamento` do tipo `pagamento_fatura` com (`cartaoId`, `faturaCompetencia`) = (cartão, M).
- **Status:** futura, aberta, fechada, vencida, paga, transportada e o chip "Paga parcialmente" (3.5), sempre a partir de `hoje`.
- **Primeira fatura controlada:** `competenciaInicial` do cartão.
- **Gastos fixos previstos no cartão:** atribuídos à fatura pelo ciclo, só na projeção (3.9).

## 5. Origem de um lançamento

Usada no filtro "origem" de 6.3. É derivada, sem coluna, e cada item tem uma só, na ordem de precedência:

| Origem | Itens |
| --- | --- |
| `recorrencia` | `Lancamento` ou `Compra` (com suas parcelas) referenciado pelo retrato de uma `Ocorrencia` |
| `divida` | `Lancamento` com `dividaId` e `ParcelaDivida` (juros ou parcela reconhecidos, 3.3) |
| `cartao` | `Parcela`, `ItemFatura` e `Lancamento` do tipo `pagamento_fatura` |
| `manual` | Os demais lançamentos |

Recorrência vem antes de cartão: um gasto fixo confirmado no cartão aparece como origem recorrência.

## 6. Exclusão em conjunto

Exclusão é sempre lógica (9.4). Itens que só existem por causa de outro são excluídos juntos, na mesma chamada de `gravar(ops)`:

| Ao excluir | Também são excluídos |
| --- | --- |
| `Compra` | Suas `Parcela` e os `ItemFatura` com o seu `compraId` |
| `Divida` | Suas `ParcelaDivida` |
| `Recorrencia` | Suas `RecorrenciaVersao` e `Ocorrencia`. Os lançamentos e compras criados continuam e passam a ter origem manual |
| `Cartao` | Seus `CartaoCiclo` |
| `Categoria` pai | Suas subcategorias; os itens vão para "A classificar" (D49) |
| `Lancamento` ou `Compra` de uma ocorrência | A `Ocorrencia` (seção 3.13) |

## 7. Enumerações

Valores exatos, como vão para o banco e para o domínio.

| Enumeração | Coluna | Valores |
| --- | --- | --- |
| `TipoCategoria` | `categorias.tipo` | `receita`, `despesa`, `ambos` |
| `CategoriaSistema` | `categorias.sistema` | `a_classificar`, `juros_encargos`, `tarifas`, `ajuste_saldo` |
| `TipoConta` | `contas.tipo` | `corrente`, `poupanca`, `investimento`, `dinheiro`, `outra` |
| `TipoLancamento` | `lancamentos.tipo` | `receita`, `despesa`, `transferencia`, `ajuste`, `pagamento_fatura`, `captacao`, `pagamento_divida`, `amortizacao` |
| `StatusLancamento` | `lancamentos.status` | `previsto`, `efetivado` |
| `TipoItemFatura` | `itens_fatura.tipo` | `encargo`, `estorno`, `ajuste_compra`, `saldo_anterior_cadastro` |
| `TipoDivida` | `dividas.tipo` | `emprestimo`, `financiamento` |
| `DestinoDoValor` | `dividas.destino_do_valor` | `creditado_em_conta`, `pago_a_terceiro` |
| `SistemaAmortizacao` | `dividas.sistema_amortizacao` | `price`, `sac`, `parcela_informada` |
| `NaturezaRecorrencia` | `recorrencias.natureza` | `renda`, `gasto` |
| `FormaPagamento` | `recorrencia_versoes.forma_pagamento` | `conta`, `cartao` |
| `SituacaoOcorrencia` | `ocorrencias.situacao` | `confirmada`, `ignorada` |

Derivadas (só no domínio, nunca gravadas): estado de 3.1, status da fatura, status da parcela de dívida, status do mês da recorrência e origem (seção 5).

## 8. Cenários de 11.2 a 11.8

Como cada grupo de critérios é montado com estas entidades.

| Critérios | Montagem |
| --- | --- |
| 11.2 Saldo e transferências | `Conta` (`saldoInicial`, `dataSaldoInicial`, `incluirNoTotal`, `arquivada`); `Lancamento` `despesa` antes e depois do saldo inicial; `transferencia` com `contaId` e `contaDestinoId`; nome único parcial; `contaPagamentoId` do cartão bloqueia desmarcar "Incluir no total" |
| 11.3 Cartões | `Cartao` + `CartaoCiclo` (fecha 3/vence 10, fecha 25/vence 5, dia 31); `Compra` + `Parcela` com rateio e competência gravada; `pagamento_fatura` com `faturaCompetencia` (parcial e excedente derivam transporte e crédito); nova versão de `CartaoCiclo` sem mexer nas parcelas; `competenciaInicial` + `ItemFatura` `saldo_anterior_cadastro` + compra antiga com parcelas "Paga antes do cadastro"; `ajuste_compra` e `cancelada` |
| 11.4 Reconhecimento e projeção | `Recorrencia` + `RecorrenciaVersao` com `formaPagamento = cartao` (streaming na fatura); `Lancamento` previsto; `ParcelaDivida.juros` (creditado em conta) ou `valor` (pago a terceiro) |
| 11.5 Dívidas | `Divida` (Price, SAC, taxa zero, parcela informada) + `ParcelaDivida` com `juros` e `amortizacao` gravados |
| 11.6 Recorrências | Duas `RecorrenciaVersao` (novembro e "a partir de dezembro"); `Ocorrencia` confirmada com retrato de R$ 6.500,00; chave única (recorrência, competência) para a confirmação automática; `dia = 31` |
| 11.7 Indicadores e dados | Todas as entidades exportadas com as colunas de controle; chaves estrangeiras da seção 2 para a integridade referencial; `updatedAt` decide o modo Mesclar; ids gerados no core permitem regravar pelo mesmo id |
| 11.8 Banco de dados | Colunas de controle de 9.4; chaves únicas parciais com `created_by` (reusar o nome de uma conta excluída); chaves estrangeiras compostas com `created_by`; exclusão em conjunto da seção 6 |
