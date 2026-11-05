# Prompt v2 — Sistema de Controle Financeiro Pessoal

Nov 4, 2026 · @Saulo Verussa

## 1. Papel, objetivo e precedência

Você é um(a) Product Designer sênior especialista em Material Design 3 e um(a) engenheiro(a) front-end sênior em React. Sua tarefa é **desenhar as telas, planejar o fluxo e implementar** o sistema de controle financeiro pessoal **Goose Money** (as telas de design usam o nome provisório "Meu Caixa"), que roda no navegador e como aplicativo desktop a partir do mesmo código.

O produto responde, em qualquer tela, três perguntas:

1. **Quanto eu tenho agora?** (saldo em contas)
2. **Quanto eu já devo?** (cartões e dívidas, incluindo parcelas futuras de compras já feitas)
3. **Quanto vai sobrar?** (saldo previsto no fim do mês e nos meses seguintes)

### 1.1 Regra de precedência (leia antes de tudo)

- **A seção 3 (Regras canônicas) é a única fonte de definição** de estados, datas, valores, indicadores e cálculos. As demais seções referenciam os indicadores pelo nome em **negrito** definido na seção 3.10 e nunca os redefinem.
- Se alguma descrição de tela parecer contradizer a seção 3, **a seção 3 prevalece**.
- Se uma situação não estiver coberta, **não invente uma regra silenciosamente**: escolha a opção mais conservadora (a que mostra menos dinheiro disponível), registre a decisão em `docs/DECISOES.md` e sinalize-a na entrega.
- Todo indicador é calculado por uma única função do domínio. É proibido recalcular um indicador dentro de um componente.

### 1.2 Público e contexto

- Usuário único, uso pessoal, pt-BR, moeda Real (R$), datas dd/mm/aaaa, fuso local.
- Uso típico: lançar despesas no dia a dia (rápido, muitas vezes no celular), conferir faturas e extratos (semanal), planejar o mês seguinte (mensal).
- O usuário não é contador: quando um termo técnico aparecer na interface (competência, saldo devedor, SAC), ofereça tooltip explicativo.

### 1.3 Módulos obrigatórios

Login com Supabase Auth (e-mail e senha; ver `docs/DECISOES.md`, D2); Painel com abas Visão geral, Saldos, Cartões e Projeções; Lançamentos; Contas bancárias com extrato mensal e controle de saldo; Cartões de crédito com compras à vista e parceladas; Empréstimos e financiamentos; Rendas fixas com várias fontes; Gastos fixos mensais; Configurações.

### 1.4 Regra de ouro dos totais

Os indicadores essenciais ficam sempre visíveis e mudam imediatamente após qualquer lançamento, edição, exclusão, confirmação ou desfazer, sem recarregar a página. A regra exata de visibilidade por largura de tela está na seção 4.2.

## 2. Stack, arquitetura e aritmética monetária

Um único código React gera a versão web e a desktop (Tauri, desde a fundação). O back end é o Supabase (Auth e Postgres); o app é online-first e não tem modo offline (`docs/DECISOES.md`, D18). Versões e política de atualização em D4 e D5.

| Camada | Escolha | Observação |
| --- | --- | --- |
| Linguagem e build | React + TypeScript 6 (strict) + Vite | Tipos fortes em todo o domínio |
| Design system | shadcn/ui (Radix + Tailwind CSS 4) com tokens do Material 3 em variáveis CSS | Componentes no repositório, ajustados ao design; Roboto Flex instalada no app; ícones lucide-react |
| Gráficos | Recharts (via `Chart` do shadcn) | Cores lidas das variáveis do tema; exportar PNG com html-to-image e CSV com código próprio |
| Datas | Módulo `datas` próprio no core + `Intl.DateTimeFormat('pt-BR')` | Datas civis sem horário (`AAAA-MM-DD`); campo de data nativo |
| Formulários | React Hook Form + Zod (adaptador próprio) | Schemas de formulário separados dos de domínio e de backup (seção 9) |
| Estado e dados no app | TanStack Query (fatos em cache, mutações chamando RPC) + `useMemo` sobre o Motor | Nenhum indicador é gravado; recarrega ao voltar o foco e ao reconectar |
| Pacotes | pnpm workspaces | `minimumReleaseAge` de 7 dias (D5) |
| Decimal | decimal.js | Só em cálculos intermediários com juros e taxas |
| Back end e dados | Supabase Postgres via `supabase-js` | RLS por usuário; gravações pela função RPC `gravar(ops)`, uma transação por ação (D36); exclusão lógica e colunas de controle (9.4) |
| Migrações | Flyway 13 em Docker | Todo comando de banco é migração (12.2) |
| Ambiente local | Supabase local e Flyway em Docker; Makefile | Seção 12 |
| Autenticação | Supabase Auth (`flowType: 'pkce'`) | E-mail e senha; deep link do Tauri para redefinir senha |
| Desktop | Tauri 2 | Mesmo bundle |
| Rotas | React Router (modo biblioteca) com `HashRouter` e páginas em `React.lazy` | Período, filtros e base de data na URL (`#/lancamentos?de=…`) |
| Testes | Vitest (core); Playwright + axe-core (interface, Chromium e WebKit); Supabase local em Docker | Cobertura obrigatória do domínio; critérios 11.1 no Playwright; RLS e funções RPC testadas no banco local |
| Arquivos no desktop | Plugins `dialog` e `fs` do Tauri atrás de `src/plataforma/arquivos.ts` | Download no navegador; diálogo nativo no Tauri |

### 2.1 Arquitetura

- **Três camadas** em um monorepo (D19): `packages/core` (domínio), `apps/app` (front) e `supabase/` (back end: Supabase local e migrações Flyway com tabelas, RLS e funções RPC).
- **Domínio puro** em `packages/core`: tipos, regras da seção 3 e o **Motor** (`core/src/motor`), que expõe uma função por indicador da seção 3.10 e a função `projetarFluxo` da seção 3.9. Sem dependência de React nem de rede. Toda função do Motor recebe `hoje` como parâmetro; o domínio nunca lê o relógio. Uma derivação única por mudança de fatos (faturas, saldos, cronogramas) alimenta todos os indicadores.
- **Acesso a dados** em `apps/app/src/data`: funções do domínio (`carregarTudo`, `gravar(ops)`) sobre o `supabase-js`; a UI nunca chama o Supabase diretamente. Ao entrar, o app carrega todos os fatos do usuário e o Motor roda sobre eles; recarrega ao voltar o foco e ao reconectar.
- **Cache do TanStack Query** guarda apenas fatos (lançamentos, compras, parcelas de cartão e de dívida, pagamentos, dívidas, recorrências e suas versões, ocorrências gravadas, preferências do usuário). Seletores chamam o Motor.
- **Gravações compostas são atômicas**: o core monta a lista de mudanças de cada ação e a função Postgres `gravar(ops)`, chamada por RPC, grava tudo numa transação (ex.: compra em 10 parcelas; confirmação de recorrência + lançamento; importação de backup). As regras ficam só no core; o banco garante o dono do registro e as restrições simples (D36).

### 2.2 Aritmética monetária

- Valores monetários armazenados como **centavos inteiros** (`number` inteiro seguro). Soma e subtração de centavos são exatas.
- **Cálculos com taxas, juros, divisões e percentuais** usam `Decimal` com pelo menos 20 dígitos significativos; o resultado é convertido para centavos **somente no ponto definido pela regra** (seções 3.6 e 3.7), com arredondamento **meio para cima** (`ROUND_HALF_UP`).
- Nunca use `number` de ponto flutuante para valores intermediários de juros.
- Percentuais exibidos com 1 casa decimal; taxas de juros com 2 a 4 casas.
- Formatação com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.

### 2.3 Estrutura de pastas

```
packages/core/src/  # tipos, regras, motor/ (indicadores e projeção), datas/, dinheiro/, schemas de domínio e backup, seed
apps/app/
  src/
    app/            # rotas, layout, providers, tema, mensagens
    data/           # acesso ao Supabase (carregarTudo, gravar), exportar/importar backup
    queries/        # consultas e mutações do TanStack Query + seletores que chamam o motor
    plataforma/     # adaptadores Tauri × navegador (arquivos, deep link)
    features/       # auth, painel, lancamentos, contas, cartoes, dividas, rendas, gastos-fixos, configuracoes
    components/     # ui/ (shadcn), TotalsBar, MoneyText, PeriodPicker, QuickAddFab, ChartCard, EmptyState
  src-tauri/        # app desktop (capabilities, CSP)
  tests/e2e/        # Playwright + axe-core
supabase/
  config.toml       # Supabase local (12.1)
  flyway/sql/       # migrações Flyway: tabelas, restrições, políticas RLS, triggers e funções RPC (12.2)
docker-compose.yml  # serviço Flyway
Makefile            # comandos do projeto (12.3)
.env.example        # variáveis locais do Supabase e do Flyway
docs/DECISOES.md    # decisões tomadas em casos não cobertos
docs/tasks/         # tarefas de implementação, por etapa
```

## 3. Regras canônicas de cálculo

Princípio central: **cada real consumido ou recebido é reconhecido como despesa ou receita exatamente uma vez, na sua data de competência.** Movimentos que apenas liquidam algo já reconhecido (pagar fatura, pagar parcela de dívida, transferir) mexem no caixa, mas nunca são receita nem despesa.

### 3.1 Vocabulário de estados

| Estado | Significado | Altera saldo de conta? | Reconhecido como receita/despesa? | Visual |
| --- | --- | --- | --- | --- |
| Previsto | Ainda não aconteceu e pode não acontecer: ocorrência de recorrência não confirmada, lançamento avulso marcado como previsto | Não | Não | Chip "Previsto", ícone de relógio, texto secundário |
| Realizado e liquidado | Aconteceu e o dinheiro já entrou ou saiu de uma conta | Sim | Conforme 3.3 | Texto normal |
| Realizado a pagar | Aconteceu, mas ainda não foi pago: parcela de cartão em fatura não paga, parcela de dívida não paga | Não, até o pagamento | Sim, na competência | Chip "A pagar" |
| Vencido | Realizado a pagar com vencimento anterior a hoje | Não | Sim | Chip "Vencido" em `error` |
| Atrasado | Renda prevista com data anterior a hoje e não confirmada | Não | Não | Chip "Atrasado" em `warning` |

Parcelas de compras no cartão **nunca** são "previstas": a compra já aconteceu. Apenas gastos fixos ainda não confirmados que serão pagos no cartão são previstos.

### 3.2 As três datas de cada item

