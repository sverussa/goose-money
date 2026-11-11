# Comandos do projeto (PROMPT 12.3, D24). Compatível com GNU Make 3.81.
# Cada alvo só chama pnpm, docker compose ou pnpm exec supabase; a lógica fica no package.json.

# Variáveis locais (PORTA_APP, VITE_*, FLYWAY_*) vão para os comandos.
-include .env
export

SUPABASE = pnpm exec supabase
DOCKER_OK = @docker info >/dev/null 2>&1 || { echo "O Docker não está rodando. Abra o Docker Desktop e tente de novo."; exit 1; }

.DEFAULT_GOAL := help

.PHONY: help setup dev dev-desktop app-docker-start app-docker-stop db-start db-stop db-status db-compose-start db-compose-stop db-compose-status db-migrate db-info db-validate \
	db-reset db-migrate-prod db-types db-limpar-testes deploy-web db-eliminar-usuario test test-e2e \
	test-e2e-completo lint format \
	format-check typecheck check build build-desktop

help: ## Lista os alvos
	@grep -E '^[a-zA-Z0-9_-]+:.*## ' Makefile | awk 'BEGIN {FS = ":.*## "}; {printf "  %-22s %s\n", $$1, $$2}'

setup: ## Instala as dependências e cria o .env a partir do .env.example
	pnpm install
	@test -f .env || { cp .env.example .env; echo "Criado .env a partir do .env.example. Preencha VITE_SUPABASE_ANON_KEY com make db-status."; }
	@test -f supabase/tests/.env || { cp supabase/tests/.env.example supabase/tests/.env; echo "Criado supabase/tests/.env. Preencha as chaves com make db-status."; }

dev: ## App web no navegador (Vite, porta PORTA_APP, padrão 1420)
	pnpm dev

dev-desktop: ## App Tauri em desenvolvimento (sempre na porta 1420, a do devUrl)
	PORTA_APP=1420 pnpm dev:desktop

app-docker-start: ## App web em Docker (build do Vite + Caddy) na porta PORTA_APP; precisa do Supabase local
	$(DOCKER_OK)
	@test -n "$(VITE_SUPABASE_ANON_KEY)" || { echo "Preencha VITE_SUPABASE_ANON_KEY no .env (make db-status ou make db-compose-status)."; exit 1; }
	docker compose up -d --build --wait app
	@echo "App em http://localhost:$(or $(PORTA_APP),1420)"

app-docker-stop: ## Para o app web em Docker
	docker compose down app

db-start: ## Sobe o Supabase local
	$(DOCKER_OK)
	$(SUPABASE) start

db-stop: ## Para o Supabase local
	$(SUPABASE) stop

db-status: ## Mostra URLs e chaves do Supabase local
	$(SUPABASE) status

db-compose-start: ## Sobe o Supabase local por docker compose, sem a CLI (mesmas portas e chaves; pare a CLI antes)
	$(DOCKER_OK)
	pnpm db:compose-start

db-compose-stop: ## Para o Supabase do docker compose (mantém o volume do banco)
	pnpm db:compose-stop

db-compose-status: ## Mostra os serviços e as chaves do Supabase do docker compose
	pnpm db:compose-status

db-migrate: ## Aplica as migrações Flyway no banco local
	$(DOCKER_OK)
	docker compose run --rm flyway migrate

db-info: ## Mostra o estado das migrações
	$(DOCKER_OK)
	docker compose run --rm flyway info

db-validate: ## Confere nomes e checksums das migrações
	$(DOCKER_OK)
	docker compose run --rm flyway validate

db-reset: ## Recria o banco local do zero (supabase db reset + db-migrate); pede confirmação
	$(DOCKER_OK)
	@printf 'Isto apaga todos os dados do banco local. Digite RESET para confirmar: '; read r; [ "$$r" = "RESET" ] || { echo "Cancelado."; exit 1; }
	$(SUPABASE) db reset
	$(MAKE) db-migrate

db-migrate-prod: ## Aplica as migrações em produção com .env.producao; pede confirmação
	@test -f .env.producao || { echo "Falta o arquivo .env.producao com FLYWAY_URL, FLYWAY_USER e FLYWAY_PASSWORD de produção (fora do Git)."; exit 1; }
	$(DOCKER_OK)
	@printf 'Isto aplica as migrações no banco de PRODUÇÃO. Digite PRODUCAO para confirmar: '; read r; [ "$$r" = "PRODUCAO" ] || { echo "Cancelado."; exit 1; }
	docker compose --env-file .env.producao run --rm flyway migrate

db-types: ## Gera os tipos do banco local em apps/app/src/data/database.types.ts
	pnpm db:types

db-limpar-testes: ## Apaga os usuários de teste (@teste.local) com mais de 1 hora e os dados deles
	pnpm db:limpar-testes

deploy-web: ## Gera o build de produção e envia para a VPS (D53); pede confirmação
	@echo "Ainda não implementado: chega em T06-05 (produção)."; exit 1

db-eliminar-usuario: ## Apaga fisicamente os dados e a conta de um usuário (LGPD, D54); pede confirmação
	@echo "Ainda não implementado: chega em T06-06 (privacidade e LGPD)."; exit 1

test: ## Testes Vitest, inclusive os de banco (exigem db-start e db-migrate)
	pnpm test

test-e2e: ## Testes Playwright + axe-core, só no Chromium (dia a dia)
	pnpm test:e2e

test-e2e-completo: ## Testes Playwright + axe-core no Chromium e no WebKit; rodar antes do merge
	pnpm test:e2e-completo

lint: ## ESLint
	pnpm lint

format: ## Prettier
	pnpm format

format-check: ## Confere a formatação sem alterar arquivos
	pnpm format:check

typecheck: ## Checagem de tipos em todos os pacotes
	pnpm typecheck

check: format-check lint typecheck test db-validate ## Formatação, lint, tipos, testes e migrações; rodar antes do PR

build: ## Build do app web
	pnpm build

build-desktop: ## Build e empacotamento do Tauri
	pnpm build:desktop
