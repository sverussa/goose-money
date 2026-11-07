import { EllipsisVertical, FileImage, FileSpreadsheet, ListTree } from 'lucide-react';
import { type ReactNode, useRef } from 'react';
import { toast } from 'sonner';

import { mensagens } from '@/app/mensagens';
import { usePrivacidade } from '@/app/providers/usePrivacidade';
import { salvarArquivo } from '@/plataforma/arquivos';

import { gerarCsv, type Linha, resumirSeries, semDados, type Serie } from './graficos/dados';
import { Button } from './ui/button';
import { Card } from './ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

const m = mensagens.graficos;

async function salvar(arquivo: Parameters<typeof salvarArquivo>[0]) {
  try {
    const nome = await salvarArquivo(arquivo);
    if (nome) toast(m.exportado(nome));
  } catch {
    toast.error(m.erroAoExportar);
  }
}

/**
 * Invólucro de todo gráfico (8.3): título com a conclusão, subtítulo com o período, menu com
 * "Ver itens" e exportação PNG/CSV, `aria-label` com o resumo das séries e estado vazio.
 * `dados` e `series` são os mesmos passados ao gráfico (`children`), já calculados pelo core.
 */
export function ChartCard({
  titulo,
  subtitulo,
  arquivo,
  dados,
  categoria,
  series,
  verItens,
  vazio,
  rodape,
  children,
}: {
  titulo: string;
  subtitulo: string;
  /** Nome do arquivo exportado, sem extensão. */
  arquivo: string;
  dados: readonly Linha[];
  /** Campo e rótulo da coluna de categoria (eixo X ou fatia), para o CSV e o resumo. */
  categoria: { chave: string; rotulo: string };
  series: readonly Serie[];
  /** Mesmo destino do clique no gráfico (8.1). */
  verItens?: () => void;
  /** Estado vazio: frase curta e ação ("Sem despesas neste período · Lançar despesa"). */
  vazio: { frase: string; acao?: ReactNode };
  /** Abaixo do gráfico e fora do `role="img"`: ranking ou legenda com itens clicáveis. */
  rodape?: ReactNode;
  children: ReactNode;
}) {
  const card = useRef<HTMLDivElement>(null);
  const { oculto } = usePrivacidade();
  const semPontos = semDados(dados, series);

  async function exportarPng() {
    const no = card.current;
    if (!no) return;
    const { toBlob } = await import('html-to-image');
    const png = await toBlob(no, {
      backgroundColor: getComputedStyle(no).backgroundColor,
      pixelRatio: 2,
      filter: (n) => !(n instanceof HTMLElement && n.dataset.exportar === 'nao'),
    });
    if (png) await salvar({ nomeSugerido: `${arquivo}.png`, tipo: 'image/png', conteudo: png });
  }

  return (
    <Card ref={card} variant="elevated" className="gap-4">
      <div className="flex items-start gap-2">
        <div className="flex flex-1 flex-col gap-0.5">
          <h2 className="text-title-md">{titulo}</h2>
          <p className="text-body-md text-on-surface-variant">{subtitulo}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="icon"
              aria-label={`${m.opcoes}: ${titulo}`}
              data-exportar="nao"
              className="-mt-2 -mr-2"
            >
              <EllipsisVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {verItens && (
              <DropdownMenuItem onSelect={verItens}>
                <ListTree /> {m.verItens}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem disabled={semPontos} onSelect={() => void exportarPng()}>
              <FileImage /> {m.exportarPng}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={semPontos}
              onSelect={() =>
                void salvar({
                  nomeSugerido: `${arquivo}.csv`,
                  tipo: 'text/csv',
                  conteudo: gerarCsv(dados, categoria, series),
                })
              }
            >
              <FileSpreadsheet /> {m.exportarCsv}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {semPontos ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="text-body-lg text-on-surface-variant">{vazio.frase}</p>
          {vazio.acao}
        </div>
      ) : (
        <>
          <div
            role="img"
            aria-label={`${titulo}. ${resumirSeries(dados, categoria.chave, series, oculto)}`}
          >
            {children}
          </div>
          {rodape}
        </>
      )}
    </Card>
  );
}
