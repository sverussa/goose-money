# Handoff de design → implementação

Este documento liga as telas desenhadas (`design/telas/`) à especificação (`docs/PROMPT.md`). Ele é a ponte para quem implementa: o que cada tela é, qual rota vira, quais componentes usa e o que ainda falta desenhar.

## 1. Precedência (leia primeiro)

1. **`docs/PROMPT.md`, seção 3**: estados, datas, cálculos e indicadores. Vence qualquer conflito.
2. **Demais seções do `PROMPT.md`**: comportamento das telas, fluxo de lançamento, gráficos, persistência, critérios de aceite.
3. **`design/telas/*.dc.html`**: layout, hierarquia, textos da interface, componentes e estados visuais.
4. **Este documento**: mapeamento e lacunas.

Se o design contradizer o `PROMPT.md`, siga o `PROMPT.md` e registre a divergência em `docs/DECISOES.md`.

### Nome do produto

O `PROMPT.md` e as telas usam o nome provisório **"Meu Caixa"**. O produto se chama **Goose Money**: use esse nome em todo texto da interface, título da janela, manifest do app web e login.

## 2. Como ler os arquivos `.dc.html`

Os arquivos vêm do canvas de design e usam um formato próprio. **São referência visual, não código para copiar.** Reconstrua tudo em React + shadcn/ui (Tailwind).

| No arquivo | Significado | O que fazer |
| --- | --- | --- |
| `<x-dc>…</x-dc>` | Raiz do desenho | Ignorar o wrapper |
| `<helmet>` | Fonte e estilos base | Fonte vai para o tema (Roboto Flex instalada no app, D8) |
| `<dc-import name="Nav">`, `<dc-import name="TotalsBar">` | Componente compartilhado em outro arquivo (`Nav.dc.html`, `TotalsBar.dc.html`) | Virar componente React único |
| `<sc-for list="{{x}}">` | Repetição sobre dados de `renderVals()` | `.map()` sobre dados das consultas |
| `<sc-if value="{{x}}">` | Bloco condicional | Renderização condicional |
| `{{campo}}` | Valor vindo de `renderVals()` | Vem do Motor, nunca fixo |
| `<script type="text/x-dc">` com `class Component extends DCLogic` | Dados simulados e pequenas interações (abas, seleção) | Ler só para entender estados e interações |
| `style="…"` inline | Medidas e cores de referência | Converter em variáveis do tema e classes do Tailwind |
| `<script src="./support.js">` | Runtime do canvas | Ignorar |

**Os valores em R$ são ilustrativos.** Eles simulam o seed da seção 10 com "hoje" = 04/11/2026, mas não podem ser fixados no código: todo número sai do Motor sobre os dados do repositório.

Para ver as telas renderizadas, abra o canvas original no claude.ai ou exporte PNGs dele para `design/png/`.

## 3. Mapa de telas