- **Data do evento:** quando o fato ocorreu (compra, lançamento, contratação).
- **Data de competência:** define em que mês o item conta como receita ou despesa (Resultado, KPIs, gráficos).
- **Data de caixa:** quando o dinheiro entra ou sai de uma conta.

| Item | Evento | Competência | Caixa |
| --- | --- | --- | --- |
| Receita ou despesa em conta | Data do lançamento | Igual ao evento | Igual ao evento |
| Parcela de compra no cartão | Data da compra | Data de vencimento da fatura em que a parcela cai | Data do pagamento da fatura (nunca por item) |
| Estorno ou encargo no cartão | Data do lançamento no cartão | Vencimento da fatura em que cai | Pagamento da fatura |
| Pagamento de fatura | Data do pagamento | Não tem (não é despesa) | Igual ao evento |
| Parcela de dívida | Data de vencimento | Data de vencimento | Data do pagamento registrado |
| Captação de empréstimo | Data da contratação | Não tem | Data da contratação |
| Transferência e ajuste de saldo | Data informada | Não tem | Igual ao evento |

### 3.3 Reconhecimento de receitas e despesas (regra única)

As funções `receitasReconhecidas(periodo, filtros)` e `despesasReconhecidas(periodo, filtros)` são **as únicas** fontes de Resultado, KPIs, todos os gráficos de receitas e despesas e da visão "Receitas e despesas" da tela Lançamentos. Cada tipo de movimento é gravado com tipo próprio; um pagamento de fatura nunca é gravado como despesa.

| Tipo de movimento | Efeito no saldo de conta | Reconhecimento |
| --- | --- | --- |
| `receita` (em conta) | + na data | Receita na data |
| `despesa` (em conta) | − na data | Despesa na data |
| Parcela de compra no cartão | Nenhum até pagar a fatura | Despesa na competência, categoria da compra |
| Estorno no cartão | Nenhum | Despesa negativa na competência, categoria da compra original |
| Encargo no cartão (juros, multa, anuidade) | Nenhum | Despesa na competência, categoria "Juros e encargos" ou "Tarifas" |
| `pagamento_fatura` | − na data | Nenhum |
| Saldo anterior transportado, crédito de fatura ou saldo anterior ao cadastro | Nenhum | Nenhum |
| Parcela "Paga antes do cadastro" (cartão ou dívida) | Nenhum | Nenhum |
| `captacao` (valor do empréstimo creditado) | + na data | Nenhum |
| Parcela de empréstimo creditado em conta | Nenhum até pagar | Somente os juros, na competência, categoria "Juros e encargos" |
| Parcela de financiamento pago a terceiro | Nenhum até pagar | Valor integral, na competência, categoria da dívida |
| `pagamento_divida` | − na data | Nenhum |
| Amortização extraordinária | − na data | Nenhum se creditado em conta; despesa na data, categoria da dívida, se pago a terceiro |
| `transferencia` | − na origem, + no destino | Nenhum |
| `ajuste` de saldo | ± na data | Nenhum (aparece só no extrato) |
| Qualquer item previsto | Nenhum | Nenhum (só entra no Motor de projeção, 3.9) |

### 3.4 Saldo de conta e saldo inicial

- `saldoInicial` é o saldo **no fim do dia** `dataSaldoInicial` e já incorpora todos os movimentos até essa data, inclusive.
- Para uma data d ≥ `dataSaldoInicial`: saldo(conta, d) = saldoInicial + soma dos movimentos de caixa efetivados com `dataSaldoInicial` < data ≤ d.
- Para d < `dataSaldoInicial`, o saldo é **indisponível**: exiba "—" com tooltip "Antes do saldo inicial informado".
- Movimentos com data ≤ `dataSaldoInicial` podem existir como histórico (contam em receitas e despesas), mas **não alteram o saldo**; aparecem com a marca "Anterior ao saldo inicial". Ao criar um, avise e ofereça "Manter fora do saldo" (padrão) ou "Mudar a data do saldo inicial".
- Extrato do mês M: saldo de abertura = saldo(conta, max(último dia de M−1, `dataSaldoInicial`)); movimentos após essa data até o fim de M, com saldo corrente por linha; saldo de fechamento ao final.
- Ajuste de saldo: o usuário informa o saldo real numa data; o sistema mostra a diferença e grava um movimento `ajuste` dela.

### 3.5 Cartões de crédito e faturas

**Ciclo.** Cada cartão tem dia de fechamento F e de vencimento V, versionados em `CartaoCiclo` (`vigenteDesde` = competência). A fatura de competência M é a que **vence em M**, no dia V. Seu fechamento é no dia F de M se F < V, ou no dia F de M−1 se F ≥ V. Dia inexistente no mês vira o último dia do mês.

**Atribuição de compra.** Uma compra pertence à fatura M quando fechamento(M−1) ≤ data da compra < fechamento(M). Compra feita no próprio dia do fechamento vai para a fatura seguinte.

**Mudança de ciclo.** Vale a partir da primeira fatura ainda não fechada. Faturas fechadas mantêm suas datas; parcelas já criadas mantêm a competência gravada; só novas compras usam o novo ciclo.

**Saldo da fatura M** = parcelas com competência M + encargos − estornos + saldo transportado de M−1 − crédito transportado de M−1 − pagamentos alocados a M.

**Status da fatura.** Futura (fecha depois da aberta) · Aberta (recebendo compras hoje) · Fechada (fechou, vence hoje ou depois, saldo > 0) · Vencida (venceu, saldo > 0) · Paga (fechou e saldo ≤ 0) · Transportada (saldo levado para a fatura seguinte). Chip adicional "Paga parcialmente" quando há pagamento e saldo > 0.

**Pagamentos são alocados à fatura, nunca a itens.** Destino padrão: a fatura vencida ou fechada mais antiga com saldo; se não houver, a aberta (pagamento antecipado). O usuário pode escolher outra.

- **Pagamento parcial:** o saldo restante continua na fatura (fechada ou vencida). Na data de fechamento da fatura seguinte, o saldo ainda pendente vira o item "Saldo anterior não pago" nela e a fatura antiga passa a "Transportada" com saldo zero. Esse item não é despesa. Ao transportar, o app sugere lançar os juros do rotativo como encargo.
- **Pagamento excedente:** o que passar do saldo vira item "Crédito de pagamento" (negativo) na fatura seguinte. Não é receita.
- **Estorno:** item negativo à vista, na fatura da data do estorno, vinculado à compra original quando houver.

**Cartão cadastrado já em uso.** A primeira fatura controlada é a aberta na data do cadastro.

- Compras anteriores podem ser lançadas com a data original. Parcelas com competência anterior à primeira fatura controlada ficam com status "Paga antes do cadastro": não têm reconhecimento, não entram em saldo de fatura nem em indicadores.
- Se houver fatura fechada e ainda não paga na data do cadastro, o campo "Saldo da fatura fechada a pagar" cria nela o item "Saldo anterior ao cadastro". Esse item entra no saldo da fatura, em **A pagar no cartão** e em **Obrigações do cartão**, mas não é despesa (as despesas que o compõem são anteriores ao controle).

**Indicadores do cartão** (somados em todos os cartões ativos nos indicadores globais):

- **Obrigações do cartão** = soma dos saldos de todas as faturas não pagas e não transportadas, **incluindo faturas futuras** com parcelas já lançadas, menos créditos.
- **A pagar no cartão** = soma dos saldos das faturas vencidas, fechadas e da aberta (curto prazo).
- **Limite disponível** = limite − max(0, Obrigações do cartão).
- **Parcelas restantes de uma compra** (informativo) = parcelas com competência posterior à última fatura fechada.
- Gastos fixos previstos no cartão **nunca** entram nesses indicadores; só no Motor de projeção.

### 3.6 Compras parceladas: cálculo, invariantes e edição

**Rateio:** parcela base = parte inteira de (valorTotal ÷ n) em centavos; o resto (valorTotal − base × n) vai para a 1ª parcela. A parcela k cai na competência da 1ª parcela + (k − 1) meses.

**Invariantes que nunca podem quebrar:**

1. Soma das parcelas = `valorTotal`.
2. Quantidade de parcelas = `numeroParcelas`, numeradas de 1 a n.
3. Competências em ordem não decrescente.
4. Descrição e categoria pertencem à compra, não à parcela.

**Operações permitidas** (não existe edição de valor de uma parcela isolada):

| Operação | Permitida quando | Efeito |
| --- | --- | --- |
| Editar descrição, categoria, observação | Sempre | Vale para a compra inteira, inclusive parcelas passadas |
| Editar valor, nº de parcelas, data ou cartão | Nenhuma parcela em fatura fechada | Regenera todas as parcelas |
| Lançar ajuste | Há parcela em fatura fechada | Cria encargo (+) ou estorno (−) na fatura aberta, vinculado à compra; valor efetivo = valorTotal + ajustes |
| Antecipar parcelas | Há parcelas em faturas futuras | Move as k últimas para a fatura aberta; desconto opcional vira estorno |
| Cancelar compra | Sempre | Remove parcelas de faturas não fechadas; para as já faturadas, pergunta se o banco estornou e, se sim, gera estorno da soma |
| Excluir compra | Nenhuma parcela em fatura fechada | Remove compra e parcelas |

### 3.7 Empréstimos e financiamentos

**Campos obrigatórios:** `valorContratado` (PV), `destinoDoValor` (`creditado_em_conta` ou `pago_a_terceiro`), sistema (`price`, `sac` ou `parcela_informada`), n, data da 1ª parcela, conta de débito. Taxa mensal i para Price e SAC; valor da parcela para "parcela informada".

**Cálculo** (todo intermediário em `Decimal`; arredondar para centavos, meio para cima, só nos pontos indicados):

Price com i > 0, parcela arredondada uma vez:

```latex
PMT = \mathrm{round}\left(PV \cdot \frac{i}{1 - (1 + i)^{-n}}\right)
```

Para cada parcela k: juros J(k) = round(SD(k−1) × i); amortização A(k) = PMT − J(k); SD(k) = SD(k−1) − A(k). **Última parcela:** A(n) = SD(n−1) e parcela = SD(n−1) + J(n), de modo que SD(n) = 0 exatamente.

SAC: A(k) = parte inteira de PV ÷ n para k < n e A(n) = SD(n−1); J(k) = round(SD(k−1) × i); parcela = A(k) + J(k).

**Taxa zero** (Price ou SAC): não use a fórmula. Parcelas = rateio igual ao do cartão (3.6), mas com o resto de centavos na **última** parcela; juros zero.

