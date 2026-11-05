# T05-04 · Formulário de lançamento: campos inteligentes e "Mais opções"

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 5 · Telas | Lançar | T05-02 | `feat/lancar-campos` |

**Referências:** PROMPT 3.4, 4.1 (itens 2, 4), 7.3 · `design/telas/LancarDialog.dc.html` · T01-01 (D3 tags)

## Objetivo

Os padrões inteligentes e a revelação progressiva do formulário.

## Escopo

- Descrição com autocomplete das descrições já usadas; escolher uma sugestão preenche a categoria usada da última vez com aquela descrição.
- Categoria em grade com as 8 mais usadas (no tipo atual) + "Ver todas" (lista com busca, agrupada por categoria pai).
- Data com chips "Hoje" e "Ontem" + campo de data nativo (D6).
- "Mais opções" (recolhido por padrão): observação; status "Previsto" para despesas e receitas avulsas futuras; tags conforme a decisão de T01-01.
- Aviso inline quando a data é anterior ao saldo inicial da conta, com as opções "Manter fora do saldo" (padrão) e "Mudar a data do saldo inicial" (3.4).
- As sugestões e a contagem de "mais usadas" vêm de uma função do core sobre os fatos (sem contar no componente).

## Fora do escopo

Edição de lançamento existente (T05-07).

## Passos

1. Função do core `sugestoesDeLancamento(fatos, tipo)` com testes.
2. Campos na tela.

## Critérios de aceite

- [ ] Escolher a descrição "Mercado" sugerida preenche a categoria usada no último "Mercado".
- [ ] A grade mostra as 8 categorias mais usadas do tipo.
- [ ] Lançamento previsto não altera nenhum saldo nem o Resultado (3.1).
- [ ] Data anterior ao saldo inicial mostra o aviso e, por padrão, grava fora do saldo.
