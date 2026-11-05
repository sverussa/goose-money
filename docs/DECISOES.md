# Decisões

Decisões tomadas fora do texto original do `PROMPT.md`, em casos não cobertos ou em divergências. Cada uma indica as seções afetadas. As decisões da revisão da especificação estão em `DECISOES-REVISAO.md`.

## Revisão da stack e da arquitetura (05/11/2026)

### Decididas pelo Saulo

| # | Decisão | Motivo | Seções |
| --- | --- | --- | --- |
| D1 | **Tauri 2 desde a fundação.** O mesmo código gera o app web e o app desktop; o projeto Tauri (`src-tauri/`) nasce na etapa de fundação, não no fim. Exige toolchain Rust. | Desktop é alvo de primeira classe | 2 |
| D2 | **Login com Supabase Auth** (e-mail e senha), no lugar da trava local `admin`/`admin`. Revista por D18: o Supabase também guarda os dados. | Autenticação real em vez de trava local | 1.3, 2, 6.1, 6.9, 11.1 |
| D3 | **Parcelas de dívida gravadas**, como as do cartão. Contratação, amortização extraordinária e antecipação regeneram as parcelas não pagas em uma única transação. | Facilita antecipar parcelas no futuro | 3.7, 6.6 |
| D17 | **shadcn/ui no lugar do MUI** (não junto). Detalhes abaixo. | Biblioteca escolhida; dois sistemas de estilo no mesmo app seriam inconsistentes e pesados | 2, 4.3, 5.1, 8 |
| D18 | **Supabase como back end, online-first, sem modo offline.** O Postgres do Supabase é a fonte da verdade dos dados financeiros. Detalhes abaixo. | Banco Postgres e mesmos dados em vários aparelhos | 2, 6.1, 7.1, 9 |
| D19 | **Monorepo com pnpm workspaces**, separando core, app e back end. Detalhes abaixo. | Separar as camadas de front e back end no código | 2.1, 2.3 |
| D20 | **Adaptações a partir do `docs/StackShowCase.md`.** Detalhes abaixo. | Aproveitar a stack de referência onde ela atende à spec | 2, 6.1, 8.3, 9, 11.1 |
| D22 | **Exclusão lógica e colunas de controle.** Nenhum registro é apagado: excluir grava `is_deleted = true`. Toda tabela tem `created_at`, `updated_at` e `created_by`. Regras em `PROMPT.md` 9.4. | Preservar histórico e permitir desfazer qualquer exclusão; saber quando e por quem cada registro foi criado | 3.6, 6.4, 6.5, 6.9, 9, 11.8 |
| D23 | **Migrações com Flyway em Docker; Supabase local em Docker.** Todo comando de banco (tabelas, índices, RLS, funções, triggers) é uma migração Flyway. O Supabase de desenvolvimento roda localmente pelo Supabase CLI, em Docker. Regras em `PROMPT.md` 12.1 e 12.2. | Migrações versionadas, validadas por checksum e aplicadas igual em todos os ambientes | 2, 12 |
| D24 | **Makefile** como ponto de entrada dos comandos do projeto (`make help`). Alvos em `PROMPT.md` 12.3. | Um comando curto e documentado para cada tarefa | 12 |
| D26 | **Node.js 26** (`.nvmrc` e `engines`). | Versão instalada na máquina de desenvolvimento | 2 |
| D27 | **Identificador do app desktop `app.goosemoney`.** Não muda depois de publicado. | Não depende de registrar domínio | 2 |
| D28 | **Cadastro aberto com confirmação por e-mail.** Tela "Criar conta" (ainda sem desenho, T05-30); o link de confirmação volta ao app como o de redefinição de senha (deep link no Tauri); senha com no mínimo 8 caracteres. Resolve o item "Cadastro de usuários" que estava em aberto. | Permitir que outras pessoas usem o app sem criar contas à mão | 6.1, 11.1 |
| D29 | **CI só com checagens sem banco** por enquanto (formatação, lint, tipos, testes). Testes de banco e Playwright entram no CI na etapa 5. | CI rápido enquanto não há telas | 12.3 |
| D30 | **Prettier ignora `docs/` e `design/`.** | Evita reformatar as tabelas escritas à mão | 2 |
| D31 | **Cobertura mínima de 90%** de linhas e de ramos em `packages/core`, com falha abaixo disso. | Cálculos de dinheiro testados sem exigir testes artificiais | 11 |
| D32 | **Transferência é um lançamento só**, do tipo `transferencia`, com conta de origem e de destino. | Nunca fica "meia transferência" | 3.4, 7 |
| D33 | **Fatura sem tabela.** Derivada pelo par (cartão, competência) e pelo ciclo vigente; itens e alocações de pagamento referenciam esse par. | Nada para manter sincronizado | 3.5 |
| D34 | **Sem tags no MVP**, só observação em texto livre. | A spec não define filtro nem relatório por tag | 4.1 |
| D35 | **Subcategoria é uma `Categoria` com `categoriaPaiId`**, um nível só. Os gráficos agrupam pela categoria pai. | Uma tabela só para categorias | 6.9 |
| D36 | **Regras das gravações no core.** Cada ação vira uma lista de mudanças (T01-22) gravada pela função única `gravar(ops)` numa transação; o banco garante dono do registro e restrições simples. Revê o item "Gravações compostas" dos detalhes de D18. | Nenhuma regra duplicada em SQL | 2.1, 7.1 |
| D37 | **"Últimos N meses" incluem o mês corrente até hoje** (com hoje em 04/11, "Últimos 3 meses" = 01/09 a 04/11). O período anterior corta no mesmo dia (01/06 a 04/08). Diverge do design, que mostra os meses completos anteriores. | Mostrar os dados mais recentes | 8.2, 3.10 |
| D38 | **Transporte de saldo e crédito de pagamento da fatura derivados** no Motor, sem gravar nada. | Funciona com o app fechado e não fica inconsistente | 3.5 |
| D39 | **Inicialização do usuário chamada pelo app** depois do login e da confirmação do cadastro, com função idempotente. | Não mexe no schema `auth` do Supabase | 6.9, 12.2 |
| D40 | **Usuário novo recebe as 8 categorias da paleta do design**, além das de sistema. | Começar a lançar sem configurar nada | 6.9, 4.3 |
| D41 | **Leitura por uma função `carregar_tudo()`** que devolve um único JSON. Revê o item "Leitura" dos detalhes de D18. | Uma requisição, sem o limite de 1.000 linhas por página | 9.3 |
| D42 | **Dados do banco validados com Zod sempre**, também em produção. | Dado corrompido não chega ao Motor | 9 |
| D43 | **Tema escuro gerado em execução** com `@material/material-color-utilities` a partir da semente; o claro continua estático, vindo do design. | Permitir trocar a cor semente no futuro | 4.3, 6.9 |
| D44 | **Botão de ocultar valores no celular fica na top app bar**, como desenhado. | Não ocupa espaço na Barra compacta | 5.3 |
| D45 | **Busca global encontra telas, ações e lançamentos** por descrição. | Cobre o uso mais comum sem indexar tudo | 5.1 |
| D46 | **Gasto fixo previsto na fatura fica separado no fim**, tracejado e fora do saldo, como desenhado. | Não confunde o previsto com o que já está na fatura | 3.5, 3.8 |
| D47 | **Patrimônio negativo ganha a frase do design**, apontando a causa. | Explica o número em vez de só mostrá-lo | 6.2 |
| D48 | **Limite de alerta no gráfico de projeção como faixa colorida** entre zero e o limite, no lugar das duas linhas do design. | Escolha do Saulo | 6.2, 8 |
| D49 | **Excluir categoria em uso move os itens para "A classificar"**, com Desfazer. Excluir uma categoria pai exclui as subcategorias e move os itens delas também (caso não coberto, sinalizado). | Excluir não fica bloqueado e nada fica sem categoria | 6.9 |
| D50 | **Dados de exemplo só com a base vazia.** | Nunca misturar exemplo com dados reais | 6.9, 10 |
| D51 | **App desktop para macOS, Windows e Linux** pelo GitHub Actions (`tauri-action`), sem assinatura no início. | Alcance maior sem custo de certificados agora | 2 |
| D52 | **Supabase de produção em São Paulo** (`sa-east-1`). | Menor latência no Brasil e dados no país (LGPD) | 9.3 |
| D53 | **App web numa VPS privada**, servido por Caddy em Docker com HTTPS automático e cabeçalhos de segurança; deploy por `make deploy-web`. O Supabase continua gerenciado. | Escolha do Saulo | 12 |
| D54 | **Eliminação definitiva por script administrativo** (`make db-eliminar-usuario`), fora do app. | Atende ao pedido do titular (LGPD) sem dar ao app um caminho de apagar de verdade | 9.4 |
| D55 | **Sem criptografia ponta a ponta no MVP.** Proteção por login, RLS e criptografia em disco do provedor. | Mantém as restrições do banco e a recuperação de senha | 9.3 |
| D56 | **Desenvolvimento com agentes em paralelo** conforme `docs/tasks/tasks-agents-estrategies.md`: T01-01 sem dependência; T02-02 sem esperar T01-22 (os comandos do core produzem o formato de `gravar`); porta do app em `PORTA_APP` (1420 a 1424, uma por worktree); textos por funcionalidade; status do índice e decisões novas registrados só pelo coordenador. | Encurtar o caminho crítico de 32 para 26 ondas e evitar que um agente atrapalhe outro | 2, 12 |

