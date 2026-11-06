import { Button } from '@/components/ui/button';

import { SeletorDeTemaDev } from './SeletorDeTemaDev';

const papeis = [
  'primary',
  'on-primary',
  'primary-container',
  'on-primary-container',
  'secondary-container',
  'on-secondary-container',
  'error',
  'on-error',
  'error-container',
  'on-error-container',
  'surface',
  'surface-container-lowest',
  'surface-container-low',
  'surface-container',
  'surface-container-high',
  'surface-container-highest',
  'on-surface',
  'on-surface-variant',
  'outline',
  'outline-variant',
  'inverse-surface',
  'inverse-on-surface',
  'inverse-primary',
  'scrim',
];
const semanticos = ['income', 'expense', 'transfer', 'forecast', 'warning'].flatMap((s) => [
  s,
  `${s}-container`,
  `on-${s}-container`,
]);
const categoricas = [...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `cat-${String(n)}`), 'cat-sistema'];
const cartoes = ['cartao-a', 'cartao-a-grafico', 'cartao-b', 'cartao-b-grafico'];
const textos = [
  ['text-headline-lg', 'Headline Large'],
  ['text-headline-md', 'Headline Medium'],
  ['text-title-lg', 'Title Large'],
  ['text-title-md', 'Title Medium'],
  ['text-body-lg', 'Body Large'],
  ['text-body-md', 'Body Medium'],
  ['text-label-lg', 'Label Large'],
  ['text-label-md', 'Label Medium'],
] as const;
const raios = [
  ['rounded-xs', 'xs · 4'],
  ['rounded-sm', 'sm · 8'],
  ['rounded-md', 'md · 12'],
  ['rounded-lg', 'lg · 16'],
  ['rounded-xl', 'xl · 28'],
  ['rounded-full', 'full'],
] as const;

function Cores({ titulo, nomes }: { titulo: string; nomes: string[] }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-title-md">{titulo}</h2>
      <ul className="grid grid-cols-2 gap-2 medium:grid-cols-4 expanded:grid-cols-6">
        {nomes.map((n) => (
          <li key={n} className="flex items-center gap-2 text-label-md">
            <span
              aria-hidden
              className="size-10 shrink-0 rounded-sm border"
              style={{ background: `var(--color-${n})` }}
            />
            {n}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Revisão visual do tema (só em desenvolvimento, `#/dev/tema`). */
export function TemaDev() {
  return (
    <main className="mx-auto flex max-w-conteudo flex-col gap-6 p-pagina">
      <h1 className="text-headline-md">Tema</h1>
      <SeletorDeTemaDev />
      <Cores titulo="Papéis M3" nomes={papeis} />
      <Cores titulo="Semânticos" nomes={semanticos} />
      <Cores titulo="Categorias" nomes={categoricas} />
      <Cores titulo="Cartões" nomes={cartoes} />
      <section className="flex flex-col gap-2">
        <h2 className="text-title-md">Tipografia</h2>
        {textos.map(([classe, nome]) => (
          <p key={classe} className={classe}>
            {nome} · R$ 1.234,56
          </p>
        ))}
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-title-md">Raios</h2>
        <ul className="flex flex-wrap gap-4">
          {raios.map(([classe, nome]) => (
            <li
              key={classe}
              className={`flex size-20 items-center justify-center bg-primary-container text-label-md text-on-primary-container ${classe}`}
            >
              {nome}
            </li>
          ))}
        </ul>
      </section>
      <section className="flex flex-wrap gap-2">
        <h2 className="w-full text-title-md">Botões</h2>
        <Button>Filled</Button>
        <Button variant="tonal">Tonal</Button>
        <Button variant="outlined">Outlined</Button>
        <Button variant="text">Text</Button>
        <Button variant="destructive">Destrutivo</Button>
      </section>
    </main>
  );
}
