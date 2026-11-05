# T05-01 · Login

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 5 · Telas | Acesso | T03-01, T04-03 | `feat/tela-login` |

**Referências:** PROMPT 6.1, 11.1 · `design/telas/Login.dc.html` · DESIGN-HANDOFF 3 (linha Login) · DECISOES D2, D18

## Objetivo

Implementar `#/login` como no design, com Supabase Auth.

## Escopo

- Card centralizado de no máximo 400 dp, raio 28: logotipo, "Goose Money" (não "Meu Caixa"), frase de apoio do design.
- Campos outlined "E-mail" (no lugar de "Usuário", D2) e "Senha" com botão mostrar/ocultar (`aria-label` alternando "Mostrar senha"/"Ocultar senha").
- Checkbox "Manter conectado neste dispositivo".
- Botão "Entrar"; `Enter` envia; foco inicial em E-mail.
- Erro inline "E-mail ou senha inválidos" com `role="alert"`, campo de senha em `error` e `aria-invalid` (como no design); "Sem conexão para entrar" quando não houver rede.
- Link "Esqueci a senha" abrindo um diálogo que pede o e-mail e chama `pedirRedefinicao` (T03-01); mensagem neutra "Se o e-mail estiver cadastrado, você vai receber um link" (não revela se a conta existe).
- **Remover** o rodapé "Seus dados ficam só neste dispositivo" (D18).
- Após entrar, volta à rota pedida (T03-01).

## Fora do escopo

Tela de nova senha (T03-08) e tela de cadastro (T05-30). O link "Criar conta" abaixo de "Entrar" entra na T05-30.

## Passos

1. Montar a tela com os componentes base.
2. Testes Playwright de 11.1 (acesso) com o usuário de teste local.

## Critérios de aceite

- [ ] Usuário válido entra; credencial errada mostra o erro inline sem limpar o e-mail (11.1).
- [ ] Rota protegida sem sessão redireciona e volta após o login (11.1).
- [ ] Tudo funciona só com o teclado, e o axe passa.
- [ ] Nenhum texto "Meu Caixa" na tela.