**Parcela informada:** valide PMT × n ≥ PV (senão, erro "As parcelas somam menos que o valor contratado"). Se PMT × n = PV, i = 0. Caso contrário, encontre a taxa implícita por bisseção em \[0; 1\] com tolerância 1e-12 e gere a tabela com o PMT informado, juros arredondados por parcela e última parcela ajustada para zerar o saldo; mostre a diferença da última parcela em relação ao valor informado.

**Reconhecimento:** conforme 3.3. Contratação com `creditado_em_conta` grava `captacao` na conta (opcional para dívidas antigas: "Registrar a entrada do valor na conta"). Parcelas já pagas antes do cadastro ficam com status "Paga antes do cadastro": sem movimento de caixa e sem reconhecimento.

**Parcelas gravadas:** a tabela é gravada na contratação. Amortização extraordinária e antecipação regeneram só as parcelas não pagas, em uma transação, mantendo soma das amortizações = PV e SD final = 0.

**Saldo devedor** = SD após a última parcela paga. Status da parcela: a vencer, vencida, paga. Amortização extraordinária reduz o SD e recalcula as parcelas restantes (padrão: reduzir prazo; opção: reduzir valor).

### 3.8 Rendas e gastos fixos (recorrências)

- `Recorrencia`: natureza (renda, gasto), descrição, competência de início, competência de fim (opcional), `autoConfirmar`, ativa.
- `RecorrenciaVersao`: `vigenteDesde` (competência), valor, dia, conta, forma de pagamento (conta ou cartão), cartão, categoria. A previsão da competência C usa a versão com maior `vigenteDesde` ≤ C. Dia inexistente vira o último dia do mês.
- `Ocorrencia` é identificada por (recorrenciaId, competência), **chave única** que impede confirmação duplicada. Só é gravada ao confirmar ou ignorar e guarda um retrato (valor real, data, conta ou cartão, categoria, id do lançamento ou da compra). Ocorrência gravada nunca é recalculada a partir de versões.
- Confirmar gasto ou renda em conta cria `despesa` ou `receita` efetivada. Gasto no cartão cria compra à vista na data, que cai na fatura pelo ciclo (3.5).
- Editar recorrência = criar nova versão "a partir de \[competência\]" (padrão: a primeira competência ainda não confirmada). Nunca altera ocorrências gravadas; corrigir o passado = editar o lançamento individual.
- **Confirmação automática:** roda ao abrir o app e a cada hora com o app aberto. Processa, em ordem cronológica, todas as ocorrências pendentes com data ≤ hoje desde o início da recorrência, criando lançamentos com a **data prevista original**. É idempotente pela chave única: se outro aparelho já confirmou a ocorrência, ela é ignorada sem erro. Ao final mostra "N lançamentos automáticos registrados · Revisar". Com o app fechado nada roda; tudo é recuperado na próxima abertura.
- Status do mês: confirmada; prevista (data ≥ hoje); atrasada (renda com data < hoje); vencida (gasto com data < hoje).

### 3.9 Motor de projeção: função única `projetarFluxo(de, ate)`

**Esta é a única função de previsão do sistema.** A Barra de Totais e a aba Projeções a chamam; nenhuma tela soma previsões por conta própria.

- Ponto de partida: **Saldo em contas** de hoje (já contém tudo o que foi liquidado).
- Considera só itens **pendentes** e só fluxos de contas incluídas no total. A conta de pagamento de cada cartão deve ser uma conta incluída (validação no cadastro).
- Cada item entra em **exatamente um grupo**:

| Grupo | Entra | Itens vencidos ou atrasados |
| --- | --- | --- |
| Rendas | Ocorrências previstas de rendas, não confirmadas nem ignoradas | Rendas atrasadas **não** entram (postura conservadora); geram alerta |
| Receitas avulsas previstas | Lançamentos `receita` com status previsto | Data passada **não** entra; gera alerta |
| Gastos fixos em conta | Ocorrências previstas cuja versão tem forma de pagamento "conta" | Vencidos entram no mês corrente |
| Faturas de cartão | Saldo da fatura (3.5) com vencimento no mês + gastos fixos previstos no cartão atribuídos àquela fatura pelo ciclo | Faturas vencidas com saldo entram no mês corrente; fatura paga contribui zero |
| Parcelas de dívidas | Valor integral das parcelas não pagas com vencimento no mês | Vencidas entram no mês corrente |
| Despesas avulsas previstas | Lançamentos `despesa` com status previsto | Data passada entra no mês corrente |

Gasto fixo pago no cartão **nunca** entra em "Gastos fixos em conta": aparece somente dentro da fatura em que cairá.

```latex
Saldo_m = Saldo_{m-1} + Rendas_m + ReceitasAvulsas_m - GastosFixosConta_m - Faturas_m - ParcelasDividas_m - DespesasAvulsas_m
```

O mês corrente vai de hoje até o último dia do mês; os seguintes, do dia 1 ao último dia.

### 3.10 Indicadores canônicos

Todas as telas usam estes nomes e estas definições.

| Indicador | Definição | Referência temporal | Denominador zero |
| --- | --- | --- | --- |
| **Saldo em contas** | Soma de saldo(conta, hoje) das contas não arquivadas com `incluirNoTotal` | Hoje | — |
| **Saldo em todas as contas** | Mesma soma, todas as contas não arquivadas | Hoje | — |
| **A pagar nos cartões** | Soma de "A pagar no cartão" (3.5) | Hoje | — |
| **Obrigações de cartão** | Soma de "Obrigações do cartão" (3.5), com parcelas futuras | Hoje | — |
| **Saldo devedor de dívidas** | Soma dos saldos devedores (3.7) | Hoje | — |
| **Patrimônio líquido** | Saldo em todas as contas − Obrigações de cartão − Saldo devedor de dívidas | Hoje | — |
| **Receitas** / **Despesas** | `receitasReconhecidas` / `despesasReconhecidas` (3.3) | Período | — |
| **Resultado** | Receitas − Despesas | Período | — |
| **Taxa de poupança** | Resultado ÷ Receitas | Período | Receitas = 0 → "—" |
| **Comprometimento da renda** | (gastos fixos do mês, confirmados ou previstos + parcelas no mês de compras com n > 1 que não vieram de recorrência + parcelas de dívidas que vencem no mês) ÷ rendas fixas do mês, confirmadas ou previstas | Mês de referência | Rendas = 0 → "—" |
| **Previsto até o fim do mês** | `projetarFluxo(hoje, último dia do mês corrente)`.saldo final | Mês corrente | — |
| **Limite disponível** | Por cartão (3.5) | Hoje | — |
| **Variação** | (atual − anterior) ÷ módulo do anterior | Período anterior de mesma duração | Ambos 0 → "—"; anterior 0 → "Novo" |

Transferências não mudam o **Saldo em contas** só quando origem e destino têm o mesmo valor de `incluirNoTotal`. De uma conta incluída para uma excluída, o indicador cai o valor transferido; no sentido inverso, sobe. O **Patrimônio líquido** nunca muda com transferências.

### 3.11 Calendário

- Dia 29, 30 ou 31 inexistente no mês (recorrências, ciclos de cartão, vencimentos de dívidas) → último dia do mês.
- Sem ajuste para dia útil nesta versão (registre como evolução futura em `docs/DECISOES.md`).
- "Hoje" e "mês corrente" seguem o fuso local do dispositivo.

## 4. Princípios de UX e design system (Material 3)

### 4.1 Princípios

1. **Lançar é a ação principal.** O FAB "+ Lançar" está sempre disponível e abre direto o formulário (seção 7). Meta mensurável: despesa em até 3 interações (contagem definida em 7.2).
2. **Padrões inteligentes.** Data = hoje; conta = última usada; categoria sugerida pela descrição; a partir de uma conta ou cartão, ela já vem selecionada.
3. **Feedback imediato e reversível.** Ao salvar: o indicador afetado anima do valor antigo ao novo (\~400 ms, respeitando `prefers-reduced-motion`), um chip de variação aparece por 2 s e um snackbar oferece "Desfazer". Diálogo de confirmação só para operações em massa ou irreversíveis (cancelar compra parcelada, importar backup, apagar tudo).
4. **Revelação progressiva.** Parcelamento só aparece ao ligar "Parcelado"; observações e tags em "Mais opções".
5. **Mostrar consequências antes de salvar.** Compra parcelada mostra as faturas de cada parcela; dívida mostra a tabela; ajuste de saldo mostra a diferença; edição de recorrência mostra a partir de qual mês vale.
6. **Estados visuais consistentes** com a tabela 3.1: "Previsto", "A pagar", "Vencido", "Atrasado" sempre com o mesmo chip, ícone e cor.
7. **Cor nunca é o único sinal.** Receita: "+", seta para cima, cor `income`. Despesa: "−", seta para baixo, cor `expense`. Movimentos neutros (transferência, pagamento de fatura, ajuste): ícone próprio, cor `transfer`.
8. **Estados vazios que ensinam:** ilustração simples, uma frase de propósito, um botão de ação.
9. **Teclado no desktop:** `N` novo lançamento, `Ctrl/Cmd + K` busca, `←` `→` muda o mês, `Esc` fecha, `Enter` salva.
10. **Acessibilidade WCAG 2.2 AA:** contraste 4.5:1, alvos de 48 dp, foco visível, gráficos com resumo textual em `aria-label`.

### 4.2 Regra de visibilidade dos totais (substitui qualquer "sempre à vista" genérico)

| Largura | Visíveis simultaneamente, sem interação | Acessíveis com 1 toque |
| --- | --- | --- |
| Compact (< 600 dp) | **Saldo em contas** e **Previsto até o fim do mês** | Os demais indicadores da Barra (expandir) |
| Medium e Expanded (≥ 600 dp) | Todos os indicadores da Barra (seção 5.3) | — |

- Em qualquer largura, a Barra fica fixa abaixo da app bar e nunca sai da tela ao rolar.
- Quando um lançamento altera um indicador que está oculto no compact, a Barra **mostra temporariamente** esse indicador com o chip de variação por 2 s e depois volta ao estado anterior.
- Cada tela de módulo também mantém visível o seu cabeçalho de contexto (ex.: totais da fatura) logo abaixo da Barra, fixo ao rolar a lista.

### 4.3 Tokens do Material 3

**Cor.** Esquema M3 gerado de uma cor semente (sugestão: `#1B6B5A`). Papéis: `primary`, `secondary`, `tertiary`, `error`, `surface`, `surface-container-*`, `on-*`, `outline`. Tema claro, escuro e "seguir o sistema". Tokens semânticos próprios com variantes claro/escuro e contraste verificado: `income`, `expense`, `transfer`, `forecast`, `warning`. Paleta categórica de 8 cores; a mesma categoria tem sempre a mesma cor em todo o app.

