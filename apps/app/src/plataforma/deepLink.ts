import { estaNoTauri } from './ambiente';

/** Rotas que um link de e-mail do Auth pode abrir. */
export const ROTAS_DE_RETORNO: ReadonlySet<string> = new Set(['redefinir-senha', 'confirmar']);

/** Um link `goosemoney://<rota>?code=…` (ou com erro do Auth) lido para o app (T03-08). */
export interface LinkDeRetorno {
  rota: string;
  codigo: string | null;
  erro: boolean;
}

export function lerLinkDeRetorno(url: string): LinkDeRetorno | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== 'goosemoney:') return null;
  // O Auth pode mandar o erro na busca ou depois do `#`.
  const params = new URLSearchParams(`${u.search.slice(1)}&${u.hash.slice(1)}`);
  return {
    rota: `${u.host}${u.pathname}`.replace(/\/+$/, ''),
    codigo: params.get('code'),
    erro: params.has('error') || params.has('error_code'),
  };
}

/** Navegador: a rota de um link do Auth que voltou com erro (`?retorno=…&error=…`), ou `null`. */
export function retornoComErro(busca: string): string | null {
  const p = new URLSearchParams(busca);
  const rota = p.get('retorno');
  return rota && ROTAS_DE_RETORNO.has(rota) && (p.has('error') || p.has('error_code'))
    ? rota
    : null;
}

/**
 * Avisa a cada link `goosemoney://` que abrir o app desktop, inclusive o que o iniciou. No
 * navegador não faz nada: o link do e-mail abre a própria página do app.
 */
export async function aoAbrirLink(aviso: (url: string) => void): Promise<() => void> {
  if (!estaNoTauri()) return () => undefined;
  const { getCurrent, onOpenUrl } = await import('@tauri-apps/plugin-deep-link');
  for (const url of (await getCurrent()) ?? []) aviso(url);
  return onOpenUrl((urls) => {
    for (const url of urls) aviso(url);
  });
}
