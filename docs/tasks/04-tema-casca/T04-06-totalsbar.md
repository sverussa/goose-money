# T04-06 · Barra de Totais (`TotalsBar`)

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 4 · Tema e casca | Casca | T04-05, T03-04 | `feat/totalsbar` |

**Referências:** PROMPT 1.4, 4.1 (item 3), 4.2, 5.3, 7.4, 11.1 · `design/telas/TotalsBar.dc.html`, `MobilePainel.dc.html` · DESIGN-HANDOFF 6 (item 2)

## Objetivo

Mostrar os 5 indicadores essenciais, sempre sobre hoje e o mês corrente, atualizando na hora após qualquer gravação.

## Escopo

- Os 5 indicadores na ordem de 5.3, vindos de `useBarraDeTotais()` (T03-03): **Saldo em contas**, **Previsto até o fim do mês**, **A pagar nos cartões**, **Resultado** do mês corrente, **Patrimônio líquido**.
- Cada indicador: rótulo, ícone de informação com tooltip de uma frase (textos de `mensagens.ts`), valor em `title-lg`, link para o destino de 5.3.
- **Previsto até o fim do mês** em `warning` abaixo do limite de alerta e em `error` quando negativo (`estadoDoPrevisto`, T01-17).
- Fixa logo abaixo da top app bar; nunca sai da tela ao rolar (4.2).
- Visibilidade por largura (4.2):
  - ≥ 600 dp: os 5 visíveis
  - < 600 dp: Saldo em contas e Previsto visíveis; os outros 3 a um toque ("expandir")
- Após uma gravação (snapshot de T03-04): o valor anima do antigo ao novo em ~400 ms (sem animação com `prefers-reduced-motion`) e aparece o chip de variação por 2 s (`+R$ 6.500,00` em `income`, `−R$ 89,90` em `expense`). No compact, um indicador oculto que mudou aparece temporariamente com o chip e depois volta.
- Botão de olho: liga o modo privacidade (T04-04), com `aria-pressed`; no compact, fica na top app bar, como em `MobilePainel.dc.html` (D44).

## Fora do escopo

Os indicadores em si (core, T01-17).

## Passos

1. Implementar a barra e os estados.
2. Testes Playwright de 11.1 com uma compra no cartão.

## Critérios de aceite

- [ ] Em 360 dp, Saldo em contas e Previsto ficam visíveis sem interação; após uma compra no cartão, A pagar nos cartões aparece temporariamente com o chip (11.1).
- [ ] Em 768 e 1440 dp, os 5 ficam visíveis ao mesmo tempo (11.1).
- [ ] Cada indicador leva ao destino de 5.3.
- [ ] Desfazer volta os valores com a mesma animação.

## Decisão tomada

**D1. Botão de privacidade no celular** (respondida pelo Saulo em 05/11/2026): na top app bar (opção A). Registrada em `DECISOES.md` D44.
