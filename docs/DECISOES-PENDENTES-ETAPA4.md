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

## T04-05

1. **Drawer e rail feitos à mão, sem o `Sidebar` do shadcn** (diverge de D17). O `Sidebar` traz colapso, cookie, atalho Ctrl+B e um modo ícone sem rótulo que não é o rail do M3; o design pede drawer fixo, rail com rótulo e navigation bar, que saem mais simples com links e classes de largura. O `sidebar.tsx` continua instalado (T04-03) e não é usado.
2. As três navegações ficam no DOM e a largura escolhe qual aparece (`hidden` / `medium:` / `expanded:`), sem JavaScript para medir a tela.
3. Páginas provisórias criadas já no lugar final, em `src/features/<funcionalidade>/<Nome>Pagina.tsx` (painel, lancamentos, contas, cartoes, dividas, rendas, gastos-fixos, configuracoes), para a etapa 5 trocar só o arquivo da página. Isso saiu da pasta da trilha U a pedido da própria tarefa.
4. `/projecoes` redireciona para `/?aba=projecoes`; nessa aba o item ativo do menu é "Projeções", não "Painel". Rota desconhecida autenticada volta para `/`.
5. "Mais" mostra a soma dos badges dos itens que ele abre (Rendas fixas e Gastos fixos).
6. O badge é visual (`aria-hidden`); o leitor de tela ouve ", N pendências" no nome do link.
7. O título da top app bar e da janela vem do item do menu da rota (`/contas/:id` mostra "Contas"); a tela de detalhe pode trocar depois.
8. O rodapé do drawer mostra o e-mail do usuário (o design mostrava o nome de usuário, que não existe com o Supabase Auth). O menu do usuário na top app bar abre com a inicial do e-mail.
9. O botão de busca entra na T04-09, junto com o atalho; a T04-05 não deixa um botão sem ação.
10. A Barra de Totais provisória (indicadores em centavos) ocupa o lugar da Barra até a T04-06, para os testes das tarefas T03-03 a T03-06 continuarem valendo. A faixa "Sem conexão" fica fixa junto com a Barra.
11. `cn()` (`src/lib/utils.ts`, fora da trilha U) passou a conhecer a escala tipográfica e as sombras do tema: sem isso o tailwind-merge descartava `text-label-md` ao lado de uma cor de texto.

## T04-07

1. `MonthSelector` e `ContextHeader` entram na casca por portal: a casca tem um lugar na top app bar e outro logo abaixo da Barra, no mesmo bloco fixo, então o cabeçalho de contexto acompanha a Barra ao rolar sem medir alturas. Fora da casca, os dois ficam no próprio lugar.
2. `ContextHeader` exige um `rotulo` (região nomeada para o leitor de tela, pedido do axe).
3. Período padrão do `PeriodPicker`, que a spec não define: **Últimos 3 meses**, como no design; cada tela pode passar outro.
4. "Lembrado por aba" = por tela (`chave`: visão geral, saldos, lançamentos) e por aba do navegador (`sessionStorage`): sem `de`/`ate` na URL, vale o último período escolhido naquela tela; a URL só recebe `de`/`ate` quando o usuário escolhe.
5. O texto de comparação mostra o período anterior em `dd/mm` sem o ano ("comparado a 01/06 – 04/08", como na tarefa), não o "mai–jul" do design.
6. "Personalizado" abre um popover com dois campos de data nativos (`type="date"`) e "Aplicar"; data final antes da inicial mostra erro e não aplica. Depois de deslocar com as setas, o chip ativo passa a ser "Personalizado" quando o período não coincide com nenhum atalho.
7. Mês inválido na URL (`?mes=2026-13`) e período inválido (`?de=2026-02-30`) voltam ao padrão em silêncio, sem mensagem.
8. `EstadoDaCarga` cobre carregando (esqueleto) e erro ("Tentar de novo") de qualquer consulta; o estado vazio de cada tela usa `EmptyState`.
