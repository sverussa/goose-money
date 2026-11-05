# T04-03 · Componentes base do shadcn ajustados ao design

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 4 · Tema e casca | Design system | T04-01 | `feat/componentes-base` |

**Referências:** PROMPT 4.3 (Componentes) · DECISOES D17 · `design/telas/*.dc.html`

## Objetivo

Instalar os componentes do shadcn que as telas usam e ajustá-los ao visual Material 3 do design, uma vez, antes das telas.

## Escopo

- Instalar com o CLI (versão fixa): `button`, `input`, `label`, `textarea`, `checkbox`, `switch`, `select`, `dialog`, `drawer`, `sheet`, `tabs`, `toggle`, `toggle-group`, `tooltip`, `dropdown-menu`, `popover`, `command`, `table`, `badge`, `progress`, `sonner`, `sidebar`, `alert`, `card`, `separator`, `skeleton`, `scroll-area`.
- Ajustes por componente, conferindo com as telas de design:
  - `Button`: variantes `filled` (primária), `tonal`, `outlined`, `text`, `icon`; altura 40, formato pílula, `labelLarge`
  - `Input` e `Label`: estilo outlined do Login (altura 56, raio 4, erro em `error`)
  - `Card`: variantes `elevated` (KPIs), `outlined` (listas, borda `outline-variant`, raio 16) e `filled`
  - `ToggleGroup` como segmented button; `Toggle` como filter chip (pílula, selecionado em `secondary-container`)
  - `Tabs` primárias (sublinhado de 3 px em `primary`) e secundárias roláveis
  - `Dialog` com raio 28; `Drawer` em tela cheia para o compact
  - `Sonner` com sombra (única sombra além do FAB, handoff 5) e botão de ação
  - `Tooltip`, `DropdownMenu` com itens desabilitados mostrando o motivo
  - `Badge` com as cores de erro do menu
  - `Alert` como banner persistente (5.2, 6.2 Projeções)
- Alvo mínimo de 48 dp em tudo que é clicável.
- Página `#/dev/componentes` (só em desenvolvimento) com todos os componentes e variantes, nos dois temas.

## Fora do escopo

Componentes do app (`MoneyText`, `TotalsBar` etc., tarefas seguintes).

## Passos

1. Instalar os componentes.
2. Ajustar um por vez, comparando com a tela de design onde ele aparece.
3. Revisão visual na página de componentes.

## Critérios de aceite

- [ ] Todos os componentes listados existem em `src/components/ui`.
- [ ] Nenhum hex nem valor arbitrário de cor nos componentes (lint de T00-05).
- [ ] A página de componentes passa no axe nos dois temas.
