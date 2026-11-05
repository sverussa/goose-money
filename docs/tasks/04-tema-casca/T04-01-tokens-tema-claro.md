# T04-01 · Tokens do tema claro

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 4 · Tema e casca | Tema | T00-04 | `feat/tema-claro` |

**Referências:** `design/theme-tokens.ts` · PROMPT 4.3 · DESIGN-HANDOFF 5 · DECISOES D17

## Objetivo

Transformar `design/theme-tokens.ts` nas variáveis CSS do Tailwind, para que nenhum componente use cor, raio ou tamanho fora do tema.

## Escopo

- `apps/app/src/app/tema.css`, bloco `@theme`, com nomes estáveis:
  - papéis M3: `--color-primary`, `--color-on-primary`, `--color-primary-container`, `--color-surface`, `--color-surface-container-lowest` … `--color-surface-container-highest`, `--color-on-surface`, `--color-on-surface-variant`, `--color-outline`, `--color-outline-variant`, `--color-error` etc.
  - semânticos com o trio `main`/`container`/`on-container`: `income`, `expense`, `transfer`, `forecast`, `warning`
  - paleta categórica `--color-cat-1` … `--color-cat-8` e `--color-cat-sistema`
  - raios: `--radius-xs` (4) … `--radius-xl` (28), `--radius-full`
  - tipografia: utilitários para a escala de `theme-tokens.ts` (`text-headline-lg`, `text-headline-md`, `text-title-lg`, `text-title-md`, `text-body-lg`, `text-body-md`, `text-label-lg`, `text-label-md`) com tamanho, altura de linha e peso
  - medidas de layout: largura do drawer (260), altura da top app bar (64), alvo mínimo (48), largura máxima do conteúdo (1280)
- Mapear as variáveis que o shadcn espera (`--background`, `--foreground`, `--primary`, `--ring`, `--radius`…) para os papéis M3 acima, para os componentes do shadcn herdarem o tema.
- Foco visível: `outline` de 3 px na cor `primary` com afastamento de 2 px (como no design).
- Os valores vêm de `design/theme-tokens.ts`; um teste lê esse arquivo e confere que `tema.css` tem os mesmos hex (evita divergência).

## Fora do escopo

Tema escuro (T04-02).

## Passos

1. Escrever `tema.css`.
2. Escrever o teste de correspondência.
3. Página provisória `#/dev/tema` (só em desenvolvimento) mostrando cores, tipografia e raios, para revisão visual.

## Critérios de aceite

- [ ] Todos os tokens de `theme-tokens.ts` existem como variáveis.
- [ ] O teste de correspondência passa.
- [ ] O `Button` do shadcn usa a cor `primary` do tema.