| Arquivo | Rota | Seções do PROMPT | Componentes principais | Interações desenhadas |
| --- | --- | --- | --- | --- |
| `Login.dc.html` | `/login` | 6.1 | Card centralizado (máx. 400 dp), `Input` e `Label` do shadcn, mostrar senha, checkbox "Manter conectado". Campo "Usuário" vira "E-mail" (Supabase Auth, D2 em `DECISOES.md`); remover "Seus dados ficam só neste dispositivo" (D18) | Erro inline, mostrar/ocultar senha |
| `Main.dc.html` | `/` (aba Visão geral) | 6.2, 8.1, 8.2 | `PendenciasCard`, `PeriodPicker`, 4 cards de KPI com `Variação`, 4 `ChartCard`, lista "Maiores despesas" | Chips de período; estado "Novo" e "—" na variação |
| `PainelSaldos.dc.html` | `/?aba=saldos` | 6.2, 8.1 | Destaque do Patrimônio líquido com decomposição, cards de conta com sparkline e "Fora do total", barras horizontais, linhas de evolução | — |
| `PainelCartoes.dc.html` | `/?aba=cartoes` | 6.2, 3.5, 8.1 | Card por cartão (face do cartão + fatura aberta, próxima, limite, obrigações), tabela de parceladas ativas com rodapé, barras empilhadas de 12 meses | — |
| `PainelProjecoes.dc.html` | `/projecoes` e `/?aba=projecoes` | 6.2, 3.9 | Segmented de horizonte, banner, gráfico com referência no zero e linha de alerta, tabela mês a mês com os grupos de 3.9, detalhamento por grupo, simulador "E se?", previsão de quitação | Clique no mês troca o detalhamento |
| `Lancamentos.dc.html` | `/lancamentos` | 6.3 | Segmented das duas visões, cabeçalho de contexto fixo, busca, filter chips, lista agrupada por dia com total | Troca de visão muda cabeçalho e lista |
| `LancarDialog.dc.html` | Dialog global (FAB ou tecla N) | 7.1–7.3 | Chips de tipo, campo de valor com máscara e foco inicial, autocomplete, grade de categorias, chips Hoje/Ontem, conta ou cartão, "Mais opções", snackbar "Desfazer" | Chips de tipo trocam os campos; tweak mostra o snackbar |
| `NovaCompra.dc.html` | Dialog na tela do cartão | 6.5, 3.6 | Alternância valor total/parcela, toggle Parcelado, seletor de nº de parcelas, prévia de faturas, painel "O que muda ao salvar" | — |
| `ContaExtrato.dc.html` | `/contas/:id` | 6.4, 3.4 | Chips de conta (vindos das contas ativas), cabeçalho fixo (abertura, entradas, saídas, fechamento, atual), tabela com saldo corrente | — |
| `CartaoFatura.dc.html` | `/cartoes/:id` | 6.5, 3.5, 3.6 | Seletor de cartão (não desenhado), tabs roláveis por fatura, cabeçalho da fatura, lista de itens, item previsto separado, menu de operações da compra, painel "Pagar fatura" | Tabs trocam a fatura; menu com itens desabilitados e motivo |
| `DividaDetalhe.dc.html` | `/dividas` e `/dividas/:id` | 6.6, 3.7 | Cards das dívidas com progresso, resumo do contrato, gráficos de saldo devedor e juros × amortização, tabela de amortização com status | — |
| `Rendas.dc.html` | `/rendas` | 6.7, 3.8 | Cabeçalho (previsto, recebido, a receber, atrasado), lista de fontes, formulário de edição com "Aplicar a partir de" e histórico de versões, rosca da composição | — |
| `GastosFixos.dc.html` | `/gastos-fixos` | 6.8, 3.8 | Cabeçalho com Comprometimento da renda, lista por dia com status e ação ("Pagar" ou "Confirmar no cartão") | — |
| `Configuracoes.dc.html` | `/configuracoes` | 6.9, 9 | Categorias com cadeado nas de sistema, tema, preferências, acesso, dados com relatório de importação e "Apagar tudo" | — |
| `MobilePainel.dc.html` | `/` em compact (< 600 dp) | 4.2, 5.1, 5.3 | Barra de Totais compacta (2 fixos + expandir), indicador temporário, navigation bar com 5 itens e badges, FAB acima da barra | Expandir/recolher a Barra; tweak simula o indicador temporário |
| `MobileLancar.dc.html` | Full-screen dialog em compact | 7.1–7.3 | Mesmos campos do dialog desktop em tela cheia | — |
| `Nav.dc.html` | — (componente) | 5.1 | Navigation drawer com os 9 itens, badges, rodapé com usuário e Sair (sem "Dados neste dispositivo", D18) | Prop `active` |
| `TotalsBar.dc.html` | — (componente) | 5.3 | 5 indicadores com tooltip e link, botão de olho (privacidade), chip de variação | Botão de olho oculta valores |

`design/canvas.json` guarda a disposição das pranchetas no canvas; não é necessário para implementar.

## 4. Componentes compartilhados a criar

