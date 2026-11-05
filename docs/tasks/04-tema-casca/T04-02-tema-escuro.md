# T04-02 · Tema escuro e seletor de tema

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 4 · Tema e casca | Tema | T04-01 | `feat/tema-escuro` |

**Referências:** PROMPT 4.3, 6.9 (Aparência), 11.1 · DESIGN-HANDOFF 5, 7 · DECISOES D17, D20

## Objetivo

Criar o tema escuro, que não foi desenhado, e permitir escolher claro, escuro ou seguir o sistema.

## Escopo

- Gerar os papéis escuros da mesma semente `#1B6B5A`, conforme a decisão D1, e acrescentá-los a `design/theme-tokens.ts` (`darkRoles` e variantes escuras dos semânticos).
- `tema.css`: bloco `.dark { … }` redefinindo as mesmas variáveis.
- `ThemeProvider` (`apps/app/src/app/providers/tema.tsx`): `claro`, `escuro`, `sistema`; aplica a classe `dark` no `<html>`; em `sistema`, segue `prefers-color-scheme` e reage à troca.
- A escolha fica em `localStorage` (preferência do aparelho, D20) e é aplicada antes da primeira pintura (script curto no `index.html`), para não piscar o tema claro.
- Teste automatizado de contraste: para cada par texto/fundo usado (on-surface/surface, semânticos sobre surface, on-container/container), razão ≥ 4,5:1 nos dois temas.

## Fora do escopo

Tela de Configurações › Aparência (T05-28).

## Passos

1. Gerar os tokens escuros.
2. Implementar o provider e o script de inicialização.
3. Escrever o teste de contraste.

## Critérios de aceite

- [ ] Alternar o tema muda todas as telas sem recarregar.
- [ ] Em "sistema", trocar o tema do SO troca o app.
- [ ] Nenhum par de texto do app fica abaixo de 4,5:1 em qualquer tema (11.1).
- [ ] Recarregar a página não pisca o tema errado.

## Decisões

**D1. Como gerar o tema escuro?**

- **A)** Script único (`scripts/gerar-tema-escuro.ts`) com `@material/material-color-utilities` como dependência de dev, gerando os tokens escuros a partir da semente. O resultado é commitado; o app não carrega a biblioteca. Ajustes manuais dos semânticos, se o contraste pedir. *(recomendado)*
- **B)** Escrever os tokens escuros à mão, usando o Material Theme Builder como referência visual.
- **C)** Gerar em tempo de execução no app com a biblioteca, permitindo trocar a cor semente no futuro.
