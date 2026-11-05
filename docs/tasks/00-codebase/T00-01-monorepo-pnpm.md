# T00-01 · Monorepo com pnpm workspaces

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 0 · Codebase | Monorepo | — | `feat/monorepo` |

**Referências:** PROMPT 2, 2.3, 12 · DECISOES D5, D19, D20

## Objetivo

Criar a raiz do monorepo com pnpm, a regra dos 7 dias para versões e a estrutura de pastas vazia que as próximas tarefas vão preencher.

## Escopo

- `package.json` da raiz: `"name": "goose-money"`, `"private": true`, `"packageManager": "pnpm@<versão 12 com ≥ 7 dias>"`, `"engines": { "node": "<versão escolhida>" }`.
- `pnpm-workspace.yaml`:
  - `packages: ["packages/*", "apps/*"]`
  - `minimumReleaseAge: 10080` (7 dias, em minutos)
  - `saveExact: true` (versões sem `^`)
- `.nvmrc` com a versão do Node.
- `.gitignore`: acrescentar `playwright-report/`, `test-results/`, `supabase/.temp/`, `supabase/.branches/`, `*.tsbuildinfo`. Conferir que `.env` e `.env.*` continuam ignorados e `.env.example` não.
- `tsconfig.base.json` na raiz, usado por todos os pacotes: `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`, `moduleResolution: "bundler"`, `target: "ES2023"`, `skipLibCheck`.
- Pastas `packages/` e `apps/` (cada uma ganha conteúdo em T00-02 e T00-03).

## Fora do escopo

Pacotes, app, lint e testes (tarefas seguintes).

## Passos

1. Conferir a versão do pnpm instalada (`pnpm -v`) e escolher a versão 12 mais recente publicada há pelo menos 7 dias (`npm view pnpm time`).
2. Criar os arquivos acima.
3. Rodar `pnpm install` na raiz (gera `pnpm-lock.yaml`).
4. Testar a regra dos 7 dias: tentar `pnpm add -w <pacote com versão publicada hoje>` e confirmar que o pnpm recusa ou escolhe uma versão mais antiga. Desfazer a instalação.

## Critérios de aceite

- [ ] `pnpm install` roda sem erro e gera `pnpm-lock.yaml`.
- [ ] Uma versão publicada há menos de 7 dias não é instalada.
- [ ] Dependências novas entram sem `^` no `package.json`.
- [ ] `tsconfig.base.json` existe com as opções listadas.

## Decisões

**D1. Qual versão do Node.js o projeto exige?**

- **A)** Node 24 (LTS ativo): estável para ferramentas e CI. *(recomendado)*
- **B)** Node 26 (versão atual, a que está instalada na máquina): recursos mais novos, mas fora de LTS até outubro de 2027.
- **C)** Node 22 (LTS em manutenção): máxima compatibilidade, mas perto do fim do suporte.
