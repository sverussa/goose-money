# T04-08 · `ChartCard` e base dos gráficos

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 4 · Tema e casca | Gráficos | T04-07, T03-07 | `feat/chartcard` |

**Referências:** PROMPT 8.1, 8.3 · DECISOES D11, D17, D20 · DESIGN-HANDOFF 4

## Objetivo

Um invólucro único para todos os gráficos, com título, menu, exportação e acessibilidade.

## Escopo

- Dependências: `recharts` 3 e `html-to-image`; componente `chart` do shadcn.
- `ChartCard`:
  - título com a conclusão ou pergunta, subtítulo com o período aplicável (8.3)
  - menu com "Ver itens" (mesmo destino do clique, recebido por prop), "Exportar PNG" e "Exportar CSV"
  - PNG com `html-to-image` do card inteiro; CSV gerado das séries recebidas; os dois salvos por `salvarArquivo` (T03-07)
  - `aria-label` com resumo textual das séries (função `resumirSeries` testada)
  - estado vazio: frase curta + ação ("Sem despesas neste período · Lançar despesa")
- `ChartContainer` com cores lidas das variáveis do tema: `income`, `expense`, categórica estável por categoria e por cartão (cor escolhida no cadastro); previstos tracejados ou com hachura `forecast` (padrão SVG).
- Formatação: tooltips em R$ com percentual do total; eixo Y abreviado ("R$ 1,2 mil"); barras sempre a partir de zero.
- Componentes base reutilizáveis: barras agrupadas com linha, barras empilhadas, rosca com ranking, linhas, barras horizontais, sparkline.

## Fora do escopo

Os gráficos de cada tela (etapa 5).

## Passos

1. Implementar `ChartCard` e um gráfico de barras de exemplo na página `#/dev/componentes`.
2. Testar exportação de PNG e CSV no navegador.

## Critérios de aceite

- [ ] O PNG exportado tem as cores do tema (não preto e cinza).
- [ ] O CSV tem uma linha por ponto e cabeçalho em português.
- [ ] Todo gráfico tem `aria-label` com resumo.
- [ ] Nenhum `NaN` ou `Infinity` em tooltip ou rótulo (8.3).
