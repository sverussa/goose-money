# T04-05 · `AppShell` e navegação

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 4 · Tema e casca | Casca | T04-04, T03-01, T01-21 | `feat/app-shell` |

**Referências:** PROMPT 5.1, 5.2 · `design/telas/Nav.dc.html`, `Main.dc.html`, `MobilePainel.dc.html` · DESIGN-HANDOFF 4

## Objetivo

Montar a estrutura comum de toda tela autenticada e registrar todas as rotas.

## Escopo

- `AppShell` com, de cima para baixo (5.2): top app bar, Barra de Totais (lugar reservado, T04-06), cabeçalho de contexto (lugar reservado, T04-07), conteúdo e FAB "+ Lançar" (lugar reservado, T05-02).
- Navegação por largura (5.1):
  - ≥ 840 dp: drawer fixo de 260 px com os 9 itens, logotipo "Goose Money", badges e rodapé com usuário e "Sair" (sem "Dados neste dispositivo", D18)
  - 600–839 dp: navigation rail com os 9 itens (não desenhado: seguir o vocabulário do drawer)
  - < 600 dp: navigation bar com 5 itens (Painel, Lançamentos, Contas, Cartões, Mais); "Mais" abre um `Sheet` com os itens 5 a 9
- Ícones lucide de 5.1; item ativo com `aria-current="page"`.
- Badges vindos de `badges()` do core (T01-21).
- Top app bar: título da tela, lugar para o `MonthSelector`, botão de busca e menu do usuário (Configurações, Sair).
- Rotas com `React.lazy` e `Suspense`, todas protegidas (T03-01): `/`, `/lancamentos`, `/contas`, `/contas/:id`, `/cartoes`, `/cartoes/:id`, `/dividas`, `/dividas/:id`, `/rendas`, `/gastos-fixos`, `/projecoes` (atalho para a aba Projeções), `/configuracoes`. Cada uma com página provisória com o título.
- Título da janela: "<Tela> · Goose Money".

## Fora do escopo

Conteúdo das telas (etapa 5), ajustes finos do compact e do medium (T06-01).

## Passos

1. Implementar o shell e as três formas de navegação.
2. Testes Playwright em 360, 768 e 1440 dp navegando por todos os itens.

## Critérios de aceite

- [ ] Os 9 itens levam às rotas certas nas três larguras.
- [ ] Em 360 dp, a navigation bar tem exatamente 5 itens, incluindo "Mais".
- [ ] Os badges aparecem com os números do core.
- [ ] axe sem violações nas três larguras.
