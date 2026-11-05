# T03-07 · Salvar e abrir arquivos (navegador e Tauri)

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 3 · Dados no app | Plataforma | T00-07 | `feat/app-arquivos` |

**Referências:** PROMPT 2 (Arquivos no desktop), 6.4 (Exportar CSV), 8.3, 9.2 · DECISOES D20

## Objetivo

Um adaptador único para salvar e abrir arquivos, que funciona no navegador e no desktop.

## Escopo

- `apps/app/src/plataforma/ambiente.ts`: `estaNoTauri()` (pela presença de `window.__TAURI_INTERNALS__`).
- `apps/app/src/plataforma/arquivos.ts`:
  - `salvarArquivo({ nomeSugerido, tipo, conteudo: Blob | string })`
    - navegador: download por `Blob` + `URL.createObjectURL` + `<a download>`
    - Tauri: `save()` do plugin `dialog` para escolher o caminho e `writeFile`/`writeTextFile` do plugin `fs`
  - `abrirArquivo({ tipos })` → `{ nome, conteudo }`
    - navegador: `<input type="file">`
    - Tauri: `open()` do plugin `dialog` e `readTextFile`
  - cancelar o diálogo devolve `null`, sem erro
- Plugins no Tauri: `tauri-plugin-dialog` e `tauri-plugin-fs` (Rust e JS), registrados em `lib.rs`.
- Capabilities mínimas em `src-tauri/capabilities/default.json`: `dialog:allow-save`, `dialog:allow-open`, `fs:allow-write-file`, `fs:allow-write-text-file`, `fs:allow-read-text-file`, com escopo só nos caminhos escolhidos pelo usuário no diálogo.
- Plugins importados dinamicamente só quando `estaNoTauri()`, para não pesar no app web.

## Fora do escopo

Conteúdo dos arquivos (CSV, PNG, backup ficam nas telas).

## Passos

1. Implementar os dois caminhos.
2. Testar no navegador (Playwright, evento `download`) e no Tauri (manual, registrar o resultado no PR).

## Critérios de aceite

- [ ] No navegador, salvar um CSV baixa o arquivo com o nome sugerido.
- [ ] No Tauri, o diálogo nativo abre e o arquivo é gravado no caminho escolhido.
- [ ] Cancelar o diálogo não mostra erro.
- [ ] Nenhuma permissão de `fs` sem escopo.
