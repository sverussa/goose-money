import {
  dataCivil,
  deslocar,
  type Periodo,
  periodo as criarPeriodo,
  periodoAnterior,
  periodoPreset,
  type Preset,
} from '@goose-money/core';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { type SubmitEvent, useState } from 'react';

import { formatarData } from '@/app/formatacao';
import { mensagens } from '@/app/mensagens';
import { useHoje } from '@/queries/relogio';

import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Toggle } from './ui/toggle';

const m = mensagens.periodo;
const presets = Object.keys(m.presets) as Preset[];
const mesmoPeriodo = (a: Periodo, b: Periodo) => a.de === b.de && a.ate === b.ate;
const diaMes = (d: string) => formatarData(dataCivil(d)).slice(0, 5);

function Personalizado({
  periodo,
  ativo,
  onChange,
}: {
  periodo: Periodo;
  ativo: boolean;
  onChange: (p: Periodo) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState(false);

  function aplicar(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    const texto = (campo: string) => {
      const v = dados.get(campo);
      return typeof v === 'string' ? v : '';
    };
    try {
      onChange(criarPeriodo(dataCivil(texto('de')), dataCivil(texto('ate'))));
      setAberto(false);
    } catch {
      setErro(true);
    }
  }

  return (
    <Popover
      open={aberto}
      onOpenChange={(a) => {
        setAberto(a);
        setErro(false);
      }}
    >
      <PopoverTrigger asChild>
        <Toggle pressed={ativo} aria-haspopup="dialog">
          {ativo && <Check aria-hidden />}
          {m.personalizado}
        </Toggle>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <form className="flex flex-col gap-3" onSubmit={aplicar}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="periodo-de">{m.de}</Label>
            <Input id="periodo-de" name="de" type="date" required defaultValue={periodo.de} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="periodo-ate">{m.ate}</Label>
            <Input id="periodo-ate" name="ate" type="date" required defaultValue={periodo.ate} />
          </div>
          {erro && (
            <p role="alert" className="text-label-md text-error">
              {m.invalido}
            </p>
          )}
          <Button type="submit" className="self-end">
            {m.aplicar}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Seletor de período (8.2): chips, setas que deslocam o período inteiro e o texto com o período
 * anterior da **Variação** (3.10, D37). Toda a regra vem de `periodos` do core.
 */
export function PeriodPicker({
  periodo,
  onChange,
}: {
  periodo: Periodo;
  onChange: (p: Periodo) => void;
}) {
  const hoje = useHoje();
  const escolhido = presets.find((p) => mesmoPeriodo(periodoPreset(p, hoje), periodo));
  const anterior = periodoAnterior(periodo);

  return (
    <div role="group" aria-label={m.rotulo} className="flex flex-wrap items-center gap-2">
      <Button
        variant="icon"
        className="size-10 border border-outline-variant bg-surface-container-lowest"
        aria-label={m.anterior}
        onClick={() => {
          onChange(deslocar(periodo, -1));
        }}
      >
        <ChevronLeft />
      </Button>
      {presets.map((p) => (
        <Toggle
          key={p}
          pressed={p === escolhido}
          onPressedChange={() => {
            onChange(periodoPreset(p, hoje));
          }}
        >
          {p === escolhido && <Check aria-hidden />}
          {m.presets[p]}
        </Toggle>
      ))}
      <Personalizado periodo={periodo} ativo={escolhido === undefined} onChange={onChange} />
      <Button
        variant="icon"
        className="size-10 border border-outline-variant bg-surface-container-lowest"
        aria-label={m.proximo}
        onClick={() => {
          onChange(deslocar(periodo, 1));
        }}
      >
        <ChevronRight />
      </Button>
      <span className="ml-2 text-body-md text-on-surface-variant">
        {m.descricao(
          formatarData(periodo.de),
          formatarData(periodo.ate),
          diaMes(anterior.de),
          diaMes(anterior.ate),
        )}
      </span>
    </div>
  );
}
