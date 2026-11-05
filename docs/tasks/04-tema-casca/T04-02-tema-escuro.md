# T04-02 · Tema escuro e seletor de tema

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 4 · Tema e casca | Tema | T04-01 | `feat/tema-escuro` |

**Referências:** PROMPT 4.3, 6.9 (Aparência), 11.1 · DESIGN-HANDOFF 5, 7 · DECISOES D17, D20

## Objetivo

Criar o tema escuro, que não foi desenhado, e permitir escolher claro, escuro ou seguir o sistema.

## Escopo

- Tema escuro gerado **em execução** (D43): `@material/material-color-utilities` como dependência do app; `apps/app/src/app/tema/gerarTemaEscuro.ts` gera os papéis escuros a partir da semente `#1B6B5A` (lida de `design/theme-tokens.ts`) e as variantes escuras dos semânticos (sucesso, alerta, erro, informação) como cores customizadas da biblioteca.
- `main.tsx` aplica as variáveis geradas num bloco `.dark` (as mesmas variáveis de `tema.css`) antes do primeiro `render`. O tema claro continua estático, vindo dos tokens do design (T04-01).
- Ajuste manual dos semânticos só se o contraste pedir, como correção sobre o resultado gerado, num lugar só.
- A semente fica como parâmetro de `gerarTemaEscuro`, para permitir trocá-la no futuro. Trocar a semente pela interface fica fora do MVP.
- `ThemeProvider` (`apps/app/src/app/providers/tema.tsx`): `claro`, `escuro`, `sistema`; aplica a classe `dark` no `<html>`; em `sistema`, segue `prefers-color-scheme` e reage à troca.
- A escolha fica em `localStorage` (preferência do aparelho, D20) e é aplicada antes da primeira pintura (script curto no `index.html`), para não piscar o tema claro.
- Teste automatizado de contraste (Playwright, lendo as variáveis aplicadas na página): para cada par texto/fundo usado (on-surface/surface, semânticos sobre surface, on-container/container), razão ≥ 4,5:1 nos dois temas.
- Medir o peso que a biblioteca acrescenta ao bundle inicial e registrar no PR.

## Fora do escopo

Tela de Configurações › Aparência (T05-28).

## Passos

1. Implementar a geração em execução.
2. Implementar o provider e o script de inicialização.
3. Escrever o teste de contraste.

## Critérios de aceite

- [ ] Alternar o tema muda todas as telas sem recarregar.
- [ ] Em "sistema", trocar o tema do SO troca o app.
- [ ] Nenhum par de texto do app fica abaixo de 4,5:1 em qualquer tema (11.1).
- [ ] Recarregar a página não pisca o tema errado.

## Decisão tomada

**D1. Geração do tema escuro** (respondida pelo Saulo em 05/11/2026): em execução no app, com a biblioteca (opção C). Registrada em `DECISOES.md` D43.
