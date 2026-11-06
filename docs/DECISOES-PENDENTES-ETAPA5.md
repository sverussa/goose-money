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
