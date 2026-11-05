# T06-05 · Ambiente de produção

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 6 · Qualidade e entrega | Produção | T02-11 | `feat/producao` |

**Referências:** PROMPT 12.2 (Produção) · DECISOES D18, D23, Em aberto (região) · `Makefile` (`db-migrate-prod`)

## Objetivo

Colocar o banco e o app web no ar.

## Escopo

- Projeto Supabase de produção na região da decisão D1.
- Auth de produção: cadastro conforme T00-08 (D1), `site_url` e `additional_redirect_urls` com o domínio do app web e `goosemoney://**`, SMTP próprio para os e-mails de senha (o SMTP padrão do Supabase tem limite baixo de envio).
- `.env.producao` (fora do Git) com `FLYWAY_URL` pela conexão direta ou session pooler (porta 5432); `make db-migrate-prod` e `make db-validate` contra produção.
- Rodar a suíte de segurança de T02-11 contra produção com dois usuários de teste e apagar os usuários depois.
- Hospedagem do app web conforme a decisão D2, com HTTPS e variáveis de build.
- Backups do banco: conferir o plano do Supabase (backup diário) e registrar no README.

## Fora do escopo

App desktop (T06-04).

## Passos

1. Criar o projeto e configurar o Auth.
2. Aplicar as migrações.
3. Publicar o app web.

## Critérios de aceite

- [ ] `make db-migrate-prod` aplica todas as migrações e `db-validate` passa.
- [ ] A suíte de segurança passa contra produção.
- [ ] O app web em produção faz login, grava e desfaz.

## Decisões

**D1. Em que região criar o projeto Supabase?** (ponto em aberto no DECISOES.md)

- **A)** São Paulo (`sa-east-1`): menor latência no Brasil e dados no país (LGPD). *(recomendado)*
- **B)** Leste dos EUA (`us-east-1`): costuma receber recursos novos primeiro e custa um pouco menos, com latência maior.
- **C)** Decidir pela latência medida de onde o app será mais usado.

**D2. Onde hospedar o app web?**

- **A)** Cloudflare Pages: estático, HTTPS e CDN grátis, deploy por Git. *(recomendado)*
- **B)** Vercel: mesmo modelo, com pré-visualização por PR muito simples.
- **C)** GitHub Pages: grátis e no mesmo lugar do código; menos controle de cabeçalhos HTTP.
