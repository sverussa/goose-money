import { estaNoTauri } from './ambiente';

/**
 * Salvar e abrir arquivos (T03-07, D20): diálogo nativo no desktop, download e
 * `<input type="file">` no navegador. Os plugins do Tauri só carregam no desktop.
 */

export interface ArquivoParaSalvar {
  nomeSugerido: string;
  /** Tipo MIME (`text/csv`, `image/png`, `application/json`). */
  tipo: string;
  conteudo: Blob | string;
}

export interface ArquivoAberto {
  nome: string;
  conteudo: string;
}

const extensao = (nome: string) => /\.([^.]+)$/.exec(nome)?.[1]?.toLowerCase();

/** Devolve o nome ou caminho salvo; `null` se o usuário cancelou o diálogo. */
export async function salvarArquivo(a: ArquivoParaSalvar): Promise<string | null> {
  if (estaNoTauri()) {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const ext = extensao(a.nomeSugerido);
    const caminho = await save({
      defaultPath: a.nomeSugerido,
      filters: ext ? [{ name: ext.toUpperCase(), extensions: [ext] }] : [],
    });
    if (!caminho) return null;
    const fs = await import('@tauri-apps/plugin-fs');
    if (typeof a.conteudo === 'string') await fs.writeTextFile(caminho, a.conteudo);
    else await fs.writeFile(caminho, new Uint8Array(await a.conteudo.arrayBuffer()));
    return caminho;
  }

  const blob =
    typeof a.conteudo === 'string' ? new Blob([a.conteudo], { type: a.tipo }) : a.conteudo;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = a.nomeSugerido;
  link.click();
  // O WebKit cancela o download se a URL some na hora.
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
  return a.nomeSugerido;
}

/** `tipos`: extensões aceitas, sem ponto (`['json']`). `null` se o usuário cancelou. */
export async function abrirArquivo({ tipos }: { tipos: string[] }): Promise<ArquivoAberto | null> {
  if (estaNoTauri()) {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const caminho = await open({
      multiple: false,
      directory: false,
      filters: [{ name: tipos.join(', ').toUpperCase(), extensions: tipos }],
    });
    if (!caminho) return null;
    const { readTextFile } = await import('@tauri-apps/plugin-fs');
    return { nome: caminho.split(/[\\/]/).pop() ?? caminho, conteudo: await readTextFile(caminho) };
  }

  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = tipos.map((t) => `.${t}`).join(',');
    input.addEventListener('cancel', () => {
      resolve(null);
    });
    input.addEventListener('change', () => {
      const arquivo = input.files?.[0];
      if (!arquivo) {
        resolve(null);
        return;
      }
      arquivo.text().then((conteudo) => {
        resolve({ nome: arquivo.name, conteudo });
      }, reject);
    });
    input.click();
  });
}
