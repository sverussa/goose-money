# Decisões pendentes da etapa 5

Decisões tomadas durante as tarefas da etapa 5 (e da T00-14, que a prepara) em casos que a spec não cobre ou em que foi preciso escolher. Cada uma espera aprovação; as aprovadas vão para `docs/DECISOES.md`.

## T00-14

1. A limpeza dos usuários de teste desliga os gatilhos das tabelas de negócio durante a exclusão (`session_replication_role = replica`), em vez de só seguir a ordem inversa de `tabelas_de_negocio()`, que não é uma ordem de dependência. Os gatilhos voltam antes de apagar de `auth.users`.
2. `recorrencias` também ganhou o índice por dono, embora não estivesse na lista da tarefa: o plano varria inteiro o índice `(id, created_by)`.
3. O projeto `db-tempo` roda um arquivo por vez (`fileParallelism: false`): com os dois arquivos em paralelo, o teste de 1 s ainda falhava.
4. `massa.test.ts` foi inteiro para o `db-tempo`, como a tarefa pede, embora só o último teste meça tempo.

## T05-01

1. A rota `/login` aponta para `LoginProvisorio` em `src/app/`. Para não editar o arquivo de rotas, `LoginProvisorio.tsx` passou a só reexportar a `LoginPagina` de `features/acesso`. Trocar o nome no arquivo de rotas e apagar o reexporte fica para quando ele puder ser editado.
2. "Esqueci a senha" não aparece no design. Ficou abaixo de "Entrar", centralizado, como link de texto. É um link de verdade para `#/esqueci-senha` (a página da T03-08 continua existindo e foi refeita no mesmo card do login); com JavaScript, abre o diálogo sem sair do login e já traz o e-mail digitado.
3. Campos vazios usam a validação nativa do navegador (`required`), em vez de mandar a tentativa ao Supabase e mostrar um erro genérico.
4. O teste `tests/e2e/redefinir-senha.spec.ts` (T03-08), fora da pasta `acesso/`, foi ajustado para preencher o e-mail dentro do diálogo: com a tela nova, o login e o diálogo têm um campo "E-mail" cada.
5. O teste de teclado usa `Option+Tab` no WebKit: no Safari do macOS, `Tab` só passa pelos campos de texto.
6. Ambiente: `arquivos.spec.ts › abrir lê o arquivo escolhido` estourou o tempo uma vez no `make test-e2e-completo` e passou sozinho (`--last-failed`).

## T05-02

1. A categoria é um seletor com todas as categorias do tipo (subcategorias como "Pai › Filho", sem a de ajuste de saldo). A grade com as 8 mais usadas e "Ver todas" chega na T05-04.
2. Os chips Compra no cartão, Transferência e Pagamento de fatura aparecem desabilitados até a T05-03.
3. Sem nenhuma conta, o FAB (e a tecla N) abre o diálogo com o estado vazio "Para lançar, cadastre antes a sua primeira conta" e o botão "Cadastrar conta", que leva a `#/contas?nova=1`; a T05-08 abre o formulário de conta por esse parâmetro.
4. Última conta usada: a do `localStorage` deste aparelho (como a tarefa pede); sem ela, a do lançamento mais recente (como o MODELO-DADOS diz); sem lançamentos, a primeira conta ativa.
5. O snackbar mostra "Lançado · Desfazer" com a descrição do comando do core ("Lançado"). O design mostra também a descrição e o valor ("Lançado · Padaria São Jorge −R$ 15,90"); isso pede mudar a descrição do comando no core e ficou de fora.
6. O FAB é desenhado pelo próprio `LancarDialog` (posição fixa, abre pelo `useLancar`) para não editar a casca. Fica estendido no topo da página e só com o ícone depois de rolar.
7. Data efetivada no futuro: o erro do core aparece inline e o diálogo não fecha (o "Previsto" chega na T05-04).
8. Fora da pasta da tarefa: `react-hook-form` 7.91.0 no `apps/app/package.json` (aprovado), a mesma dependência no `optimizeDeps` do `vite.config.ts` (regra da T00-14, para o Vite não recarregar no meio dos testes) e o nome do diálogo em `tests/e2e/atalhos.spec.ts` ("Lançar" passou a "Novo lançamento", o título do design).
9. Ambiente: `arquivos.spec.ts › abrir lê o arquivo escolhido` estourou o tempo de novo no conjunto e passou sozinho.

## T05-03