**Tipografia.** Roboto Flex (ou Roboto), escala M3 (Display, Headline, Title, Body, Label). Valores com `font-variant-numeric: tabular-nums`. Indicadores da Barra em Title Large; número principal de cada painel em Headline Medium.

**Forma e elevação.** Raios 4 / 8 / 12 / 16 / 28 (extra-small a extra-large). Elevação tonal (surface-container) em vez de sombras.

**Componentes** (nomes do Material 3; correspondência com o shadcn em `docs/DECISOES.md`, D17). Top app bar; FAB estendido "+ Lançar" (vira FAB comum ao rolar); cards elevated (KPIs), outlined (listas), filled (destaques); filter chips (período, filtros); segmented buttons (tipo de lançamento, visões); tabs primárias e secundárias; lists com supporting text e valor à direita; dialogs, full-screen dialogs (compact) e bottom sheets; snackbar com ação; banners para alertas persistentes; progress linear (limite, parcelas pagas); badges no menu; stepper no cadastro de dívida.

**Microcopy.** "Lançar", "Salvar", "Salvar e lançar outro", "Pagar fatura", "Confirmar recebimento", "Registrar pagamento", "Desfazer". Negativos com sinal de menos, nunca entre parênteses.

## 5. Navegação, layout e Barra de Totais

A navegação segue o raciocínio do usuário: **ver** (Painel) → **registrar** (Lançamentos) → **gerenciar onde o dinheiro está** (Contas, Cartões, Dívidas) → **planejar** (Rendas fixas, Gastos fixos, Projeções).

### 5.1 Menu principal

| Ordem | Item | Rota | Ícone (lucide-react) | Para que serve |
| --- | --- | --- | --- | --- |
| 1 | Painel | `/` | `LayoutDashboard` | Abas Visão geral, Saldos, Cartões, Projeções |
| 2 | Lançamentos | `/lancamentos` | `ReceiptText` | Receitas e despesas por competência; movimentações por data |
| 3 | Contas | `/contas` | `Landmark` | Contas, extratos mensais, saldo |
| 4 | Cartões | `/cartoes` | `CreditCard` | Faturas, compras, parcelamentos |
| 5 | Dívidas | `/dividas` | `HandCoins` | Empréstimos e financiamentos |
| 6 | Rendas fixas | `/rendas` | `Banknote` | Fontes de renda recorrentes |
| 7 | Gastos fixos | `/gastos-fixos` | `CalendarSync` | Contas e assinaturas mensais |
| 8 | Projeções | `/projecoes` | `TrendingUp` | Atalho para a aba Projeções do Painel |
| 9 | Configurações | `/configuracoes` | `Settings` | Categorias, senha, tema, backup |

**Navegação por largura:**

- Compact (< 600 dp): navigation bar com **5 itens no total**: Painel, Lançamentos, Contas, Cartões e "Mais" (que abre os itens 5 a 9).
- Medium (600–839 dp): navigation rail com os 9 itens.
- Expanded (≥ 840 dp): navigation drawer fixo com os 9 itens.
- Badges: Gastos fixos (vencidos + vencendo em até 3 dias), Rendas fixas (atrasadas), Cartões (faturas vencidas), Lançamentos (itens "A classificar").

### 5.2 Estrutura de toda tela autenticada (de cima para baixo)

1. **Top app bar:** título, seletor de mês (`◀ Novembro 2026 ▶`) nas telas mensais, busca, menu do usuário (Configurações, Sair).
2. **Barra de Totais** (fixa).
3. **Cabeçalho de contexto** do módulo (fixo ao rolar).
4. **Conteúdo.**
5. **FAB "+ Lançar"** (acima da navigation bar no compact).

### 5.3 Barra de Totais (`TotalsBar`)

A Barra sempre se refere a **hoje e ao mês corrente**, independentemente do período escolhido na tela. Todos os valores vêm dos indicadores da seção 3.10.

| Ordem | Indicador exibido | Visível no compact | Ao clicar, abre |
| --- | --- | --- | --- |
| 1 | **Saldo em contas** | Sim | Contas |
| 2 | **Previsto até o fim do mês** | Sim | Painel › Projeções, mês corrente detalhado |
| 3 | **A pagar nos cartões** | Ao expandir | Cartões |
| 4 | **Resultado** do mês corrente | Ao expandir | Painel › Visão geral, mês corrente |
| 5 | **Patrimônio líquido** | Ao expandir | Painel › Saldos |

Comportamento:

- Recalcula imediatamente após lançamento, edição, exclusão, confirmação, pagamento, importação ou desfazer.
- Anima o valor e mostra o chip de variação (`+R$ 6.500,00` em `income`, `−R$ 89,90` em `expense`); se o indicador estiver oculto no compact, aparece temporariamente (4.2).
- **Previsto até o fim do mês** fica em `warning` abaixo do limite de alerta configurado (padrão R$ 500,00, editável) e em `error` quando negativo.
- Botão de olho oculta todos os valores do app (modo privacidade), lembrando a escolha.
- Tooltip de cada indicador explica em uma frase como é calculado.

## 6. Especificação das telas

Para cada tela, entregue: wireframe descrito em compact e expanded, hierarquia visual, cabeçalho de contexto (com os indicadores pelo nome da seção 3.10), ações, estados (carregando, vazio, erro) e o que muda após um lançamento.

### 6.1 Login

- Card centralizado (máx. 400 dp): logo, nome, campos "E-mail" e "Senha" (outlined), mostrar/ocultar senha, "Manter conectado", botão "Entrar".
- Autenticação pelo Supabase Auth (e-mail e senha). Erro inline: "E-mail ou senha inválidos"; sem rede: "Sem conexão para entrar". `Enter` envia; foco inicial em E-mail.
- Sessão do `supabase-js` em `sessionStorage` (ou `localStorage` com "Manter conectado"). Rotas protegidas redirecionam para `/login` e voltam à rota pedida após o login.
- Troca de senha em Configurações, também pelo Supabase. No Tauri, os links de redefinição de senha e de confirmação de cadastro voltam ao app por deep link.
- Cadastro aberto (D28): link "Criar conta" no login leva a `/criar-conta` (E-mail, Senha, Confirmar senha; mínimo de 8 caracteres). O usuário só entra depois de confirmar o e-mail. A mensagem após o envio é neutra ("Se o e-mail puder ser cadastrado, você vai receber um link de confirmação") e não revela se a conta já existe.

### 6.2 Painel (`/`)

Abas primárias: **Visão geral · Saldos · Cartões · Projeções**. No topo da aba Visão geral, acima de tudo, o card **Pendências** (quando houver): rendas atrasadas, gastos fixos vencidos ou vencendo em 3 dias, faturas fechadas ou vencidas, parcelas de dívida vencidas; cada item com ação direta (Confirmar, Pagar, Pagar fatura, Registrar pagamento) e "Confirmar todos" para recorrências.

**Visão geral** (período do seletor, seção 8)

- KPIs: **Receitas**, **Despesas**, **Resultado**, **Taxa de poupança**, cada um com **Variação**.
- Gráficos da seção 8 marcados para Visão geral.

**Saldos** (referência: hoje)

- Destaque: **Patrimônio líquido**, com a decomposição visível: Saldo em todas as contas − Obrigações de cartão − Saldo devedor de dívidas.
- Cards por conta: saldo atual, variação no mês, sparkline de 30 dias, marca "Fora do total" quando `incluirNoTotal` for falso.
- Gráficos da seção 8 marcados para Saldos.

**Cartões** (referência: hoje e próximos 12 meses)

- Card por cartão: fatura aberta, próxima fatura a vencer, **Limite disponível**, **Obrigações do cartão**.
- Tabela de compras parceladas ativas: descrição, cartão, parcela atual (ex.: 3/10), valor da parcela, parcelas restantes, valor restante, competência da última parcela; total no rodapé.
- Gráficos da seção 8 marcados para Cartões.

**Projeções** (horizonte próprio: 3, 6, 12 ou 24 meses)

- Gráfico de saldo projetado e tabela mês a mês com as colunas dos grupos de 3.9 e saldo final. A primeira linha é o mês corrente e seu saldo final é igual ao **Previsto até o fim do mês**.
- Clicar num mês abre o detalhamento: lista de cada item pendente que compôs aquele mês, por grupo.
- Banner quando algum mês ficar negativo ou abaixo do limite de alerta; alertas de rendas atrasadas não incluídas.
- **Simulador "E se?"**: compra parcelada ou gasto fixo hipotético, curva tracejada sobreposta, nada é gravado.
- Previsão de quitação de cada dívida e da última parcela de cartão.

### 6.3 Lançamentos (`/lancamentos`)

Segmented button com duas visões. A visão e os filtros ficam na URL.

| Visão | Base de data | Contém | Uso |
| --- | --- | --- | --- |
| **Receitas e despesas** (padrão) | Competência (3.2) | Exatamente os itens de `receitasReconhecidas` e `despesasReconhecidas`: lançamentos em conta, parcelas e estornos de cartão, encargos, juros ou parcelas de dívida conforme 3.3 | Entender o resultado; destino dos cliques nos gráficos |
| **Movimentações** | Data do evento | Todos os lançamentos em conta (inclusive transferências, pagamentos, captações, ajustes) e compras no cartão pela data da compra | Conferir o que aconteceu no dia a dia |

- Cabeçalho de contexto: na visão Receitas e despesas, **Receitas**, **Despesas** e **Resultado** do recorte; na visão Movimentações, entradas e saídas de caixa do recorte.
- Filtros: período, tipo, conta, cartão, categoria, estado (3.1), origem (manual, recorrência, cartão, dívida); busca por descrição.
- Lista agrupada por dia com total do dia. Parcela de cartão aparece como "Notebook · 3/10 · Cartão A · comprado em 12/10".
- Previstos aparecem só quando o filtro de estado os inclui, sempre com chip e sem somar nos totais do cabeçalho.
- Itens na categoria "A classificar" ganham ação rápida "Classificar".
- **Invariante:** quando aberta a partir de um gráfico, a soma dos itens listados é igual ao valor clicado.

### 6.4 Contas bancárias (`/contas`, `/contas/:id`)

