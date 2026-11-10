import { mensagensRecorrencias as base } from '@/features/recorrencias/mensagens';

/** Textos de Rendas fixas (6.7, Rendas.dc.html). */
export const mensagensRendas = {
  totais: 'Totais das rendas',
  previsto: 'Previsto no mês',
  recebido: 'Recebido',
  aReceber: 'A receber',
  atrasado: 'Atrasado',
  nova: 'Nova renda fixa',
  lista: (mes: string) => `Rendas fixas de ${mes}`,
  vazio: 'Cadastre o salário e as outras rendas que se repetem para ver o mês inteiro antes dele.',
  semNoMes: 'Nenhuma renda fixa neste mês.',
  detalhe: (dia: number, conta: string, automatica: boolean) =>
    `Dia ${String(dia)} · ${conta} · ${automatica ? 'confirmação automática ligada' : 'confirmação manual'}`,
  chip: {
    confirmada: (data: string) => `Recebida · ${data}`,
    ignorada: 'Ignorada este mês',
    prevista: (data: string) => `Prevista · ${data}`,
    atrasada: (data: string) => `Atrasada · ${data}`,
  },
  menu: {
    ...base.menu,
    detalheExcluir: 'Sai da lista e da projeção; os recebimentos já lançados continuam',
  },
  confirmar: {
    ...base.confirmar,
    titulo: 'Confirmar recebimento',
    acao: (nome: string) => `Confirmar recebimento de ${nome}`,
    valor: 'Valor recebido',
    data: 'Data do recebimento',
    entra: (valor: string, conta: string) => `Entram ${valor} em ${conta}.`,
  },
  formulario: {
    ...base.formulario,
    tituloNova: 'Nova renda fixa',
    explicacao: 'Renda que se repete todo mês, recebida em conta.',
    dicaAutomatica: 'Lança o recebimento sozinho na data prevista, ao abrir o Goose Money.',
    criar: 'Criar renda fixa',
  },
  composicao: {
    titulo: (nome: string, fatia: string) => `${nome} é ${fatia} da renda`,
    unica: (nome: string) => `Toda a renda fixa vem de ${nome}`,
    subtitulo: (mes: string) => `Composição da renda · ${mes}`,
    fonte: 'Fonte',
    valor: 'Valor previsto',
    vazio: 'Sem renda fixa neste mês',
    abrir: 'editar',
  },
} as const;
