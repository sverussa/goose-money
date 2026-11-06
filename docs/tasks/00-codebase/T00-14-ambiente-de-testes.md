# T00-14 · Ambiente de testes rápido e estável

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 0 · Codebase (extra) | Ferramentas · Banco | T02-11, T04-09 | `feat/ambiente-testes` |

**Referências:** CLAUDE.md (regras de banco, comandos) · PROMPT 9.3 (desempenho), 12.3 · DECISOES D29, D56 · `tasks-agents-estrategies.md` (Ambiente compartilhado)

## Objetivo

Fazer `make check` e `make test-e2e` levarem o mesmo tempo na décima rodada que na primeira e falharem só quando há bug. Na etapa 4, quase toda tarefa precisou de várias rodadas por causa de três problemas:

- o banco local cresceu a cada rodada (cerca de 1.300 usuários de teste e 200 mil lançamentos) e ficou lento;
- a máquina chegou a carga 14–23 com os dois navegadores do Playwright, o Supabase e o app;
- o Vite recarregava a página no meio dos testes ao otimizar dependências.

## Escopo

### 1. Banco: medir e indexar

- **Medir antes de mudar.** Num teste temporário (ou num script em `supabase/tests/`), com o banco cheio como está, rode `explain (analyze, buffers)` da consulta que `carregar_tudo()` faz em cada tabela, como um usuário de teste autenticado. Anote quais tabelas fazem `Seq Scan`.
- **O que já se sabe:**
  - `lancamentos` já tem `lancamentos_por_data (created_by, data) where not is_deleted`, então pode não ser essa a causa;
  - `compras`, `itens_fatura`, `dividas` e `recorrencias` não têm índice que comece por `created_by` com o predicado `not is_deleted`;
  - confira também `cartao_ciclos`.
- **Corrigir.** Uma migração `V012__indices_por_dono.sql` com `create index <tabela>_por_dono on public.<tabela> (created_by) where not is_deleted` só nas tabelas em que a medição mostrou varredura. Esses índices também servem em produção, onde todos os usuários dividem as mesmas tabelas.
- Se a medição mostrar outra causa (o `auth.uid()` no `execute` de `R__carregar_tudo.sql`, gatilhos ou estatísticas desatualizadas), corrija essa causa e descreva o que achou na seção "Decisões" desta tarefa.
- **Atualizar as estatísticas.** Nos testes de volume (`carregar-tudo.test.ts`, `massa.test.ts`), rode `analyze` nas tabelas carregadas logo depois da carga, pelo `sqlComoPostgres`.

### 2. Banco: limpar os usuários de teste

- Um script `supabase/tests/limpar.ts` que apaga fisicamente, pelo `sqlComoPostgres`, os usuários `@teste.local` criados há mais de 1 hora e todas as linhas deles:
  - nas tabelas de negócio, na ordem inversa de `tabelas_de_negocio()` (as FKs são `on delete restrict`);
  - depois, em `auth.users`.
- **Proteções:**
  - só roda se a URL do banco for `127.0.0.1` ou `localhost`; em qualquer outra, para com erro;
  - nunca apaga usuário de outro domínio;
  - o limite de 1 hora existe porque o Supabase local é compartilhado entre worktrees (Ambiente compartilhado): uma rodada nunca apaga os usuários de outra rodada em andamento.
- Roda no `globalSetup` do Vitest (`preparar.ts`) e num `globalSetup` novo do Playwright.
- Alvo `make db-limpar-testes`, que chama o mesmo script, para usar à mão.

### 3. Menos carga na máquina

- `playwright.config.ts`:
  - `workers: process.env.CI ? undefined : 2`;
  - sem a variável `E2E_COMPLETO`, roda só o projeto `chromium`.
- `make test-e2e` passa a rodar só o Chromium (dia a dia). Um alvo novo, `make test-e2e-completo`, roda Chromium e WebKit com `E2E_COMPLETO=1` e é o que vale antes do merge.
- `vitest.config.ts`: os testes de tempo do banco (`carregar-tudo.test.ts`, `massa.test.ts`) saem do projeto `db` para um projeto `db-tempo`, com `sequence: { groupOrder: 3 }`, depois de todos os outros. É o mesmo padrão do projeto `desempenho`.
- `supabase/config.toml`: desligue os serviços que nem o app nem os testes usam. Confira antes, com `grep` no código, se algum é usado:
  - candidatos: `[analytics]`, `[edge_runtime]`, `[storage]`, `[realtime]`;
  - o `[studio]` fica ligado;
  - o `[local_smtp]` fica ligado, porque os testes de cadastro e de redefinição de senha leem os e-mails.

### 4. Vite sem recarga no meio do teste

- `vite.config.ts`: `optimizeDeps.include` com as dependências que hoje são descobertas no primeiro uso:
  - `@tauri-apps/api`, `@tauri-apps/plugin-deep-link`, `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-fs`, `cmdk`, `vaul`, `recharts`, `html-to-image`, `radix-ui`;
  - confira a lista com `rm -rf apps/app/node_modules/.vite` seguido de uma rodada de `make test-e2e`: o log do Vite não pode mostrar "new dependencies optimized" nem "reloading".