| Componente | Onde aparece | Observações |
| --- | --- | --- |
| `AppShell` | Todas as telas autenticadas | Drawer fixo (≥ 840 dp), rail (600–839 dp), navigation bar (< 600 dp). Top app bar + Barra fixa + cabeçalho de contexto + conteúdo + FAB (5.2) |
| `TotalsBar` | Todas as telas autenticadas | Sempre sobre hoje e o mês corrente; regras de visibilidade de 4.2; anima valor e chip de variação |
| `ContextHeader` | Lançamentos, Extrato, Fatura, Dívidas, Rendas, Gastos fixos | Fixo logo abaixo da Barra ao rolar |
| `PeriodPicker` | Visão geral, Saldos, Lançamentos | Filter chips + setas; período na URL (8.2) |
| `MonthSelector` | Telas mensais | `◀ Novembro 2026 ▶`; atalhos ← → |
| `ChartCard` | Todos os gráficos | Título com conclusão, subtítulo com período, menu "Ver itens" e "Exportar PNG/CSV", `aria-label` com resumo |
| `StatusChip` | Listas e cabeçalhos | Um único mapeamento estado → rótulo, cor e ícone (tabela 3.1 e status de fatura de 3.5) |
| `MoneyText` | Todo valor monetário | `Intl.NumberFormat` pt-BR, sinal "−" (nunca parênteses), cor income/expense/transfer, modo privacidade |
| `QuickAddFab` + `LancarDialog` | Global | Dialog no desktop, full-screen no compact; tipo padrão conforme a tela (7.2) |
| `PendenciasCard` | Topo da Visão geral | Ação direta por item e "Confirmar todos" |
| `EmptyState` | Listas e gráficos vazios | Ilustração simples, uma frase, um botão |

## 5. Tokens visuais

Os valores usados no design estão em `design/theme-tokens.ts`, prontos para virar as variáveis CSS do `@theme` do Tailwind (D17 em `DECISOES.md`). Resumo:

- **Cor semente** `#1B6B5A` (M3). Papéis de superfície em tons verdes neutros.
- **Semânticos**: income `#14713A`, expense `#B3261E`, transfer `#48617A`, forecast `#6B5778`, warning `#7A4F00` (cada um com o par container/on-container).
- **Paleta categórica de 8 cores**, fixa por categoria.
- **Cartões**: Cartão A `#24364D`, Cartão B `#6B2E4F` (cor do cartão é escolhida pelo usuário no cadastro).
- **Tipografia**: Roboto Flex, números com `tabular-nums`; indicadores da Barra ~22 px (Title Large), número principal de painel 28–36 px (Headline).
- **Formas**: raios 4 / 8 / 12 / 16 / 28; elevação tonal, sombra só no FAB e no snackbar.
- Contraste conferido para texto normal (≥ 4,5:1) no tema claro. **O tema escuro não foi desenhado**: gere-o a partir da mesma semente e verifique o contraste dos semânticos.

## 6. Decisões de design para validar e registrar em `docs/DECISOES.md`

1. **"Últimos 3 meses"** foi desenhado como os três meses completos anteriores (ago–out, com hoje em novembro), igual ao exemplo de URL de 8.2. O `PROMPT.md` não define se o mês corrente entra.
2. **Botão de privacidade no celular**: no compact, o olho fica na top app bar para não ocupar espaço na Barra.
3. **Linha de alerta no gráfico de Saldo projetado**: mostra o limite configurado (padrão R$ 500,00) além da referência no zero.
4. **Item previsto dentro da fatura** (gasto fixo no cartão ainda não confirmado) aparece separado, tracejado e fora do saldo da fatura.
5. **Patrimônio líquido negativo** ganha uma frase explicativa na aba Saldos.
6. **Parcela Price do exemplo**: R$ 40.000,00 a 1,49% a.m. em 48x dá parcela de R$ 1.172,49 (a última, R$ 1.172,71). O design já usa esses valores; os testes de 11.5 devem confirmar.

## 7. O que ainda não foi desenhado

Implemente seguindo o `PROMPT.md` e o vocabulário visual das telas existentes, ou peça o desenho antes:

