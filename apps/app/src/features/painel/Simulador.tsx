import { centavos, type ConclusaoSimulacao, type Derivado } from '@goose-money/core';
import { Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { CampoDeValor } from '@/features/cartoes/CampoDeValor';
import { MAX_PARCELAS } from '@/features/cartoes/compra';
import { cartoesAtivos } from '@/features/lancar/padroes';

import { mensagensPainel } from './mensagens';
import { EM_CONTA, frasesDaSimulacao, type ValoresDaSimulacao } from './simulacao';

const m = mensagensPainel.projecoes.simulador;
const campo = 'h-11 border-forecast bg-surface-container-lowest text-on-surface';

function Campo({
  id,
  rotulo,
  children,
}: {
  id: string;
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Label htmlFor={id} className="text-label-md">
        {rotulo}
      </Label>
      {children}
    </div>
  );
}

/** Simulador "E se?" (6.2): compra parcelada ou gasto fixo hipotético; o estado fica na tela. */
export function Simulador({
  d,
  valores: v,
  aoMudar,
  aoLimpar,
  conclusao,
}: {
  d: Derivado;
  valores: ValoresDaSimulacao;
  aoMudar: (x: Partial<ValoresDaSimulacao>) => void;
  aoLimpar: () => void;
  conclusao: ConclusaoSimulacao | null;
}) {
  const cartoes = cartoesAtivos(d.fatos);
  const limite = d.fatos.preferencias?.limiteAlerta ?? centavos(0);
  const semCartao = v.tipo === 'compra' && cartoes.length === 0;

  return (
    <section
      aria-labelledby="simulador"
      className="flex flex-col gap-3.5 rounded-lg bg-forecast-container px-5 py-4 text-on-forecast-container"
    >
      <div className="flex flex-col gap-0.5">
        <h2 id="simulador" className="text-title-md">
          {m.titulo}
        </h2>
        <p className="text-body-md">{m.subtitulo}</p>
      </div>
      <ToggleGroup
        type="single"
        aria-label={m.tipo}
        value={v.tipo}
        onValueChange={(tipo) => {
          if (tipo) aoMudar({ tipo: tipo as ValoresDaSimulacao['tipo'] });
        }}
      >
        {(['compra', 'gastoFixo'] as const).map((t) => (
          <ToggleGroupItem key={t} value={t}>
            {v.tipo === t && <Check aria-hidden />}
            {m[t]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {semCartao ? (
        <p className="text-body-md">{m.semCartao}</p>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          <Campo id="simulador-valor" rotulo={v.tipo === 'compra' ? m.valorTotal : m.valor}>
            <CampoDeValor
              id="simulador-valor"
              valor={v.valor}
              aoMudar={(valor) => {
                aoMudar({ valor });
              }}
              className={campo}
            />
          </Campo>
          {v.tipo === 'compra' ? (
            <>
              <Campo id="simulador-parcelas" rotulo={m.parcelas}>
                <Input
                  id="simulador-parcelas"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={String(MAX_PARCELAS).length}
                  className={campo}
                  value={v.parcelas ? String(v.parcelas) : ''}
                  onChange={(e) => {
                    aoMudar({ parcelas: Number(e.target.value.replace(/\D/g, '')) });
                  }}
                />
              </Campo>
              <Campo id="simulador-cartao" rotulo={m.cartao}>
                <Select
                  value={v.cartaoId}
                  onValueChange={(cartaoId) => {
                    aoMudar({ cartaoId });
                  }}
                >
                  <SelectTrigger id="simulador-cartao" className={campo}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {cartoes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Campo>
              <Campo id="simulador-data" rotulo={m.data}>
                <Input
                  id="simulador-data"
                  type="date"
                  className={campo}
                  value={v.data}
                  onChange={(e) => {
                    aoMudar({ data: e.target.value });
                  }}
                />
              </Campo>
            </>
          ) : (
            <>
              <Campo id="simulador-dia" rotulo={m.dia}>
                <Input
                  id="simulador-dia"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={2}
                  className={campo}
                  value={v.dia ? String(v.dia) : ''}
                  onChange={(e) => {
                    aoMudar({ dia: Number(e.target.value.replace(/\D/g, '')) });
                  }}
                />
              </Campo>
              <Campo id="simulador-desde" rotulo={m.desde}>
                <Input
                  id="simulador-desde"
                  type="month"
                  className={campo}
                  value={v.desde}
                  onChange={(e) => {
                    aoMudar({ desde: e.target.value });
                  }}
                />
              </Campo>
              <Campo id="simulador-pagamento" rotulo={m.pagamento}>
                <Select
                  value={v.pagamento}
                  onValueChange={(pagamento) => {
                    aoMudar({ pagamento });
                  }}
                >
                  <SelectTrigger id="simulador-pagamento" className={campo}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EM_CONTA}>{m.emConta}</SelectItem>
                    {cartoes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Campo>
            </>
          )}
        </div>
      )}

      <p aria-live="polite" className="text-body-md font-medium">
        {conclusao ? frasesDaSimulacao(conclusao, v.tipo, limite) : semCartao ? null : m.preencha}
      </p>
      <div>
        <Button
          type="button"
          variant="outlined"
          className="border-forecast bg-transparent text-on-forecast-container"
          onClick={aoLimpar}
        >
          {m.limpar}
        </Button>
      </div>
    </section>
  );
}
