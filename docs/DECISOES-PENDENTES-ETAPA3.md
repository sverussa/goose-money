# Decisões pendentes da etapa 3 (dados no app)

Casos que a spec não cobre ou em que o texto da tarefa diverge do `MODELO-DADOS.md` ou da spec. Em cada um, a opção mais conservadora foi seguida; aguardam aprovação.

## T03-01
1. Ainda não há tela de login (T05-01) nem rotas do menu (T04-05). Para a sessão funcionar de ponta a ponta e o teste abrir `#/contas`, entram um login provisório (`LoginProvisorio`) e uma página provisória para toda rota autenticada (`path="*"`, `InicioProvisorio`, com o botão "Sair"). As duas tarefas substituem esses arquivos.
2. `@tanstack/react-query` e `src/queries/cliente.ts` (com as opções da T03-03) entram já aqui, porque "Sair" limpa o cache.
3. "Sair" encerra a sessão só neste aparelho (`signOut({ scope: 'local' })`); o padrão do Supabase (`global`) derrubaria a sessão em todos os aparelhos. Sem rede, o supabase-js remove a sessão local do mesmo jeito.
4. E-mail ainda não confirmado mostra "Confirme o e-mail antes de entrar" (6.1 só cobre credencial inválida e falta de rede). Só aparece com a senha certa, então não revela a quem não sabe a senha se o e-mail existe. Outros erros: "Não foi possível entrar. Tente de novo."
5. `inicializar_usuario()` roda uma vez por usuário a cada abertura do app com sessão, e não só logo depois do login: é idempotente e recria as categorias de sistema que faltarem. Se falhar, as telas ficam bloqueadas com "Tentar de novo" (o Motor e os comandos precisam das categorias de sistema).
6. `?voltar=` só aceita rota interna (começa com `/`, sem `//` e sem `/login`); qualquer outro valor volta para `/`, para o link de login não levar a outro site.
7. `criarUsuario` (`supabase/tests/apoio.ts`) passou a devolver também e-mail e senha, para o Playwright entrar pela tela. A `service_role` continua só no código de teste e em `supabase/tests/.env`.
8. "Fechar e reabrir o navegador" é testado abrindo uma aba nova no mesmo contexto: ela começa com o `sessionStorage` vazio e o mesmo `localStorage`, como o navegador reaberto.

## T03-02
1. Um mapeamento só, por convenção de nomes (tabela e coluna são o nome do domínio em `snake_case`), em vez de um `deBanco`/`paraBanco` escrito à mão por tabela. A checagem de tipos (`Confere` em `mapeamento.ts`) compara, tabela por tabela, as colunas de `database.types.ts` com os campos do core: coluna ou tabela nova de um lado só quebra o `tsc` (conferido acrescentando uma coluna aos tipos gerados).
2. `paraBanco` não manda `id`, `created_at`, `updated_at` e `created_by` (o `gravar` os preenche) e manda `is_deleted`. Por isso a ida e volta é `deBanco(paraBanco(x) + colunas de controle do banco) = x`.
3. `taxa_mensal` (`numeric`) chega do JSON como número e vira texto com até 15 dígitos significativos, sem notação científica (`1e-7` → `"0.0000001"`). Uma taxa com mais de 15 dígitos significativos perderia precisão na leitura (não acontece com taxa digitada). Na gravação ela vai como texto, sem perda.
4. Todo número lido, salvo `taxa_mensal`, precisa ser inteiro seguro; senão `carregarTudo` falha com "tabela.coluna: valor não é um inteiro seguro".
5. Os testes do app que dependem do banco ficam em `apps/app/tests/db`, num projeto Vitest próprio (`app-db`), fora do CI como o `db`; `pnpm test:db` roda os dois. `src/data/supabase.ts` usa o `localStorage` ao ser importado, que o Node não tem: os testes chamam as funções puras (`lerFatos`, `paraBanco`) com o cliente dos utilitários de `supabase/tests`.

## T03-03
1. O `QueryClient` com as opções desta tarefa já tinha entrado na T03-01 (decisão T03-01.2); aqui entram o `QueryClientProvider` em uso, os hooks e o relógio.
2. `src/queries/relogio.ts` é o único módulo que lê o relógio: além de `useHoje`, tem `agoraIso()`, o instante das colunas de controle que os comandos do core pedem no `Contexto` (T03-04). O "hoje" também é conferido no evento `focus` da janela (cobre o computador que acorda depois da meia-noite).
3. Com fatos em cache, uma recarga que falha continua mostrando os últimos fatos (o estado de erro só aparece sem nenhum dado); o banner de T03-05 avisa que podem estar desatualizados, como em 9.3.
4. Hooks finos criados agora: `useBarraDeTotais`, `useIndicadoresDoPeriodo` e `useFaturas`. Os demais nascem com as telas que os usam.
5. A página provisória (T03-01.1) mostra "hoje" e os indicadores da Barra em centavos, sem formatação, para o Playwright conferir a virada do dia e a recarga pelo foco com o relógio falso (`page.clock`). Sai com a T04-05/T04-06.
6. Com `staleTime` de 30 s, voltar o foco só recarrega fatos com mais de 30 s; o teste avança o relógio 31 s antes de devolver o foco.
