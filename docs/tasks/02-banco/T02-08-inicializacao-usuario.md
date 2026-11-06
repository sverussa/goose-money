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
  - cria as 8 categorias padrão de despesa da paleta do design: Moradia, Transporte, Alimentação, Compras, Saúde e bem-estar, Assinaturas, Lazer, Outras, cada uma com sua cor fixa, e a categoria de receita "Renda", com a cor de "Outras" (D40). A lista, os ícones e as cores estão em `categoriasIniciais` de `packages/core/src/seed/`
  - cria a linha de `preferencias` com os padrões (limite de alerta R$ 500,00, horizonte padrão 12 meses, ocultar valores ao abrir desligado, tema "sistema")
- Disparo: o app chama `inicializar_usuario()` logo depois do login e da confirmação do cadastro (T05-30), antes de carregar os dados (D39). Nada no schema `auth`.
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

## Decisões tomadas

Respondidas pelo Saulo em 05/11/2026, ambas na opção A.

- **D1. Disparo** (D39): o app chama a função depois do login.
- **D2. Categorias padrão** (D40): as 8 de despesa da paleta do design e "Renda" (receita).
