# Tarefas de implementação

Plano para implementar o Goose Money, quebrado em 100 tarefas pequenas, uma por arquivo, organizadas em 7 etapas e, dentro delas, por contexto. As regras continuam em `docs/PROMPT.md` (a seção 3 vence qualquer conflito); cada tarefa aponta as seções, decisões e telas de design que usa.

## Como usar

- **Uma tarefa por branch**, com o nome sugerido no cabeçalho da tarefa, e um Pull Request por tarefa (CLAUDE.md).
- Para trabalhar com vários agentes em paralelo, siga [tasks-agents-estrategies.md](tasks-agents-estrategies.md): trilhas, fases, ambiente compartilhado e regras de merge.
- Só comece uma tarefa quando as dependências estiverem concluídas. Dentro de uma etapa, tarefas sem dependência entre si podem andar em paralelo.
- Caminhos em paralelo: T01-01 (modelo de dados) desde o primeiro dia; depois da base, a etapa 1 (domínio), T04-01 a T04-04 (tema e componentes base) e a etapa 2 (banco), que só espera o modelo de dados aprovado. As telas esperam a etapa 3.
- **Tarefas com decisões** terminam com a seção "Decisão tomada", que resume a escolha e aponta o registro em `docs/DECISOES.md`. Dúvida nova numa tarefa vai na descrição do PR, como seção "Decisões" com as opções A, B e C (a recomendada marcada); o coordenador registra a resposta em `docs/DECISOES.md` (D56).
- Ao concluir, confira os critérios de aceite no PR. O "✅" na linha da tarefa neste índice é acrescentado pelo coordenador, no merge (D56).

## Estrutura de cada tarefa

| Seção | Conteúdo |
| --- | --- |
| Cabeçalho | Etapa, contexto, dependências e nome da branch |
| Referências | Seções do `PROMPT.md`, decisões do `DECISOES.md` e telas de `design/telas/` |
| Objetivo | O resultado em uma ou duas frases |
| Escopo | O que entra, com arquivos, funções e regras |
| Fora do escopo | O que fica para outra tarefa |
| Passos | Ordem sugerida de execução |
| Critérios de aceite | Como saber que terminou; os itens de `PROMPT.md` 11 aparecem com o número entre parênteses |
| Decisão tomada | A escolha feita e o número em `docs/DECISOES.md`; dúvida nova entra como "Decisões", com as opções A, B e C |

## Decisões

Todas as decisões foram tomadas (DECISOES D26 a D55). Cada tarefa traz a escolha na seção "Decisão tomada".

## Etapa 0 · Codebase

Base do projeto: monorepo, app, desktop, Supabase local, Flyway, Makefile, CI. Nenhuma regra de negócio.

| Tarefa | Contexto | Depende de | Decisões |
| --- | --- | --- | --- |
| ✅ [T00-01 · Monorepo com pnpm workspaces](00-codebase/T00-01-monorepo-pnpm.md) | Monorepo | — | tomada |
| ✅ [T00-02 · Pacote `@goose-money/core`](00-codebase/T00-02-pacote-core.md) | Core | T00-01 | — |
| ✅ [T00-03 · App web com Vite e React](00-codebase/T00-03-app-vite-react.md) | App | T00-02 | — |
| ✅ [T00-04 · Tailwind 4, shadcn/ui e fonte Roboto Flex](00-codebase/T00-04-tailwind-shadcn-fonte.md) | App · Design system | T00-03 | — |
| ✅ [T00-05 · ESLint, Prettier e regras de fronteira](00-codebase/T00-05-lint-formatacao.md) | Qualidade | T00-04 | tomada |
| ✅ [T00-06 · Testes: Vitest e Playwright com axe](00-codebase/T00-06-testes-vitest-playwright.md) | Qualidade | T00-05 | tomada |
| ✅ [T00-07 · App desktop com Tauri 2](00-codebase/T00-07-tauri.md) | Desktop | T00-03 | tomada |
| ✅ [T00-08 · Supabase local em Docker](00-codebase/T00-08-supabase-local.md) | Back end | T00-01 | tomada |
| ✅ [T00-09 · Flyway em Docker e migração base](00-codebase/T00-09-flyway-docker.md) | Back end | T00-08 | — |
| ✅ [T00-10 · Makefile, scripts e `.env.example`](00-codebase/T00-10-makefile-env.md) | Ferramentas | T00-06, T00-07, T00-09 | — |
| ✅ [T00-11 · Cliente Supabase e variáveis de ambiente no app](00-codebase/T00-11-cliente-supabase-env.md) | App · Dados | T00-08, T00-10 | — |
| ✅ [T00-12 · Integração contínua](00-codebase/T00-12-ci.md) | Qualidade | T00-10 | tomada |
| ✅ [T00-13 · Documentar a base de código](00-codebase/T00-13-documentacao-base.md) | Documentação | T00-01 a T00-12 | — |

