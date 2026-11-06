## T01-11
1. PV ≤ 0, n inválido ou taxa negativa → RangeError no domínio (implementado).
2. Price com PV ínfimo e n grande pode dar SD negativo antes da última; não tratado, reavaliar na validação de entrada.
## T01-04
1. "Este mês" = 1º do mês até hoje (implementado, como D37).
2. Período personalizado que não começa no dia 1 → desloca a mesma quantidade de dias.
3. Período que começa no dia 1 → desloca em competências; mantém fim de mês ou o mesmo dia (dia inexistente vira o último).
4. ▶ pode ir ao futuro; o PeriodPicker (T04-07) desabilita.
5. "Até 12 meses" na granularidade: ate < de + 12 meses (mesmo dia) → mensal; senão oferece trimestral.
6. periodoDaUrl lança RangeError.
## T01-05
1. Cor: valida só o formato de chave `^[a-z][a-z0-9-]*$`; vira enum quando o tema tiver as chaves.
2. ItemFatura `ajuste_compra`: categoriaId nulo (vale a da compra).
3. Fatos.preferencias = Preferencias | null antes da inicialização.
4. AlocacaoPagamento sem schema (campos do lançamento, D59).
5. Sem `.default()` nos schemas de domínio; padrões ficam no formulário e no banco.
## T01-12
1. Amortização extraordinária: parcelas não pagas que vencem até a data da amortização ficam como estão; só as posteriores são regeneradas.
2. Parcela informada com "reduzir valor": recalcula como Price com a taxa implícita.
3. Total pago no resumo inclui "Paga antes do cadastro" e os lançamentos de amortização.
4. Taxa implícita > 100% a.m.: a bisseção satura perto de 1; recomendado rejeitar no cadastro (T01-22).
5. "Reduzir prazo" mantém a parcela/amortização da próxima parcela a vencer (preserva um "reduzir valor" anterior).
## T01-07
1. Competência anterior à primeira versão do ciclo: usa a versão mais antiga (compras antigas ganham fatura e viram "Paga antes do cadastro"). Cartão sem ciclo → erro.
2. Mudança de ciclo vale a partir da fatura aberta; se o novo fechamento já passou, a aberta fecha na hora (mais conservador).
3. Funções ignoram ciclos de outros cartões e excluídos.
4. previaDoCadastro devolve dados; a frase fica na interface.
## T01-06
1. Mês que contém a data do saldo inicial: o extrato mostra todos os movimentos do mês; os anteriores ao saldo inicial vêm sem saldo e fora de entradas/saídas.
2. Mês inteiro antes do saldo inicial: abertura e fechamento null, entradas e saídas 0.
3. Lançamento efetivado com data futura → respondida, D79 (bloquear no formulário e no gravar).
4. diferencaDeAjuste com data ≤ dataSaldoInicial → null (tela sugere mudar a data do saldo inicial).
## T01-08
1. Antecipar renumera → respondida, D78.
2. Parcelas "Paga antes do cadastro" ficam fora do estorno de cancelamento e do limite na prévia.
3. Compra já cancelada: só editar descrição e excluir (este segue a regra da fatura fechada); demais desabilitadas com "Compra cancelada."
4. Desconto da antecipação entre 0 e a soma das parcelas antecipadas.
## T01-20
1. Compra cancelada no backup: não exige quantidade nem soma; exige número ≤ numeroParcelas e competências em ordem.
2. Confere todas as chaves únicas de MODELO-DADOS; nome único entre contas e cartões (D67, corrigido).
3. Substituir marca como excluídos só os ids que não estão no arquivo; os demais são atualizados.
4. Mesclar compara updatedAt até milissegundos; empate mantém o existente.
5. createdBy diferente do usuário atual: T02-10 sobrescreve ou rejeita.
6. Erros da etapa 1 vêm do Zod em inglês; a tela (T05-29) traduz.
## T01-13
1. "Aplicar a partir de": primeira competência sem ocorrência gravada (ignorada conta como resolvida).
2. Resumo: previsto = recebido/pago + a receber/a pagar + atrasado/vencido; confirmada pelo valor real.
3. Recorrência inativa fica fora da lista e da confirmação automática.
4. Ocorrência confirmada fora da vigência continua aparecendo; ignorada fora some.
## T01-09
1. Excedente pago numa fatura aberta/futura fica nela (saldo negativo) e só vira crédito na seguinte quando ela fechar.
2. Pagamento alocado a fatura Transportada reduz o saldo transportado ou vira crédito.
3. Parcelas "Paga antes do cadastro" ficam fora dos itens e do saldo da fatura.
4. Gasto fixo no cartão com data passada e não confirmado continua listado como previsto (conservador).
## T01-10
1. Arquivar cartão é negado se qualquer fatura tiver saldo ≠ 0 (mesmo com Obrigações = 0 por compensação).
2. Gasto fixo que impede arquivar: recorrência ativa, não encerrada, cuja versão vigente ou futura use o cartão.
3. Excluir cartão só com "Saldo anterior ao cadastro" é negado (conservador).
4. Excluir cartão citado por qualquer gasto fixo (mesmo inativo/versão passada) é negado.
5. Parcelas comprometidas (8.1): janela começa na fatura aberta mais antiga entre os cartões; conta parcelas a partir da aberta de cada cartão.
6. Parcela "atual" da tabela de parceladas = a primeira restante.
## T01-14
1. Período parcial (ex.: "Este mês" até hoje) filtra pela data de competência: fatura que vence depois de hoje fica fora até a data (literal a 3.2; mantém gráfico diário = lista).
2. Parcelas de cartão e dívida com competência futura são reconhecidas na competência delas (3.1).
3. Item reconhecido traz `estado` (liquidado/a_pagar/vencido); parcela de dívida usa contaId = contaDebitoId.
## T01-22
1. Excluir dívida com pagamentos ou amortizações é recusado; sem pagamentos, exclui dívida, parcelas e captação.
2. Lançamento `amortizacao` não se edita nem se exclui (só Desfazer).
3. Editar lançamento/compra de uma ocorrência atualiza o retrato da ocorrência.
4. Arquivar cartão: saldo zero em todas as faturas e nenhuma recorrência ativa no cartão (igual T01-10).
5. Arquivar conta: bloqueia com qualquer versão de recorrência ativa na conta ou parcela de dívida não paga.
6. Excluir cartão usado por gasto fixo é recusado.
7. Conta e cartão arquivados são só leitura.
8. Confirmar renda/gasto antes da data prevista: recusado (D79); o formulário manda data = hoje.
9. Renda fixa no cartão é recusada.
10. Item "Saldo anterior ao cadastro" com data = hoje, na competência aberta − 1.
Formato: mudanças em `inserir|alterar` (formato do gravar de T02-02); excluir = alterar isDeleted.
## T01-15
1. receitasReconhecidas/despesasReconhecidas passam a receber o Derivado (D13), não Fatos.
2. Saldo de fim de mês por soma corrente em motor/ (teste garante igualdade com saldo()).
3. fimDoMes só até o mês de hoje; meses futuros ficam com a projeção.
Obs.: teste de desempenho (< 50 ms) pode oscilar em CI mais lento.
Follow-up: motor/reconhecimento.ts e comandos/dividas.ts (parcelasDaDivida) calculam "parcelas pagas" cada um; unificar.
## T01-16
1. projetarFluxo(derivado, ate, hipoteticos?) sem `de` e `hoje` (a projeção parte de hoje do Derivado).
2. Gastos fixos não confirmados de meses anteriores entram vencidos no mês corrente, desde o início da recorrência; rendas atrasadas geram alerta.
3. Fatura aberta com crédito não reduz a projeção (conservador).
4. Fluxos de contas excluídas do total ou arquivadas ficam fora (3.9 à risca).
## T01-21
1. Pendências incluem meses vizinhos (vencidos anteriores e os que vencem em 3 dias no mês seguinte) — pedido o ajuste conservador.
2. "Confirmar todos" só para recorrências com data até hoje (D79).
3. Badge de Lançamentos conta lançamentos e compras em "A classificar".
4. Renda com confirmação automática pendente aparece atrasada até a confirmação rodar.
Follow-up: motor/pendencias.ts (ocorrenciasAte) e motor/projecao.ts repetem o laço de meses de ocorrências; unificar.
## T01-17
1. previstoAteOFimDoMes e estadoDoPrevisto ficam em projecao.ts (evita import circular).
2. Evolução do patrimônio no passado é reconstruída (obrigações e saldo devedor até t); aproximada antes de uma amortização extraordinária.
3. Comprometimento: rendas incluem atrasadas (são "previstas", 3.10 literal); fixos incluem vencidos e os pagos no cartão; `livre` pode ser negativo.
4. Contas e cartões arquivados ficam fora de todos os indicadores e séries, inclusive do histórico.
## T01-18
1. O Resultado da Barra usa o mês inteiro (definido em indicadoresDaBarra), para a compra no cartão que vence no mês já contar (7.4).
2. Testes de tempo usam a mediana de 5, como a tarefa pede; se o CI oscilar, voltar ao menor tempo.
(Resolvido: laço de meses unificado em motor/ocorrencias.ts.)
## T01-19
1. Categoria de receita → respondida: "Renda" entra nas iniciais de todo usuário (D40 e T02-08 atualizados).
2. Estorno e encargo "em M−1" datados em M−1 (caem na fatura de M0 pelo ciclo).
3. Faturas vencidas pagas no vencimento, menos os dois casos de borda; as de M0 ficam a pagar.
4. Gastos fixos e compras à vista de M0 só até hoje.
Indicadores do seed (hoje 04/11/2026) diferem dos ilustrativos do design (esperado: os do design são ilustrativos).
