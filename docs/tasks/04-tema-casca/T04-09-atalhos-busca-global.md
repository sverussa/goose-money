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
- Busca com o componente `Command` do shadcn, com o escopo da decisão D1.
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

## Decisões

**D1. O que a busca global encontra?**

- **A)** Telas e ações ("Nova conta", "Pagar fatura") e lançamentos por descrição, levando ao item em Lançamentos. *(recomendado)*
- **B)** Só telas e ações (uma paleta de comandos), sem buscar dados.
- **C)** Tudo: lançamentos, compras, contas, cartões, dívidas, recorrências e categorias, com resultados agrupados por tipo.
