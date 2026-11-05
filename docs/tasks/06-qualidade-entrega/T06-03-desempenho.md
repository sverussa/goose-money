# T06-03 · Desempenho com volume real

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 6 · Qualidade e entrega | Desempenho | Etapa 5 | `feat/desempenho` |

**Referências:** PROMPT 9.3 (Desempenho) · DECISOES D9, D13

## Objetivo

Confirmar na interface, com 10 mil lançamentos, os limites que o core já cumpre isoladamente (T01-18).

## Escopo

- Script de carga: usuário de teste com 10 mil lançamentos (`gerarFatosVolumosos`, T01-18) gravado no banco local.
- Medições no navegador (Playwright + `performance.mark`):
  - tempo de recálculo dos indicadores após uma gravação (meta < 100 ms, só o cálculo, sem a rede)
  - projeção de 24 meses (meta < 200 ms)
  - rolagem da lista de Lançamentos com 10 mil itens sem quedas visíveis
  - carga inicial (`carregar_tudo` + mapeamento + derivação), registrada como referência
- Corrigir o que passar dos limites (memoização, divisão de código das páginas, virtualização).
- Registrar os números medidos no PR e em `docs/DECISOES.md` se algum limite precisar mudar.

## Fora do escopo

Otimização de rede do Supabase.

## Passos

1. Criar o script de carga.
2. Medir, corrigir, medir de novo.

## Critérios de aceite

- [ ] Indicadores em menos de 100 ms e projeção de 24 meses em menos de 200 ms com 10 mil lançamentos (9.3).
- [ ] A lista de Lançamentos com 10 mil itens rola sem travar.