## Etapa 1 · Domínio

Regras da seção 3 em `packages/core`, TypeScript puro e testado. Não depende do banco nem da interface.

| Tarefa | Contexto | Depende de | Decisões |
| --- | --- | --- | --- |
| ✅ [T01-01 · Modelo de dados](01-dominio/T01-01-modelo-de-dados.md) | Modelo | — | tomada |
| ✅ [T01-02 · Dinheiro: centavos, Decimal e rateios](01-dominio/T01-02-dinheiro.md) | Fundamentos | T00-02 | — |
| ✅ [T01-03 · Datas civis e competências](01-dominio/T01-03-datas-competencias.md) | Fundamentos | T00-02 | — |
| ✅ [T01-04 · Períodos, granularidade e período anterior](01-dominio/T01-04-periodos.md) | Fundamentos | T01-03 | tomada |
| ✅ [T01-05 · Tipos e schemas Zod das entidades](01-dominio/T01-05-tipos-schemas.md) | Modelo | T01-01, T01-02, T01-03 | — |
| ✅ [T01-06 · Saldo de conta e extrato mensal](01-dominio/T01-06-saldo-extrato.md) | Contas | T01-05 | — |
| ✅ [T01-07 · Ciclo do cartão e atribuição de compra à fatura](01-dominio/T01-07-ciclo-cartao.md) | Cartões | T01-05 | — |
| ✅ [T01-08 · Compras parceladas: geração, invariantes e operações](01-dominio/T01-08-compras-parceladas.md) | Cartões | T01-02, T01-07 | — |
| ✅ [T01-09 · Saldo da fatura, status, pagamentos e transporte](01-dominio/T01-09-fatura-pagamentos.md) | Cartões | T01-08 | tomada |
| ✅ [T01-10 · Indicadores do cartão e cartão já em uso](01-dominio/T01-10-indicadores-cartao.md) | Cartões | T01-09 | — |
| ✅ [T01-11 · Dívidas: tabelas Price, SAC e taxa zero](01-dominio/T01-11-dividas-tabelas.md) | Dívidas | T01-02, T01-03 | — |
| ✅ [T01-12 · Dívidas: parcela informada, amortização e saldo devedor](01-dominio/T01-12-dividas-operacoes.md) | Dívidas | T01-11 | — |
| ✅ [T01-13 · Recorrências: versões, previsão, status e pendentes](01-dominio/T01-13-recorrencias.md) | Recorrências | T01-05, T01-07 | — |
| ✅ [T01-14 · Reconhecimento de receitas e despesas](01-dominio/T01-14-reconhecimento.md) | Motor | T01-06, T01-10, T01-12, T01-13 | — |
| ✅ [T01-15 · Derivação única dos fatos](01-dominio/T01-15-derivacao-unica.md) | Motor | T01-06, T01-10, T01-12, T01-13 | — |
| ✅ [T01-16 · Projeção: `projetarFluxo`, simulador e quitação](01-dominio/T01-16-projetar-fluxo.md) | Motor | T01-15 | — |
| ✅ [T01-17 · Indicadores canônicos](01-dominio/T01-17-indicadores-canonicos.md) | Motor | T01-14, T01-16 | — |
| ✅ [T01-18 · Efeitos na Barra de Totais e desempenho](01-dominio/T01-18-efeitos-barra-desempenho.md) | Motor | T01-17 | — |
| ✅ [T01-19 · Gerador de dados de exemplo](01-dominio/T01-19-seed-dados-exemplo.md) | Seed | T01-17 | — |
| ✅ [T01-20 · Backup: envelope, validação e relatório](01-dominio/T01-20-backup-validacao.md) | Backup | T01-05 | — |
| ✅ [T01-21 · Pendências e badges do menu](01-dominio/T01-21-pendencias-badges.md) | Motor | T01-15 | — |
| ✅ [T01-22 · Comandos: mudanças e inversas](01-dominio/T01-22-comandos-mudancas.md) | Comandos | T01-08, T01-09, T01-12, T01-13 | — |

