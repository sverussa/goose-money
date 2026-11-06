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

## T03-04
1. `src/data/gravacao.ts` tem a parte pura (ops, leitura e validação da resposta, aplicação no cache, mensagens de erro) e `src/data/gravar.ts` só chama o `gravar` do Supabase. As opções da mutação ficam em `src/queries/gravacao.ts`, sem React nem Supabase: o teste usa o `MutationObserver` do TanStack (o mesmo do `useMutation`) para conferir "Salvando…" (`isPending`), o cache intacto no erro e o Desfazer. O `useComando` só liga essas opções ao Sonner.
2. As linhas devolvidas pelo `gravar` também são validadas pelos schemas do core (D42), como na carga; das excluídas basta o id.
3. "Desfazer" grava as inversas do comando pelo mesmo caminho e mostra o snackbar "Desfeito", sem novo "Desfazer" (o spec não pede refazer).
4. `useComando().executar(comando)` devolve `true`/`false` em vez de lançar: o formulário fecha só quando gravou; o erro já foi mostrado no snackbar.
5. Mensagens de erro: unicidade (`23505`), referência (`23503`), registro não encontrado (`P0002`), regra (`23514`, `23502`, `P0001`), sem conexão (requisição sem resposta, `status 0`, ou navegador offline) e sessão expirada (`401`/`PGRST30x`). Erro de domínio (`ErroDeDominio`) mostra a mensagem do core. As telas podem trocar por mensagens por restrição (o `detail` traz o nome) quando precisarem.
6. A Barra de antes de cada gravação (inclusive do Desfazer) fica em `src/queries/barraAnterior.ts` (`useBarraAnterior`), com um contador de versão para a T04-06 animar mesmo quando os valores repetem.
7. Correção da T03-03: o `derivar` passou a ser feito uma vez para o app inteiro (`derivarUmaVez`, pela identidade dos fatos e pelo dia), em vez de uma vez por componente que usa `useDerivado` (D13).
8. Sonner: `components/ui/sonner.tsx` escrito à mão, como o do shadcn mas sem `next-themes` (o tema escuro é da T04-02).
9. **Verificação pendente (sem tela ainda):** o botão mostrando "Salvando…" e o snackbar com "Desfazer" na interface ficam para o Playwright da T05-02 (primeiro formulário). A lógica está testada no Node e contra o banco.

## T03-05
1. A conexão (`src/data/conexao.ts`) é o `fetch` do próprio cliente Supabase (`global.fetch`): toda chamada sem resposta (inclusive do Auth) liga o "sem conexão", e qualquer resposta HTTP o desliga. Com o navegador dizendo "online" mas a chamada falhando, uma sonda a `auth/v1/health` tenta de novo a cada 15 s até haver resposta. Requisição cancelada (`AbortError`) não conta.
2. O `onlineManager` do TanStack Query segue a mesma conexão: consultas pausam sem rede e retomam quando ela volta.
3. `refetchOnReconnect: 'always'` em vez de `true`: com `true` e `staleTime` de 30 s, voltar a rede logo depois de uma carga não recarregava, e o critério pede recarregar ao voltar (outro aparelho pode ter gravado no intervalo).
4. Mutações com `networkMode: 'always'`: sem isso o TanStack deixaria a gravação offline pausada em silêncio ("Salvando…" sem fim). Agora ela falha na hora com "Sem conexão: tente de novo quando a internet voltar", sem chamar o banco.
5. O banner fica, por enquanto, no topo das rotas autenticadas (`RotaProtegida`); a T04-05 o põe logo abaixo da top app bar. Não aparece no login, que tem a própria mensagem.
6. `BotaoSalvar` (`src/components`): "Salvando…" durante a gravação e desabilitado sem conexão, com a explicação no `title` até o `Tooltip` da T04-03.
7. **Verificação pendente (sem tela ainda):** "Salvar fica desabilitado offline" na interface fica para o Playwright da T05-02, primeiro formulário a usar o `BotaoSalvar`. O banner, a recarga ao voltar e a recusa da gravação offline estão testados.