Consequências de D2:

- O campo "Usuário" do design vira "E-mail".
- A chave pública (`anon`) e a URL do projeto ficam em `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), fora do Git. A chave `service_role` nunca entra no app.
- "Manter conectado" escolhe onde o `supabase-js` guarda a sessão: `localStorage` (marcado) ou `sessionStorage`.
- "Alterar senha" e "Esqueci a senha" passam a usar o Supabase.
- No Tauri, a CSP precisa liberar o domínio do projeto Supabase.

Invariantes de D3 (testados no domínio):

1. Soma das amortizações = valor contratado.
2. Saldo devedor após a última parcela = R$ 0,00.
3. Parcela paga nunca é regenerada; só as não pagas mudam.

Detalhes de D17:

- **Base:** shadcn (CLI 4) com primitivos Radix e Tailwind CSS 4. O código dos componentes fica no repositório, em `src/components/ui`, e é ajustado para seguir as telas de `design/telas/` (Material 3). O visual padrão do shadcn não vale onde o design disser outra coisa.
- **Tema:** os valores de `design/theme-tokens.ts` viram variáveis CSS no `@theme` do Tailwind (`src/app/tema.css`). Tema escuro pela classe `.dark`, gerado em execução da mesma semente (D43), com contraste AA verificado.
- **Gráficos:** Recharts 3, pelo componente `Chart` do shadcn, no lugar do MUI X Charts.
- **Snackbar** com Sonner; **ícones** com lucide-react, no lugar de Material Symbols (equivalências na tabela 5.1 do PROMPT).
- **Correspondência com o design:** menu lateral e rail com `Sidebar`; segmented buttons com `ToggleGroup`; filter chips com `Toggle`; formulário em tela cheia no compact com `Drawer`; busca Ctrl/Cmd+K com `Command`. Feitos à mão: FAB "+ Lançar" e navigation bar do celular.
- **Radix, não Base UI:** é o primitivo com mais componentes e exemplos no shadcn.

Detalhes de D18:

- **Dados por usuário:** toda tabela tem RLS ligado e política `created_by = auth.uid()` (D22: `created_by` é também o dono do registro e substitui o `user_id`). Sem política, nenhuma linha é visível.
- **Tipos no Postgres:** centavos em `bigint`, datas civis em `date`, ids em `uuid`.
- **Restrições no banco** onde forem simples: chaves estrangeiras, unicidade de (recorrência, competência) da 3.8 e `check` de valores. Elas valem além das validações do domínio.
- **Gravações compostas** (compra parcelada, confirmação de recorrência, pagamento, importação de backup) e o **Desfazer** passam pela função `gravar(ops)`, numa transação, com `security invoker` para respeitar o RLS (D36).
- **Leitura:** ao entrar, `carregarTudo` busca todos os fatos do usuário numa chamada da função `carregar_tudo()` (D41). O Motor roda no app sobre esses fatos, como antes.
- **Vários aparelhos:** o app recarrega os fatos quando a janela volta ao foco e quando a conexão volta (`refetchOnWindowFocus` e `refetchOnReconnect` do TanStack Query, D20). Atualização em tempo real (Supabase Realtime) fica para depois.
- **Sem conexão:** banner "Sem conexão" e gravações bloqueadas. Não há cópia local dos dados.
- **Sai da stack:** Dexie, fake-indexeddb, vite-plugin-pwa e `navigator.storage.persist()` (D16). Para instalar o app web basta um `manifest.webmanifest` estático.
- **Desenvolvimento e testes:** Supabase local em Docker; migrações Flyway em `supabase/flyway/sql` (D23); testes de RLS e das funções RPC contra o banco local.
- **Backup** (seção 9) continua, como portabilidade: exportar gera o arquivo no app e importar roda numa única função RPC.
- **Privacidade:** os dados ficam no servidor do Supabase, criptografados em disco pelo provedor e acessíveis só pelo dono via RLS. Saem do design os textos "Seus dados ficam só neste dispositivo" (Login) e "Dados neste dispositivo" (Nav).

Detalhes de D19:

```text
goose-money/
├── packages/core/   domínio e Motor (o antigo src/domain): TypeScript puro, sem React e sem rede
├── apps/app/        front: React, shadcn, store, src/data (supabase-js), src-tauri/
└── supabase/        back end: config do Supabase local e migrações Flyway (flyway/sql)
```

- `packages/core` depende só de `decimal.js` e `zod`. Nunca importa React nem `@supabase/supabase-js`. O `package.json` dele e o `node_modules` estrito do pnpm garantem isso: um pacote só enxerga as próprias dependências.
- Os caminhos `src/...` citados nas outras decisões ficam dentro de `apps/app/`.

Detalhes de D20:

- **Adotado:**
  - **pnpm 12** com workspaces. `minimumReleaseAge: 10080` (7 dias, em minutos) no `pnpm-workspace.yaml` aplica a D5 automaticamente; versões salvas sem `^`.
  - **TanStack Query no lugar do Zustand.** Os fatos do usuário são uma consulta; cada gravação é uma mutação que chama a função RPC, recebe as linhas alteradas e as aplica com `setQueryData`, sem recarregar tudo. O Motor roda sobre o resultado da consulta (`useMemo`).
  - **html-to-image** para exportar PNG do `ChartCard` inteiro, no lugar da conversão SVG própria: as cores do gráfico do shadcn vêm de variáveis CSS, que um SVG serializado sozinho perde.
  - **Plugins `dialog` e `fs` do Tauri** atrás de um adaptador `src/plataforma/arquivos.ts`, que salva pelo diálogo nativo no desktop e por download no navegador. Usado no backup, no CSV e no PNG.
  - **Plugin `deep-link` do Tauri** para o link de "Esqueci a senha" voltar ao app.
  - **Capabilities do Tauri** só com o necessário e **CSP** liberando apenas o domínio do projeto Supabase.
  - **`HashRouter`** e páginas com `React.lazy`. O Supabase Auth usa `flowType: 'pkce'` (retorno em `?code=`), porque o fluxo padrão devolve o token depois do `#` e conflita com o `HashRouter`.
  - **Playwright + `@axe-core/playwright`** para os testes de interface (critérios 11.1: 360, 768 e 1440 dp, contraste AA, número de interações), rodando no Chromium e no WebKit.
  - **Prettier**, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `@vitejs/plugin-react`, `@tailwindcss/vite`, alias `@/` e Vite na porta `1420` com `strictPort`.
  - **ThemeProvider** com claro, escuro e sistema.
  - `class-variance-authority`, `clsx` e `tailwind-merge`, que vêm com o shadcn.
