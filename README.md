# 🪿 Goose Money

> Controle financeiro pessoal simples, claro e no seu ritmo.

![status](https://img.shields.io/badge/status-em%20desenvolvimento-blue)

---

## 💡 Sobre o projeto

O **Goose Money** é um aplicativo de controle financeiro pessoal. O objetivo é ajudar qualquer pessoa a entender para onde vai o próprio dinheiro, organizar os gastos do dia a dia e planejar o futuro sem planilhas complicadas.

A ideia é que registrar uma despesa leve segundos e que, com o tempo, o app mostre uma visão clara da vida financeira: quanto entra, quanto sai, onde dá para economizar e quanto falta para alcançar cada meta.

## 🎯 Objetivos

- Tornar o registro de receitas e despesas rápido e sem atrito
- Dar visibilidade sobre hábitos de consumo
- Ajudar no planejamento com orçamentos e metas
- Manter os dados financeiros do usuário privados e seguros

## ✨ Funcionalidades planejadas

### Essenciais (MVP)

- [ ] Cadastro de contas (conta corrente, poupança, carteira, cartão de crédito)
- [ ] Registro de receitas e despesas
- [ ] Categorias e subcategorias personalizáveis
- [ ] Saldo por conta e saldo geral
- [ ] Histórico de transações com busca e filtros

### Planejamento

- [ ] Orçamento mensal por categoria
- [ ] Metas de economia (ex.: viagem, reserva de emergência)
- [ ] Lançamentos recorrentes (aluguel, assinaturas, salário)
- [ ] Controle de faturas e parcelamentos no cartão

### Análise

- [ ] Resumo mensal de entradas e saídas
- [ ] Gráficos de gastos por categoria
- [ ] Evolução do patrimônio ao longo do tempo

### Extras

- [ ] Importação de extratos (OFX/CSV)
- [ ] Exportação de dados
- [ ] Lembretes de contas a pagar
- [ ] Suporte a múltiplas moedas

## 🗺 Roadmap

| Fase | Entrega                                       |
| ---- | --------------------------------------------- |
| 0    | Definição de escopo, requisitos e tecnologias |
| 1    | MVP: contas, transações e categorias          |
| 2    | Orçamentos, metas e recorrências              |
| 3    | Relatórios, gráficos e importação de extratos |
| 4    | Primeira versão pública                       |

## 🚀 Como rodar

### Pré-requisitos

- [Docker](https://www.docker.com/) com Compose v2 (Supabase local e Flyway)
- Node.js 26 (`.nvmrc`) e pnpm 12 (versão exata em `packageManager` no `package.json`)
- [Rust](https://rustup.rs/) estável e as [dependências do Tauri](https://tauri.app/start/prerequisites/) para o app desktop
- GNU Make 3.81 ou posterior

### Primeira vez

```bash
make setup        # instala as dependências e cria o .env a partir do .env.example
make db-start     # sobe o Supabase local em Docker
make db-status    # mostra a chave anon: copie para VITE_SUPABASE_ANON_KEY no .env
make db-migrate   # aplica as migrações Flyway
make dev          # app web em http://localhost:1420
```

Para o app desktop: `make dev-desktop`. `make` sem argumentos lista todos os comandos; antes de abrir um PR, rode `make check`.

O Supabase local usa as portas 54321 (API), 54322 (Postgres), 54323 (Studio) e 54324 (Mailpit, onde chegam os e-mails de confirmação). Se alguma estiver ocupada, `make db-start` falha; libere a porta antes de subir.

## 📁 Estrutura do repositório

```text
GooseMoney/
├── apps/
│   └── app/                 # front end: React, shadcn/ui, Tailwind, Vite
│       ├── src/             # app/ (tema, env), data/ (Supabase), components/ui/ (shadcn)
│       ├── src-tauri/       # app desktop (Tauri 2: CSP e permissões)
│       └── tests/e2e/       # Playwright + axe-core
├── packages/
│   └── core/                # domínio e Motor, TypeScript puro (sem React, rede ou DOM)
├── supabase/
│   ├── config.toml          # Supabase local (portas, Auth, Mailpit)
│   └── flyway/sql/          # migrações Flyway (V###__, R__) e checklist de tabela nova
├── docs/
│   ├── PROMPT.md            # especificação do produto (fonte da verdade)
│   ├── DECISOES.md          # decisões de stack, arquitetura e casos não cobertos
│   ├── DECISOES-REVISAO.md  # decisões da revisão da especificação
│   ├── DESIGN-HANDOFF.md    # mapa telas → rotas → componentes
│   ├── MODELO-DADOS.md      # entidades, campos e relações (contrato core ↔ banco)
│   ├── StackShowCase.md     # stack de referência (Desktop UI Showcase), base da D20
│   └── tasks/               # tarefas de implementação, uma por arquivo, por etapa
├── design/
│   ├── telas/               # 18 telas e componentes desenhados (.dc.html)
│   ├── canvas.json          # disposição das telas no canvas de design
│   └── theme-tokens.ts      # cores, tipografia e formas (Material 3)
├── .github/workflows/       # CI: formatação, lint, tipos e testes em todo PR
├── Makefile                 # comandos do projeto (make help)
├── docker-compose.yml       # serviço Flyway
├── .env.example             # variáveis locais (Supabase, Flyway, PORTA_APP)
├── package.json             # raiz do monorepo e scripts (pnpm 12, Node 26)
├── pnpm-workspace.yaml      # workspaces e regra dos 7 dias (minimumReleaseAge)
├── pnpm-lock.yaml
├── tsconfig.base.json       # opções do TypeScript usadas por todos os pacotes
├── eslint.config.js         # lint e regras de fronteira entre camadas
├── vitest.config.ts         # testes unitários (core e app) e cobertura do core
├── .prettierrc, .prettierignore
├── .nvmrc
├── CLAUDE.md
├── README.md
└── .gitignore
```

## 🤝 Contribuindo

1. Crie uma branch a partir de `main`: `git checkout -b feat/nome-da-feature`
2. Faça commits seguindo [Conventional Commits](https://www.conventionalcommits.org/pt-br/) (`feat:`, `fix:`, `docs:`…)
3. Abra um Pull Request descrevendo a mudança

## 📄 Licença

A definir.

---

Feito por **Saulo Verussa**.
