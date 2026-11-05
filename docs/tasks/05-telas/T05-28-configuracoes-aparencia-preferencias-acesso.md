# T05-28 · Configurações › Aparência, Preferências e Acesso

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 5 · Telas | Configurações | T05-27, T04-02, T03-01 | `feat/config-preferencias` |

**Referências:** PROMPT 5.3 (limite de alerta, olho), 6.1, 6.9 (Acesso, Aparência, Preferências) · `design/telas/Configuracoes.dc.html` · DECISOES D20 (preferências)

## Objetivo

As três seções de ajustes do usuário.

## Escopo

- **Aparência**:
  - tema claro, escuro ou sistema (T04-02; guardado no aparelho)
  - "Ocultar valores ao abrir" (guardado no Supabase, em `preferencias`)
- **Preferências** (no Supabase):
  - limite de alerta do Previsto (padrão R$ 500,00, campo com máscara de dinheiro)
  - horizonte padrão da projeção (3, 6, 12 ou 24 meses)
  - confirmação automática por recorrência: lista das recorrências com um switch cada (atalho para o campo `autoConfirmar`)
- **Acesso**: "Alterar senha" com senha atual, nova e confirmação (Supabase Auth); e-mail do usuário mostrado só para leitura; botão "Sair".
- Salvar cada preferência usa `useComando` com Desfazer.

## Fora do escopo

Dados (T05-29).

## Passos

1. Montar as seções.
2. Testes Playwright: mudar o limite de alerta muda a cor do Previsto na Barra.

## Critérios de aceite

- [ ] Mudar o limite de alerta para acima do Previsto deixa o Previsto em `warning` na hora (5.3).
- [ ] As preferências salvas aparecem iguais em outro navegador logado na mesma conta.
- [ ] Alterar senha com a senha atual errada mostra erro inline.