1. "Parcelar esta compra" (design) não aparece: o diálogo Nova compra é a T05-13, fora desta sequência. A compra no cartão grava sempre à vista (1 parcela).
2. Sem cartão cadastrado, os chips Compra no cartão e Pagamento de fatura mostram, no lugar dos campos, o estado vazio "Para lançar no cartão, cadastre antes um cartão" e o botão "Cadastrar cartão", que leva a `#/cartoes?novo=1` (a T05-11 abre o formulário por esse parâmetro). O valor digitado fica, e "Salvar" fica desabilitado.
3. Último cartão usado: guardado no `localStorage` deste aparelho, como a última conta; sem ele, o primeiro cartão ativo.
4. Pagamento de fatura: as faturas oferecidas são as vencidas, as fechadas e a aberta (as que podem receber pagamento em 3.5), com o saldo de cada uma no rótulo. "Saldo total" é um chip que preenche o valor com o saldo da fatura escolhida. A prévia diz "restam R$ X nesta fatura", "o pagamento quita esta fatura" ou "sobram R$ X de crédito para a próxima fatura" (`previaDoPagamento`).
5. Ao trocar o cartão no pagamento, a conta volta à conta de pagamento do cartão e a fatura, ao destino padrão de 3.5.
6. Na transferência, a conta de destino já vem preenchida com a primeira conta ativa diferente da origem.
7. O aviso da transferência entre inclusões diferentes também cobre o sentido contrário ("o Saldo em contas vai subir R$ X").
8. A descrição (opcional) aparece em todos os tipos, inclusive transferência e pagamento de fatura (o lançamento tem o campo).
9. O `Enter` só envia a partir de um campo de texto: com o foco num seletor ou num chip, o `Enter` aciona aquele controle, como no navegador.

## T05-04

1. `sugestoesDeLancamento(fatos, tipo)` (core, aprovada): conta os lançamentos do tipo e, na despesa, também as compras no cartão. As descrições vêm das mais usadas para as menos (empate: a mais recente), sem diferenciar maiúsculas; a categoria sugerida é a do uso mais recente. Ficam fora a categoria de ajuste de saldo e as categorias que não existem mais.
2. A grade mostra as 8 mais usadas e, se a escolhida (por padrão "A classificar") não estiver entre elas, ela também, mais "Ver todas". Usuário sem histórico vê só a escolhida e "Ver todas".
3. A lista de sugestões mostra até 5 descrições que contêm o texto digitado. Com a lista aberta, `Esc` fecha só a lista (o diálogo continua aberto).
4. "Mais opções" diz "previsto e observação" (sem tags, D34). O "Previsto" aparece só em despesa e receita; não é marcado sozinho quando a data é futura: sem ele, o erro do core pede para marcar.
5. Aviso de data anterior ao saldo inicial (3.4): aparece quando a data é igual ou anterior à `dataSaldoInicial` da conta do movimento (a de origem, na transferência) e o lançamento é efetivado; compra no cartão e previsto não mexem no saldo e não mostram o aviso. "Mudar a data do saldo inicial" leva a data para a véspera do movimento, sem mudar o valor do saldo inicial, e grava a conta e o lançamento num comando só (o Desfazer desfaz os dois). A composição dos dois comandos está no app (`formulario.ts`), sem função nova no core.
6. Na transferência, o aviso olha só a conta de origem.
7. A data ocupa a linha inteira (chips Hoje e Ontem e o seletor nativo), e a conta vem na linha de baixo; no design, data e conta dividem a linha.

## T05-05

1. "Abaixo de 600 dp" é lido por `matchMedia('(width < 600px)')` num hook da própria pasta (`useCompact`), em vez do `use-mobile` do shadcn, que corta em 768.
2. No celular, Salvar fica no topo (como no design) e "Salvar e lançar outro" no rodapé fixo. Como Salvar está no topo, continua visível com o teclado aberto; o teste simula o teclado encolhendo a janela.
3. A grade de categorias usa 2 colunas no celular (o design usa 3): os nomes do seed, como "Saúde e bem-estar", quebrariam em 3.
4. Fora do escopo do design: a dica "Enter salva · Esc fecha" não aparece no celular.

## T05-06