## Etapa 2 · Banco

Tabelas, RLS, função de gravação e leitura no Supabase, por migrações Flyway, com testes no banco local.

| Tarefa | Contexto | Depende de | Decisões |
| --- | --- | --- | --- |
| ✅ [T02-01 · Base para testes de banco](02-banco/T02-01-testes-de-banco.md) | Testes | T00-09, T00-11 | — |
| ✅ [T02-02 · Função `gravar(ops)` e convenções de escrita](02-banco/T02-02-funcao-gravar.md) | Escrita | T02-01, T01-01 | tomada |
| ✅ [T02-03 · Tabelas de cadastros: categorias, contas e preferências](02-banco/T02-03-tabelas-cadastros.md) | Cadastros | T02-02, T01-01 | — |
| ✅ [T02-04 · Tabela de lançamentos](02-banco/T02-04-tabela-lancamentos.md) | Lançamentos | T02-03 | — |
| ✅ [T02-05 · Tabelas de cartões, compras e faturas](02-banco/T02-05-tabelas-cartoes.md) | Cartões | T02-04 | — |
| ✅ [T02-06 · Tabelas de dívidas](02-banco/T02-06-tabelas-dividas.md) | Dívidas | T02-04 | — |
| ✅ [T02-07 · Tabelas de recorrências](02-banco/T02-07-tabelas-recorrencias.md) | Recorrências | T02-05 | — |
| ✅ [T02-08 · Inicialização de um usuário novo](02-banco/T02-08-inicializacao-usuario.md) | Cadastros | T02-03 | tomada |
| ✅ [T02-09 · Leitura: carregar todos os fatos do usuário](02-banco/T02-09-carregar-tudo.md) | Leitura | T02-06, T02-07 | tomada |
| ✅ [T02-10 · Operações em massa: apagar tudo, importar e dados de exemplo](02-banco/T02-10-operacoes-em-massa.md) | Backup | T02-09, T01-19, T01-20 | — |
| ✅ [T02-11 · Testes de segurança e regras do banco](02-banco/T02-11-testes-seguranca.md) | Segurança | T02-10 | — |

## Etapa 3 · Dados no app

Sessão, leitura, mutações com Desfazer, conexão, confirmação automática e integrações com o desktop.

| Tarefa | Contexto | Depende de | Decisões |
| --- | --- | --- | --- |
| ✅ [T03-01 · Sessão, rotas protegidas e saída](03-dados-app/T03-01-sessao-rotas-protegidas.md) | Acesso | T00-11, T02-08 | — |
| ✅ [T03-02 · Mapeamento banco ↔ domínio e `carregarTudo`](03-dados-app/T03-02-mapeamento-carregar.md) | Leitura | T02-09, T01-05 | tomada |
| ✅ [T03-03 · Consultas, "hoje" e Motor no app](03-dados-app/T03-03-consultas-motor.md) | Leitura | T03-02, T01-17 | — |
| ✅ [T03-04 · Mutações, "Salvando…" e Desfazer](03-dados-app/T03-04-mutacoes-desfazer.md) | Escrita | T03-03, T01-22, T02-02 | — |
| ✅ [T03-05 · Sem conexão](03-dados-app/T03-05-sem-conexao.md) | Conexão | T03-04 | — |
| ✅ [T03-06 · Confirmação automática de recorrências](03-dados-app/T03-06-confirmacao-automatica.md) | Recorrências | T03-04, T01-13, T02-07 | — |
| ✅ [T03-07 · Salvar e abrir arquivos (navegador e Tauri)](03-dados-app/T03-07-arquivos-plataforma.md) | Plataforma | T00-07 | — |
| ✅ [T03-08 · Deep link e redefinição de senha](03-dados-app/T03-08-deep-link-senha.md) | Acesso · Plataforma | T03-01, T03-07 | — |