- **Não adotado:** pastas atomic design (`atoms`, `molecules`, `organisms`, `templates`); TanStack Table (o `Table` do shadcn basta); jsPDF (sem PDF na spec); `@hookform/resolvers` (fica a D7); persistência em `localStorage`, login de demonstração e latência simulada; plugins `clipboard-manager`, `notification`, `os` e `opener` (sem requisito agora).
- **Preferências:** as do usuário (limite de alerta, horizonte da projeção, ocultar valores ao abrir) ficam no Supabase, para valerem em todos os aparelhos. Só o que é do aparelho (tema, estado do menu) fica em `localStorage`.
- **Sai da stack:** Zustand, Testing Library e jsdom. O core é testado com Vitest puro e a interface com Playwright.

### Recomendações aceitas

| # | Decisão | Motivo | Seções |
| --- | --- | --- | --- |
| D4 | **TypeScript 6.0.x**, não o 7. | O typescript-eslint 8.72 exige TypeScript < 6.1; com o 7, o lint com tipos para | 2 |
| D5 | **Versões fixas** (sem `^`) e só versões publicadas há pelo menos 7 dias. Referência em 05/11/2026: React 19, TypeScript 6.0, Vite 8, shadcn 4, Tailwind CSS 4, Radix 1, Recharts 3, lucide-react 1, React Router 8 (modo biblioteca), TanStack Query 5, React Hook Form 7, Zod 4, decimal.js 10, html-to-image 1, Tauri 2, supabase-js 2, Supabase CLI 2 (a 3.0 saiu em 02/11/2026; esperar amadurecer), Flyway 13 (imagem Docker com tag fixa), pnpm 12, Vitest 5, Playwright 1, ESLint 10, Prettier 3. Aplicada pelo `minimumReleaseAge` do pnpm (D20). | Reduz risco de cadeia de suprimentos e de versões quebradas | 2 |
| D6 | **Sem seletor de data de biblioteca e sem date-fns.** Datas civis como texto `AAAA-MM-DD`; o core tem um módulo `datas` próprio (somar meses, último dia do mês, dia 29–31, comparar), testado. Campo de data com `<input type="date">` nativo no `Input` do shadcn (não o `Calendar`, que puxa date-fns), mais os chips Hoje/Ontem. Formatação com `Intl.DateTimeFormat('pt-BR')`. | Duas dependências a menos; seletor nativo é acessível e usa o teclado do celular | 2, 7.3 |
| D7 | **Adaptador Zod → React Hook Form próprio** (~10 linhas), sem `@hookform/resolvers`. | O pacote lançou as versões 6 e 7 em duas semanas | 2 |
| D8 | **Roboto Flex instalada no app** (`@fontsource-variable/roboto-flex`), sem Google Fonts. | Não depende de terceiros para carregar a fonte | 4.3 |
| D9 | **Lista virtualizada só em Lançamentos** (`@tanstack/react-virtual`). As demais listas são mensais e pequenas. | Única lista que chega a milhares de itens | 9.3 |
| D10 | **Textos em arquivos de mensagens**, sem biblioteca de i18n: os comuns em `src/app/mensagens.ts` e os de cada tela em `src/features/<funcionalidade>/mensagens.ts` (revista por D56). | Só existe pt-BR | 9.3 |
| D11 | **Exportar CSV** a partir dos dados do gráfico, com código próprio, e **PNG** com html-to-image (revista por D20). | O Recharts não exporta imagem nem CSV | 8.3 |
| D12 | **"Hoje" é parâmetro** de toda função do Motor (`(fatos, hoje)`). O core nunca lê o relógio. | Testes de 11.6 e seed relativo à data | 2.1, 3 |
| D13 | **Derivação única por mudança de fatos:** uma função calcula faturas e seus saldos, saldos por conta e cronogramas; os indicadores de 3.10 leem desse resultado. | Cumprir < 100 ms com 10 mil lançamentos sem recalcular o mesmo dado várias vezes | 2.1, 9.3 |
| D14 | **Grava primeiro, depois atualiza o cache** (não otimista). A gravação é uma mutação do TanStack Query que chama a função RPC e aplica as linhas devolvidas; o botão mostra "Salvando…" enquanto espera. Falha mostra snackbar de erro e nada muda. "Desfazer" é genérico: cada gravação guarda a imagem anterior dos registros alterados e uma função RPC a restaura numa transação. | Elimina o código de reversão. Se a latência incomodar, rever para otimista | 2.1, 7.1 |
| D15 | **Módulo `src/data` com funções do domínio** (`carregarTudo`, `gravar(ops)`) sobre o `supabase-js`, sem `interface Repository<T>` genérica, usadas pelas consultas e mutações do TanStack Query. A UI nunca chama o Supabase diretamente. | Interface com uma só implementação | 2.1 |
| D16 | Cancelada por D18 (era `navigator.storage.persist()`, só fazia sentido com dados locais). | — | — |

