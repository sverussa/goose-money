# T02-08 · Inicialização de um usuário novo

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 2 · Banco | Cadastros | T02-03 | `feat/db-inicializacao` |

**Referências:** PROMPT 6.9 (categorias de sistema), 5.3 (limite de alerta), 7.2 (primeiro uso)

## Objetivo

Garantir que todo usuário tenha as categorias de sistema e uma linha de preferências antes de lançar qualquer coisa.

## Escopo

- Função `R__inicializar_usuario.sql`: `public.inicializar_usuario() returns void`, `security invoker`, **idempotente** (pode rodar várias vezes sem duplicar):
  - cria as categorias de sistema "A classificar", "Juros e encargos", "Tarifas", "Ajuste de saldo" (`sistema = true`)
  - cria as categorias padrão conforme a decisão D2
  - cria a linha de `preferencias` com os padrões (limite de alerta R$ 500,00, horizonte padrão 12 meses, ocultar valores ao abrir desligado, tema "sistema")
- Mecanismo de disparo conforme a decisão D1.
- Testes: usuário novo fica com as categorias e preferências; rodar duas vezes não duplica.

## Fora do escopo

Dados de exemplo (T02-10, T05-29).

## Passos

1. Escrever a função e o disparo.
2. Testar com usuário novo.

## Critérios de aceite

- [ ] Primeiro acesso de um usuário novo cria as 4 categorias de sistema e as preferências.
- [ ] Chamar de novo não cria nada.
- [ ] As categorias de sistema não podem ser editadas nem excluídas (T02-03).

## Decisões

**D1. Quando a inicialização roda?**

- **A)** O app chama `inicializar_usuario()` logo depois do login, antes de carregar os dados. Não toca no schema `auth` do Supabase. *(recomendado)*
- **B)** Trigger em `auth.users` que roda ao criar o usuário. Automático, mas é um objeto nosso dentro de um schema gerenciado pelo Supabase (PROMPT 12.2 pede para não fazer isso).
- **C)** Sem inicialização: as categorias de sistema são linhas globais (sem dono), visíveis para todos por política própria.

**D2. Que categorias um usuário novo recebe além das de sistema?**

- **A)** As 8 da paleta do design: Moradia, Transporte, Alimentação, Compras, Saúde e bem-estar, Assinaturas, Lazer, Outras, cada uma com sua cor fixa. *(recomendado)*
- **B)** Só as de sistema; o usuário cria as suas.
- **C)** Uma lista maior, com subcategorias comuns (por exemplo, Alimentação › Mercado, Restaurante).
