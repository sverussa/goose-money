# T04-09 · Atalhos de teclado e busca global

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 4 · Tema e casca | Casca | T04-05 | `feat/atalhos-busca` |

**Referências:** PROMPT 4.1 (item 9), 5.2 (busca) · DESIGN-HANDOFF 7 (busca não desenhada) · DECISOES D17 (`Command`)

## Objetivo

Atalhos do desktop e a busca global com `Ctrl/Cmd + K`.

## Escopo

- `useAtalhos()` global, desligado quando o foco está num campo de texto:
  - `N`: abre o formulário de lançamento (T05-02)
  - `←` `→`: mês anterior e seguinte nas telas com `MonthSelector`
  - `Esc`: fecha diálogo ou busca
  - `Enter`: salva no formulário aberto (tratado no próprio formulário)
  - `Ctrl/Cmd + K`: abre a busca
- Busca com o componente `Command` do shadcn, encontrando telas, ações ("Nova conta", "Pagar fatura") e lançamentos por descrição; escolher um lançamento abre Lançamentos com ele em destaque (D45).
- Lista de atalhos visível no menu do usuário ("Atalhos de teclado").

## Fora do escopo

Busca dentro da tela Lançamentos (T05-07).

## Passos

1. Implementar o hook e a busca.
2. Testes Playwright de cada atalho.

## Critérios de aceite

- [ ] `N` abre o formulário em qualquer tela, menos quando se digita num campo.
- [ ] `Ctrl+K` (Windows/Linux) e `Cmd+K` (macOS) abrem a busca.
- [ ] A busca é navegável só pelo teclado.

## Decisão tomada

**D1. Escopo da busca** (respondida pelo Saulo em 05/11/2026): telas, ações e lançamentos (opção A). Registrada em `DECISOES.md` D45.
