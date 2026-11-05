# T03-01 · Sessão, rotas protegidas e saída

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 3 · Dados no app | Acesso | T00-11, T02-08 | `feat/app-sessao` |

**Referências:** PROMPT 6.1, 5.2 (menu do usuário) · DECISOES D2, D20 (PKCE)

## Objetivo

Controlar a sessão do Supabase Auth no app: quem está logado, o que fazer sem sessão e como sair.

## Escopo

- `apps/app/src/data/auth.ts` (único lugar que chama `supabase.auth`): `entrar(email, senha, manterConectado)`, `sair()`, `sessaoAtual()`, `aoMudarSessao(cb)`, `pedirRedefinicao(email)`, `redefinirSenha(nova)`.
- `apps/app/src/app/providers/sessao.tsx`: contexto com `usuario`, `carregando` e as ações; ouve `onAuthStateChange`.
- `RotaProtegida`: sem sessão, redireciona para `#/login?voltar=<rota pedida>`; após o login, volta à rota pedida (6.1).
- Logo após entrar, chama `inicializar_usuario()` (T02-08) antes de liberar as telas.
- `sair()`: encerra a sessão, limpa o cache do TanStack Query (T03-03) e vai para `/login`.
- "Manter conectado" decide o armazenamento da sessão (adaptador de T00-11).
- Erros do Auth traduzidos: credencial inválida → "E-mail ou senha inválidos"; sem rede → "Sem conexão para entrar" (6.1).

## Fora do escopo

A tela de login (T05-01).

## Passos

1. Escrever as funções e o provider.
2. Testes unitários do mapeamento de erros e do cálculo da rota de volta.
3. Teste Playwright: abrir `#/contas` sem sessão vai para o login e volta depois de entrar (usa o usuário de teste local).

## Critérios de aceite

- [ ] Rota protegida sem sessão redireciona para `/login` e volta à rota pedida após o login (11.1).
- [ ] "Sair" limpa a sessão e o cache.
- [ ] Sem "Manter conectado", fechar e reabrir o navegador pede login de novo.
