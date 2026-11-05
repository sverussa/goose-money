# T00-05 · ESLint, Prettier e regras de fronteira

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 0 · Codebase | Qualidade | T00-04 | `feat/lint` |

**Referências:** PROMPT 2.1 · DECISOES D17, D19, D20 · CLAUDE.md (cores só pelo tema)

## Objetivo

Configurar análise estática e formatação, e fazer o lint garantir as fronteiras da arquitetura.

## Escopo

- Dependências na raiz: `eslint` 10, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`, `prettier`.
- `eslint.config.js` (flat config) na raiz:
  - `typescript-eslint` `strictTypeChecked` com `parserOptions.projectService: true`
  - `react-hooks` e `react-refresh` só em `apps/app/**`
  - ignorar `**/dist`, `**/src-tauri/target`, `apps/app/src/components/ui/**` (código gerado pelo shadcn; revisado à mão), `design/**`
- **Regras de fronteira** (`no-restricted-imports`):
  1. Em `packages/core/**`: proibir `react`, `react-dom`, `@supabase/*`, `@tauri-apps/*`, `@goose-money/app`.
  2. Em `apps/app/src/**`, exceto `apps/app/src/data/**`: proibir `@supabase/supabase-js` (a UI nunca chama o Supabase, D15).
  3. Em `apps/app/src/**`, exceto `apps/app/src/plataforma/**`: proibir `@tauri-apps/*`.
- **Cores fora do tema:** `no-restricted-syntax` em `apps/app/src/**/*.tsx` proibindo literais de string que contenham `[#` (por exemplo `bg-[#1B6B5A]`) ou `#` seguido de 3 a 8 dígitos hexadecimais.
- `.prettierrc`: `printWidth: 100`, `singleQuote: true`, `semi: true`, `trailingComma: "all"`.
- `.prettierignore`: ignora `docs/` e `design/`, além dos artefatos de build.
- Scripts na raiz: `lint` (`eslint .`), `format` (`prettier --write .`), `format:check`.

## Fora do escopo

CI (T00-12).

## Passos

1. Instalar e configurar.
2. Rodar `pnpm lint` e `pnpm format` e corrigir o que aparecer.
3. Testar cada regra de fronteira com um import proibido temporário.

## Critérios de aceite

- [ ] `pnpm lint` e `pnpm format:check` passam.
- [ ] Importar `react` no core, `@supabase/supabase-js` num componente e `@tauri-apps/api` fora de `plataforma/` geram erro de lint.
- [ ] `className="bg-[#1B6B5A]"` num `.tsx` gera erro de lint.

## Decisão tomada

**D1. Prettier nos documentos:** não formatar `docs/` e `design/` (opção A, escolhida pelo Saulo em 05/11/2026). Registrada em `DECISOES.md` D30.
