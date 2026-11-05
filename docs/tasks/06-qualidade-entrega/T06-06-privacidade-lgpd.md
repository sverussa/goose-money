# T06-06 · Privacidade e LGPD

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 6 · Qualidade e entrega | Privacidade | T06-05 | `feat/privacidade` |

**Referências:** README (objetivo de privacidade) · DECISOES D18, D22, Em aberto (LGPD, criptografia ponta a ponta)

## Objetivo

Fechar os dois pontos de privacidade em aberto antes da primeira versão pública (fase 4 do roadmap).

## Escopo

- Eliminação definitiva dos dados de um usuário, conforme a decisão D1.
- Criptografia ponta a ponta, conforme a decisão D2.
- Texto curto de privacidade no app (Configurações, rodapé do login e tela Criar conta, já que o cadastro é aberto, D28): onde os dados ficam (Supabase, região de T06-05), quem acessa e como pedir a eliminação.
- Registrar as escolhas no `DECISOES.md` e remover os itens de "Em aberto".

## Fora do escopo

Política de privacidade jurídica completa.

## Passos

1. Responder as decisões.
2. Implementar o que for escolhido.

## Critérios de aceite

- [ ] Existe um caminho documentado e testado para apagar de verdade os dados de um usuário.
- [ ] O texto de privacidade descreve o comportamento real do app.

## Decisões

**D1. Como apagar de verdade os dados de um usuário que pede (LGPD)?**

- **A)** Script administrativo (`make db-eliminar-usuario EMAIL=…`), fora do app, que apaga fisicamente todas as linhas do usuário e a conta no Auth, com confirmação digitada. *(recomendado)*
- **B)** Botão "Excluir minha conta" em Configurações, que chama uma função com privilégio elevado para apagar tudo do próprio usuário.
- **C)** Nada no MVP; tratar pedidos manualmente no painel do Supabase.

**D2. Criptografar os dados no app antes de enviar ao Supabase?**

- **A)** Não no MVP: os dados ficam protegidos por login, RLS e criptografia em disco do provedor. *(recomendado)*
- **B)** Só os textos livres (descrições e observações), com chave derivada da senha; valores e datas continuam legíveis para as restrições do banco.
- **C)** Tudo, com chave derivada da senha: máxima privacidade, mas perde as restrições e a unicidade no banco e torna a recuperação de senha impossível sem perder os dados.
