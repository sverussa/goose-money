# T03-08 · Deep link e redefinição de senha

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 3 · Dados no app | Acesso · Plataforma | T03-01, T03-07 | `feat/app-deep-link` |

**Referências:** PROMPT 6.1, 6.9 (Acesso) · DECISOES D2, D20

## Objetivo

Fazer o link de "Esqueci a senha" funcionar no navegador e no app desktop.

## Escopo

- Fluxo PKCE do Supabase: o e-mail traz um link com `?code=…` que volta para o app.
- Navegador: `redirectTo` = `<origem>/#/redefinir-senha`; o app troca o código pela sessão (`exchangeCodeForSession`) e mostra o formulário de nova senha.
- Tauri: plugin `tauri-plugin-deep-link` com o esquema `goosemoney://`; `redirectTo` = `goosemoney://redefinir-senha`; ao receber o link, o app traz a janela para a frente e segue o mesmo fluxo.
- `supabase/config.toml`: `goosemoney://**` em `additional_redirect_urls`.
- Rota `#/redefinir-senha` com o formulário "Nova senha" e "Confirmar nova senha" (validação: mínimo de caracteres conforme a política do Supabase Auth; as duas iguais).
- Teste com o Mailpit local (54324): pedir redefinição, abrir o e-mail, seguir o link, definir a nova senha e entrar com ela.

## Fora do escopo

"Alterar senha" logado, em Configurações (T05-28).

## Passos

1. Configurar o deep link no Tauri e o redirect no Supabase local.
2. Implementar a rota e a troca do código.
3. Testar no navegador (Playwright lendo o Mailpit pela API dele) e no Tauri (manual).

## Critérios de aceite

- [ ] No navegador, o fluxo completo termina com login usando a senha nova.
- [ ] No Tauri, clicar no link do e-mail abre o app na tela de nova senha.
- [ ] Link expirado ou já usado mostra "Link inválido ou expirado" com o botão "Pedir novo link".
