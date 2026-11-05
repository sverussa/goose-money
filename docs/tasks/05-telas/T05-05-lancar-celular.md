# T05-05 · Formulário de lançamento em tela cheia no celular

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 5 · Telas | Lançar | T05-04 | `feat/lancar-celular` |

**Referências:** PROMPT 4.2, 5.2 (FAB acima da navigation bar), 7.1–7.3, 11.1 · `design/telas/MobileLancar.dc.html`, `MobilePainel.dc.html`

## Objetivo

Em telas menores que 600 dp, o mesmo formulário abre em tela cheia.

## Escopo

- Abaixo de 600 dp, `LancarDialog` vira um `Drawer` em tela cheia com o layout de `MobileLancar.dc.html`: barra superior com fechar e título "Novo lançamento", campos na mesma ordem, botões fixos no rodapé acima do teclado.
- FAB posicionado acima da navigation bar (5.2).
- O mesmo componente de formulário nos dois layouts (só o invólucro muda).
- Após salvar no celular, a Barra mostra temporariamente o indicador oculto que mudou (T04-06).

## Fora do escopo

Demais telas em compact (T06-01).

## Passos

1. Separar o conteúdo do formulário do invólucro.
2. Testes Playwright em 360 dp.

## Critérios de aceite

- [ ] Em 360 dp, a despesa continua em 3 interações.
- [ ] O teclado numérico abre no campo valor.
- [ ] O botão Salvar fica visível com o teclado aberto.
