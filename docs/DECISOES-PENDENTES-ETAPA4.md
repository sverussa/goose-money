# Decisões pendentes da etapa 4 (tema e casca)

Escolhas feitas durante T04-01 a T04-09 em casos que a spec e o design não cobrem. Cada uma seguiu a opção mais conservadora e espera aprovação para entrar em `docs/DECISOES.md`.

## T04-01

1. As cores e os raios padrão do Tailwind foram removidos do tema (`--color-*: initial`, `--radius-*: initial`): componente só usa as variáveis de `design/theme-tokens.ts`. Tamanhos de texto e espaçamentos padrão continuam disponíveis.
2. Mapeamento dos nomes do shadcn para M3: `card` = `surface-container-lowest` (os cards do design são brancos sobre `surface`), `popover` = `surface-container`, `secondary` = `secondary-container`, `muted` e `accent` = `surface-container-high`, `border` = `outline-variant`, `input` = `outline`, `ring` = `primary`, `chart-1..5` = `cat-1..5`.
3. O snackbar (Sonner) usa `inverse-surface` / `inverse-on-surface` e raio extra-small, como o snackbar do M3.
4. Medidas de layout viram utilitários com nome em português: `w-drawer`, `h-app-bar`, `h-tab`, `min-h-item`, `min-h-alvo`, `p-pagina`, `p-card`, `gap-padrao`, `max-w-conteudo`; larguras M3 como variantes `medium:` (≥ 600) e `expanded:` (≥ 840).

## T04-02

1. Tema padrão, sem escolha salva: **seguir o sistema**.
2. O script que aplica o tema antes da primeira pintura é um arquivo (`public/tema-inicial.js`), não inline: a CSP do Tauri (`default-src 'self'`) bloqueia script inline.
3. Para não piscar o claro, o CSS escuro gerado em execução fica guardado no `localStorage` (`goose-money:tema-escuro-css`) e o script inicial o aplica; o app gera de novo a cada abertura. Na primeira abertura de todas, sem nada guardado, ainda pode piscar uma vez.
4. Esquema M3 usado na geração: Tonal Spot (o padrão do Material You), contraste padrão (0). Semânticos gerados como cores customizadas **sem harmonizar** com a semente, para manter a cor de cada significado.
5. A paleta categórica e as cores de cartão **não** mudam no escuro (são cores de gráfico e de identidade, não de texto). Contraste de elementos gráficos (3:1) fica para T06-02.
6. Peso no bundle inicial: `@material/material-color-utilities` 0.4.0 acrescenta cerca de 87 kB (21 kB com gzip): de 745 kB para 832 kB.

## T04-03

1. As variantes do `Button` passam a ter só os nomes M3 (`filled`, padrão, `tonal`, `outlined`, `text`, `icon`) e `destructive` (fundo `error`, para "Apagar tudo" e confirmações irreversíveis). As variantes e tamanhos do shadcn (`default`, `ghost`, `sm`, `icon-sm`…) saíram; os componentes do shadcn que os usavam foram ajustados.
2. O alvo de 48 dp de botões, chips, segmentos, checkbox e switch vem de uma área invisível centrada (utilitário `alvo`), sem mudar o tamanho visível do design (40 dp nos botões, 36 dp nos chips).
3. `Card` `elevated` segue o design (branco com borda `surface-container-highest`, sem sombra), não a borda `outline-variant` citada na tarefa; `outlined` usa `outline-variant`.
4. Item de menu desabilitado mostra o motivo numa segunda linha (`motivo`), na cor `outline`, como no design da fatura; o item fica fora da navegação pelo teclado (comportamento do Radix).
5. O `Alert` não tem `role` fixo: quem usa escolhe `note`, `status` ou `alert`.
6. A rolagem do `ScrollArea` recebe foco pelo teclado (`tabIndex=0`), pedido do axe.
7. O CLI do shadcn 4.23 trocou o import de `cn` por um pacote `cn` e trouxe `next-themes`; os dois foram removidos e o `use-mobile` foi para `src/components/ui` (fora de `src/hooks`, que não é da trilha U).
8. Textos dos componentes base (por ora só "Fechar") ficam em `src/app/mensagens.ts`.

## T04-04

1. `MoneyText` sem `tipo` mostra só o valor com o sinal dele, sem cor nem ícone (saldos, totais). Com `tipo`, o sinal vem do tipo (receita sempre "+", despesa sempre "−", com o valor em módulo); `neutro` mantém o sinal do valor e usa o ícone de setas trocadas.
2. Valor zero sai sem sinal ("R$ 0,00"), inclusive `-0`.
3. Modo privacidade: a escolha do botão de olho fica no `sessionStorage` e vale até fechar o app; ao abrir de novo, volta a seguir a preferência "ocultar valores ao abrir". Enquanto os fatos não chegam, os valores não aparecem de qualquer forma.
4. Ícones escolhidos para os chips (não definidos na spec): Previsto relógio, A pagar ampulheta, Vencido/Vencida alerta, Atrasado relógio com alerta, Vence em breve calendário com relógio, Futura calendário, Aberta cadeado aberto, Fechada cadeado, Paga check, Transportada seta para a linha, Paga parcialmente pizza, A classificar etiqueta, Novo brilho, Anterior ao saldo inicial retroceder, Paga antes do cadastro calendário com check.
5. Cores dos chips fora de `statusChips` do design: Vencida (fatura) igual a Vencido; Transportada, Anterior ao saldo inicial e Paga antes do cadastro em `surface-container` (neutro); Paga parcialmente em `transfer-container`.
6. "Vence em breve" é o rótulo padrão do chip de vencimento próximo; a tela pode trocar o texto ("Vence amanhã") mantendo cor e ícone.
7. Percentual negativo usa o mesmo "−" (U+2212) da moeda; a moeda curta dos eixos segue o Intl ("R$ 1,2 mil", "R$ 3,5 mi").