## Casos não cobertos

### D21 · Cadastro de contas e cartões (05/11/2026)

A spec já previa várias contas e vários cartões, mas não definia o formulário de cartão nem as regras de editar, arquivar e excluir. Regras completadas em `PROMPT.md` 3.3, 3.5, 6.4, 6.5, 11.2 e 11.3. **Precisam da sua validação.**

| Ponto | Decisão | Por quê |
| --- | --- | --- |
| Tipo de conta | Novo tipo "Outra" (conta salário, conta de pagamento…). O tipo só muda ícone e rótulo | Não limitar o usuário; nenhum cálculo depende do tipo |
| Conta de investimento | "Incluir no total" vem desmarcado por padrão | Conservador: mostra menos dinheiro disponível |
| Saldo inicial negativo | Permitido | Cheque especial existe |
| Arquivar conta | Só com saldo atual zero e sem vínculo ativo (cartão, recorrência, dívida) | Arquivar com saldo mudaria o **Patrimônio líquido** sem nenhum movimento; com saldo negativo, aumentaria o dinheiro mostrado |
| Arquivar cartão | Só com **Obrigações do cartão** zero e sem recorrência ativa no cartão | Esconder um cartão com dívida mostraria menos obrigações do que existem |
| Excluir conta ou cartão | Só sem nenhum movimento; senão, "Arquivar" | Excluir apagaria histórico e mudaria receitas, despesas e saldos passados |
| Dias do ciclo na edição | Só por "Configurar ciclo" | Mantém o versionamento de 3.5 |
| Cartão já em uso | A primeira fatura controlada é a aberta no cadastro. Parcelas anteriores ficam "Paga antes do cadastro", como nas dívidas (3.7). Fatura fechada a pagar entra como item "Saldo anterior ao cadastro", sem ser despesa | Evita reconhecer despesas antigas de novo e não deixa de mostrar o que ainda está a pagar |
| Sem cartão cadastrado | Escolher "Compra no cartão" no lançamento leva ao cadastro de cartão | Mesmo padrão do primeiro uso sem contas (7.2) |

