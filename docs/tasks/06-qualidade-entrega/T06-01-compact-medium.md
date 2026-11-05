# T06-01 · Layouts compact e medium

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 6 · Qualidade e entrega | Responsivo | Etapa 5 | `feat/responsivo` |

**Referências:** PROMPT 4.2, 5.1, 5.2, 11.1 · `design/telas/MobilePainel.dc.html` · DESIGN-HANDOFF 7 (medium, "Mais" e módulos em compact não desenhados), 9

## Objetivo

Todas as telas funcionando em 360, 768 e 1440 dp.

## Escopo

- Painel em compact como `MobilePainel.dc.html`: Barra compacta (2 fixos + expandir), indicador temporário, navigation bar com 5 itens e badges, FAB acima da barra.
- Telas de módulo em compact (não desenhadas): tabelas viram listas (extrato, amortização, parceladas, tabela de projeção), cabeçalho de contexto em duas linhas, diálogos em tela cheia (`Drawer`).
- Medium (600–839 dp): navigation rail (T04-05) e grids de cards com 2 colunas.
- Nenhuma rolagem horizontal da página em 360 dp.
- Suíte Playwright que abre **todas** as rotas nas três larguras e confere: sem rolagem horizontal, Barra fixa ao rolar, cabeçalho de contexto fixo, alvos ≥ 48 dp.

## Fora do escopo

Acessibilidade além do tamanho dos alvos (T06-02).

## Passos

1. Revisar tela por tela em 360 e 768 dp.
2. Escrever a suíte.

## Critérios de aceite

- [ ] Critérios de 11.1 de largura (360, 768, 1440 dp) passam em todas as rotas.
- [ ] Checklist visual do handoff (seção 9) marcado para cada tela.
