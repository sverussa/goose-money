import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

import { type Tema, useTema } from '../providers/useTema';

/** Troca o tema nas páginas de revisão (a tela de verdade é Configurações › Aparência, T05-28). */
export function SeletorDeTemaDev() {
  const { tema, setTema } = useTema();
  return (
    <ToggleGroup
      type="single"
      value={tema}
      onValueChange={(t) => {
        if (t) setTema(t as Tema);
      }}
      aria-label="Tema"
    >
      <ToggleGroupItem value="claro">claro</ToggleGroupItem>
      <ToggleGroupItem value="escuro">escuro</ToggleGroupItem>
      <ToggleGroupItem value="sistema">sistema</ToggleGroupItem>
    </ToggleGroup>
  );
}
