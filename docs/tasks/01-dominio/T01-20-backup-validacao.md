# T01-20 · Backup: envelope, validação e relatório

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 1 · Domínio | Backup | T01-05 | `feat/core-backup` |

**Referências:** PROMPT 9.1, 9.2, 9.4, 11.7

## Objetivo

Criar `packages/core/src/backup/`: o formato do arquivo e as três primeiras etapas da importação, tudo puro. A gravação é T02-10.

## Escopo

- Schema de backup: `{ schemaVersion, exportadoEm, app: "goose-money", dados: { …entidades } }`, reaproveitando os schemas de domínio de cada entidade.
- `exportar(fatos, agora)`: só registros não excluídos, com colunas de controle.
- `migrarBackup(arquivo)`: aplica migrações por `schemaVersion` (começa com a versão 1 e uma lista vazia de migrações).
- Validação em etapas, cada uma devolvendo erros por entidade:
  1. estrutural (schema)
  2. integridade referencial: toda referência (`contaId`, `cartaoId`, `compraId`, `categoriaId`, `recorrenciaId`…) aponta para entidade do arquivo ou da base, conforme o modo
  3. invariantes de domínio (3.6, chaves únicas de 3.8)
- `planejarImportacao(arquivo, fatosAtuais, modo)`:
  - **Substituir**: o que marcar como excluído e o que gravar por id
  - **Mesclar**: mesmo id → fica o de `updatedAt` mais recente; ids novos → adiciona; conflito de chave única → mantém o existente e lista no relatório
  - depois de mesclar, revalida as invariantes; se quebrar, o plano é inválido
- `relatorio(plano)`: contagens por entidade, conflitos e erros (etapa 4, mostrada antes do botão "Importar").

## Fora do escopo

Gravação e backup automático antes de Substituir (T02-10), tela (T05-29).

## Passos

1. Testes com arquivo válido, com referência quebrada e com conflito de chave única.
2. Implementar.

## Critérios de aceite

- [ ] Exportar e planejar Substituir sobre a base vazia reproduz os mesmos fatos (11.7).
- [ ] Mesclar o mesmo arquivo duas vezes não cria duplicatas (11.7).
- [ ] Parcela apontando para compra inexistente invalida o plano e o relatório aponta a entidade (11.7).
- [ ] Registros excluídos nunca aparecem no arquivo exportado.
