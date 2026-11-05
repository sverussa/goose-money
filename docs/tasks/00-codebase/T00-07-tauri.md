# T00-07 · App desktop com Tauri 2

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 0 · Codebase | Desktop | T00-03 | `feat/tauri` |

**Referências:** PROMPT 2 · DECISOES D1, D20 · `docs/StackShowCase.md` (D01, D09)

## Objetivo

Empacotar o mesmo app web como aplicativo desktop, com permissões mínimas e CSP restrita.

## Escopo

- Pré-requisito: Rust estável via `rustup` e as dependências de sistema do Tauri para o SO.
- Dependências no app: `@tauri-apps/api` e, em dev, `@tauri-apps/cli` (versões 2 com ≥ 7 dias).
- `pnpm --filter @goose-money/app exec tauri init`, gerando `apps/app/src-tauri/`:
  - `productName: "Goose Money"`, `identifier` conforme a decisão D1
  - `build.devUrl: "http://localhost:1420"`, `build.frontendDist: "../dist"`
  - `build.beforeDevCommand: "pnpm dev"`, `build.beforeBuildCommand: "pnpm build"`
  - janela: `title: "Goose Money"`, `width: 1280`, `height: 800`, `minWidth: 360`, `minHeight: 640`
  - Rust edição 2021
- CSP em `tauri.conf.json` (`app.security.csp`):
  - `default-src 'self'`
  - `connect-src 'self' http://127.0.0.1:54321` (o domínio de produção do Supabase entra em T06-04)
  - `img-src 'self' data: blob:`, `font-src 'self'`, `style-src 'self' 'unsafe-inline'` (os primitivos Radix usam estilo inline)
- `src-tauri/capabilities/default.json` só com `core:default`. Plugins entram nas tarefas que precisam deles (T03-07, T03-08).
- Scripts no app: `tauri` (`tauri`), `dev:desktop` (`tauri dev`), `build:desktop` (`tauri build`).
- `.gitignore` já cobre `src-tauri/target/`; versionar `Cargo.lock`.

## Fora do escopo

Plugins de arquivo e deep link (etapa 3), ícones definitivos e assinatura do app (T06-04).

## Passos

1. Instalar o CLI e rodar o `init`.
2. Ajustar `tauri.conf.json` com os valores acima.
3. `pnpm --filter @goose-money/app dev:desktop`.
4. `pnpm --filter @goose-money/app build:desktop` no macOS.

## Critérios de aceite

- [ ] A janela "Goose Money" abre com a página do app e recarrega ao editar o código.
- [ ] O build gera o pacote `.app`/`.dmg` no macOS.
- [ ] Uma requisição para um domínio fora da CSP é bloqueada (testar com `fetch` no console da WebView).

## Decisões

**D1. Qual identificador do aplicativo (`identifier`)?** Ele não pode mudar depois de publicado, porque o sistema usa esse valor para guardar os dados e as permissões do app.

- **A)** `br.com.goosemoney.app`: exige o domínio `goosemoney.com.br` para assinar e distribuir. *(recomendado se o domínio for registrado)*
- **B)** `io.github.sauloverussa.goosemoney`: usa um domínio que você já controla pelo GitHub.
- **C)** `app.goosemoney.desktop`: neutro, sem depender de domínio agora; troca futura exige migrar os dados locais do app.