- **Lista:** cabeçalho com **Saldo em contas**, **Saldo em todas as contas** e o botão "Nova conta" (o FAB continua sendo "+ Lançar"); cards por conta com nome, tipo, instituição, saldo atual e a marca "Fora do total" quando for o caso; arquivadas recolhidas no fim, com a contagem.
- **Seletor de conta** no extrato: chips com as contas ativas, na ordem da lista.
- **Extrato mensal** (seletor de mês): cabeçalho fixo com saldo de abertura, entradas, saídas, saldo de fechamento (3.4) e saldo atual. Lista com data, descrição, categoria ou tipo, valor e saldo corrente. Meses anteriores ao saldo inicial mostram os movimentos sem coluna de saldo.
- Ações: Lançar (conta pré-selecionada), Transferir, Ajustar saldo, Exportar CSV.
- **Formulário (nova ou editar conta):**

| Campo | Regra |
| --- | --- |
| Nome | Obrigatório; único entre as contas ativas |
| Instituição | Opcional |
| Tipo | Corrente, poupança, investimento, dinheiro ou outra. Só muda ícone e rótulo; nenhum cálculo depende do tipo |
| Saldo inicial | Obrigatório; pode ser negativo (cheque especial) |
| Data do saldo inicial | Obrigatória, padrão hoje, com a explicação "saldo no fim deste dia" (3.4) |
| Cor | Obrigatória, da paleta categórica |
| Incluir no total | Padrão: sim; para o tipo investimento, padrão não |

- **Editar** nome, instituição, tipo e cor vale imediatamente. Mudar saldo inicial ou data mostra antes de salvar o saldo atual antigo e o novo e quantos movimentos passam a ficar "Anterior ao saldo inicial" ou deixam de ficar. Desmarcar "Incluir no total" é bloqueado se a conta for a conta de pagamento de um cartão ativo (3.9), com o motivo no tooltip.
- **Menu da conta:** Editar, Arquivar, Excluir, habilitados ou desabilitados conforme a regra, com o motivo no tooltip quando desabilitados.
- **Arquivar** exige saldo atual igual a zero (sugere "Transferir" ou "Ajustar saldo" antes) e que a conta não seja conta de pagamento de cartão ativo, conta de recorrência ativa nem conta de débito de dívida com parcelas a vencer. A conta arquivada sai dos indicadores (3.10) e dos seletores dos formulários; o extrato fica só para leitura. "Desarquivar" está sempre disponível.
- **Excluir** só é permitido para conta sem nenhum movimento e sem vínculo com cartão, recorrência ou dívida. Nos demais casos, o app oferece "Arquivar".

### 6.5 Cartões de crédito (`/cartoes`, `/cartoes/:id`)

- **Lista:** cabeçalho com **A pagar nos cartões**, **Obrigações de cartão** e o botão "Novo cartão"; cards no estilo cartão físico, na cor escolhida, com nome, fatura aberta, vencimento e barra de limite; arquivados recolhidos no fim, com a contagem.
- **Seletor de cartão** no detalhe: chips com os cartões ativos, como no extrato da conta.
- **Detalhe:** tabs secundárias roláveis por fatura, abrindo na aberta. Cabeçalho da fatura: saldo, status (3.5), fechamento, vencimento, pagamentos feitos, **Limite disponível**. Itens: compras à vista, parcelas, estornos, encargos, "Saldo anterior não pago", "Crédito de pagamento". Ações: "Nova compra", "Pagar fatura", "Lançar encargo ou estorno", "Configurar ciclo".
- **Nova compra:** valor, descrição, categoria, data, toggle "Parcelado" (nº de parcelas e alternância valor total / valor da parcela). Prévia ao vivo: "1/10 · R$ 420,00 · fatura de dez/2026"… e o novo **Limite disponível**.
- **Menu de uma compra:** apenas as operações da tabela 3.6, habilitadas ou desabilitadas conforme a regra, com o motivo no tooltip quando desabilitadas.
- **Pagar fatura:** conta (padrão do cartão), valor ("Saldo total" ou outro), data, fatura de destino (padrão por 3.5). Mostra antes de salvar o que acontecerá: saldo restante, ou crédito para a próxima fatura.
- **Configurar ciclo:** novos dias de fechamento e vencimento, mostrando a partir de qual fatura valem.
- **Formulário (novo ou editar cartão):**

| Campo | Regra |
| --- | --- |
| Nome | Obrigatório; único entre os cartões ativos |
| Instituição | Opcional |
| Cor | Obrigatória; usada na face do cartão e nos gráficos |
| Limite | Obrigatório, maior que zero |
| Dia de fechamento e dia de vencimento | Obrigatórios, de 1 a 31 (3.5 e 3.11). Na edição, só mudam por "Configurar ciclo" |
| Conta de pagamento | Obrigatória; conta ativa e incluída no total (3.9) |
| Saldo da fatura fechada a pagar | Opcional, só no cadastro (3.5, "Cartão cadastrado já em uso") |

- **Prévia ao cadastrar:** "Compras feitas hoje caem na fatura que vence em dd/mm/aaaa" e as datas da fatura aberta.
- **Editar** nome, instituição, cor, limite e conta de pagamento vale imediatamente; o novo **Limite disponível** aparece antes de salvar.
- **Menu do cartão:** Editar, Configurar ciclo, Arquivar, Excluir, habilitados ou desabilitados conforme a regra, com o motivo no tooltip quando desabilitados.
- **Arquivar** exige **Obrigações do cartão** igual a zero (nenhuma fatura com saldo, inclusive futuras) e nenhuma recorrência ativa paga no cartão. O cartão arquivado sai dos seletores e da lista principal; as faturas ficam só para leitura. "Desarquivar" está sempre disponível.
- **Excluir** só é permitido para cartão sem compras, encargos, estornos ou pagamentos. Nos demais casos, o app oferece "Arquivar".
- **Sem cartão cadastrado:** escolher o tipo "Compra no cartão" no formulário de lançamento leva ao cadastro de cartão.

### 6.6 Empréstimos e financiamentos (`/dividas`, `/dividas/:id`)

- **Lista:** cabeçalho com **Saldo devedor de dívidas** e parcelas a vencer no mês; card por dívida: credor, tipo, saldo devedor, progresso (18/48), próxima parcela, quitação prevista.
- **Detalhe:** resumo (valor contratado, taxa informada ou implícita, sistema, destino do valor, total pago, juros pagos e a pagar); gráficos de saldo devedor e juros × amortização; tabela de amortização com status; ações "Registrar pagamento" e "Amortizar".
- **Cadastro em stepper:** (1) contrato: tipo, credor, valor contratado, data; (2) destino do valor, com explicação curta de como afeta despesas (3.3), e conta de crédito se aplicável; (3) condições: sistema, taxa ou parcela, n, 1ª parcela, conta de débito; (4) parcelas já pagas antes do cadastro; (5) prévia da tabela e confirmação.

### 6.7 Rendas fixas (`/rendas`)

- Cabeçalho: previsto no mês, recebido, a receber, atrasado.
- Lista de fontes com valor da versão vigente, dia, conta, status do mês (3.8). Ação principal: "Confirmar recebimento" (valor e data editáveis).
- "Nova renda fixa" é um botão no cabeçalho da tela (o FAB continua sendo "+ Lançar").
- Editar abre o formulário com o campo obrigatório "Aplicar a partir de" (padrão: primeira competência não confirmada) e mostra o histórico de versões.
- Gráfico pequeno: composição da renda por fonte.

### 6.8 Gastos fixos (`/gastos-fixos`)

- Cabeçalho: previsto no mês, pago, a pagar, vencido, e **Comprometimento da renda**.
- Lista por data: descrição, valor, dia, forma de pagamento, status (3.8). Ação principal: "Pagar" (em conta) ou "Confirmar no cartão". "Ignorar este mês" no menu.
- "Novo gasto fixo" no cabeçalho; edição com "Aplicar a partir de", como em Rendas.

### 6.9 Configurações (`/configuracoes`)

- Categorias: CRUD com ícone, cor, tipo, subcategorias. Categorias de sistema bloqueadas: "A classificar", "Juros e encargos", "Tarifas", "Ajuste de saldo".
- Acesso: alterar senha.
- Aparência: tema; ocultar valores ao abrir.
- Preferências: limite de alerta do Previsto; horizonte padrão da projeção; confirmação automática por recorrência (atalho).
- Dados: exportar, importar (seção 9), carregar dados de exemplo, apagar tudo (confirmação digitando "APAGAR"; exclusão lógica, 9.4).

## 7. Fluxo de lançamento e efeito nos indicadores

### 7.1 Caminho de todo lançamento

1. **Abrir:** FAB "+ Lançar" (ou `N`). O formulário abre direto, já no tipo padrão da tela e com foco no campo valor.
2. **Trocar o tipo, se preciso:** chips no topo do formulário: Despesa · Receita · Compra no cartão · Transferência · Pagamento de fatura.
3. **Informar o valor** e, opcionalmente, descrição, categoria, data, conta ou cartão.
4. **Salvar** (botão ou `Enter`). Erros aparecem inline e o formulário não fecha.
5. **Gravação atômica** pela função RPC `gravar(ops)` no Supabase; o botão mostra "Salvando…" e o cache é atualizado com as linhas devolvidas depois que ela termina. Se falhar ou não houver conexão, snackbar de erro e nada muda.
6. **Seletores recalculam** os indicadores pelo Motor (seção 3).
7. **Barra de Totais e cabeçalhos animam**; indicador oculto no compact aparece temporariamente (4.2).
8. **Snackbar "Lançado · Desfazer".** Desfazer restaura, em uma transação, a imagem anterior dos registros alterados; os indicadores voltam ao valor anterior.

"Salvar e lançar outro" volta ao passo 3 mantendo tipo, conta ou cartão e data.

### 7.2 Tipo padrão e contagem de interações

| Onde o FAB é tocado | Tipo padrão | Pré-seleção |
| --- | --- | --- |
| Tela de uma conta | Despesa | Aquela conta |
| Tela de um cartão | Compra no cartão (à vista) | Aquele cartão |
| Qualquer outra tela | Despesa | Última conta usada |

**Como contar:** 1 interação = um toque ou clique, uma seleção, ou uma tecla de comando (`N`, `Enter`). Digitar o valor no campo que já está com foco conta como 1 interação, qualquer que seja o número de dígitos. Rolar e ler não contam.

**Campos e obrigatoriedade:** valor (obrigatório, sem padrão); tipo, data, conta ou cartão (obrigatórios, com padrão); categoria (obrigatória, padrão "A classificar"); descrição (opcional; quando vazia, a lista mostra o nome da categoria).

