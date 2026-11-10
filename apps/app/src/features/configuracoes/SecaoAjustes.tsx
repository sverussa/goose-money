import {
  type Centavos,
  centavos,
  type Comando,
  competenciaDe,
  type Contexto,
  type Derivado,
  editarRecorrencia,
  ErroDeDominio,
  salvarPreferencias,
} from '@goose-money/core';
import { Check } from 'lucide-react';
import { type ReactNode, type SubmitEvent, useState } from 'react';
import { toast } from 'sonner';

import { type Tema, useTema } from '@/app/providers/useTema';
import { useSessao } from '@/app/providers/useSessao';
import { BotaoSalvar } from '@/components/BotaoSalvar';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { alterarSenha } from '@/data/auth';
import { mensagemDoErroDaSenha, validarNovaSenha } from '@/features/acesso/senha';
import { CampoDeValor } from '@/features/cartoes/CampoDeValor';
import { useComando, useContexto } from '@/queries/useComando';

import { mensagensConfiguracoes } from './mensagens';
import { HORIZONTES, linhasDaConfirmacao } from './preferencias';

const m = mensagensConfiguracoes;
const TEMAS: Tema[] = ['claro', 'escuro', 'sistema'];

function Secao({
  id,
  titulo,
  salvando = false,
  children,
}: {
  id: string;
  titulo: string;
  salvando?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-3.5 rounded-lg border border-surface-container-highest bg-surface-container-lowest p-5"
    >
      <div className="flex items-center gap-2">
        <h2 id={id} className="flex-1 text-title-md font-semibold">
          {titulo}
        </h2>
        <span role="status" className="text-label-md text-on-surface-variant">
          {salvando ? m.salvando : ''}
        </span>
      </div>
      {children}
    </section>
  );
}

/** Grava pelo `useComando` (Salvando… e Desfazer); a regra do core que falhar vira snackbar. */
function useSalvar() {
  const { executar, salvando } = useComando();
  const contexto = useContexto();
  const salvar = (montar: (ctx: Contexto) => Comando) => {
    let comando;
    try {
      comando = montar(contexto());
    } catch (e) {
      if (e instanceof ErroDeDominio) {
        toast.error(e.message);
        return;
      }
      throw e;
    }
    void executar(comando);
  };
  return { salvar, salvando };
}

function LinhaDoSwitch({
  id,
  rotulo,
  dica,
  checked,
  disabled,
  aoMudar,
}: {
  id: string;
  rotulo: string;
  dica?: string;
  checked: boolean;
  disabled: boolean;
  aoMudar: (v: boolean) => void;
}) {
  return (
    <div className="flex min-h-11 items-center gap-4">
      <span className="flex flex-1 flex-col">
        <label htmlFor={id} className="text-body-lg">
          {rotulo}
        </label>
        {dica && (
          <span id={`${id}-dica`} className="text-label-md font-normal text-on-surface-variant">
            {dica}
          </span>
        )}
      </span>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={aoMudar}
        aria-describedby={dica ? `${id}-dica` : undefined}
      />
    </div>
  );
}

