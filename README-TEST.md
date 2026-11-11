# 🧪 Goose Money: como testar o sistema

Guia prático para subir o Goose Money na sua máquina, criar uma conta e usar o sistema. Os comandos estão no [README.md](README.md), as regras de cálculo estão no [docs/PROMPT.md](docs/PROMPT.md), e `make` sem argumentos lista todos os comandos.

## 1. Subir o ambiente

Pré-requisitos: Docker (com Compose v2), Node.js 26 e pnpm 12 (versão exata em `packageManager`). Rust e as dependências do Tauri só são necessários para o app desktop.

```bash
make setup        # instala as dependências e cria o .env e o supabase/tests/.env
make db-start     # sobe o Supabase local em Docker (pela Supabase CLI)
make db-status    # mostra as chaves locais
make db-migrate   # cria as tabelas (Flyway)
make dev          # app web em http://localhost:1420
```

Na primeira vez, copie a chave **anon** que o `make db-status` mostra para `VITE_SUPABASE_ANON_KEY` no `.env`. A chave `service_role` vai **só** no `supabase/tests/.env`, nunca no `.env` do app.

**Sem a Supabase CLI:** troque `make db-start` por `make db-compose-start` e `make db-status` por `make db-compose-status`; o resto não muda. Use um modo de cada vez: os dois usam as mesmas portas e cada um tem o seu banco. Para parar, use `make db-stop` (CLI) ou `make db-compose-stop` (compose); os dados ficam guardados.

### Endereços locais

| O quê                               | Endereço                                       |
| ----------------------------------- | ---------------------------------------------- |
| App web                             | http://localhost:1420                          |
| Caixa de e-mails (Mailpit)          | http://localhost:54324                         |
| Supabase Studio (só para consultar) | http://localhost:54323                         |
| API do Supabase                     | http://127.0.0.1:54321                         |
| Postgres                            | `127.0.0.1:54322` (usuário e senha `postgres`) |

Se alguma porta estiver ocupada, o Supabase não sobe: libere a porta antes. No Studio, só consulte os dados: mudanças no banco são sempre migrações Flyway.

## 2. Criar a conta

1. Abra http://localhost:1420. Sem sessão, o app mostra o **Login**.
2. Clique em **Criar conta** (ou abra `http://localhost:1420/#/criar-conta`).
3. Preencha:
   - **E-mail:** qualquer endereço, mesmo inventado (ex.: `eu@exemplo.local`). Nenhum e-mail sai da sua máquina.
   - **Senha:** no mínimo 8 caracteres.
   - **Confirmar senha:** igual à senha.
4. Clique em **Criar conta**. A tela mostra uma mensagem neutra pedindo para conferir o e-mail. A mensagem é a mesma quando o e-mail já tem conta, de propósito, para não revelar quem está cadastrado.

> ⚠️ **Não use endereços `@teste.local`.** Os testes automáticos e o `make db-limpar-testes` apagam esses usuários, e todos os dados deles, uma hora depois de criados.

## 3. Confirmar o e-mail

Local, os e-mails não chegam na sua caixa de verdade: o **Mailpit**, um servidor de e-mail falso que roda em Docker junto com o Supabase, guarda todos.

1. Abra http://localhost:54324.
2. Abra o e-mail de confirmação do endereço que você usou.
3. Clique no link. Ele abre `#/confirmar` no app, que entra direto no **Painel** (vazio, no primeiro acesso).

Cuidados:

- **Abra o link no mesmo navegador em que criou a conta.** Em outro navegador aparece "Link inválido ou expirado", mas o e-mail fica confirmado assim mesmo: entre pelo login normal.
- **Antes de confirmar**, o login recusa com "Confirme seu e-mail para entrar".
- **Link vencido ou já usado:** a tela mostra "Link inválido ou expirado" e o botão "Voltar ao login". Crie a conta de novo ou peça "Esqueci a senha".

## 4. Entrar, sair e senha

