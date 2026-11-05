# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Goose Money is still before the first line of code (roadmap phase 0), but the product spec and the screen designs are done:

- `docs/PROMPT.md`: full product and technical spec (calculation rules, indicators, screens, flows, charts, persistence, sample data, acceptance criteria). It names the product "Meu Caixa"; the product is **Goose Money**, so use that name in all UI text.
- `docs/DECISOES.md`: stack, architecture and uncovered-case decisions (versions policy, Supabase as back end, monorepo, Tauri, persisted debt installments, shadcn/ui instead of MUI, adaptations from `docs/StackShowCase.md`). Also lists open questions.
- `docs/DECISOES-REVISAO.md`: decisions taken while reviewing the spec.
- `docs/DESIGN-HANDOFF.md`: maps each designed screen to a route, spec sections and components; lists what is not designed yet and the suggested build order. **Read it before implementing any screen.**
- `docs/tasks/`: the implementation plan, one task per file, grouped by stage (`docs/tasks/README.md` is the index). Work one task per branch.
- `design/telas/*.dc.html`: the 18 designed screens and components (visual reference only, see below).
- `design/theme-tokens.ts`: colors, typography, shapes and layout values used in the designs.

Stack: `docs/PROMPT.md` section 2 (React + TypeScript 6 strict + Vite, shadcn/ui (Radix + Tailwind CSS 4) with Material 3 tokens, Recharts, lucide-react icons, TanStack Query, decimal.js, Supabase (Auth + Postgres with RLS) as the back end, Tauri 2, Vitest, Playwright + axe-core). Pin exact versions published at least 7 days ago (D5 in `docs/DECISOES.md`), and update this file with the `make` targets once the project is set up (the target list is in `docs/PROMPT.md` 12.3).

Architecture (D18, D19, D20): pnpm workspaces monorepo, with `minimumReleaseAge` enforcing the 7-day rule. `packages/core` holds the domain and the Motor (pure TypeScript, never imports React or `@supabase/supabase-js`). `apps/app` is the front end (React, shadcn, TanStack Query, `src/data`, `src/plataforma`, `src-tauri/`). `supabase/` is the back end (local Supabase config and Flyway migrations in `supabase/flyway/sql`). Online-first with no offline mode: Postgres is the source of truth, every composite write is one RPC function in one transaction, and every table has RLS with `created_by = auth.uid()`. Never put the `service_role` key in the app.

Database rules (D22–D24, `docs/PROMPT.md` 9.4 and 12):

- Every schema change is a Flyway migration run in Docker (`make db-migrate`). Never use `supabase/migrations`, the Studio or `supabase db diff` to change the schema. Never edit an applied migration; add a new one. `flyway clean` stays disabled.
- Every business table has `id`, `created_at`, `updated_at` (trigger `set_updated_at`), `created_by` (default `auth.uid()`, also the RLS owner) and `is_deleted`. `snake_case` in the database, `camelCase` in the domain; mapping only in `src/data`.
- Deletion is always logical (`is_deleted = true`). `delete` is revoked for `authenticated` and `anon`. Reads in `carregarTudo` and RPC functions filter `not is_deleted`; uniqueness uses partial indexes `where not is_deleted`.
- Local Supabase runs in Docker through the Supabase CLI (`make db-start`).

## Source of truth

1. `docs/PROMPT.md` section 3 defines states, dates, values, indicators and calculations. It wins any conflict.
2. The rest of `docs/PROMPT.md` defines behavior.
3. `design/telas/` defines layout, hierarchy, UI copy and visual states.

When the design and the spec disagree, follow the spec and record the divergence in `docs/DECISOES.md`. Situations the spec does not cover: choose the most conservative option (the one that shows less available money), record it in `docs/DECISOES.md` and flag it.

## Working with the design files

- The `.dc.html` files use the design canvas format (`<x-dc>`, `<sc-for>`, `<sc-if>`, `<dc-import>`, inline styles, a `renderVals()` script with mock data). Do not copy their markup; rebuild in React + shadcn/ui + Tailwind, adjusting the shadcn components to match the designs.
- Money values in the designs are illustrative (seed data with "today" = 2026-11-04). Never hardcode them: every number comes from the domain engine.
- Every indicator is computed by a single domain function. Never compute an indicator inside a component.
- Colors, sizes and radii go through the Tailwind theme variables built from `design/theme-tokens.ts` (`src/app/tema.css`). No hex values or arbitrary values (`bg-[#...]`) in components.
- Build one screen per branch, with its design file and the spec sections listed in `docs/DESIGN-HANDOFF.md`.

## Domain (from README)

The MVP covers accounts (checking, savings, wallet, credit card), income and expense transactions, customizable categories and subcategories, per-account and overall balances, and transaction history with search and filters. Later phases add monthly budgets per category, savings goals, recurring entries, credit card bills and installments (parcelamentos), reports and charts, OFX/CSV import, export, bill reminders and multi-currency support.

User financial data must stay private and secure. This is a stated project goal.

## Conventions

- The README and user-facing text are written in Brazilian Portuguese.
- Branch from `main` using `feat/<name>`.
- Commits follow Conventional Commits (`feat:`, `fix:`, `docs:`…).
- Changes go through Pull Requests.
- When the repo structure changes, update the "Estrutura do repositório" section in the README.
