# Decisões pendentes da etapa 5

Decisões tomadas durante as tarefas da etapa 5 (e da T00-14, que a prepara) em casos que a spec não cobre ou em que foi preciso escolher. Cada uma espera aprovação; as aprovadas vão para `docs/DECISOES.md`.

## T00-14

1. A limpeza dos usuários de teste desliga os gatilhos das tabelas de negócio durante a exclusão (`session_replication_role = replica`), em vez de só seguir a ordem inversa de `tabelas_de_negocio()`, que não é uma ordem de dependência. Os gatilhos voltam antes de apagar de `auth.users`.
2. `recorrencias` também ganhou o índice por dono, embora não estivesse na lista da tarefa: o plano varria inteiro o índice `(id, created_by)`.
3. O projeto `db-tempo` roda um arquivo por vez (`fileParallelism: false`): com os dois arquivos em paralelo, o teste de 1 s ainda falhava.
4. `massa.test.ts` foi inteiro para o `db-tempo`, como a tarefa pede, embora só o último teste meça tempo.