- **Entrar:** e-mail e senha no Login. Com **Manter conectado** marcado, a sessão continua depois de fechar e abrir o navegador; sem ele, o app pede o login de novo.
- **Esqueci a senha:** o link no Login envia um e-mail de redefinição, que também chega no Mailpit (http://localhost:54324). O link abre a tela para definir a senha nova.
- **Trocar a senha:** em **Configurações › Acesso › Alterar senha**. O app pede a senha atual antes de trocar. As sessões abertas em outros aparelhos não são encerradas.
- **Sair:** em **Configurações › Acesso › Sair**.

## 5. Carregar os dados de exemplo

Uma conta nova começa vazia, só com as categorias iniciais. Para explorar o sistema com dados prontos:

1. Abra **Configurações › Dados**.
2. Clique em **Carregar dados de exemplo**.

O botão só funciona com a **base vazia**: nada além das categorias e das preferências. Se você já lançou algo, use antes **Apagar tudo** na mesma seção (pede para digitar `APAGAR`).

Os dados de exemplo são montados **a partir de hoje**: M0 é o mês corrente e M−1 o anterior. Por isso os valores não batem com os das telas de design, que usam hoje = 04/11/2026. Os dados incluem:

- **Contas:** Conta corrente (R$ 3.200,00), Poupança (R$ 8.000,00), Carteira (R$ 150,00) e Investimentos (R$ 15.000,00, fora do total).
- **Rendas fixas:** Salário R$ 6.500,00 no dia 5, com confirmação automática, e Freelance no dia 20, com duas versões de valor. Mais o 13º previsto para o mês que vem.
- **Gastos fixos:** Aluguel, Internet, Academia, Energia no **dia 31** (para testar meses curtos) e Streaming no Cartão A. Mais o IPVA previsto para daqui a dois meses.
- **Cartões:** Cartão A (fecha dia 3, vence dia 10) e Cartão B (fecha dia 25, vence dia 5).
- **Compras parceladas:** Notebook em 10x, Geladeira em 6x e Fone em 3x, além de compras à vista todo mês.
- **Faturas:** uma fatura paga parcialmente com juros e uma paga a mais, que gera crédito na seguinte.
- **Dívidas:** um financiamento de veículo (Price, 48x) e um empréstimo pessoal com parcela informada.
- **Histórico:** lançamentos desde M−3, duas transferências, dois itens em "A classificar" e, se o dia 20 já passou, o Freelance do mês atrasado nas pendências.

Os dados de exemplo podem ser desfeitos pelo **Desfazer** do aviso que aparece logo depois de carregar.

## 6. Roteiro de uso

| Tela                                      | O que testar                                                                                                                                                              |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Lançar** (botão flutuante ou tecla `N`) | Despesa, receita, compra no cartão, transferência e pagamento de fatura no mesmo formulário. As sugestões de descrição e categoria vêm do que você já lançou.             |
| **Painel › Visão geral**                  | Pendências com a ação direto nelas: pagar fatura, confirmar renda, pagar gasto fixo e parcela de dívida. Mostra também os indicadores, os gráficos e as maiores despesas. |
| **Painel › Saldos, Cartões e Projeções**  | A evolução dos saldos, a situação dos cartões, a projeção dos próximos meses e o simulador "E se?".                                                                       |
| **Barra de totais** (topo)                | Saldo em contas, Previsto, A pagar e os outros indicadores; cada um explica o cálculo no tooltip. O ícone de olho oculta os valores.                                      |
| **Lançamentos**                           | As visões "Receitas e despesas" e "Movimentações", com filtros, busca e ações em cada item.                                                                               |
| **Contas**                                | Cadastro, extrato mensal, Transferir e Ajustar saldo.                                                                                                                     |
| **Cartões**                               | Fatura por mês com o status, compra à vista ou parcelada, estorno, encargo e Pagar fatura.                                                                                |
| **Dívidas**                               | Cadastro em 5 etapas com a tabela de amortização, registrar pagamento e amortizar.                                                                                        |
| **Rendas fixas e Gastos fixos**           | Confirmar, ignorar o mês, editar a partir de um mês e excluir. O gasto pode ser pago em conta ou confirmado no cartão.                                                    |
| **Configurações**                         | Categorias, tema, "Ocultar valores ao abrir", limite de alerta, horizonte das projeções, confirmação automática, backup e Apagar tudo.                                    |

Toda gravação mostra "Salvando…" e um aviso com **Desfazer**.

## 7. Backup

- **Exportar** (Configurações › Dados) salva `goose-money-backup-AAAA-MM-DD.json`.
- **Importar** mostra o relatório do que vai mudar antes de gravar:
  - **Substituir** troca tudo pelo arquivo e baixa antes um backup do estado atual.
  - **Mesclar** junta o arquivo aos dados atuais, sem criar duplicados.
- **Limite conhecido:** importar com **Substituir** um backup de **outra conta** falha, porque as categorias de sistema têm ids diferentes. Nada é gravado e o erro aparece. Restaurar o **seu próprio** backup funciona.

## 8. App desktop (Tauri)

```bash
make dev-desktop
```

Roda sempre na porta 1420; pare o `make dev` antes, se estiver nela. Os links de confirmação e de redefinição de senha abrem o app por `goosemoney://`. Ainda não foi testado à mão se o link de confirmação abre o app no desktop.

## 9. Testes automáticos

| Comando                  | O que roda                                                |
| ------------------------ | --------------------------------------------------------- |
| `make test`              | Vitest: core, app e banco                                 |
| `make test-e2e`          | Playwright + axe-core no Chromium                         |
| `make test-e2e-completo` | Playwright no Chromium e no WebKit (antes de todo merge)  |
| `make check`             | Formatação, lint, tipos, Vitest e validação das migrações |
| `make db-limpar-testes`  | Apaga os usuários `@teste.local` com mais de 1 hora       |

Os testes criam os próprios usuários `@teste.local` e não mexem na sua conta. Se um teste end-to-end falhar uma vez, rode só ele de novo com `pnpm --filter @goose-money/app exec playwright test --last-failed`.

## 10. Problemas comuns

| Sintoma                                         | O que fazer                                                                                                                                                                      |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| O app abre mas não entra, ou dá erro de conexão | Confira se o Supabase está rodando (`make db-status` ou `make db-compose-status`) e se `VITE_SUPABASE_ANON_KEY` está no `.env`. Depois de mudar o `.env`, reinicie o `make dev`. |
| Tela em branco ou erro de tabela                | Rode `make db-migrate`.                                                                                                                                                          |
| Banner "Sem conexão"                            | O app não funciona sem o banco: não há modo offline. Suba o Supabase e recarregue a página.                                                                                      |
| O e-mail de confirmação não aparece             | Abra http://localhost:54324 e confira o endereço digitado. Pedidos repetidos para o mesmo e-mail em poucos segundos podem ser ignorados.                                         |
| "Carregar dados de exemplo" desabilitado        | A base não está vazia: use **Apagar tudo** antes.                                                                                                                                |
| Porta ocupada ao subir o Supabase               | Pare o outro modo (`make db-stop` ou `make db-compose-stop`) ou o programa que usa a porta.                                                                                      |
| Quero zerar o banco local inteiro               | `make db-reset` (só com a CLI) apaga **todos** os usuários e dados locais e pede para digitar `RESET`. Para zerar só a sua conta, use **Apagar tudo**.                           |
