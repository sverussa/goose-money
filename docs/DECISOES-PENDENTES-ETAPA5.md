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
