import {
  argbFromHex,
  customColor,
  Hct,
  hexFromArgb,
  MaterialDynamicColors,
  SchemeTonalSpot,
} from '@material/material-color-utilities';

import { lightRoles, seedColor, semantic } from '../../../../../design/theme-tokens';

/** Onde o app guarda o CSS escuro gerado, para o `tema-inicial.js` aplicar antes da primeira pintura. */
export const CHAVE_CSS_ESCURO = 'goose-money:tema-escuro-css';

/**
 * Correções manuais sobre o resultado gerado, só quando o contraste pedir (T04-02).
 * Hoje nenhuma: o teste de contraste (tests/e2e/tema.spec.ts) passa com o gerado.
 */
const ajustes: Record<string, string> = {};

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/**
 * Tema escuro gerado da semente (D43): os mesmos papéis M3 de `tema.css` e as variantes escuras
 * dos semânticos, como cores customizadas sem harmonizar (o vermelho da despesa continua vermelho).
 */
export function gerarTemaEscuro(semente: string = seedColor): Record<string, string> {
  const esquema = new SchemeTonalSpot(Hct.fromInt(argbFromHex(semente)), true, 0);
  const cores = new MaterialDynamicColors();
  const vars: Record<string, string> = {};
  for (const papel of Object.keys(lightRoles) as (keyof typeof lightRoles)[])
    vars[`--color-${kebab(papel)}`] = hexFromArgb(cores[papel]().getArgb(esquema));
  for (const [nome, { main }] of Object.entries(semantic)) {
    const { dark } = customColor(argbFromHex(semente), {
      name: nome,
      value: argbFromHex(main),
      blend: false,
    });
    vars[`--color-${nome}`] = hexFromArgb(dark.color);
    vars[`--color-${nome}-container`] = hexFromArgb(dark.colorContainer);
    vars[`--color-on-${nome}-container`] = hexFromArgb(dark.onColorContainer);
  }
  return { ...vars, ...ajustes };
}

/** Põe o tema escuro num bloco `:root.dark` (antes do primeiro render) e guarda o CSS. */
export function aplicarTemaEscuro(semente?: string) {
  const declaracoes = Object.entries(gerarTemaEscuro(semente))
    .map(([nome, valor]) => `${nome}:${valor};`)
    .join('');
  const css = `:root.dark{color-scheme:dark;${declaracoes}}`;
  let estilo = document.getElementById('tema-escuro');
  if (!estilo) {
    estilo = document.createElement('style');
    estilo.id = 'tema-escuro';
    document.head.append(estilo);
  }
  estilo.textContent = css;
  try {
    localStorage.setItem(CHAVE_CSS_ESCURO, css);
  } catch {
    // Sem armazenamento (modo privado): só perde o tema escuro antes da primeira pintura.
  }
}
