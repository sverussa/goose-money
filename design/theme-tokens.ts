/**
 * Tokens visuais usados nas telas de design (design/telas/*.dc.html).
 * Base: Material Design 3, cor semente #1B6B5A. Somente tema claro foi desenhado.
 * O tema escuro deve ser gerado a partir da mesma semente, com contraste AA verificado.
 *
 * Uso previsto: gerar as variáveis CSS do @theme do Tailwind em src/app/tema.css (shadcn/ui, D17).
 * Nenhum componente deve usar estes hex diretamente; sempre via variáveis do tema.
 */

export const seedColor = '#1B6B5A';

/** Papéis de cor M3 (tema claro). */
export const lightRoles = {
  primary: '#1B6B5A',
  onPrimary: '#FFFFFF',
  primaryContainer: '#A6F2DA',
  onPrimaryContainer: '#00201A',
  secondaryContainer: '#CDE8DF',
  onSecondaryContainer: '#072019',
  error: '#BA1A1A',
  onError: '#FFFFFF',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#410002',
  surface: '#F5FBF7',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#EFF5F1',
  surfaceContainer: '#E9EFEB',
  surfaceContainerHigh: '#E3EAE6',
  surfaceContainerHighest: '#DEE4E0',
  onSurface: '#171D1B',
  onSurfaceVariant: '#3F4945',
  outline: '#6F7975',
  outlineVariant: '#BFC9C4',
  inverseSurface: '#2C3230',
  inverseOnSurface: '#ECF2EE',
  inversePrimary: '#8AD5BF',
  scrim: '#5E6562',
} as const;

/** Tokens semânticos próprios do app (seção 4.3 do PROMPT). */
export const semantic = {
  income: { main: '#14713A', container: '#C8F0D2', onContainer: '#0B3D1F' },
  expense: { main: '#B3261E', container: '#FFDAD6', onContainer: '#8C1D18' },
  transfer: { main: '#48617A', container: '#D3E4F5', onContainer: '#1D3246' },
  forecast: { main: '#6B5778', container: '#F2DAFF', onContainer: '#25132F' },
  warning: { main: '#7A4F00', container: '#FFDDB0', onContainer: '#5C3B00' },
} as const;

/** Paleta categórica estável: a mesma categoria tem sempre a mesma cor. */
export const categorical = [
  '#1B6B5A', // Moradia
  '#3B6FB6', // Transporte
  '#C26A12', // Alimentação
  '#8E5BC4', // Compras
  '#C2457A', // Saúde e bem-estar
  '#6F8A1E', // Assinaturas
  '#8D6E63', // Lazer
  '#8A9490', // Outras / A classificar
] as const;

/** Categorias de sistema usam cinza-azulado neutro. */
export const systemCategoryColor = '#5C6B7A';

/** Cores de exemplo dos cartões (no app, escolhidas no cadastro). */
export const cardColors = {
  cartaoA: { face: '#24364D', chart: '#24364D' },
  cartaoB: { face: '#6B2E4F', chart: '#B0628C' },
} as const;

/** Formas (raios M3: extra-small a extra-large). */
export const shape = {
  extraSmall: 4,
  small: 8,
  medium: 12,
  large: 16,
  extraLarge: 28,
  full: 9999,
} as const;

/** Tipografia. Números sempre com tabular-nums. */
export const typography = {
  fontFamily: "'Roboto Flex', Roboto, system-ui, sans-serif",
  numeric: { fontVariantNumeric: 'tabular-nums' },
  scale: {
    headlineLarge: { size: 36, lineHeight: 44, weight: 500 }, // Patrimônio líquido em destaque
    headlineMedium: { size: 28, lineHeight: 36, weight: 500 }, // número principal de painel/KPI
    titleLarge: { size: 22, lineHeight: 28, weight: 500 }, // indicadores da Barra, título de tela
    titleMedium: { size: 16, lineHeight: 24, weight: 600 }, // título de card/gráfico
    bodyLarge: { size: 16, lineHeight: 24, weight: 400 },
    bodyMedium: { size: 14, lineHeight: 20, weight: 400 },
    labelLarge: { size: 14, lineHeight: 20, weight: 600 }, // botões
    labelMedium: { size: 12, lineHeight: 16, weight: 500 }, // rótulos de indicador, chips
  },
} as const;

/** Medidas recorrentes nas telas. */
export const layout = {
  navDrawerWidth: 260,
  topAppBarHeight: 64,
  tabHeight: 48,
  listItemMinHeight: 56,
  minTouchTarget: 48,
  contentMaxWidth: 1280,
  pagePadding: 24,
  cardPadding: 20,
  gap: 16,
  breakpoints: { compact: 0, medium: 600, expanded: 840 },
} as const;

/** Mapeamento de estados (tabela 3.1 e status de fatura 3.5) para tokens. */
export const statusChips = {
  previsto: { label: 'Previsto', bg: semantic.forecast.container, fg: semantic.forecast.onContainer, icon: 'schedule' },
  aPagar: { label: 'A pagar', bg: lightRoles.surfaceContainerHigh, fg: lightRoles.onSurfaceVariant },
  vencido: { label: 'Vencido', bg: lightRoles.errorContainer, fg: lightRoles.onErrorContainer },
  atrasado: { label: 'Atrasado', bg: semantic.warning.container, fg: semantic.warning.onContainer },
  venceEmBreve: { label: 'Vence amanhã', bg: semantic.warning.container, fg: semantic.warning.onContainer },
  faturaAberta: { label: 'Aberta', bg: lightRoles.secondaryContainer, fg: lightRoles.onSecondaryContainer },
  faturaFechada: { label: 'Fechada', bg: lightRoles.surfaceContainerHigh, fg: lightRoles.onSurfaceVariant },
  faturaPaga: { label: 'Paga', bg: semantic.income.container, fg: semantic.income.onContainer },
  faturaFutura: { label: 'Futura', bg: lightRoles.surfaceContainer, fg: lightRoles.onSurfaceVariant },
  aClassificar: { label: 'A classificar', bg: semantic.warning.container, fg: semantic.warning.onContainer },
  novo: { label: 'Novo', bg: lightRoles.secondaryContainer, fg: lightRoles.onSecondaryContainer },
} as const;
