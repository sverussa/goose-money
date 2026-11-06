/**
 * Estado da conexão (T03-05, 9.3): `navigator.onLine` sozinho não basta (Wi-Fi sem internet,
 * servidor fora). Uma requisição ao Supabase sem resposta também conta como "sem conexão"; daí
 * em diante, uma sonda leve tenta de novo a cada `intervalo` até alguma resposta chegar.
 */
export interface Conexao {
  online: () => boolean;
  assinar: (aviso: () => void) => () => void;
  /** O `fetch` do cliente Supabase: registra cada falha de rede e cada resposta. */
  fetch: typeof fetch;
}

interface Dependencias {
  navegadorOnline: () => boolean;
  janela: Pick<EventTarget, 'addEventListener'>;
  fetchBase: typeof fetch;
  /** Qualquer resposta HTTP (até um 401) prova que há rede. */
  sondar: () => Promise<unknown>;
  intervalo?: number;
}

const foiCancelada = (e: unknown) => e instanceof DOMException && e.name === 'AbortError';

export function criarConexao(d: Dependencias): Conexao {
  let falhou = false;
  let sonda: ReturnType<typeof setInterval> | undefined;
  const avisos = new Set<() => void>();
  const avisar = () => {
    for (const a of avisos) a();
  };

  const marcar = (falha: boolean) => {
    if (falha === falhou) return;
    falhou = falha;
    clearInterval(sonda);
    if (falha)
      sonda = setInterval(() => {
        d.sondar().then(
          () => {
            marcar(false);
          },
          () => undefined,
        );
      }, d.intervalo ?? 15_000);
    avisar();
  };

  d.janela.addEventListener('online', () => {
    // O navegador diz que voltou: a próxima requisição confirma ou volta a marcar a falha.
    if (falhou) marcar(false);
    else avisar();
  });
  d.janela.addEventListener('offline', avisar);

  return {
    online: () => d.navegadorOnline() && !falhou,
    assinar: (aviso) => {
      avisos.add(aviso);
      return () => {
        avisos.delete(aviso);
      };
    },
    fetch: async (entrada, opcoes) => {
      try {
        const r = await d.fetchBase(entrada, opcoes);
        marcar(false);
        return r;
      } catch (e) {
        if (!foiCancelada(e)) marcar(true);
        throw e;
      }
    },
  };
}