## Etapa 4 · Tema e casca

Tokens, temas, componentes base e a estrutura comum das telas.

| Tarefa | Contexto | Depende de | Decisões |
| --- | --- | --- | --- |
| ✅ [T04-01 · Tokens do tema claro](04-tema-casca/T04-01-tokens-tema-claro.md) | Tema | T00-04 | — |
| ✅ [T04-02 · Tema escuro e seletor de tema](04-tema-casca/T04-02-tema-escuro.md) | Tema | T04-01 | tomada |
| ✅ [T04-03 · Componentes base do shadcn ajustados ao design](04-tema-casca/T04-03-componentes-shadcn-base.md) | Design system | T04-01 | — |
| [T04-04 · `MoneyText`, `StatusChip`, formatação e mensagens](04-tema-casca/T04-04-moneytext-statuschip-mensagens.md) | Componentes do app | T04-03 | — |
| [T04-05 · `AppShell` e navegação](04-tema-casca/T04-05-appshell-navegacao.md) | Casca | T04-04, T03-01, T01-21 | — |
| [T04-06 · Barra de Totais (`TotalsBar`)](04-tema-casca/T04-06-totalsbar.md) | Casca | T04-05, T03-04 | tomada |
| [T04-07 · Cabeçalho de contexto, seletores de mês e período, estados](04-tema-casca/T04-07-cabecalho-seletores-estados.md) | Componentes do app | T04-05, T01-04 | — |
| [T04-08 · `ChartCard` e base dos gráficos](04-tema-casca/T04-08-chartcard-graficos.md) | Gráficos | T04-07, T03-07 | — |
| [T04-09 · Atalhos de teclado e busca global](04-tema-casca/T04-09-atalhos-busca-global.md) | Casca | T04-05 | tomada |

## Etapa 5 · Telas

Uma tela ou diálogo por tarefa, na ordem do handoff.

