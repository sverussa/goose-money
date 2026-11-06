import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// A escala tipográfica do tema (tema.css): sem isto, o tailwind-merge acha que `text-label-md` é
// cor e o descarta ao lado de `text-on-surface`. Idem para as sombras e medidas próprias.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'headline-lg',
            'headline-md',
            'title-lg',
            'title-md',
            'body-lg',
            'body-md',
            'label-lg',
            'label-md',
          ],
        },
      ],
      shadow: [{ shadow: ['fab', 'snackbar'] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
