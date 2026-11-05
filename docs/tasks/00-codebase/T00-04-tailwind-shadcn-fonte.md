# T00-04 · Tailwind 4, shadcn/ui e fonte Roboto Flex

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 0 · Codebase | App · Design system | T00-03 | `feat/tailwind-shadcn` |

**Referências:** PROMPT 2, 4.3 · DECISOES D8, D17, D20 · `design/theme-tokens.ts`

## Objetivo

Deixar o app pronto para receber componentes shadcn estilizados com Tailwind, com a fonte instalada localmente.

## Escopo

- Dependências: `tailwindcss`, `@tailwindcss/vite`, `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `@fontsource-variable/roboto-flex`.
- `vite.config.ts`: plugin `@tailwindcss/vite`.
- `apps/app/src/app/tema.css`:
  - `@import "tailwindcss";`
  - bloco `@theme` **provisório** com `--font-sans: "Roboto Flex Variable", Roboto, system-ui, sans-serif` e a cor `--color-primary: #1B6B5A` (os tokens completos chegam em T04-01)
  - `body { font-variant-numeric: tabular-nums; }`
- `main.tsx` importa `@fontsource-variable/roboto-flex` e `./app/tema.css`.
- `npx shadcn@<versão fixa> init` em `apps/app`:
  - base Radix, TypeScript, sem RSC, variáveis CSS ligadas
  - aliases: `components: "@/components"`, `ui: "@/components/ui"`, `utils: "@/lib/utils"`, `lib: "@/lib"`, `hooks: "@/hooks"`
  - `components.json` vai para o Git
- Adicionar só o componente `button` para validar (`npx shadcn add button`).
- A rota `/` passa a mostrar um `<Button>` "Lançar".

## Fora do escopo

Tokens completos, tema escuro e demais componentes (etapa 4).

## Passos

1. Instalar as dependências com versões exatas.
2. Rodar o `shadcn init` e ajustar o `components.json` para os aliases acima.
3. Conferir que o `init` não adicionou fonte do Google nem `<link>` externo.
4. Abrir o app e inspecionar a aba Rede.

## Critérios de aceite

- [ ] O botão aparece com a cor primária e a fonte Roboto Flex.
- [ ] Nenhuma requisição a `fonts.googleapis.com` ou `fonts.gstatic.com`.
- [ ] `components.json` está versionado e `src/components/ui/button.tsx` existe.
- [ ] `build` passa.
