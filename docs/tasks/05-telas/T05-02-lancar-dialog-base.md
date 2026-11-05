# T05-02 · Formulário de lançamento: base, despesa e receita

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 5 · Telas | Lançar | T04-06, T03-04 | `feat/lancar-base` |

**Referências:** PROMPT 4.1 (itens 1–3), 7.1, 7.2, 7.3, 11.1 · `design/telas/LancarDialog.dc.html` · DECISOES D7, D14

## Objetivo

O FAB "+ Lançar" abre direto o formulário no tipo padrão da tela, e uma despesa fica gravada em 3 interações.

## Escopo

- `QuickAddFab`: FAB estendido "+ Lançar" que vira FAB comum ao rolar; tecla `N` (T04-09).
- `LancarDialog` (desktop) com React Hook Form + Zod e o adaptador próprio (D7):
  - chips de tipo no topo: Despesa · Receita · Compra no cartão · Transferência · Pagamento de fatura (só Despesa e Receita funcionam nesta tarefa; os outros entram em T05-03)
  - campo valor com máscara da direita (`deMascara`, T01-02), foco inicial, teclado numérico no celular (`inputMode="numeric"`)
  - tipo padrão e pré-seleção pela tabela 7.2 (tela de conta → aquela conta; tela de cartão → compra no cartão; demais → última conta usada, guardada em `localStorage`)
  - campos com padrão (7.2): data = hoje, conta = padrão, categoria = "A classificar", descrição opcional
  - "Salvar" (`Enter`) e "Salvar e lançar outro" (volta ao valor mantendo tipo, conta e data)
  - erros inline, o diálogo não fecha
- Gravação com o construtor do core e `useComando` (T03-04): "Salvando…", depois snackbar "Lançado · Desfazer"; a Barra anima (T04-06).
- Primeiro uso sem nenhuma conta: o FAB leva ao cadastro de conta (7.2; formulário de T05-08).

## Fora do escopo

Outros tipos (T05-03), campos inteligentes (T05-04), versão em tela cheia (T05-05).

## Passos

1. Montar o diálogo e o schema de formulário (camada de formulário de 9.1, separada da de domínio).
2. Testes Playwright de contagem de interações.

## Critérios de aceite

- [ ] De qualquer tela comum, despesa lançada em 3 interações: FAB, digitar valor, `Enter` (11.1).
- [ ] Receita em 4 interações (+ chip) (11.1).
- [ ] Digitar `1590` mostra R$ 15,90.
- [ ] "Salvar e lançar outro" mantém tipo, conta e data.
- [ ] Desfazer devolve todos os indicadores da Barra aos valores anteriores.
