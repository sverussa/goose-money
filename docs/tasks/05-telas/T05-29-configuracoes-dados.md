# T05-29 · Configurações › Dados: backup, exemplo e apagar tudo

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 5 · Telas | Configurações | T05-28, T02-10, T01-19, T01-20, T03-07 | `feat/config-dados` |

**Referências:** PROMPT 4.1 (item 3), 6.9 (Dados), 9.2, 10, 11.7 · `design/telas/Configuracoes.dc.html` · DESIGN-HANDOFF 7 (fluxo de importação não desenhado)

## Objetivo

Exportar, importar, carregar dados de exemplo e apagar tudo, com as confirmações exigidas.

## Escopo

- **Exportar**: gera o backup (`exportar`, T01-20) e salva `goose-money-backup-AAAA-MM-DD.json` (T03-07).
- **Importar** (fluxo não desenhado, em etapas num diálogo):
  1. escolher o arquivo (T03-07) e o modo: Substituir (padrão) ou Mesclar
  2. validação e relatório prévio com contagens, conflitos e erros por entidade (`relatorio`, T01-20), como no design
  3. botão "Importar" só se o plano for válido; em Substituir, antes de gravar, baixa automaticamente um backup do estado atual
  4. resultado: "N registros importados" ou o erro, sem nada gravado
- **Carregar dados de exemplo**: só com a base vazia; com dados, o botão fica desabilitado com o motivo "Disponível só sem dados. Use Apagar tudo antes" (D50); gera com `gerarSeed(hoje)` e grava num comando.
- **Apagar tudo**: confirmação digitando "APAGAR"; chama `apagar_tudo()` (exclusão lógica, 9.4); depois mostra o estado vazio do app.

## Fora do escopo

Eliminação definitiva dos dados (LGPD, T06-06).

## Passos

1. Montar a seção e o diálogo de importação.
2. Testes Playwright de 11.7 (exportar, apagar, importar em Substituir; importar duas vezes em Mesclar; arquivo com referência quebrada).

## Critérios de aceite

- [ ] Exportar, apagar tudo e importar em Substituir reproduz todos os indicadores (11.7).
- [ ] Importar o mesmo arquivo em Mesclar não cria duplicatas (11.7).
- [ ] Arquivo com referência quebrada não grava nada e o relatório aponta a entidade (11.7).
- [ ] "Apagar tudo" só roda depois de digitar "APAGAR".

## Decisão tomada

**D1. Dados de exemplo** (respondida pelo Saulo em 05/11/2026): só com a base vazia (opção A). Registrada em `DECISOES.md` D50.
