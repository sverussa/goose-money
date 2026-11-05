# T00-13 · Documentar a base de código

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 0 · Codebase | Documentação | T00-01 a T00-12 | `docs/base-codigo` |

**Referências:** CLAUDE.md · README.md · DESIGN-HANDOFF.md 8

## Objetivo

Fechar a etapa 0 com a documentação refletindo o que existe de verdade no repositório.

## Escopo

- `README.md`:
  - nova seção "Como rodar": pré-requisitos (Docker, Node, pnpm, Rust, Make), `make setup`, `make db-start`, `make db-migrate`, `make dev`, `make dev-desktop`
  - "Estrutura do repositório" atualizada com `apps/`, `packages/`, `supabase/`, `docker-compose.yml`, `Makefile`, `.env.example`
  - badge de status trocado de "em planejamento" para "em desenvolvimento"
- `CLAUDE.md`:
  - "Project status" diz que a etapa 0 está pronta
  - nova seção "Commands" com os alvos `make` (o CLAUDE.md pede isso desde a revisão da stack)
- `docs/tasks/README.md`: marcar as tarefas da etapa 0 como concluídas.

## Fora do escopo

Documentação de domínio (fica junto do código e nas tarefas seguintes).

## Passos

1. Seguir o README do zero num clone limpo e corrigir cada passo que não funcionar.
2. Atualizar os arquivos.

## Critérios de aceite

- [ ] Uma pessoa nova consegue rodar o app seguindo só o README.
- [ ] O CLAUDE.md lista os comandos reais.
- [ ] A estrutura do repositório no README bate com o `ls` da raiz.