### D25 · Detalhes de D22 que precisam da sua validação (05/11/2026)

| Ponto | Decisão | Por quê |
| --- | --- | --- |
| Dono do registro | `created_by` também é o dono usado pelo RLS; não existe `user_id` separado | Os dois teriam sempre o mesmo valor; uma coluna a menos para ficar inconsistente |
| Nomes das colunas | No banco, `snake_case` (`is_deleted`, `created_at`, `updated_at`, `created_by`); no domínio, `isDeleted`, `createdAt`, `updatedAt`, `createdBy`. O mapeamento fica em `src/data` | Convenção do Postgres (camelCase exigiria aspas em todo SQL) |
| Quem excluiu e quando | Sem `deleted_at` nem `deleted_by`: o `updated_at` marca o momento da exclusão | Não foi pedido; adicionar se precisar de auditoria |
| `DELETE` no banco | Revogado para os papéis do app (`authenticated`, `anon`) | O banco garante a regra, não só o código |
| RLS e excluídos | As políticas filtram só o dono, não `is_deleted`; quem filtra os excluídos é `carregarTudo` e as funções RPC | Se a política escondesse excluídos, o Desfazer não conseguiria restaurá-los |

### D57 · Funções novas sem `execute` para PUBLIC (05/11/2026)

Caso encontrado em T00-09. O `revoke execute on functions from anon` por schema, pedido em 12.2, não basta: o Postgres dá `execute` a `PUBLIC` em toda função nova, por um padrão global, e o `anon` herda esse direito. A V001 também tem `alter default privileges revoke execute on functions from public;`. O `authenticated` e o `service_role` continuam com `execute` pelo padrão do Supabase no schema `public`. Opção mais conservadora, testada no banco local. **Precisa da sua validação.**

### D58 · Regra dos 7 dias nos crates Rust (05/11/2026)

Caso encontrado em T00-07. O pnpm aplica a D5 sozinho (`minimumReleaseAge`), o Cargo não. Os crates diretos (`tauri`, `tauri-build`) ficam fixos com `=`, o `Cargo.lock` é versionado, e as datas dos crates do lock são conferidas no crates.io sempre que ele muda. Na T00-07, 20 crates indiretos com menos de 7 dias voltaram para a versão anterior com `cargo update --precise`. Sem ferramenta extra (como `cargo-deny`) por enquanto. **Precisa da sua validação.**

## Em aberto

- **Provedor da VPS e domínio do app web** (D53).