**Metas:** o tipo padrão da tela em **3 interações** (abrir, digitar valor, salvar); qualquer outro tipo em **4** (+ escolher o chip). Exceção: no primeiro uso, sem nenhuma conta cadastrada, o FAB leva antes ao cadastro de conta.

### 7.3 Detalhes do formulário

- Máscara monetária que preenche da direita (digitar `1590` mostra R$ 15,90); teclado numérico no mobile.
- Descrição com autocomplete; escolher uma sugestão preenche a categoria usada da última vez.
- Categoria em grade com as 8 mais usadas + "Ver todas". Data com chips "Hoje" e "Ontem" + seletor.
- Status "Previsto" disponível em "Mais opções" para despesas e receitas avulsas futuras.
- Aviso inline quando a data for anterior ao saldo inicial da conta (3.4).

### 7.4 Efeito de cada tipo nos indicadores da Barra

Valor v; conta incluída no total, salvo indicação. Esta tabela é a especificação dos testes de integração da Barra.

| Ação | Saldo em contas | A pagar nos cartões | Resultado do mês | Previsto até o fim do mês | Patrimônio líquido |
| --- | --- | --- | --- | --- | --- |
| Despesa em conta, data no mês | −v | 0 | −v | −v | −v |
| Receita em conta, data no mês | +v | 0 | +v | +v | +v |
| Compra à vista no cartão | 0 | +v | −v se a fatura vence no mês corrente; senão 0 | −v se a fatura vence até o fim do mês; senão 0 | −v |
| Compra parcelada no cartão | 0 | + parcela que cai na fatura aberta, se houver | − parcela com competência no mês corrente, se houver | − parcelas que vencem até o fim do mês | −v (total) |
| Transferência entre contas com a mesma inclusão | 0 | 0 | 0 | 0 | 0 |
| Transferência de incluída para excluída | −v | 0 | 0 | −v | 0 |
| Transferência de excluída para incluída | +v | 0 | 0 | +v | 0 |
| Pagamento de fatura | −v | −v | 0 | 0 se a fatura vence até o fim do mês; −v se vence depois | 0 |
| Confirmar renda prevista pelo valor previsto | +v | 0 | +v | 0 (se estava atrasada e fora da projeção: +v) | +v |
| Confirmar gasto fixo em conta pelo valor previsto | −v | 0 | −v | 0 | −v |
| Valor real diferente do previsto (renda ou gasto) | conforme o real | 0 | conforme o real | pela diferença | conforme o real |
| Pagar parcela de dívida | −v | 0 | 0 | 0 se vence até o fim do mês | − juros da parcela |
| Ajuste de saldo de diferença d | ±d | 0 | 0 | ±d | ±d |

## 8. Gráficos: período e destino do clique

Cada gráfico tem período e destino de clique definidos abaixo; nenhum herda regra genérica. Quando o destino é Lançamentos, a URL leva visão, base de data, período e filtros do ponto clicado, e a soma da lista aberta é igual ao valor clicado.

### 8.1 Catálogo

| Gráfico | Tipo | Onde | Período aplicável | Clique abre |
| --- | --- | --- | --- | --- |
| Receitas × Despesas por mês | Barras agrupadas + linha de Resultado | Visão geral | Seletor de período | Lançamentos › Receitas e despesas, mês e tipo clicados |
| Despesas por categoria | Rosca (até 6 fatias + "Outras") + ranking | Visão geral | Seletor de período | Lançamentos › Receitas e despesas, categoria clicada ("Outras" = lista das categorias agrupadas) |
| Gasto acumulado vs. mês anterior | Duas linhas por dia | Visão geral | Último mês do período selecionado e o anterior | Lançamentos › Receitas e despesas, do dia 1 ao dia clicado |
| Fixos × variáveis | Barras empilhadas por mês | Visão geral | Seletor de período | Lançamentos › Receitas e despesas, mês e origem (recorrência ou não) |
| Comprometimento da renda | Barra segmentada: fixos, parcelas de cartão, dívidas, livre | Visão geral | Último mês do período selecionado | Segmento abre Gastos fixos, Cartões ou Dívidas |
| Maiores despesas | Lista top 5 | Visão geral | Seletor de período | Detalhe do item (compra, lançamento ou parcela) |
| Composição do saldo por conta | Barras horizontais | Saldos | Hoje (fixo) | Extrato da conta, mês corrente |
| Evolução do saldo e do patrimônio | Linhas (fim de cada mês) | Saldos | Seletor de período | Sem navegação; tooltip mostra a composição do ponto |
| Parcelas comprometidas | Barras empilhadas por cartão | Cartões | Próximos 12 meses (fixo) | Fatura daquele cartão naquela competência |
| Gasto por cartão | Barras | Cartões | Seletor de período (competência) | Lançamentos › Receitas e despesas, filtrado pelo cartão |
| Saldo projetado | Linha com referência no zero | Projeções | Horizonte próprio (3/6/12/24 meses) | Detalhamento do mês na projeção (itens pendentes por grupo), não Lançamentos |
| Composição da renda | Rosca | Rendas fixas | Mês corrente | Recorrência clicada |
| Saldo devedor | Linha decrescente | Detalhe da dívida | Vida da dívida | Linha correspondente da tabela de amortização |
| Juros × amortização | Barras empilhadas por parcela | Detalhe da dívida | Vida da dívida | Linha correspondente da tabela de amortização |

### 8.2 Seletor de período (`PeriodPicker`)

- Aparece apenas nas abas Visão geral e Saldos e na tela Lançamentos.
- Filter chips: Este mês · Mês passado · Últimos 3 meses · Últimos 6 meses · Últimos 12 meses · Este ano · Personalizado. Setas `◀ ▶` deslocam o período inteiro.
- Período na URL (`?de=2026-09-01&ate=2026-11-04`), lembrado por aba. "Últimos N meses" inclui o mês corrente até hoje (D37).
- Granularidade: até 31 dias → diária; até 12 meses → mensal; acima → mensal com opção trimestral.
- **Variação** compara com o período anterior de mesma duração (3.10).

### 8.3 Regras visuais

- Cada gráfico em `ChartCard`: título com a conclusão ou a pergunta, subtítulo com o período aplicável, menu "Ver itens" (mesmo destino do clique) e "Exportar PNG/CSV".
- Cores do tema: `income`, `expense`, paleta categórica estável por categoria e cartão; previstos em tracejado ou com hachura `forecast`.
- Tooltips em R$ com percentual do total; eixo Y abreviado (R$ 1,2 mil), barras começando em zero.
- Estado vazio: frase curta + ação ("Sem despesas neste período · Lançar despesa").
- `aria-label` com resumo textual dos dados.
- Percentuais com denominador zero seguem 3.10 ("—" ou "Novo"), nunca `NaN` ou `Infinity`.

## 9. Persistência, backup e requisitos não funcionais

### 9.1 Três camadas de schema (Zod)

| Camada | Valida | Formato |
| --- | --- | --- |
| Domínio | Entidades gravadas e seus invariantes (3.6, chaves únicas de 3.8) | Centavos inteiros, datas ISO, ids UUID, colunas de controle (9.4) |
| Formulário | Entrada do usuário | Strings com máscara, convertidas para o domínio no envio |
| Backup | Envelope do arquivo e suas versões | `{ schemaVersion, exportadoEm, app, dados: { …entidades } }`, reaproveitando os schemas de domínio para cada entidade |

### 9.2 Exportar e importar backup

- Exporta todas as entidades, inclusive versões de recorrência, ocorrências gravadas e versões de ciclo de cartão.
- Importação em quatro etapas, tudo ou nada em uma transação: (1) validação estrutural pelo schema de backup e migrações por `schemaVersion`; (2) **integridade referencial**: toda referência (contaId, cartaoId, compraId, categoriaId, recorrenciaId…) aponta para entidade existente no arquivo ou na base, conforme o modo; (3) invariantes do domínio; (4) **relatório prévio** com contagens, conflitos e erros, e botão "Importar".
- **Exportar** inclui só registros não excluídos, com as colunas de controle (9.4).
- **Modo Substituir** (padrão): antes de importar, gera automaticamente um backup do estado atual; depois marca todos os registros atuais como excluídos (9.4) e grava o conteúdo do arquivo por id (um registro excluído com o mesmo id volta com os dados do arquivo).
- **Modo Mesclar:** mesmo id → mantém o registro com `updatedAt` mais recente; ids novos → adiciona; conflito de chave única (ex.: mesma recorrência e competência) → mantém o existente e lista no relatório. Após mesclar, revalida invariantes; se algum quebrar, nada é gravado.
- Erro em qualquer etapa: nada é gravado e o relatório mostra o motivo por entidade.

### 9.3 Requisitos não funcionais

- **Desempenho:** indicadores recalculados em menos de 100 ms com 10 mil lançamentos; listas virtualizadas; projeção de 24 meses em menos de 200 ms.
- **Conexão e privacidade:** o app exige conexão; sem ela mostra o banner "Sem conexão" e bloqueia gravações (não há modo offline). Dados no Postgres do Supabase, acessíveis só pelo dono via RLS. App web instalável por manifest e app Tauri.
- **Integridade:** toda gravação composta é atômica (2.1).
- **Internacionalização:** textos em arquivos de mensagens pt-BR (os comuns em `src/app/mensagens.ts`, os de cada tela na pasta da funcionalidade).
- **Testes unitários obrigatórios:** atribuição de compra à fatura (dia do fechamento, virada de ano, F ≥ V, meses curtos, mudança de ciclo); rateio de centavos; Price, SAC, taxa zero e parcela informada; saldo com data de saldo inicial; reconhecimento (3.3) para cada tipo de movimento; projeção sem dupla contagem; pagamentos parcial e excedente; versões de recorrência; confirmação automática idempotente; divisões por zero; importação nos dois modos.

### 9.4 Regras do banco de dados

Valem para toda tabela de negócio no Postgres do Supabase (`docs/DECISOES.md`, D22 e D25).

**Colunas de controle** (criadas pela migração de cada tabela):

| Coluna no banco | Campo no domínio | Tipo e padrão | Regra |
| --- | --- | --- | --- |
| `id` | `id` | `uuid`, `default gen_random_uuid()` | Chave primária |
| `created_at` | `createdAt` | `timestamptz not null default now()` | Data de criação; nunca muda |
| `updated_at` | `updatedAt` | `timestamptz not null default now()` | Atualizada pelo trigger `set_updated_at` (uma função única, usada por todas as tabelas) a cada `update`, inclusive na exclusão lógica |
| `created_by` | `createdBy` | `uuid not null default auth.uid() references auth.users` | Usuário que criou; também é o dono usado pelo RLS. A política `with check (created_by = auth.uid())` impede gravar para outro usuário |
| `is_deleted` | `isDeleted` | `boolean not null default false` | Exclusão lógica |

