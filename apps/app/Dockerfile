# App web em Docker (make app-docker-start): build do Vite e Caddy servindo os arquivos estáticos (D53, D81).
# Contexto do build: a raiz do monorepo. As variáveis VITE_ entram no build, não no contêiner em execução.

FROM node:26.13.0-alpine AS build
RUN npm install -g pnpm@12.16.1
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --filter @goose-money/app...
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
RUN pnpm build

FROM caddy:2.11.7-alpine
COPY apps/app/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /repo/apps/app/dist /srv