## T03-06
1. A lógica fica em `confirmarPendentes` (`src/queries/confirmacaoAutomatica.ts`), sem React, testada contra o banco local; o hook só a dispara e mostra o snackbar. Cada pendente vira um `confirmarOcorrencia` do core (uma ocorrência por chamada do `gravar`), em vez do `confirmarEmLote`, que juntaria todas numa gravação só.
2. Além de `23505` (outro aparelho já confirmou, pulado sem erro), uma ocorrência que o core ou o banco recusa por outra regra (ex.: conta arquivada) é pulada e volta a ser tentada na próxima rodada, para não travar as seguintes. Sem rede ou com a sessão expirada, a rodada para em silêncio e tenta de novo na próxima (é automática; nada que o usuário pediu se perde).
3. Roda depois da primeira carga, na virada do dia, ao voltar a conexão e a cada 60 minutos. Depois de um conflito, recarrega os fatos (o que o outro aparelho gravou ainda não estava no cache).
4. O snackbar conta só o que este aparelho registrou. "Revisar" leva a `#/lancamentos?origem=recorrencia&criadosEm=<hoje>`; os nomes dos parâmetros são provisórios até os filtros da T05-07.
5. O hook fica montado na área autenticada (`AreaAutenticada`, em `RotaProtegida.tsx`) até o `AppShell` (T04-05).
6. Vitest: o projeto `app-db` roda depois do `db` (`groupOrder` 1) e o desempenho do core passou para o fim (`groupOrder` 2, sozinho como antes). Com os dois projetos de banco ao mesmo tempo, os testes de tempo do `db` (carga de 10 mil lançamentos em < 1 s, importação em < 8 s) estouravam com a máquina carregada. Os limites não mudaram.

## T03-07
1. Versões (D5, D58), conferidas à mão no crates.io e no npm em 06/11/2026: crates `tauri-plugin-dialog =2.8.4` (28/10) e `tauri-plugin-fs =2.7.1` (14/10); indiretos novos no `Cargo.lock`: `tauri-plugin 2.7.2` (14/10) e `rfd 0.17.2` (12/01). JS: `@tauri-apps/plugin-dialog 2.8.4` (28/10) e `@tauri-apps/plugin-fs 2.7.1` (14/10). Nenhum precisou voltar de versão.
2. As permissões do `fs` não têm escopo fixo: sem o diálogo, nenhum caminho é acessível. O plugin `dialog` acrescenta ao escopo do `fs` só o arquivo escolhido em `save()`/`open()` (conferido no código do crate 2.8.4). Por isso o `fs` é registrado antes do `dialog` em `lib.rs`.
3. `salvarArquivo` devolve o caminho salvo (Tauri) ou o nome sugerido (navegador), e `null` se o usuário cancelou o diálogo. No navegador não dá para saber se o download foi cancelado.
4. `abrirArquivo({ tipos })` recebe extensões sem ponto (`['json']`) e lê só texto (backup e CSV). Cancelar o seletor do navegador devolve `null` pelo evento `cancel`.
5. Ainda não há tela que salve ou abra arquivos: o Playwright importa o módulo direto do servidor do Vite (`/src/plataforma/arquivos.ts`) e confere o download, o nome sugerido, o conteúdo, a leitura pelo seletor e que os plugins do Tauri não carregam no navegador.
6. **Verificação manual pendente (Tauri):** com `make dev-desktop`, no console do devtools, `(await import('/src/plataforma/arquivos.ts')).salvarArquivo({ nomeSugerido: 'teste.csv', tipo: 'text/csv', conteudo: 'a;b' })` deve abrir o diálogo nativo e gravar no caminho escolhido; `abrirArquivo({ tipos: ['csv'] })` deve ler o arquivo; cancelar os dois diálogos deve devolver `null` sem erro. Também cancelar o seletor de arquivo no navegador (o Playwright não simula o cancelamento). Automatizado: `cargo check`, que valida as permissões da capability pelo `build.rs`.