| Tarefa | Contexto | Depende de | Decisões |
| --- | --- | --- | --- |
| [T05-01 · Login](05-telas/T05-01-login.md) | Acesso | T03-01, T04-03 | — |
| [T05-02 · Formulário de lançamento: base, despesa e receita](05-telas/T05-02-lancar-dialog-base.md) | Lançar | T04-06, T03-04 | — |
| [T05-03 · Formulário de lançamento: compra no cartão, transferência e pagamento de fatura](05-telas/T05-03-lancar-demais-tipos.md) | Lançar | T05-02 | — |
| [T05-04 · Formulário de lançamento: campos inteligentes e "Mais opções"](05-telas/T05-04-lancar-campos-inteligentes.md) | Lançar | T05-02 | — |
| [T05-05 · Formulário de lançamento em tela cheia no celular](05-telas/T05-05-lancar-celular.md) | Lançar | T05-04 | — |
| [T05-06 · Lançamentos: visão "Receitas e despesas"](05-telas/T05-06-lancamentos-receitas-despesas.md) | Lançamentos | T04-07, T01-14 | — |
| [T05-07 · Lançamentos: "Movimentações", filtros e ações por item](05-telas/T05-07-lancamentos-movimentacoes-filtros.md) | Lançamentos | T05-06, T05-04 | — |
| [T05-08 · Contas: lista, formulário e menu](05-telas/T05-08-contas-lista-formulario.md) | Contas | T04-07, T01-22 | — |
| [T05-09 · Extrato mensal da conta](05-telas/T05-09-conta-extrato.md) | Contas | T05-08, T01-06, T03-07 | — |
| [T05-10 · Diálogos Transferir e Ajustar saldo](05-telas/T05-10-transferir-ajustar-saldo.md) | Contas | T05-09, T05-03 | — |
| [T05-11 · Cartões: lista, formulário e menu](05-telas/T05-11-cartoes-lista-formulario.md) | Cartões | T05-08, T01-10 | — |
| [T05-12 · Fatura do cartão](05-telas/T05-12-cartao-fatura.md) | Cartões | T05-11, T01-09 | tomada |
| [T05-13 · Nova compra (à vista ou parcelada)](05-telas/T05-13-nova-compra.md) | Cartões | T05-12, T01-08 | — |
| [T05-14 · Menu de uma compra](05-telas/T05-14-menu-da-compra.md) | Cartões | T05-13 | — |
| [T05-15 · Pagar fatura, encargo ou estorno, configurar ciclo](05-telas/T05-15-pagar-encargo-ciclo.md) | Cartões | T05-12 | — |
| [T05-16 · Painel › Visão geral: pendências e KPIs](05-telas/T05-16-painel-pendencias-kpis.md) | Painel | T04-07, T01-17, T01-21 | — |
| [T05-17 · Painel › Visão geral: gráficos e maiores despesas](05-telas/T05-17-painel-graficos-visao-geral.md) | Painel | T05-16, T04-08, T05-06 | — |
| [T05-18 · Painel › Saldos](05-telas/T05-18-painel-saldos.md) | Painel | T05-16, T04-08 | tomada |
| [T05-19 · Painel › Cartões](05-telas/T05-19-painel-cartoes.md) | Painel | T05-16, T01-10 | — |
| [T05-20 · Painel › Projeções](05-telas/T05-20-painel-projecoes.md) | Painel | T05-16, T01-16 | tomada |
| [T05-21 · Projeções: simulador "E se?" e previsão de quitação](05-telas/T05-21-projecoes-simulador-quitacao.md) | Painel | T05-20 | — |
| [T05-22 · Dívidas: lista e detalhe](05-telas/T05-22-dividas-lista-detalhe.md) | Dívidas | T04-08, T01-12 | — |
| [T05-23 · Cadastro de dívida em 5 etapas](05-telas/T05-23-divida-cadastro-stepper.md) | Dívidas | T05-22, T01-11, T01-12 | — |
| [T05-24 · Registrar pagamento e amortizar dívida](05-telas/T05-24-divida-pagamento-amortizar.md) | Dívidas | T05-22 | — |
| [T05-25 · Rendas fixas](05-telas/T05-25-rendas-fixas.md) | Recorrências | T04-08, T01-13, T03-06 | — |
| [T05-26 · Gastos fixos](05-telas/T05-26-gastos-fixos.md) | Recorrências | T05-25 | — |
| [T05-27 · Configurações › Categorias](05-telas/T05-27-configuracoes-categorias.md) | Configurações | T04-07, T02-08 | tomada |
| [T05-28 · Configurações › Aparência, Preferências e Acesso](05-telas/T05-28-configuracoes-aparencia-preferencias-acesso.md) | Configurações | T05-27, T04-02, T03-01 | — |
| [T05-29 · Configurações › Dados: backup, exemplo e apagar tudo](05-telas/T05-29-configuracoes-dados.md) | Configurações | T05-28, T02-10, T01-19, T01-20, T03-07 | tomada |
| [T05-30 · Criar conta](05-telas/T05-30-criar-conta.md) | Acesso | T05-01, T03-08, T02-08 | — |

## Etapa 6 · Qualidade e entrega

Responsivo, acessibilidade, desempenho, produção, privacidade e aceite final.

| Tarefa | Contexto | Depende de | Decisões |
| --- | --- | --- | --- |
| [T06-01 · Layouts compact e medium](06-qualidade-entrega/T06-01-compact-medium.md) | Responsivo | Etapa 5 | — |
| [T06-02 · Acessibilidade WCAG 2.2 AA](06-qualidade-entrega/T06-02-acessibilidade.md) | Acessibilidade | T06-01 | — |
| [T06-03 · Desempenho com volume real](06-qualidade-entrega/T06-03-desempenho.md) | Desempenho | Etapa 5 | — |
| [T06-04 · App desktop pronto para distribuir](06-qualidade-entrega/T06-04-desktop-distribuicao.md) | Desktop | T06-02, T06-05 | tomada |
| [T06-05 · Ambiente de produção](06-qualidade-entrega/T06-05-producao.md) | Produção | T02-11 | tomada |
| [T06-06 · Privacidade e LGPD](06-qualidade-entrega/T06-06-privacidade-lgpd.md) | Privacidade | T06-05 | tomada |
| [T06-07 · Aceite final do MVP](06-qualidade-entrega/T06-07-aceite-final.md) | Aceite | T06-01 a T06-06 | — |
