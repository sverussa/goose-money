# T05-27 · Configurações › Categorias

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 5 · Telas | Configurações | T04-07, T02-08 | `feat/config-categorias` |

**Referências:** PROMPT 4.3 (paleta categórica), 6.9 (Categorias) · `design/telas/Configuracoes.dc.html` · T01-01 (D4 subcategorias)

## Objetivo

O cadastro de categorias dentro de `#/configuracoes`.

## Escopo

- Seções da tela Configurações como no design (Categorias, Aparência, Preferências, Acesso, Dados); esta tarefa faz a moldura e a seção Categorias.
- Lista de categorias por tipo (despesa, receita), com ícone, cor e subcategorias (conforme T01-01, D4).
- Categorias de sistema ("A classificar", "Juros e encargos", "Tarifas", "Ajuste de saldo") com cadeado: sem editar nem excluir, com tooltip explicando.
- Criar e editar: nome, tipo, ícone (lista de ícones lucide), cor (paleta categórica de 8 cores), categoria pai.
- Excluir: exclusão lógica, com a regra para categorias em uso conforme a decisão D1.
- A mesma categoria tem sempre a mesma cor em todo o app (4.3).

## Fora do escopo

Demais seções (T05-28, T05-29).

## Passos

1. Montar a moldura e a seção.
2. Testes Playwright de criar, editar, excluir com movimentação e da trava das de sistema.

## Critérios de aceite

- [ ] Categoria de sistema não pode ser editada nem excluída, nem pela tela nem pelo banco.
- [ ] Excluir uma categoria em uso segue a decisão D1 e nenhum lançamento fica apontando para categoria excluída.
- [ ] Mudar a cor de uma categoria muda a cor dela em todos os gráficos.

## Decisões

**D1. O que acontece ao excluir uma categoria que tem lançamentos?** (a spec não define)

- **A)** Pede outra categoria e move lançamentos, compras e recorrências para ela no mesmo comando, com Desfazer. Nenhum item fica sem categoria. *(recomendado)*
- **B)** Move tudo automaticamente para "A classificar" e avisa quantos itens foram movidos.
- **C)** Não deixa excluir categoria em uso; só permite renomear ou esconder dos seletores.