1. **Divergência design × spec:** o design mostra o seletor de mês (`◀ Outubro 2026 ▶`) na top app bar; a spec (8.2) põe o `PeriodPicker` em Lançamentos. Segui a spec: o `PeriodPicker` fica no topo da tela, com o padrão "Este mês" e o período lembrado por aba (`usePeriodoDaUrl('lancamentos')`).
2. Os filtros vêm da URL com os nomes `tipo`, `conta`, `cartao`, `categoria` e `origem` (listas separadas por vírgula) e `q` (busca); são os que a T05-17 deve usar ao montar o clique dos gráficos. Os chips e menus de filtro chegam na T05-07.
3. Previstos: não são itens reconhecidos (3.3) e o filtro de estado só chega na T05-07; nesta tarefa a lista mostra só os realizados, como o "Estado: realizados" do design.
4. O seletor de visão fica acima do `PeriodPicker`, com "Movimentações" desabilitado até a T05-07; no design ele divide a faixa fixa com os totais.
5. O total do dia é receitas − despesas do dia (como no design, "+R$ 1.138,31" = 1.200,00 − 61,69), calculado com `somarItens` do core em `lista.ts`, fora do componente.
6. Estorno e ajuste de compra para menos (despesa negativa) aparecem como entrada: "+R$ X" em verde.
7. O parâmetro `?destaque=` que a busca global manda (T04-09) ainda não rola até o item.
8. Fora da pasta da tarefa: `@tanstack/react-virtual` 3.14.24 (aprovado) no `package.json` e no `optimizeDeps` do Vite.

## T05-07

1. `movimentacoes(fatos, hoje, periodo, filtros)` e `entradasESaidasDeCaixa(itens)` no core (aprovadas). A função recebe também `hoje`, para marcar como "Atrasado" a receita prevista com data passada (3.1). Compras canceladas ficam fora.
2. Cabeçalho de Movimentações: "Entradas de caixa" e "Saídas de caixa" dos itens realizados, sem transferências (o dinheiro continua com a pessoa) e sem compras no cartão (o caixa sai no pagamento da fatura). O design mostra também "Itens" (a contagem); ficou de fora porque o cabeçalho de contexto só mostra valores em dinheiro.
3. Total do dia em Movimentações: entradas − saídas de caixa do dia. Dia só com compras mostra "no cartão" e dia só com transferências, "R$ 0,00 no total", como no design.
4. Filtro de estado: Liquidado, A pagar, Vencido, Previsto e Atrasado; sem o parâmetro, "Estado: realizados" (os três primeiros). Em Receitas e despesas, os previstos que aparecem com o filtro são as despesas e receitas avulsas marcadas como previstas, com chip e fora dos totais; as ocorrências ainda não confirmadas das recorrências não entram (ficam nas telas de Rendas e Gastos fixos e na Projeção).
5. Filtro de conta e de cartão: um só por vez (menu de opção única); tipo, categoria, estado e origem aceitam vários. Na transferência, o filtro de conta vale para a origem ou o destino. Trocar de visão limpa o filtro de tipo, porque os tipos das duas visões são diferentes.
6. Ações por item: "Classificar" em itens "A classificar" (lançamentos e compras, inclusive pela parcela), e o menu "Ações de …" com Editar (receita, despesa e transferência) e Excluir (qualquer lançamento, menos amortização). Excluir não pede confirmação: o Desfazer do snackbar volta tudo. Parcelas e compras ainda não abrem o menu da compra (T05-14, fora desta sequência).
7. Editar usa o mesmo formulário de lançamento (`features/lancar/EditarLancamento.tsx`), com título "Editar lançamento", o tipo travado (o core não deixa mudar) e sem "Salvar e lançar outro".

## T05-08

Tela sem design (DESIGN-HANDOFF 7): montada com os componentes existentes, no vocabulário de `PainelSaldos.dc.html` (cards) e do `LancarDialog.dc.html` (diálogo).

