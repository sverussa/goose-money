import { corDoTema, type Serie } from '@/components/graficos/dados';

/** Legenda das séries abaixo do gráfico; decorativa, o `aria-label` do gráfico já as nomeia. */
export function Legenda({ series, linha = false }: { series: readonly Serie[]; linha?: boolean }) {
  return (
    <ul aria-hidden className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-label-md font-normal">
      {series.map((s) => (
        <li key={s.chave} className="flex items-center gap-1.5">
          <span
            className={linha ? 'h-0.5 w-4 rounded-full' : 'size-2.5 rounded-xs'}
            style={{ background: corDoTema(s.cor) }}
          />
          {s.rotulo}
        </li>
      ))}
    </ul>
  );
}
