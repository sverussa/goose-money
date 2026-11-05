# T06-04 · App desktop pronto para distribuir

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 6 · Qualidade e entrega | Desktop | T06-02, T06-05 | `feat/desktop-release` |

**Referências:** PROMPT 2 · DECISOES D1, D20 · `docs/StackShowCase.md` (D09, D11)

## Objetivo

Gerar instaladores do app desktop apontando para o Supabase de produção.

## Escopo

- Ícones definitivos (desktop e `manifest.webmanifest`) gerados a partir do logotipo do design, com `tauri icon`.
- CSP de produção: `connect-src` com o domínio do projeto Supabase de produção (T06-05) no lugar do local.
- Variáveis de produção no build (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) vindas do ambiente de build, nunca commitadas.
- Testes manuais na WebView de cada plataforma alvo: login, deep link de senha (T03-08), salvar e abrir arquivo (T03-07), tema, atalhos. Registrar o resultado no PR.
- Plataformas e assinatura conforme a decisão D1.

## Fora do escopo

Atualização automática do app (não prevista na spec).

## Passos

1. Ícones e CSP.
2. Build por plataforma.
3. Testes manuais.

## Critérios de aceite

- [ ] O instalador abre o app conectado à produção.
- [ ] Deep link e arquivos funcionam no app instalado.
- [ ] Nenhuma chave além da `anon` no pacote.

## Decisões

**D1. Para quais plataformas gerar e como distribuir?**

- **A)** Só macOS no primeiro momento, com assinatura e notarização da Apple (exige conta Apple Developer, US$ 99/ano), para o app abrir sem alertas. *(recomendado se o uso for pessoal no Mac)*
- **B)** macOS, Windows e Linux pelo GitHub Actions (`tauri-action`), sem assinatura no início; o sistema mostra alerta de app desconhecido.
- **C)** Sem instalador por enquanto: usar o app web instalável (manifest) e deixar o desktop para depois.
