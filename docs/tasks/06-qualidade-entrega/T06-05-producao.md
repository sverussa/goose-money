# T06-05 · Ambiente de produção

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 6 · Qualidade e entrega | Produção | T02-11 | `feat/producao` |

**Referências:** PROMPT 12.2 (Produção), 12.3 · DECISOES D18, D23, D28, D52, D53 · `Makefile` (`db-migrate-prod`)

## Objetivo

Colocar o banco e o app web no ar.

## Escopo

- Projeto Supabase de produção (gerenciado) em São Paulo, `sa-east-1` (D52).
- Auth de produção: cadastro aberto com confirmação, como em T00-08 (D28), `site_url` e `additional_redirect_urls` com o domínio do app web e `goosemoney://**`, SMTP próprio para os e-mails de confirmação e de senha (o SMTP padrão do Supabase tem limite baixo de envio).
- `.env.producao` (fora do Git) com `FLYWAY_URL` pela conexão direta ou session pooler (porta 5432); `make db-migrate-prod` e `make db-validate` contra produção.
- Rodar a suíte de segurança de T02-11 contra produção com dois usuários de teste e apagar os usuários depois.
- App web numa **VPS privada** (D53), só arquivos estáticos (o build de `apps/app`):
  - `deploy/docker-compose.yml` e `deploy/Caddyfile`: Caddy em Docker servindo `dist/`, com HTTPS automático (Let's Encrypt)
  - cabeçalhos: `Content-Security-Policy` (`connect-src` só com o domínio do Supabase de produção), `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `frame-ancestors 'none'`
  - cache: `index.html` sem cache; arquivos com hash em `assets/` com cache longo e `immutable`
  - `make deploy-web`: build com as variáveis de produção e envio por `rsync` sobre SSH para a VPS (`VPS_HOST` e `VPS_DIR` em `.env.producao`), com confirmação digitada como `db-migrate-prod`
  - VPS mínima segura, documentada no README: acesso SSH só por chave e sem login de root, firewall liberando só 22, 80 e 443, atualizações de segurança automáticas
- Acrescentar `deploy-web` na tabela de PROMPT 12.3 e no `make help`.
- Backups do banco: conferir o plano do Supabase (backup diário) e registrar no README.

## Fora do escopo

App desktop (T06-04).

## Passos

1. Criar o projeto e configurar o Auth.
2. Aplicar as migrações.
3. Preparar a VPS e publicar o app web com `make deploy-web`.

## Critérios de aceite

- [ ] `make db-migrate-prod` aplica todas as migrações e `db-validate` passa.
- [ ] A suíte de segurança passa contra produção.
- [ ] O app web em produção faz login, grava e desfaz.
- [ ] O domínio responde só por HTTPS, com os cabeçalhos de segurança acima (conferir com `curl -I`).

## Decisões tomadas

Respondidas pelo Saulo em 05/11/2026.

- **D1. Região do Supabase** (D52): São Paulo, `sa-east-1` (opção A).
- **D2. Hospedagem do app web** (D53): VPS privada, resposta fora das opções. O Supabase continua gerenciado; só o app web vai para a VPS. Provedor da VPS e domínio ainda não definidos.
