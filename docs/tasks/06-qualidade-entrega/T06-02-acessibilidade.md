# T06-02 · Acessibilidade WCAG 2.2 AA

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 6 · Qualidade e entrega | Acessibilidade | T06-01 | `feat/acessibilidade` |

**Referências:** PROMPT 4.1 (itens 7, 10), 8.3, 11.1 · DESIGN-HANDOFF 9

## Objetivo

Garantir o nível AA em todas as telas, nos dois temas.

## Escopo

- axe-core em todas as rotas e diálogos, nos temas claro e escuro, nas três larguras.
- Revisão manual por tela:
  - navegação só pelo teclado, ordem de foco lógica, foco visível, `Esc` fecha diálogos e devolve o foco
  - leitor de tela (VoiceOver no macOS): rótulos de campos, `aria-label` em botões só com ícone, anúncio de erros (`role="alert"`) e do snackbar (`aria-live`)
  - gráficos com resumo textual em `aria-label` (T04-08)
  - cor nunca é o único sinal: receita "+" e seta para cima, despesa "−" e seta para baixo, movimentos neutros com ícone próprio (4.1)
  - `prefers-reduced-motion` desliga as animações da Barra
- Registrar no PR o resultado da revisão manual por tela.

## Fora do escopo

Auditoria externa.

## Passos

1. Suíte axe completa.
2. Revisão manual com teclado e VoiceOver.

## Critérios de aceite

- [ ] axe sem violações em todas as rotas, temas e larguras (11.1).
- [ ] Todos os fluxos principais (lançar, pagar fatura, nova compra, confirmar renda) feitos só com teclado.
- [ ] Contraste AA nos dois temas (11.1).
