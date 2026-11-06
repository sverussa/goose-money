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
