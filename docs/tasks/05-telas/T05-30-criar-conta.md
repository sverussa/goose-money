# T05-30 · Criar conta

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 5 · Telas | Acesso | T05-01, T03-08, T02-08 | `feat/tela-criar-conta` |

**Referências:** PROMPT 6.1, 11.1 · DECISOES D28 · `design/telas/Login.dc.html` (vocabulário visual; a tela não tem desenho, DESIGN-HANDOFF 7)

## Objetivo

Permitir que uma pessoa crie a própria conta no Goose Money, com confirmação por e-mail.

## Escopo

- `apps/app/src/data/auth.ts`: `cadastrar(email, senha)` com `supabase.auth.signUp` e `emailRedirectTo` igual ao da redefinição de senha (T03-08), apontando para `#/confirmar` no navegador e `goosemoney://confirmar` no Tauri.
- Link "Criar conta" no Login (T05-01), abaixo de "Entrar".
- Rota pública `#/criar-conta`, no mesmo card do Login:
  - campos "E-mail", "Senha" (mostrar/ocultar) e "Confirmar senha"
  - validação com Zod: e-mail válido, senha com no mínimo 8 caracteres (igual a `minimum_password_length` de T00-08), as duas iguais; erros inline com `role="alert"`
  - botão "Criar conta" com "Salvando…" enquanto espera; "Sem conexão para criar a conta" sem rede
  - link "Já tenho conta" de volta ao Login
- Depois do envio, a mesma mensagem neutra em qualquer caso: "Se o e-mail puder ser cadastrado, você vai receber um link de confirmação". Não revela se a conta já existe.
- Rota `#/confirmar`: troca o código pela sessão (`exchangeCodeForSession`, como em T03-08), chama `inicializar_usuario()` (T02-08) e abre o Painel no estado de primeiro uso (7.2). Link inválido ou expirado mostra "Link inválido ou expirado" com "Voltar ao login".
- Tentar entrar antes de confirmar mostra "Confirme seu e-mail para entrar" no Login.

## Fora do escopo

Política de privacidade (T06-06), login com Google ou outros provedores, convites.

## Passos

1. Implementar `cadastrar` e as duas rotas.
2. Testes Playwright com o Mailpit local: criar conta, abrir o e-mail, seguir o link, cair no primeiro uso com as categorias de sistema criadas.
3. Teste manual no Tauri: o link do e-mail abre o app e conclui a confirmação.

## Critérios de aceite

- [ ] Fluxo completo no navegador: criar conta, confirmar pelo e-mail e entrar no primeiro uso (11.1).
- [ ] Antes de confirmar, o login é recusado com "Confirme seu e-mail para entrar".
- [ ] Cadastrar um e-mail que já existe mostra a mesma mensagem neutra e não envia o usuário para dentro do app.
- [ ] Senha com menos de 8 caracteres ou confirmação diferente é recusada antes de chamar o Supabase.
- [ ] Tudo funciona só com o teclado, e o axe passa.