1. **Lista:** cabeçalho de contexto com Saldo em contas, Saldo em todas as contas e o botão "Nova conta"; cards em grade (1, 2 ou 3 colunas) com a cor, o nome (link para o extrato), o chip "Fora do total", o saldo atual em destaque e "tipo · instituição". Saldo indisponível (antes do saldo inicial) mostra "Antes do saldo inicial". Sem sparkline nem variação, que o design do Painel tem.
2. **Arquivadas:** um botão "Arquivadas (N)" no fim, recolhido por padrão; os cards arquivados ficam iguais, com o menu Desarquivar e Excluir.
3. **Menu da conta:** botão "Ações de <nome>" no card. Item desabilitado mostra o motivo do core (`permissoesDaConta`) logo abaixo do rótulo, em vez de tooltip (item desabilitado de menu não recebe foco nem hover). Excluir desabilitado diz "Arquive-a", que é o "oferece Arquivar" da tarefa; não há atalho direto para arquivar dali.
4. **Formulário:** diálogo "Nova conta" / "Editar conta" com Nome, Instituição, Tipo, Saldo inicial, Data do saldo inicial (com "Saldo no fim deste dia…"), Cor (8 círculos da paleta categórica) e "Incluir no total" (interruptor). A cor nova é a primeira que nenhuma conta ativa usa.
5. **Saldo negativo:** a máscara só aceita dígitos; um chip "Negativo" ao lado do campo troca o sinal (cheque especial). Com saldo zero o campo fica vazio, com "R$ 0,00" de exemplo, como o valor do lançamento.
6. **Tipo investimento:** no cadastro, escolher Investimento desmarca "Incluir no total" e escolher outro tipo marca de novo; na edição, trocar o tipo não mexe nesse campo.
7. **Conta de pagamento de cartão ativo:** o interruptor "Incluir no total" fica desabilitado, com o motivo como descrição.
8. **Prévia na edição:** ao mudar saldo inicial ou data, o bloco "O que muda ao salvar" mostra o saldo atual antes → depois e quantos movimentos passam a ficar (ou deixam de ficar) anteriores ao saldo inicial (`impactoDoNovoSaldoInicial`).
9. Arquivar e excluir não pedem confirmação: o Desfazer do snackbar volta.
10. `#/contas?nova=1` abre o formulário de conta nova (o FAB do primeiro uso, T05-02, leva para lá).

## T05-09

1. O título da top app bar continua "Contas" (vem da casca, pelo item do menu); o nome da conta aparece num título logo acima dos chips, com o botão "Voltar para Contas". No design, o nome da conta é o título da barra.
2. Meses anteriores ao saldo inicial: a tabela some com a coluna Saldo, o cabeçalho mostra só "Saldo atual · hoje" e as linhas de abertura e fechamento não aparecem. Dentro de um mês com saldo, a linha anterior ao saldo inicial mostra o chip "Anterior ao saldo inicial" e "—" na coluna Saldo, com o texto "Antes do saldo inicial informado" como tooltip e nome acessível.
3. Descrição das linhas: a mesma da visão Movimentações (`movimentacoes` do core); a transferência que chega diz "Transferência · de <conta de origem>". "Categoria ou tipo": a categoria, ou o tipo do lançamento quando não há categoria.
4. Transferir e Ajustar saldo entram na T05-10; nesta tarefa a barra de ações tem Lançar e Exportar CSV. Conta arquivada: sem Lançar, com o aviso "Conta arquivada: o extrato é só para leitura."; Exportar CSV continua.
5. CSV: `extrato-<nome-da-conta>-<AAAA-MM>.csv`, separado por `;` com vírgula decimal (como os CSV dos gráficos): cabeçalho, abertura, uma linha por movimento, entradas, saídas e fechamento.
6. Conta inexistente na URL: estado vazio "Esta conta não existe mais; talvez tenha sido excluída." com "Voltar para Contas".
7. Os testes passaram a achar o FAB pelo `aria-keyshortcuts="N"`, porque o extrato também tem um botão "Lançar".
8. Ambiente: `movimentacoes.spec.ts › editar abre o mesmo formulário…` (WebKit) estourou o tempo uma vez no conjunto e passou sozinho.

## T05-10

Diálogos sem design (DESIGN-HANDOFF 7): no vocabulário do `LancarDialog.dc.html`.

1. **Transferir:** abre o mesmo formulário de lançamento, com o título "Transferir", o chip Transferência marcado e a conta da tela como origem; o destino vem com a primeira outra conta ativa. Os outros chips continuam disponíveis (a pessoa pode trocar o tipo ali). O invólucro foi generalizado em `features/lancar/EditarLancamento.tsx` (`LancarComPadrao`), o mesmo da edição.
2. **Ajustar saldo:** "Saldo real" (com o chip "Negativo") e "Data" (padrão hoje). O saldo real começa no saldo calculado de hoje, então a diferença começa em zero e "Ajustar" vem desabilitado com "O saldo já confere". O bloco "Antes de salvar" mostra o saldo calculado na data, o informado e a diferença (`diferencaDeAjuste`); data igual ou anterior ao saldo inicial mostra "O ajuste precisa ser depois da data do saldo inicial." e também desabilita.
3. O campo de saldo com sinal virou um componente da pasta de contas (`CampoDeSaldo`), usado no formulário de conta e no Ajustar saldo.
4. Conta arquivada: sem Transferir nem Ajustar saldo (extrato só para leitura).
5. No cabeçalho do extrato, entradas e saídas zeradas aparecem como "R$ 0,00", sem sinal nem cor.

