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
