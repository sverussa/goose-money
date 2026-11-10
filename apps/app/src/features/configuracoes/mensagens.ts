import type { CategoriaSistema, Entidade } from '@goose-money/core';

const plural = (n: number, um: string, varios: string) => `${String(n)} ${n === 1 ? um : varios}`;

/** Textos de Configurações (6.9, Configuracoes.dc.html). */
export const mensagensConfiguracoes = {
  categorias: {
    titulo: 'Categorias',
    nova: 'Nova categoria',
    tipos: { despesa: 'Despesa', receita: 'Receita' },
    /** Texto de apoio das de sistema (design). */
    sistema: {
      a_classificar: 'Padrão quando nenhuma é escolhida',
      juros_encargos: 'Rotativo, juros de empréstimo',
      tarifas: 'Anuidade, tarifas bancárias',
      ajuste_saldo: 'Só aparece no extrato',
    } satisfies Record<CategoriaSistema, string>,
    selo: 'Sistema',
    trava: 'Categoria de sistema: não pode ser editada nem excluída',
    subcategoriaDe: (pai: string) => `Subcategoria de ${pai}`,
    menu: {
      rotulo: (nome: string) => `Ações de ${nome}`,
      editar: 'Editar',
      excluir: 'Excluir',
    },
    formulario: {
      tituloNova: 'Nova categoria',
      tituloEditar: 'Editar categoria',
      descricao: 'Nome, tipo, ícone, cor e, se for subcategoria, a categoria pai.',
      nome: 'Nome',
      tipo: 'Tipo',
      tipoDaPai: 'A subcategoria tem o tipo da categoria pai.',
      tipoDasFilhas: 'O tipo muda só sem subcategorias.',
      pai: 'Categoria pai',
      semPai: 'Nenhuma (categoria principal)',
      paiComFilhas: 'Uma categoria com subcategorias não vira subcategoria.',
      icone: 'Ícone',
      cor: 'Cor',
      corN: (n: number) => `Cor ${String(n)}`,
      erros: { nome: 'Informe o nome' },
    },
    excluir: {
      titulo: (nome: string) => `Excluir ${nome}?`,
      semUso: 'A categoria sai do Goose Money. Dá para desfazer logo depois.',
      comSubcategorias: (n: number) =>
        `A categoria e ${n === 1 ? 'a subcategoria' : `as ${String(n)} subcategorias`} saem do Goose Money.`,
      vaoPara: (itens: string) =>
        `${itens} vão para "A classificar". Dá para desfazer logo depois.`,
      confirmar: 'Excluir categoria',
      voltar: 'Voltar',
    },
    /** Partes do "vão para A classificar", na ordem do texto. */
    itens: {
      lancamentos: (n: number) => plural(n, 'lançamento', 'lançamentos'),
      compras: (n: number) => plural(n, 'compra', 'compras'),
      itensFatura: (n: number) => plural(n, 'item de fatura', 'itens de fatura'),
      dividas: (n: number) => plural(n, 'dívida', 'dívidas'),
      recorrencias: (n: number) => plural(n, 'recorrência', 'recorrências'),
    },
    movidos: (n: number) =>
      n === 1
        ? '1 item movido para A classificar'
        : `${String(n)} itens movidos para A classificar`,
  },
  salvando: 'Salvando…',
  aparencia: {
    titulo: 'Aparência',
    tema: 'Tema',
    temas: { claro: 'Claro', escuro: 'Escuro', sistema: 'Seguir o sistema' },
    ocultar: 'Ocultar valores ao abrir',
    ocultarDica: 'Útil para abrir o app em público',
  },
  preferencias: {
    titulo: 'Preferências',
    limite: 'Alerta do Previsto abaixo de',
    limiteDica: 'O Previsto até o fim do mês fica em alerta abaixo deste valor.',
    horizonte: 'Horizonte padrão da projeção',
    meses: (n: number) => `${String(n)} meses`,
    automatica: 'Confirmação automática',
    automaticaDica: 'Lança sozinho, na data prevista, cada recorrência ligada.',
    semRecorrencias: 'Nenhuma renda ou gasto fixo cadastrado.',
    linha: (descricao: string, dia: number) => `${descricao} · dia ${String(dia)}`,
  },
  acesso: {
    titulo: 'Acesso',
    email: 'E-mail',
    alterarSenha: 'Alterar senha',
    sair: 'Sair',
    dialogo: {
      descricao: 'Para trocar, informe a senha atual e a nova duas vezes.',
      atual: 'Senha atual',
      nova: 'Nova senha',
      confirmar: 'Confirmar nova senha',
      cancelar: 'Cancelar',
      salvar: 'Alterar senha',
      atualIncorreta: 'Senha atual incorreta',
      alterada: 'Senha alterada',
    },
  },
  dados: {
    titulo: 'Dados',
    exportar: 'Exportar backup',
    exportado: (nome: string) => `Backup salvo: ${nome}`,
    importar: 'Importar backup',
    exemplo: 'Carregar dados de exemplo',
    exemploBloqueado: 'Disponível só sem dados. Use Apagar tudo antes',
    exemploCarregado: 'Dados de exemplo carregados',
    apagarTexto:
      'Apagar tudo remove contas, cartões, lançamentos e todos os outros dados da sua conta. Você vai precisar digitar APAGAR.',
    apagar: 'Apagar tudo',
    apagando: 'Apagando…',
    apagarDialogo: {
      titulo: 'Apagar tudo?',
      descricao:
        'Contas, cartões, lançamentos, dívidas, rendas, gastos fixos e categorias criadas saem do Goose Money, em todos os aparelhos. Ficam só as categorias de sistema e as preferências. Exporte um backup antes se quiser guardar uma cópia.',
      campo: 'Digite APAGAR para confirmar',
      palavra: 'APAGAR',
      voltar: 'Voltar',
      confirmar: 'Apagar tudo',
      apagado: 'Todos os dados foram apagados',
      erro: 'Não foi possível apagar. Nada mudou. Tente de novo.',
    },
    importacao: {
      titulo: 'Importar backup',
      descricao:
        'Escolha o modo e o arquivo. Nada é gravado antes do relatório e do botão Importar.',
      modo: 'Modo',
      modos: { substituir: 'Substituir', mesclar: 'Mesclar' },
      explicacao: {
        substituir:
          'Troca tudo o que existe hoje pelo conteúdo do arquivo. Antes, o Goose Money baixa um backup do estado atual.',
        mesclar:
          'Junta o arquivo com o que já existe. No mesmo registro, fica a versão mais recente; em conflito, fica a que já existe.',
      },
      escolher: 'Escolher arquivo',
      trocar: 'Escolher outro arquivo',
      jsonInvalido: (nome: string) => `${nome} não é um arquivo JSON. Nada foi gravado.`,
      relatorio: (nome: string) => `Relatório antes de importar · ${nome}`,
      resumo: {
        registros: (n: number) => plural(n, 'registro', 'registros'),
        novos: (n: number) => plural(n, 'novo', 'novos'),
        atualizados: (n: number) => plural(n, 'atualizado', 'atualizados'),
        mantidos: (n: number) => `${String(n)} sem mudança`,
        excluidos: (n: number) => plural(n, 'excluído', 'excluídos'),
        conflitos: (n: number) =>
          `${plural(n, 'conflito mantido', 'conflitos mantidos')} (mesma chave única)`,
        erros: (n: number) => plural(n, 'erro', 'erros'),
      },
      integridadeOk: 'Integridade: todas as referências encontradas.',
      integridadeErro: (n: number) =>
        `Integridade: ${plural(n, 'referência quebrada', 'referências quebradas')}.`,
      invariantesOk: 'Invariantes: ok.',
      invariantesErro: (n: number) => `Invariantes: ${plural(n, 'problema', 'problemas')}.`,
      estruturaErro: (n: number) =>
        `Estrutura: ${plural(n, 'erro', 'erros')}. O arquivo não é um backup válido.`,
      porEntidade: 'Por tipo de registro',
      conflitosTitulo: 'Conflitos mantidos',
      conflito: (id: string, existente: string) => `${id} descartado; fica ${existente}`,
      errosTitulo: 'Erros',
      arquivo: 'Arquivo',
      semMudanca: 'O arquivo não traz nada novo: não há o que importar.',
      invalido: 'Corrija o arquivo: com erros, nada é gravado.',
      cancelar: 'Cancelar',
      importar: 'Importar',
      backupCancelado: 'Sem o backup do estado atual, a importação não foi feita.',
      falhou: 'A importação não foi feita. Nada foi gravado.',
      importados: (n: number) =>
        n === 1 ? '1 registro importado' : `${String(n)} registros importados`,
    },
    /** Nomes das entidades no relatório (MODELO-DADOS). */
    entidades: {
      categorias: 'Categorias',
      contas: 'Contas',
      cartoes: 'Cartões',
      cartaoCiclos: 'Ciclos de cartão',
      lancamentos: 'Lançamentos',
      compras: 'Compras',
      parcelas: 'Parcelas de compras',
      itensFatura: 'Itens de fatura',
      dividas: 'Dívidas',
      parcelasDivida: 'Parcelas de dívidas',
      recorrencias: 'Recorrências',
      recorrenciaVersoes: 'Versões de recorrência',
      ocorrencias: 'Ocorrências',
      preferencias: 'Preferências',
    } satisfies Record<Entidade, string>,
  },
};

/** Nomes acessíveis dos ícones de categoria (lucide). */
export const nomesDosIcones: Record<string, string> = {
  house: 'Casa',
  car: 'Carro',
  fuel: 'Combustível',
  bus: 'Ônibus',
  plane: 'Avião',
  utensils: 'Talheres',
  'shopping-cart': 'Carrinho',
  'shopping-bag': 'Sacola',
  shirt: 'Roupa',
  'heart-pulse': 'Saúde',
  pill: 'Remédio',
  dumbbell: 'Academia',
  repeat: 'Repetição',
  smartphone: 'Celular',
  wifi: 'Internet',
  zap: 'Energia',
  droplet: 'Água',
  'graduation-cap': 'Estudos',
  baby: 'Criança',
  'paw-print': 'Pet',
  gift: 'Presente',
  'party-popper': 'Festa',
  ellipsis: 'Outros',
  banknote: 'Dinheiro',
  briefcase: 'Trabalho',
  'piggy-bank': 'Cofrinho',
  'trending-up': 'Rendimento',
  'circle-help': 'Interrogação',
  percent: 'Porcentagem',
  receipt: 'Recibo',
  scale: 'Balança',
};
