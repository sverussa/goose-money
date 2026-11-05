# T05-27 · Configurações › Categorias

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 5 · Telas | Configurações | T04-07, T02-08 | `feat/config-categorias` |

**Referências:** PROMPT 4.3 (paleta categórica), 6.9 (Categorias) · `design/telas/Configuracoes.dc.html` · T01-01 (D4 subcategorias)

## Objetivo

O cadastro de categorias dentro de `#/configuracoes`.

## Escopo

- Seções da tela Configurações como no design (Categorias, Aparência, Preferências, Acesso, Dados); esta tarefa faz a moldura e a seção Categorias.
- Lista de categorias por tipo (despesa, receita), com ícone, cor e subcategorias (um nível, D35).
- Categorias de sistema ("A classificar", "Juros e encargos", "Tarifas", "Ajuste de saldo") com cadeado: sem editar nem excluir, com tooltip explicando.
- Criar e editar: nome, tipo, ícone (lista de ícones lucide), cor (paleta categórica de 8 cores), categoria pai.
- Excluir (D49): exclusão lógica. Se a categoria estiver em uso, o diálogo de confirmação diz quantos lançamentos, compras e recorrências vão para "A classificar"; tudo é movido no mesmo comando (T01-22), com Desfazer.
- Excluir uma categoria pai exclui também as subcategorias, e os itens delas também vão para "A classificar" (caso não coberto pela spec, registrado em D49).
- Depois de excluir, snackbar "N itens movidos para A classificar" com Desfazer; o badge de Lançamentos (T01-21) passa a contar esses itens.
- A mesma categoria tem sempre a mesma cor em todo o app (4.3).

## Fora do escopo

Demais seções (T05-28, T05-29).

## Passos

1. Montar a moldura e a seção.
2. Testes Playwright de criar, editar, excluir com movimentação para "A classificar", Desfazer e da trava das de sistema.

## Critérios de aceite

- [ ] Categoria de sistema não pode ser editada nem excluída, nem pela tela nem pelo banco.
- [ ] Excluir uma categoria em uso move todos os itens dela e das subcategorias para "A classificar", e nenhum lançamento fica apontando para categoria excluída.
- [ ] Desfazer devolve a categoria e os itens à categoria original.
- [ ] Mudar a cor de uma categoria muda a cor dela em todos os gráficos.

## Decisão tomada

**D1. Excluir categoria em uso** (respondida pelo Saulo em 05/11/2026): os itens vão para "A classificar" (opção B). Registrada em `DECISOES.md` D49.
