# T04-04 · `MoneyText`, `StatusChip`, formatação e mensagens

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 4 · Tema e casca | Componentes do app | T04-03 | `feat/money-status` |

**Referências:** PROMPT 1.2, 2.2, 3.1, 3.5 (status), 4.1 (itens 6 e 7), 4.3 (Microcopy), 5.3 (privacidade) · DECISOES D10

## Objetivo

Criar os componentes que mostram dinheiro e estados exatamente iguais em todo o app.

## Escopo

- `apps/app/src/app/formatacao.ts`:
  - `formatarMoeda(c)`: `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`, com o sinal de menos "−" (U+2212) e nunca parênteses
  - `formatarMoedaCurta(c)` para eixos ("R$ 1,2 mil")
  - `formatarPercentual(resultado)`: 1 casa decimal; "—" para indisponível; "Novo" para novo (3.10)
  - `formatarTaxa(i)`: 2 a 4 casas
  - `formatarData(d)` `dd/mm/aaaa`, `formatarMes(c)` "Novembro 2026", `formatarMesCurto(c)` "nov/2026"
- `MoneyText`: recebe `Centavos` e o tipo (`receita`, `despesa`, `neutro`); cor `income`/`expense`/`transfer`; sinal "+"/"−" e seta para cima ou para baixo (a cor nunca é o único sinal, 4.1); `tabular-nums`; no modo privacidade mostra "R$ ••••••".
- `usePrivacidade()`: liga e desliga o modo privacidade; o padrão ao abrir vem da preferência "ocultar valores ao abrir" (T03-03) e a escolha da sessão fica lembrada.
- `StatusChip`: **um** mapeamento estado → rótulo, cor e ícone para os estados de 3.1, os status de fatura de 3.5, "Paga parcialmente", "A classificar", "Novo", "Anterior ao saldo inicial", "Paga antes do cadastro" (base em `statusChips` de `theme-tokens.ts`).
- `apps/app/src/app/mensagens.ts`: só os textos comuns a várias telas (microcopy de 4.3, erros gerais, tooltips dos indicadores de 5.3, navegação). Componentes nunca escrevem texto solto.
- Textos de uma tela ficam em `apps/app/src/features/<funcionalidade>/mensagens.ts`, criado pela tarefa da tela (D10 revista, D56). Assim, telas feitas em paralelo não editam o mesmo arquivo.

## Fora do escopo

Animação de valor (T04-06).

## Passos

1. Testes unitários da formatação (incluindo valores negativos, zero, milhões).
2. Componentes e página `#/dev/componentes` atualizada.

## Critérios de aceite

- [ ] −8990 centavos aparece como "−R$ 89,90", nunca "(R$ 89,90)" nem "-R$ 89,90" com hífen.
- [ ] Indisponível vira "—" e novo vira "Novo"; nenhum `NaN` na tela.
- [ ] Todos os estados de 3.1 e 3.5 têm chip com ícone e texto.
- [ ] Modo privacidade oculta todo `MoneyText` de uma vez.
