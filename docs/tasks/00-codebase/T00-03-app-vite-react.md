# T00-03 · App web com Vite e React

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 0 · Codebase | App | T00-02 | `feat/app-base` |

**Referências:** PROMPT 2, 2.3 · DECISOES D4, D18, D20

## Objetivo

Criar `apps/app` com Vite, React 19, TypeScript e roteamento por hash, já consumindo o pacote core.

## Escopo

- `apps/app/package.json`:
  - `"name": "@goose-money/app"`, `"private": true`, `"type": "module"`
  - dependências: `react`, `react-dom`, `react-router`, `@goose-money/core: "workspace:*"`
  - dev: `vite`, `@vitejs/plugin-react`, `typescript` 6.0.x, `@types/react`, `@types/react-dom`
  - scripts: `dev` (`vite`), `build` (`tsc --noEmit && vite build`), `preview`, `typecheck`
- `apps/app/vite.config.ts`:
  - porta de `process.env.PORTA_APP`, padrão `1420`, com `strictPort: true` e `clearScreen: false` (exigências do Tauri). Cada worktree usa a sua porta para agentes rodarem em paralelo (D56)
  - alias `@` → `./src`
  - `envPrefix: ["VITE_", "TAURI_ENV_"]`
- `apps/app/tsconfig.json`: estende a base, com `lib` incluindo `DOM` e `DOM.Iterable`, `jsx: "react-jsx"`, `paths: { "@/*": ["./src/*"] }`.
- `apps/app/index.html`: `lang="pt-BR"`, `<title>Goose Money</title>`, link para `manifest.webmanifest`.
- `apps/app/public/manifest.webmanifest`: `name` e `short_name` "Goose Money", `start_url: "./"`, `display: "standalone"`, `lang: "pt-BR"`, cores do tema (`#1B6B5A` e `#F5FBF7`), ícones provisórios (os definitivos chegam em T06-04).
- `apps/app/src/main.tsx`: `createRoot`, `<HashRouter>` e uma rota `/` que mostra "Goose Money" e o `VERSAO_CORE` importado de `@goose-money/core` (prova de que o workspace está ligado).
- Pastas vazias **não** são criadas agora; cada tarefa cria a sua (`app/`, `data/`, `queries/`, `plataforma/`, `features/`, `components/`).

## Fora do escopo

Tailwind e shadcn (T00-04), Tauri (T00-07), Supabase (T00-11).

## Passos

1. Criar os arquivos à mão (não usar o template completo do Vite, que traz arquivos de exemplo a apagar).
2. `pnpm install` e `pnpm --filter @goose-money/app dev`.
3. Abrir `http://localhost:1420/#/`.
4. `pnpm --filter @goose-money/app build`.

## Critérios de aceite

- [ ] O app abre na porta 1420 e mostra "Goose Money" e a versão do core.
- [ ] `PORTA_APP=1421 pnpm dev` abre na 1421; porta ocupada dá erro em vez de trocar de porta.
- [ ] A URL usa hash (`#/`).
- [ ] `build` e `typecheck` passam.
- [ ] Alterar `VERSAO_CORE` no core atualiza a página sem reiniciar o servidor.
