import type { CategoriaSistema } from '@goose-money/core';

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
