import {
  ajustarSaldo,
  type Centavos,
  centavos,
  type Conta,
  dataCivil,
  type Derivado,
  diferencaDeAjuste,
  ErroDeDominio,
  saldo,
} from '@goose-money/core';
import { useState } from 'react';

import { mensagens } from '@/app/mensagens';
import { BotaoSalvar } from '@/components/BotaoSalvar';
import { MoneyText } from '@/components/MoneyText';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useComando, useContexto } from '@/queries/useComando';

import { CampoDeSaldo } from './CampoDeSaldo';
import { mensagensContas } from './mensagens';

const m = mensagensContas.ajuste;

const valida = (s: string) => {
  try {
    return dataCivil(s);
  } catch {
    return null;
  }
};

function Campos({ d, conta, onFechar }: { d: Derivado; conta: Conta; onFechar: () => void }) {
  const { executar, salvando } = useComando();
  const contexto = useContexto();
  const [data, setData] = useState<string>(d.hoje);
  // Começa no saldo calculado de hoje: a diferença aparece assim que a pessoa digita o real.
  const [real, setReal] = useState<Centavos>(saldo(d.fatos, conta.id, d.hoje) ?? centavos(0));
  const [erro, setErro] = useState<string | null>(null);
  const dia = valida(data);
  // Mostrar a consequência antes de salvar (4.1, item 5): o calculado, o informado e a diferença.
  const calculado = dia ? saldo(d.fatos, conta.id, dia) : null;
  const diferenca = dia ? diferencaDeAjuste(d.fatos, conta.id, real, dia) : null;

  async function salvar() {
    if (!dia) return;
    let comando;
    try {
      comando = ajustarSaldo(d.fatos, contexto(), conta.id, real, dia);
    } catch (e) {
      if (!(e instanceof ErroDeDominio)) throw e;
      setErro(e.message);
      return;
    }
    if (await executar(comando)) onFechar();
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4.5"
      onSubmit={(e) => {
        e.preventDefault();
        void salvar();
      }}
    >
      <div className="grid gap-4 medium:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ajuste-real">{m.saldoReal}</Label>
          <CampoDeSaldo id="ajuste-real" valor={real} aoMudar={setReal} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ajuste-data">{m.data}</Label>
          <Input
            id="ajuste-data"
            type="date"
            className="h-12"
            value={data}
            onChange={(e) => {
              setData(e.target.value);
            }}
          />
        </div>
      </div>

      <section aria-label={m.previa}>
        <dl className="grid grid-cols-3 gap-3 rounded-md bg-surface-container-low px-4 py-3">
          {(
            [
              [m.calculado, calculado],
              [m.informado, real],
              [m.diferenca, diferenca],
            ] as const
          ).map(([rotulo, valor]) => (
            <div key={rotulo} className="flex flex-col">
              <dt className="text-label-md font-normal text-on-surface-variant">{rotulo}</dt>
              <dd className="text-title-md">
                {valor === null ? (
                  '—'
                ) : (
                  <MoneyText valor={valor} tipo={rotulo === m.diferenca ? 'neutro' : undefined} />
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      {diferenca === null && dia && <p className="text-body-md text-error">{m.antesDoInicial}</p>}
      {diferenca === 0 && <p className="text-body-md text-on-surface-variant">{m.confere}</p>}
      {erro && (
        <p role="alert" className="text-body-md text-error">
          {erro}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="text" onClick={onFechar}>
          {mensagens.acoes.cancelar}
        </Button>
        <BotaoSalvar salvando={salvando} disabled={!diferenca} className="px-6">
          {m.salvar}
        </BotaoSalvar>
      </div>
    </form>
  );
}

/** "Ajustar saldo" do extrato (3.4, 7.4), no vocabulário do LancarDialog (não desenhado). */
export function AjustarSaldo({
  aberto,
  d,
  conta,
  onFechar,
}: {
  aberto: boolean;
  d: Derivado;
  conta: Conta;
  onFechar: () => void;
}) {
  return (
    <Dialog
      open={aberto}
      onOpenChange={(a) => {
        if (!a) onFechar();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.titulo}</DialogTitle>
          <DialogDescription>{m.explicacao}</DialogDescription>
        </DialogHeader>
        <Campos d={d} conta={conta} onFechar={onFechar} />
      </DialogContent>
    </Dialog>
  );
}
