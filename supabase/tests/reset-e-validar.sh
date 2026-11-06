#!/bin/sh
# 11.8: recria o banco local só com as migrações Flyway e confere que validam (T02-11).
# Apaga todos os dados locais: o make db-reset pede para digitar RESET.
set -e
make db-reset
make db-validate
pnpm test:db
