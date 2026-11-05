# T06-06 · Privacidade e LGPD

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 6 · Qualidade e entrega | Privacidade | T06-05 | `feat/privacidade` |

**Referências:** README (objetivo de privacidade) · DECISOES D18, D22, Em aberto (LGPD, criptografia ponta a ponta)

## Objetivo

Fechar os dois pontos de privacidade em aberto antes da primeira versão pública (fase 4 do roadmap).

## Escopo

- Eliminação definitiva (D54): `make db-eliminar-usuario EMAIL=…`, fora do app, apaga fisicamente todas as linhas do usuário e a conta no Auth, numa transação, com confirmação digitada do e-mail. Roda com a conexão administrativa de `.env.producao`, nunca pelo app.
- Sem criptografia ponta a ponta no MVP (D55): os dados ficam protegidos por login, RLS e criptografia em disco do provedor. O texto de privacidade diz isso com clareza.
- Texto curto de privacidade no app (Configurações, rodapé do login e tela Criar conta, já que o cadastro é aberto, D28): onde os dados ficam (Supabase, região de T06-05), quem acessa e como pedir a eliminação.
- Acrescentar `db-eliminar-usuario` na tabela de PROMPT 12.3.

## Fora do escopo

Política de privacidade jurídica completa.

## Passos

1. Escrever o script de eliminação e testá-lo no banco local com dois usuários (só o pedido é apagado).
2. Escrever o texto de privacidade.

## Critérios de aceite

- [ ] Existe um caminho documentado e testado para apagar de verdade os dados de um usuário.
- [ ] O texto de privacidade descreve o comportamento real do app.

## Decisões tomadas

Respondidas pelo Saulo em 05/11/2026, ambas na opção A.

- **D1. Eliminação definitiva** (D54): script administrativo.
- **D2. Criptografia ponta a ponta** (D55): não no MVP.
