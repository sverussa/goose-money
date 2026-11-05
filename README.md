# 🪿 Goose Money

> Controle financeiro pessoal simples, claro e no seu ritmo.

![status](https://img.shields.io/badge/status-em%20planejamento-lightgrey)

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

| Fase | Entrega |
|------|---------|
| 0 | Definição de escopo, requisitos e tecnologias |
| 1 | MVP: contas, transações e categorias |
| 2 | Orçamentos, metas e recorrências |
| 3 | Relatórios, gráficos e importação de extratos |
| 4 | Primeira versão pública |

## 📁 Estrutura do repositório

```text
GooseMoney/
├── apps/                    # front end (apps/app, a partir de T00-03)
├── packages/                # domínio e Motor (packages/core, a partir de T00-02)
├── docs/
│   ├── PROMPT.md            # especificação do produto (fonte da verdade)
│   ├── DECISOES.md          # decisões de stack, arquitetura e casos não cobertos
│   ├── DECISOES-REVISAO.md  # decisões da revisão da especificação
│   ├── DESIGN-HANDOFF.md    # mapa telas → rotas → componentes
│   ├── StackShowCase.md     # stack de referência (Desktop UI Showcase), base da D20
│   └── tasks/               # tarefas de implementação, uma por arquivo, por etapa
├── design/
│   ├── telas/               # 18 telas e componentes desenhados (.dc.html)
│   ├── canvas.json          # disposição das telas no canvas de design
│   └── theme-tokens.ts      # cores, tipografia e formas (Material 3)
├── package.json             # raiz do monorepo (pnpm 12, Node 26)
├── pnpm-workspace.yaml      # workspaces e regra dos 7 dias (minimumReleaseAge)
├── pnpm-lock.yaml
├── tsconfig.base.json       # opções do TypeScript usadas por todos os pacotes
├── .nvmrc
├── CLAUDE.md
├── README.md
└── .gitignore
```

> Esta seção será atualizada conforme o projeto ganhar forma.

## 🤝 Contribuindo

1. Crie uma branch a partir de `main`: `git checkout -b feat/nome-da-feature`
2. Faça commits seguindo [Conventional Commits](https://www.conventionalcommits.org/pt-br/) (`feat:`, `fix:`, `docs:`…)
3. Abra um Pull Request descrevendo a mudança

## 📄 Licença

A definir.

---

Feito por **Saulo Verussa**.