Campos de negócio seguem o mesmo padrão de nomes: `snake_case` no banco e `camelCase` no domínio (`saldo_inicial` ↔ `saldoInicial`). O mapeamento fica só em `src/data`.

**Exclusão lógica:**

- Toda menção a excluir, remover, apagar ou cancelar nesta spec (3.6, 6.4, 6.5, 6.9, 9.2) é exclusão lógica: `is_deleted = true`. Nenhuma linha é apagada fisicamente pelo app.
- O banco garante a regra: `delete` é revogado para os papéis `authenticated` e `anon` em todas as tabelas.
- Excluir é diferente de arquivar: um item arquivado continua visível só para leitura (6.4, 6.5); um item excluído some de listas, seletores, indicadores, gráficos e backups.
- Itens que só existem por causa de outro são excluídos juntos, na mesma chamada de `gravar(ops)`: compra e suas parcelas; dívida e suas parcelas; recorrência e suas versões.
- `carregarTudo` e todas as funções RPC leem só `not is_deleted`. O Motor nunca recebe um registro excluído. As políticas de RLS filtram só o dono, para que o Desfazer consiga restaurar.
- **Desfazer** uma exclusão volta `is_deleted` para `false`; os valores do registro não mudam.
- Restrições de unicidade usam índices parciais `where not is_deleted`: (recorrência, competência) de 3.8 e nome entre contas e cartões ativos (6.4, 6.5). Um nome de item excluído pode ser reutilizado.
- Chaves estrangeiras continuam valendo (`on delete restrict`), já que nada é apagado.

## 10. Dados de exemplo

O seed é gerado com **datas relativas ao dia em que é carregado** (M0 = mês corrente, M−1 = mês anterior…), para que os gráficos nunca nasçam vazios nem desatualizados. Ele também deve exercitar os casos de borda da seção 3.

**Contas** (saldo inicial no último dia de M−4):

| Conta | Tipo | Saldo inicial | Incluir no total |
| --- | --- | --- | --- |
| Conta corrente | Corrente | R$ 3.200,00 | Sim |
| Poupança | Poupança | R$ 8.000,00 | Sim |
| Carteira | Dinheiro | R$ 150,00 | Sim |
| Investimentos | Investimento | R$ 15.000,00 | Não |

**Rendas fixas** (conta corrente):

- Salário R$ 6.500,00, dia 5, confirmação automática ligada.
- Freelance, dia 20, com **duas versões**: R$ 1.000,00 até M−2 e R$ 1.200,00 a partir de M−1.
- Receita avulsa prevista: 13º salário R$ 3.250,00 no dia 20 de M+1.

**Gastos fixos:**

- Aluguel R$ 1.800,00, dia 10, conta corrente.
- Internet R$ 119,90, dia 15, conta corrente.
- Academia R$ 99,00, dia 5, conta corrente.
- Energia R$ 180,00, **dia 31** (testa meses curtos), conta corrente; em M−1 confirmada com valor real R$ 212,40.
- Streaming R$ 55,90, dia 12, **no Cartão A**.
- Despesa avulsa prevista: IPVA R$ 1.300,00 no dia 15 de M+2.

**Cartões** (conta de pagamento: conta corrente):

- Cartão A: limite R$ 8.000,00, fecha dia 3, vence dia 10 (F < V).
- Cartão B: limite R$ 4.000,00, fecha dia 25, vence dia 5 (F ≥ V: fecha no mês anterior ao vencimento).

**Compras:**

- Notebook R$ 4.200,00 em 10x no Cartão A, comprado em M−2 (parcelas de R$ 420,00).
- Geladeira R$ 2.400,00 em 6x no Cartão B, comprada em M−1.
- Fone R$ 1.000,00 em 3x no Cartão A, comprado em M0 (R$ 333,34 + R$ 333,33 + R$ 333,33).
- 15 a 25 compras à vista variadas por mês nos dois cartões, uma delas **no dia exato do fechamento**.
- Um estorno de R$ 89,90 no Cartão A em M−1, vinculado a uma compra.
- Fatura do Cartão B de M−1: **paga parcialmente** (60%), com o restante transportado e um encargo de juros de R$ 38,70.
- Fatura do Cartão A de M−2: paga com **R$ 50,00 a mais**, gerando crédito na seguinte.

**Dívidas:**

- Financiamento de veículo: **pago a terceiro**, Price, R$ 40.000,00, 1,49% a.m., 48x, débito na conta corrente, categoria Transporte, 12 parcelas pagas antes do cadastro.
- Empréstimo pessoal: **creditado em conta**, valor contratado **R$ 4.800,00**, parcela informada R$ 450,00 × 12 (taxa implícita calculada pelo sistema, cerca de 1,86% a.m.), 3 parcelas pagas antes do cadastro, entrada do valor não registrada.

**Histórico:**

- Lançamentos variados de M−3 até hoje em todas as contas incluídas, incluindo duas transferências (uma da conta corrente para Investimentos).
- Um lançamento com data anterior ao saldo inicial (marcado "Anterior ao saldo inicial").
- Dois lançamentos em "A classificar".
- Uma ocorrência de renda do mês corrente deixada atrasada (Freelance, se o dia 20 já passou), para exibir o alerta.

## 11. Critérios de aceite

Cada item deve virar um teste automatizado (unitário no domínio ou de integração na UI). Cenários partem de uma base vazia, salvo indicação.

### 11.1 Acesso e interação

- [ ] Usuário válido do Supabase entra; credencial errada mostra erro inline; rota protegida sem sessão redireciona para `/login` e volta após o login.
- [ ] Uma pessoa cria a conta em `/criar-conta`, confirma pelo link do e-mail e entra no primeiro uso; antes de confirmar, o login é recusado; e-mail já cadastrado recebe a mesma mensagem neutra.
- [ ] De qualquer tela comum, uma despesa é lançada em 3 interações (FAB, valor, salvar); uma receita em 4.
- [ ] Na tela de um cartão, uma compra à vista naquele cartão é lançada em 3 interações.
- [ ] Em 360 dp, **Saldo em contas** e **Previsto até o fim do mês** ficam visíveis sem interação; após uma compra no cartão, **A pagar nos cartões** aparece temporariamente com o chip de variação.
- [ ] Em 768 dp e 1440 dp, os 5 indicadores da Barra ficam visíveis simultaneamente, em tema claro e escuro, com contraste AA.

### 11.2 Saldo e transferências

- [ ] Conta com saldo inicial R$ 1.000,00 em 31/07: despesa de R$ 200,00 em 31/07 não altera o saldo e recebe a marca "Anterior ao saldo inicial"; despesa de R$ 200,00 em 01/08 deixa o saldo em R$ 800,00; saldo consultado em 30/07 aparece como "—".
- [ ] Transferência de R$ 500,00 de conta incluída para conta excluída: **Saldo em contas** −500, **Previsto até o fim do mês** −500, **Resultado** e **Patrimônio líquido** inalterados.
- [ ] Extrato mensal: saldo de abertura + entradas − saídas = saldo de fechamento, e o fechamento do mês corrente até hoje é igual ao saldo atual.
- [ ] Várias contas de todos os tipos podem ser cadastradas; nome repetido entre contas ativas é rejeitado.
- [ ] Arquivar conta com saldo atual diferente de zero, ou que é conta de pagamento de cartão ativo, fica desabilitado com o motivo; com saldo zero, a conta sai de **Saldo em todas as contas** e dos seletores, e "Desarquivar" a traz de volta.
- [ ] Excluir conta com movimentos fica desabilitado e o app oferece "Arquivar".
- [ ] Desmarcar "Incluir no total" da conta de pagamento de um cartão ativo é bloqueado.

### 11.3 Cartões

- [ ] Cartão A (fecha 3, vence 10): compra em 02/11 cai na fatura que vence 10/11; compra em 03/11 cai na que vence 10/12.
- [ ] Cartão B (fecha 25, vence 5): compra em 24/11 cai na fatura que vence 05/12; compra em 25/11 cai na que vence 05/01.
- [ ] Cartão com fechamento no dia 31: em fevereiro fecha no dia 28 (29 em ano bissexto).
- [ ] Compra de R$ 1.000,00 em 3x gera R$ 333,34 + R$ 333,33 + R$ 333,33 em faturas consecutivas e reduz o **Limite disponível** em R$ 1.000,00.
- [ ] Compra de R$ 1.200,00 em 12x: **Patrimônio líquido** e **Obrigações de cartão** mudam R$ 1.200,00; **A pagar nos cartões** muda apenas R$ 100,00 (parcela da fatura aberta).
- [ ] Pagar integralmente uma fatura de R$ 800,00 que vence no mês: **Saldo em contas** −800, **A pagar nos cartões** −800; **Resultado**, gráficos de despesas e **Previsto até o fim do mês** inalterados.
- [ ] Fatura de R$ 1.000,00 com pagamento de R$ 600,00: saldo R$ 400,00 com chip "Paga parcialmente"; se vencida, os R$ 400,00 entram no mês corrente da projeção; no fechamento seguinte viram "Saldo anterior não pago" e a fatura antiga fica "Transportada"; despesas reconhecidas não mudam.
- [ ] Fatura de R$ 500,00 paga com R$ 550,00: fatura "Paga" e crédito de −R$ 50,00 na seguinte; nenhuma receita reconhecida.
- [ ] Compra parcelada com parcela em fatura fechada: "Editar valor" desabilitado com motivo no tooltip; "Lançar ajuste" e "Cancelar compra" disponíveis; a soma das parcelas continua igual ao valor total.
- [ ] Mudar o fechamento do cartão não move parcelas já criadas nem altera datas de faturas fechadas.
- [ ] Três cartões cadastrados: **A pagar nos cartões** e **Obrigações de cartão** somam os três, e o seletor do detalhe mostra os três.
- [ ] Cartão cadastrado em 04/11 com fatura fechada a pagar de R$ 900,00: o item "Saldo anterior ao cadastro" entra em **A pagar nos cartões** e **Obrigações de cartão** e não entra em **Despesas**. Compra de R$ 1.200,00 em 12x feita antes, lançada com a data original: parcelas anteriores à fatura aberta ficam "Paga antes do cadastro" e as demais seguem 3.6.
- [ ] Arquivar cartão com **Obrigações do cartão** maior que zero fica desabilitado com o motivo; excluir cartão com compras fica desabilitado e o app oferece "Arquivar".