### 5. Documentação

- `CLAUDE.md`, tabela de comandos:
  - `make test-e2e` (só Chromium);
  - `make test-e2e-completo` (antes do merge);
  - `make db-limpar-testes`.
- `docs/tasks/tasks-agents-estrategies.md`:
  - "Regras de merge": antes do merge, rodar `make check` e `make test-e2e-completo`;
  - "Ambiente compartilhado": a limpeza respeita o limite de 1 hora.
- Seção "Estrutura do repositório" do README, se aparecerem arquivos novos.

## Fora do escopo

- Rodar e2e no CI (D29 continua: o CI não sobe banco).
- `make db-eliminar-usuario` de produção (T06-06).
- Ajustes do Docker Desktop: são da máquina, não do repositório. Ficam como recomendação no resumo final (4 CPUs e 6 GB).

## Passos

1. Medir com o banco cheio, antes de qualquer mudança. Guardar os tempos de `carregar_tudo`, de `make check` e de `make test-e2e`.
2. Índices e `analyze`; medir de novo.
3. Limpeza dos usuários de teste.
4. Playwright, Vitest e `config.toml`.
5. `optimizeDeps`.
6. Rodar `make check` e `make test-e2e` três vezes seguidas e comparar com o passo 1.

## Critérios de aceite

- [ ] `explain` de `carregar_tudo` usa índice em todas as tabelas com muitas linhas, com o banco cheio de outros usuários.
- [ ] O teste "10 mil lançamentos em menos de 1 s" passa com 200 mil lançamentos de outros usuários no banco.
- [ ] Depois de `make db-limpar-testes`, não sobra usuário `@teste.local` com mais de 1 hora, nem linha dele nas tabelas de negócio. Os demais usuários continuam intactos.
- [ ] O script de limpeza se recusa a rodar com uma URL que não seja local (testado).
- [ ] Três rodadas seguidas de `make check` e `make test-e2e` passam sem nenhuma falha intermitente, e a terceira não é mais lenta que a primeira.
- [ ] Com o cache do Vite apagado, `make test-e2e` passa sem recarga de página.
- [ ] `make test-e2e-completo` passa em Chromium e WebKit.
- [ ] Tabela de tempos antes e depois no resumo da tarefa.

## Decisões e medições

Medido em 06/11/2026, num Mac de 8 núcleos e 8 GB, com o Supabase local compartilhado.

**`explain` de `carregar_tudo`** como o usuário de teste com 10 mil lançamentos, num banco de 67 mil (antes) e de 224 mil lançamentos (depois): `Seq Scan` em `contas`, `cartoes`, `compras`, `itens_fatura` e `dividas`; `recorrencias` varria inteiro o índice `(id, created_by)`. A V012 cria `<tabela>_por_dono` nessas seis. As outras já tinham índice começando por `created_by` com `not is_deleted`. A chamada inteira caiu de 543 ms para 281 ms; o resto é o `jsonb_agg` dos 10 mil lançamentos.

**A causa principal da falha de tempo** não era o banco: era a disputa de CPU. O teste "10 mil lançamentos em menos de 1 s" levava 3,2 s no `make check` e passava sozinho. Ele e o `massa.test.ts` foram para o projeto `db-tempo`, depois de todos os outros e um arquivo por vez (`fileParallelism: false`), porque os dois juntos ainda estouravam o limite.

**Limpeza:** a ordem inversa de `tabelas_de_negocio()` não basta. A lista não está em ordem de dependência (`lancamentos` aponta para `parcelas_divida`) e `on delete restrict` é checado na hora, mesmo com a chave adiável. O script desliga os gatilhos só nas tabelas de negócio (`set local session_replication_role = replica`) e os religa antes de apagar de `auth.users`, para o `on delete cascade` do Auth levar sessões e identidades. Como toda chave leva o dono junto (D71), não sobra referência solta. Na primeira rodada saíram 365 usuários em 1,5 s.

**Serviços desligados** no `config.toml`: `realtime`, `storage`, `edge_runtime` e `analytics` (o `vector` sai junto). Nenhum aparece no código do app nem dos testes. Os containers caíram de 12 para 7.

| Medida | Antes | Depois (rodadas 1 / 2 / 3) |
| --- | --- | --- |
| `make check` | 31,8 s, **1 falha** (tempo de `carregar_tudo`) | 33,1 / 32,1 / 32,4 s, sem falhas |
| `make test-e2e` | 134,6 s (Chromium e WebKit, 128 testes) | 54,4 / 55,1 / 54,1 s (Chromium, 64 testes) |
| `make test-e2e-completo` | — | 103,7 s (Chromium e WebKit, 128 testes) |
| Carga máxima da máquina no e2e | 17,6 | 7,9 |
| Recargas do Vite com o cache apagado | — | 0 |
| `carregar_tudo` (10 mil lançamentos) | 543 ms | 281 ms |

Recomendação para a máquina (fora do repositório): Docker Desktop com 4 CPUs e 6 GB.