/** Aparência (6.9): o tema é do aparelho (D20, D64); "ocultar valores ao abrir" vai ao Supabase. */
export function Aparencia({ d }: { d: Derivado }) {
  const { tema, setTema } = useTema();
  const { salvar, salvando } = useSalvar();
  const a = m.aparencia;
  return (
    <Secao id="config-aparencia" titulo={a.titulo} salvando={salvando}>
      <ToggleGroup
        type="single"
        value={tema}
        onValueChange={(t) => {
          if (t) setTema(t as Tema);
        }}
        aria-label={a.tema}
      >
        {TEMAS.map((t) => (
          <ToggleGroupItem key={t} value={t} className="px-3 medium:px-4.5">
            {t === tema && <Check aria-hidden />}
            {a.temas[t]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <LinhaDoSwitch
        id="config-ocultar"
        rotulo={a.ocultar}
        dica={a.ocultarDica}
        checked={d.fatos.preferencias?.ocultarValoresAoAbrir ?? false}
        disabled={salvando}
        aoMudar={(v) => {
          salvar((ctx) => salvarPreferencias(d.fatos, ctx, { ocultarValoresAoAbrir: v }));
        }}
      />
    </Secao>
  );
}

/**
 * Limite do alerta: grava ao sair do campo ou com `Enter`, só se mudou. O valor gravado que muda
 * (Desfazer, outro aparelho) volta para o campo.
 */
function LimiteDoAlerta({ salvo, aoSalvar }: { salvo: Centavos; aoSalvar: (v: Centavos) => void }) {
  const [valor, setValor] = useState(salvo);
  const [anterior, setAnterior] = useState(salvo);
  if (salvo !== anterior) {
    setAnterior(salvo);
    setValor(salvo);
  }
  const gravar = () => {
    if (valor !== salvo) aoSalvar(valor);
  };
  return (
    <form
      noValidate
      className="flex flex-col gap-1.5"
      onBlur={gravar}
      onSubmit={(e) => {
        e.preventDefault();
        gravar();
      }}
    >
      <Label htmlFor="config-limite">{m.preferencias.limite}</Label>
      <CampoDeValor
        id="config-limite"
        valor={valor}
        aoMudar={setValor}
        aria-describedby="config-limite-dica"
      />
      <span id="config-limite-dica" className="text-label-md font-normal text-on-surface-variant">
        {m.preferencias.limiteDica}
      </span>
    </form>
  );
}

/** Preferências (6.9, D20): no Supabase, valem em todos os aparelhos. */
export function Preferencias({ d }: { d: Derivado }) {
  const { salvar, salvando } = useSalvar();
  const p = m.preferencias;
  const pref = d.fatos.preferencias;
  const linhas = linhasDaConfirmacao(d.fatos, competenciaDe(d.hoje));
  const limite = pref?.limiteAlerta ?? centavos(0);
  return (
    <Secao id="config-preferencias" titulo={p.titulo} salvando={salvando}>
      <div className="grid gap-3 medium:grid-cols-2">
        <LimiteDoAlerta
          salvo={limite}
          aoSalvar={(v) => {
            salvar((ctx) => salvarPreferencias(d.fatos, ctx, { limiteAlerta: v }));
          }}
        />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="config-horizonte">{p.horizonte}</Label>
          <Select
            value={String(pref?.horizontePadrao ?? 12)}
            disabled={salvando}
            onValueChange={(v) => {
              const h = HORIZONTES.find((x) => String(x) === v);
              if (h) salvar((ctx) => salvarPreferencias(d.fatos, ctx, { horizontePadrao: h }));
            }}
          >
            <SelectTrigger id="config-horizonte" className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HORIZONTES.map((h) => (
                <SelectItem key={h} value={String(h)}>
                  {p.meses(h)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <h3
        id="config-automatica"
        className="pt-1 text-label-lg font-semibold text-on-surface-variant"
      >
        {p.automatica}
      </h3>
      <p className="-mt-2 text-label-md font-normal text-on-surface-variant">{p.automaticaDica}</p>
      {linhas.length === 0 ? (
        <p className="text-body-md text-on-surface-variant">{p.semRecorrencias}</p>
      ) : (
        <ul aria-labelledby="config-automatica" className="flex flex-col">
          {linhas.map((l) => (
            <li key={l.id}>
              <LinhaDoSwitch
                id={`config-automatica-${l.id}`}
                rotulo={p.linha(l.descricao, l.dia)}
                checked={l.autoConfirmar}
                disabled={salvando}
                aoMudar={(v) => {
                  salvar((ctx) => editarRecorrencia(d.fatos, ctx, l.id, { autoConfirmar: v }));
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </Secao>
  );
}

function AlterarSenha({ onFechar }: { onFechar: () => void }) {
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const t = m.acesso.dialogo;

  async function salvar(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    const [atual, nova, confirmar] = ['atual', 'nova', 'confirmar'].map((k) => dados.get(k));
    if (typeof atual !== 'string' || typeof nova !== 'string' || typeof confirmar !== 'string')
      return;
    const invalida = validarNovaSenha(nova, confirmar);
    setErro(invalida);
    if (invalida) return;
    setSalvando(true);
    const codigo = await alterarSenha(atual, nova);
    setSalvando(false);
    if (codigo) {
      setErro(
        codigo === 'senha_atual_incorreta' ? t.atualIncorreta : mensagemDoErroDaSenha(codigo),
      );
      return;
    }
    toast(t.alterada);
    onFechar();
  }

  const campo = (nome: string, rotulo: string, autoComplete: string, autoFocus = false) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`senha-${nome}`}>{rotulo}</Label>
      <Input
        id={`senha-${nome}`}
        name={nome}
        type="password"
        required
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        aria-invalid={erro !== null}
        aria-describedby={erro ? 'senha-erro' : undefined}
        className="h-12"
      />
    </div>
  );

  return (
    <Dialog
      open
      onOpenChange={(a) => {
        if (!a) onFechar();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.acesso.alterarSenha}</DialogTitle>
          <DialogDescription>{t.descricao}</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={(e) => void salvar(e)}>
          {campo('atual', t.atual, 'current-password', true)}
          {campo('nova', t.nova, 'new-password')}
          {campo('confirmar', t.confirmar, 'new-password')}
          {erro && (
            <p id="senha-erro" role="alert" className="text-label-md text-error">
              {erro}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="text" onClick={onFechar}>
              {t.cancelar}
            </Button>
            <BotaoSalvar salvando={salvando}>{t.salvar}</BotaoSalvar>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Acesso (6.1, 6.9): e-mail só para leitura, troca de senha pelo Supabase Auth e sair. */
export function Acesso() {
  const { usuario, sair } = useSessao();
  const [aberto, setAberto] = useState(false);
  const a = m.acesso;
  return (
    <Secao id="config-acesso" titulo={a.titulo}>
      <dl className="flex flex-col gap-0.5">
        <dt className="text-label-md text-on-surface-variant">{a.email}</dt>
        <dd className="text-body-lg break-all">{usuario?.email}</dd>
      </dl>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outlined"
          onClick={() => {
            setAberto(true);
          }}
        >
          {a.alterarSenha}
        </Button>
        <Button variant="text" onClick={() => void sair()}>
          {a.sair}
        </Button>
      </div>
      {aberto && (
        <AlterarSenha
          onFechar={() => {
            setAberto(false);
          }}
        />
      )}
    </Secao>
  );
}