### 11.4 Reconhecimento e projeção (sem dupla contagem)

- [ ] Streaming de R$ 55,90 no Cartão A (dia 12), não confirmado: aparece **uma única vez** na projeção, dentro da fatura que vence em 10 do mês seguinte, e nunca na coluna "Gastos fixos em conta".
- [ ] **Previsto até o fim do mês** na Barra é igual ao saldo final do mês corrente na aba Projeções, inclusive com receitas e despesas avulsas previstas no mês.
- [ ] Renda atrasada não entra na projeção e gera alerta; gasto fixo, fatura e parcela de dívida vencidos entram no mês corrente.
- [ ] Parcela de cartão de compra feita em outubro com fatura vencendo em novembro conta nas **Despesas** de novembro; ao clicar na barra de novembro, ela aparece na lista e a soma da lista é igual ao valor da barra.
- [ ] Empréstimo creditado em conta: só os juros de cada parcela entram em **Despesas**; financiamento pago a terceiro: a parcela inteira entra; nenhum pagamento de parcela altera o **Resultado**.

### 11.5 Dívidas

- [ ] Price R$ 40.000,00, 1,49% a.m., 48x: saldo devedor final exatamente R$ 0,00, com a diferença de centavos absorvida pela última parcela.
- [ ] Taxa zero, R$ 1.200,00 em 12x: 12 parcelas de R$ 100,00, juros zero, sem divisão por zero; R$ 1.000,00 em 3x: R$ 333,33 + R$ 333,33 + R$ 333,34.
- [ ] Parcela informada R$ 300,00 × 12 com valor contratado R$ 4.800,00 é rejeitada com mensagem clara; R$ 450,00 × 12 é aceita com taxa implícita próxima de 1,86% a.m.

### 11.6 Recorrências

- [ ] Salário de R$ 6.500,00 confirmado em novembro e editado para R$ 7.000,00 "a partir de dezembro": novembro continua R$ 6.500,00, a projeção usa R$ 7.000,00 de dezembro em diante, meses anteriores não mudam.
- [ ] App fechado de 01/11 a 10/11 com salário (dia 5) em confirmação automática: ao abrir em 10/11, cria um lançamento datado de 05/11; abrir de novo não duplica.
- [ ] Gasto fixo no dia 31 aparece no dia 30 em novembro e no dia 28 ou 29 em fevereiro.

### 11.7 Indicadores, gráficos e dados

- [ ] Período sem receitas: **Taxa de poupança** "—"; anterior zero e atual R$ 500,00: **Variação** "Novo"; nenhum `NaN` ou `Infinity` em qualquer tela.
- [ ] Cada gráfico respeita o período e o destino de clique da tabela 8.1; quando o destino é Lançamentos, a soma da lista é igual ao valor clicado.
- [ ] Exportar, apagar tudo e importar em modo Substituir reproduz todos os indicadores da seção 3.10 com os mesmos valores; importar o mesmo arquivo em modo Mesclar não cria duplicatas.
- [ ] Importar um arquivo com referência quebrada (ex.: parcela apontando para compra inexistente) não grava nada e o relatório aponta a entidade.
- [ ] Desfazer qualquer lançamento devolve todos os indicadores aos valores anteriores.

### 11.8 Banco de dados

- [ ] Excluir uma despesa grava `is_deleted = true`, a linha continua no banco e o item some de listas, indicadores e gráficos; Desfazer devolve todos os indicadores aos valores anteriores.
- [ ] Excluir uma compra parcelada marca a compra e todas as parcelas como excluídas na mesma transação.
- [ ] `delete` direto numa tabela, feito pelo usuário autenticado, é negado pelo banco.
- [ ] O usuário A não lê nem altera registros do usuário B, inclusive os excluídos; inserir com `created_by` de outro usuário é rejeitado.
- [ ] `updated_at` muda a cada atualização e `created_at` nunca muda.
- [ ] Depois de excluir a conta "Poupança" (sem movimentos), é possível criar outra conta com o mesmo nome.
- [ ] `make db-reset` recria o banco local do zero só com as migrações Flyway, e `make db-validate` passa.

## 12. Ambiente de desenvolvimento

Pré-requisitos na máquina: Docker com Compose v2, Node.js 26 (D26), pnpm 12, Rust (para o Tauri) e GNU Make 3.81 ou posterior. Decisões em `docs/DECISOES.md`, D23 e D24.

### 12.1 Supabase local em Docker

- O Supabase CLI é dependência de desenvolvimento do workspace raiz (pacote `supabase`, versão fixa) e roda por `pnpm exec supabase`; não precisa de instalação global.
- `supabase/config.toml` fica no Git (gerado por `supabase init`, com `project_id = "goose-money"`).
- `supabase start` sobe os serviços em containers Docker. Portas padrão do CLI: API `54321`, Postgres `54322`, Studio `54323` e Mailpit `54324` (caixa de e-mail local para testar "Esqueci a senha").
- As migrações nativas do CLI **não são usadas**: não existe `supabase/migrations/`, e `supabase db reset` só roda dentro de `make db-reset`, que em seguida aplica o Flyway. Mudar o schema pelo Studio é proibido; toda mudança é uma migração (12.2).
- `.env.example` (no Git) traz `VITE_SUPABASE_URL=http://127.0.0.1:54321`, `VITE_SUPABASE_ANON_KEY` vazio (preencher com a chave mostrada por `make db-status`) e as variáveis `FLYWAY_*` locais. O `.env` fica fora do Git.
- Os testes criam os próprios usuários no banco local com a chave `service_role` local, só no código de teste. Essa chave nunca entra no app.

### 12.2 Flyway em Docker

Todo comando de banco (tabelas, índices, restrições, políticas RLS, grants, triggers e funções RPC) é uma migração Flyway, aplicada pelo container oficial. `docker-compose.yml` na raiz:

```yaml
services:
  flyway:
    image: flyway/flyway:13.11.1-alpine
    volumes:
      - ./supabase/flyway/sql:/flyway/sql:ro
    environment:
      FLYWAY_URL: ${FLYWAY_URL}            # local: jdbc:postgresql://host.docker.internal:54322/postgres
      FLYWAY_USER: ${FLYWAY_USER}          # local: postgres
      FLYWAY_PASSWORD: ${FLYWAY_PASSWORD}  # local: postgres
      FLYWAY_DEFAULT_SCHEMA: flyway        # tabela de histórico fora do schema exposto pela API
      FLYWAY_SCHEMAS: flyway,public
      FLYWAY_CLEAN_DISABLED: "true"
      FLYWAY_VALIDATE_MIGRATION_NAMING: "true"
      FLYWAY_CONNECT_RETRIES: "10"
    extra_hosts:
      - "host.docker.internal:host-gateway"  # acesso ao Postgres do Supabase local também no Linux
```

Uso: `docker compose run --rm flyway migrate` (ou `info`, `validate`). O Compose lê o `.env` da raiz; para produção, `--env-file .env.producao`.

**Arquivos** em `supabase/flyway/sql/`:

- `V001__funcoes_base.sql`: função `set_updated_at` e grants padrão.
- `V002__contas.sql`, `V003__cartoes.sql`…: uma migração versionada por mudança, nome em português descrevendo o que faz.
- `R__funcoes_rpc.sql` e outros repetíveis (`R__…`) para funções RPC e views, com `create or replace`; o Flyway reaplica quando o conteúdo muda.

**Toda migração que cria tabela** inclui:

1. As colunas de controle de 9.4 e o trigger `set_updated_at`.
2. `enable row level security` e políticas de `select`, `insert` e `update` com `created_by = auth.uid()` (`with check` no `insert` e no `update`).
3. `revoke delete` para `authenticated` e `anon`, e `revoke all` para `anon`.
4. Índices de unicidade parciais `where not is_deleted` e chaves estrangeiras `on delete restrict`.

**Regras:**

- Migração já aplicada nunca é editada: o `flyway validate` falha pela diferença de checksum. Correção é uma nova migração.
- `flyway clean` fica desabilitado em todos os ambientes.
- Migrações não tocam nos schemas gerenciados pelo Supabase (`auth`, `storage`), só os referenciam (`auth.users`, `auth.uid()`).
- Produção: conexão direta ou session pooler do Supabase (porta `5432`), nunca o transaction pooler (porta `6543`). Só por `make db-migrate-prod`, com confirmação; credenciais em `.env.producao`, fora do Git.

### 12.3 Makefile

O `Makefile` na raiz é o ponto de entrada dos comandos. Regras:

- Compatível com GNU Make 3.81, a versão do macOS (sem `.ONESHELL` nem recursos posteriores).
- `make` sem alvo executa `make help`, que lista os alvos a partir do comentário `## descrição` de cada um.
- Cada alvo só chama `pnpm`, `docker compose` ou `pnpm exec supabase`; a lógica fica nos scripts do `package.json`.
- Alvos destrutivos pedem confirmação digitada.

| Alvo | O que faz |
| --- | --- |
| `help` | Lista os alvos |
| `setup` | `pnpm install` e cria o `.env` a partir do `.env.example`, se não existir |
| `dev` | App web no navegador (Vite, porta `PORTA_APP`, padrão 1420) |
| `dev-desktop` | App Tauri em desenvolvimento |
| `db-start` | Sobe o Supabase local |
| `db-stop` | Para o Supabase local |
| `db-status` | Mostra URLs e chaves do Supabase local |
| `db-migrate` | Aplica as migrações Flyway no banco local |
| `db-info` | Mostra o estado das migrações |
| `db-validate` | Confere nomes e checksums das migrações |
| `db-reset` | Recria o banco local do zero (`supabase db reset` + `db-migrate`); pede confirmação |
| `db-migrate-prod` | Aplica as migrações em produção com `.env.producao`; pede confirmação |
| `deploy-web` | Gera o build de produção e envia para a VPS (D53); pede confirmação |
| `db-eliminar-usuario` | Apaga fisicamente os dados e a conta de um usuário que pediu (LGPD, D54); pede confirmação |
| `test` | Testes Vitest (os de dados exigem `db-start` e `db-migrate`) |
| `test-e2e` | Testes Playwright + axe-core |
| `lint` | ESLint |
| `format` | Prettier |
| `typecheck` | Checagem de tipos em todos os pacotes |
| `check` | `lint` + `typecheck` + `test` + `db-validate`; rodar antes de abrir PR |
| `build` | Build do app web |
| `build-desktop` | Build e empacotamento do Tauri |