## T05-11

Lista e formulário sem design (DESIGN-HANDOFF 7): a face do cartão de `PainelCartoes.dc.html` e o vocabulário do formulário de conta (T05-08).

1. **Lista:** cabeçalho de contexto com A pagar nos cartões, Obrigações de cartão e "Novo cartão"; cards em grade (1 ou 2 colunas) com a face do cartão na cor escolhida (nome, "fecha dia F · vence dia V" do ciclo vigente na fatura aberta, "Fatura aberta · vence dd/mm" e o saldo da aberta) e, abaixo, "Limite disponível X de Y" com a barra de limite usado. O nome é o link para a fatura e o card inteiro é clicável. Ficaram de fora os blocos do Painel ("Próxima a vencer", "Pagar fatura", Obrigações por cartão), que são da T05-19.
2. **Barra de limite:** usa o `Progress` do tema (cor primária), não a cor do cartão como no design: a cor do indicador é fixa no componente, e mudá-la pediria editar `src/components/ui`.
3. **Paleta do cartão:** `cartao-a`, `cartao-b` e as categóricas 1, 2, 4, 5 e 7. As categóricas 3, 6 e 8 ficaram de fora porque o texto branco da face fica abaixo de 4,5:1 nelas. O cartão novo vem com a primeira cor que nenhum cartão ativo usa.
4. **Texto da face no tema escuro:** não há token de cor clara fixa nos dois temas (`on-primary` fica escuro no tema escuro). A face usa `on-primary` no claro e `on-surface` no escuro; no escuro, o contraste fica abaixo de 4,5:1 nas categóricas 2, 4, 5 e 7. **Sugestão:** um token `on-cartao` (branco nos dois temas) em `tema.css` e `theme-tokens.ts`, numa tarefa que possa editá-los.
5. **Formulário:** diálogo "Novo cartão" / "Editar cartão" com Nome, Instituição, Limite (máscara da direita), Dia de fechamento e Dia de vencimento (campos numéricos de 1 a 31), Conta de pagamento (padrão: a primeira conta ativa incluída no total), "Saldo da fatura fechada a pagar (opcional)" com a explicação, Cor e o bloco "Antes de salvar" com a prévia de `previaDoCadastro`.
6. **Editar:** os dias aparecem desabilitados, com o texto "Para mudar os dias, use "Configurar ciclo" no menu do cartão."; mudar o limite mostra "Limite disponível: antes → depois" (`limiteDisponivel` com as Obrigações do cartão).
7. **Menu do cartão:** botão "Ações de <nome>" na face. Itens desabilitados mostram o motivo do core (`podeArquivarCartao`, `podeExcluirCartao`) abaixo do rótulo, como em Contas. "Configurar ciclo" leva a `#/cartoes/<id>?acao=ciclo`: o diálogo é da T05-15, na tela do cartão. Cartão arquivado: só Desarquivar e Excluir.
8. `ItemDoMenu` e `useRodar` estão repetidos de `features/contas/ContasPagina.tsx` (são locais dela e a tarefa não podia editá-la). **Sugestão:** levá-los para `src/components` numa tarefa que possa editar as duas pastas.
9. Arquivar e excluir não pedem confirmação: o Desfazer do snackbar volta.
10. `#/cartoes?novo=1` abre o formulário de cartão novo (o "Cadastrar cartão" do formulário de lançamento, T05-03, leva para lá).
11. Sem nenhuma conta incluída no total, a Conta de pagamento fica vazia com "Cadastre antes uma conta incluída no total." e Salvar recusa com "Escolha a conta de pagamento".
12. "Editar" no menu não devolve o foco ao botão "Ações de …" ao fechar o menu (`onCloseAutoFocus` com `preventDefault`): o foco voltava ao botão depois que o diálogo abria e engolia o que se digitava no formulário (o teste de editar o limite falhava 1 vez em 5). O menu da conta (`features/contas/ContasPagina.tsx`) tem o mesmo padrão e o mesmo risco; não foi mexido.
