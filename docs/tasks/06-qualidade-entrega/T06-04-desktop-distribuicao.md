# T06-04 · App desktop pronto para distribuir

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 6 · Qualidade e entrega | Desktop | T06-02, T06-05 | `feat/desktop-release` |

**Referências:** PROMPT 2 · DECISOES D1, D20, D27, D51 · `docs/StackShowCase.md` (D09, D11)

## Objetivo

Gerar instaladores do app desktop apontando para o Supabase de produção.

## Escopo

- Ícones definitivos (desktop e `manifest.webmanifest`) gerados a partir do logotipo do design, com `tauri icon`.
- CSP de produção: `connect-src` com o domínio do projeto Supabase de produção (T06-05) no lugar do local.
- Variáveis de produção no build (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) vindas do ambiente de build, nunca commitadas.
- Testes manuais na WebView de cada plataforma alvo: login, deep link de senha (T03-08), salvar e abrir arquivo (T03-07), tema, atalhos. Registrar o resultado no PR.
- Plataformas (D51): macOS (Apple Silicon e Intel), Windows e Linux, gerados pelo GitHub Actions com `tauri-action` (fixada por SHA, como em T00-12), ao criar uma tag `v*`. Os instaladores ficam anexados a um GitHub Release.
- Sem assinatura no início: o macOS (Gatekeeper) e o Windows (SmartScreen) avisam que o app é de desenvolvedor desconhecido. Documentar no README como abrir o app mesmo assim em cada sistema.
- Publicar o SHA-256 de cada instalador no Release.

## Fora do escopo

Atualização automática do app (não prevista na spec).

## Passos

1. Ícones e CSP.
2. Workflow de release com `tauri-action` nas três plataformas.
3. Testes manuais.

## Critérios de aceite

- [ ] Os instaladores de macOS, Windows e Linux saem do workflow e abrem o app conectado à produção.
- [ ] Deep link e arquivos funcionam no app instalado.
- [ ] Nenhuma chave além da `anon` no pacote.

## Decisão tomada

**D1. Plataformas** (respondida pelo Saulo em 05/11/2026): macOS, Windows e Linux pelo GitHub Actions, sem assinatura no início (opção B). Assinatura fica para quando o app tiver mais usuários. Registrada em `DECISOES.md` D51.