- Estados **carregando, vazio e erro** de cada tela (4.1, 6).
- **Tema escuro** e layout **medium** com navigation rail (5.1).
- **Cadastro de dívida em stepper** de 5 etapas (6.6).
- **Listas de contas e de cartões** (`/contas`, `/cartoes`), com os botões "Nova conta" e "Novo cartão" e os arquivados recolhidos (6.4, 6.5). Hoje o menu leva direto ao extrato e à fatura.
- Formulários de **conta** e de **cartão**, com a prévia do cartão e o campo "Saldo da fatura fechada a pagar" (6.4, 6.5, D21), e o diálogo **Configurar ciclo**.
- Menus da conta e do cartão (Editar, Arquivar, Excluir) com itens desabilitados e motivo.
- **Seletor de cartão** em `CartaoFatura.dc.html`: o título "Cartão A" está fixo. Os chips de conta de `ContaExtrato.dc.html` também estão fixos nas 4 contas do seed e devem vir das contas ativas; falta a ação "Exportar CSV".
- Diálogos **Transferir**, **Ajustar saldo**, **Confirmar recebimento**, **Registrar pagamento**, **Amortizar**, **Lançar encargo ou estorno**.
- Menu **"Mais"** do celular (itens 5 a 9) e telas de módulo em compact.
- Busca global (Ctrl/Cmd + K) e menu do usuário.
- Fluxo completo de **importação de backup** (etapas e erros) e confirmação de **Apagar tudo**.
- Primeiro uso sem contas (7.2: o FAB leva ao cadastro de conta).

## 8. Ordem de implementação sugerida

O plano detalhado, com uma tarefa por arquivo, está em [`docs/tasks/README.md`](tasks/README.md). A lista abaixo é o resumo das etapas; uma branch `feat/<nome>` por tarefa, cada uma com testes passando:

1. **Fundação**: monorepo com pnpm workspaces e `minimumReleaseAge` (`packages/core`, `apps/app`, `supabase/`), Vite + React + TypeScript 6 strict, ESLint + Prettier, Vitest, Playwright + axe-core, Tauri 2 (`apps/app/src-tauri/`), Supabase local em Docker, Flyway em Docker (`docker-compose.yml`), `Makefile` e `.env.example`, seguindo `PROMPT.md` seção 12 e `docs/DECISOES.md` (D18–D24). Atualizar `CLAUDE.md` e o README com os comandos.
2. **Domínio**: `packages/core` (tipos, dinheiro em centavos, datas, Motor e `projetarFluxo`) com os testes unitários de 9.3 e os critérios de 11.2–11.7. Sem interface.
3. **Dados**: migrações Flyway (tabelas com colunas de controle e exclusão lógica de 9.4, restrições, RLS, funções RPC) com testes no banco local; `apps/app/src/data`; seed relativo à data (seção 10); backup.
4. **Tema e casca**: `design/theme-tokens.ts` → `src/app/tema.css` (variáveis do Tailwind); componentes base do shadcn; `AppShell`, `TotalsBar`, `QuickAddFab`.
5. **Telas**, uma por etapa, nesta ordem: Login → Lançar (dialog) → Lançamentos → Contas/Extrato → Cartões/Fatura + Nova compra → Painel (4 abas) → Dívidas → Rendas → Gastos fixos → Configurações.
6. **Responsivo e acessibilidade**: compact, medium, tema escuro, checagem AA, critérios de 11.1.

Exemplo de pedido para uma etapa de tela:

> Implemente `/cartoes/:id` usando `design/telas/CartaoFatura.dc.html` como referência visual e as seções 3.5, 3.6 e 6.5 de `docs/PROMPT.md` como regra. Todos os valores vêm do Motor sobre o seed. Reaproveite `AppShell`, `TotalsBar`, `ContextHeader` e `StatusChip`. Ao terminar, rode os testes de 11.3 e liste qualquer divergência entre o design e o PROMPT.

## 9. Checklist de aceite visual por tela

- [ ] Hierarquia, textos da interface e ordem dos blocos iguais ao design.
- [ ] Nenhuma cor ou tamanho fixo fora do tema.
- [ ] Todo valor vem do Motor; nenhum número do design no código.
- [ ] Estados (chips) seguem `StatusChip` e a tabela 3.1.
- [ ] Barra de Totais e cabeçalho de contexto fixos ao rolar.
- [ ] Funciona em 360 dp, 768 dp e 1440 dp.
- [ ] Alvos ≥ 48 dp, foco visível, `aria-label` em botões só com ícone e em gráficos.
