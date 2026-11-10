import {
  type Derivado,
  exportar,
  type Modo,
  planejarImportacao,
  relatorio,
} from '@goose-money/core';
import { useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { apagarTudo } from '@/data/gravar';
import { abrirArquivo, salvarArquivo } from '@/plataforma/arquivos';
import { chaveDosFatos } from '@/queries/fatos';
import { agoraIso } from '@/queries/relogio';
import { useComando } from '@/queries/useComando';

import {
  baseVazia,
  comandoDaImportacao,
  comandoDoExemplo,
  nomeDoBackup,
  registrosGravados,
  resumoDoRelatorio,
} from './dados';
import { mensagensConfiguracoes } from './mensagens';
import { Secao } from './SecaoAjustes';

const m = mensagensConfiguracoes.dados;
const MODOS: Modo[] = ['substituir', 'mesclar'];

/** Salva o backup do estado atual (9.2); devolve o nome, ou `null` se o usuário cancelou. */
const salvarBackup = (d: Derivado) =>
  salvarArquivo({
    nomeSugerido: nomeDoBackup(d.hoje),
    tipo: 'application/json',
    conteudo: JSON.stringify(exportar(d.fatos, agoraIso()), null, 2),
  });

type Lido = { nome: string; json: unknown } | { nome: string; invalido: true };

function Relatorio({ nome, r }: { nome: string; r: ReturnType<typeof relatorio> }) {
  const i = m.importacao;
  const s = resumoDoRelatorio(r);
  const partes = [
    i.modos[r.modo],
    i.resumo.registros(s.noArquivo),
    s.mantidos > 0 && i.resumo.mantidos(s.mantidos),
    s.novos > 0 && i.resumo.novos(s.novos),
    s.atualizados > 0 && i.resumo.atualizados(s.atualizados),
    s.excluidos > 0 && i.resumo.excluidos(s.excluidos),
    s.conflitos > 0 && i.resumo.conflitos(s.conflitos),
  ].filter(Boolean);
  const nomeDe = (e: keyof typeof m.entidades | null) => (e ? m.entidades[e] : i.arquivo);
  const contagens = r.contagens.filter(
    (c) => c.novos + c.atualizados + c.mantidos + c.excluidos + c.conflitos + c.erros > 0,
  );
  return (
    <section
      aria-labelledby="relatorio-titulo"
      className="flex flex-col gap-1.5 rounded-md bg-surface-container-low px-4 py-3.5 text-body-md"
    >
      <h3 id="relatorio-titulo" className="font-semibold break-all">
        {i.relatorio(nome)}
      </h3>
      <p className="text-on-surface-variant">{partes.join(' · ')}</p>
      {s.estrutura > 0 ? (
        <p className="text-error">{i.estruturaErro(s.estrutura)}</p>
      ) : (
        <p className={s.referencias + s.invariantes > 0 ? 'text-error' : 'text-on-surface-variant'}>
          {s.referencias > 0 ? i.integridadeErro(s.referencias) : i.integridadeOk}{' '}
          {s.invariantes > 0 ? i.invariantesErro(s.invariantes) : i.invariantesOk}
        </p>
      )}
      {contagens.length > 0 && (
        <>
          <h4 id="relatorio-entidades" className="pt-1 text-label-lg font-semibold">
            {i.porEntidade}
          </h4>
          <ul aria-labelledby="relatorio-entidades" className="text-on-surface-variant">
            {contagens.map((c) => (
              <li key={c.entidade}>
                {`${m.entidades[c.entidade]}: ${[
                  c.novos > 0 && i.resumo.novos(c.novos),
                  c.atualizados > 0 && i.resumo.atualizados(c.atualizados),
                  c.mantidos > 0 && i.resumo.mantidos(c.mantidos),
                  c.excluidos > 0 && i.resumo.excluidos(c.excluidos),
                  c.conflitos > 0 && i.resumo.conflitos(c.conflitos),
                  c.erros > 0 && i.resumo.erros(c.erros),
                ]
                  .filter(Boolean)
                  .join(' · ')}`}
              </li>
            ))}
          </ul>
        </>
      )}
      {r.conflitos.length > 0 && (
        <>
          <h4 id="relatorio-conflitos" className="pt-1 text-label-lg font-semibold">
            {i.conflitosTitulo}
          </h4>
          <ul aria-labelledby="relatorio-conflitos" className="break-all text-on-surface-variant">
            {r.conflitos.map((c) => (
              <li key={`${c.entidade} ${c.id}`}>
                {`${m.entidades[c.entidade]}: ${i.conflito(c.id, c.idExistente)}`}
              </li>
            ))}
          </ul>
        </>
      )}
      {r.erros.length > 0 && (
        <>
          <h4 id="relatorio-erros" className="pt-1 text-label-lg font-semibold text-error">
            {i.errosTitulo}
          </h4>
          <ul aria-labelledby="relatorio-erros" className="break-all text-error">
            {r.erros.map((e, k) => (
              <li key={k}>{`${nomeDe(e.entidade)}: ${e.mensagem}`}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/** Importar (9.2): modo, arquivo, relatório prévio e "Importar" só com o plano válido. */
function Importar({ d, onFechar }: { d: Derivado; onFechar: () => void }) {
  const { executar, salvando } = useComando();
  const [modo, setModo] = useState<Modo>('substituir');
  const [lido, setLido] = useState<Lido | null>(null);
  const [falha, setFalha] = useState<string | null>(null);
  const [baixando, setBaixando] = useState(false);
  const i = m.importacao;

  const plano = useMemo(
    () => (lido && 'json' in lido ? planejarImportacao(lido.json, d.fatos, modo) : null),
    [lido, d.fatos, modo],
  );
  const r = plano && relatorio(plano);
  const n = r ? registrosGravados(r) : 0;
  const motivo = !r ? null : !r.valido ? i.invalido : n === 0 ? i.semMudanca : null;

  async function escolher() {
    const a = await abrirArquivo({ tipos: ['json'] });
    if (!a) return;
    setFalha(null);
    try {
      setLido({ nome: a.nome, json: JSON.parse(a.conteudo) as unknown });
    } catch {
      setLido({ nome: a.nome, invalido: true });
    }
  }

  async function importar() {
    if (!plano || !r || motivo) return;
    setFalha(null);
    if (modo === 'substituir') {
      setBaixando(true);
      const salvo = await salvarBackup(d).finally(() => {
        setBaixando(false);
      });
      if (!salvo) {
        setFalha(i.backupCancelado);
        return;
      }
    }
    const ok = await executar(comandoDaImportacao(d.fatos, plano, i.importados(n)));
    if (ok) onFechar();
    else setFalha(i.falhou);
  }

  return (
    <Dialog
      open
      onOpenChange={(a) => {
        if (!a) onFechar();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{i.titulo}</DialogTitle>
          <DialogDescription>{i.descricao}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <ToggleGroup
            type="single"
            value={modo}
            onValueChange={(v) => {
              if (v) setModo(v as Modo);
            }}
            aria-label={i.modo}
            aria-describedby="importar-modo-dica"
          >
            {MODOS.map((x) => (
              <ToggleGroupItem key={x} value={x} className="px-4.5">
                {x === modo && <Check aria-hidden />}
                {i.modos[x]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <p id="importar-modo-dica" className="text-label-md font-normal text-on-surface-variant">
            {i.explicacao[modo]}
          </p>
        </div>
        <Button variant="outlined" className="self-start" onClick={() => void escolher()}>
          {lido ? i.trocar : i.escolher}
        </Button>
        {lido && 'invalido' in lido && (
          <p role="alert" className="text-body-md text-error">
            {i.jsonInvalido(lido.nome)}
          </p>
        )}
        {lido && r && <Relatorio nome={lido.nome} r={r} />}
        {(motivo ?? falha) && (
          <p
            id="importar-motivo"
            role={falha ? 'alert' : undefined}
            className="text-label-md text-on-surface-variant"
          >
            {falha ?? motivo}
          </p>
        )}
        <form
          noValidate
          className="flex flex-wrap items-center justify-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void importar();
          }}
        >
          <Button type="button" variant="text" onClick={onFechar}>
            {i.cancelar}
          </Button>
          {r && (
            <BotaoSalvar
              salvando={salvando || baixando}
              disabled={motivo !== null}
              aria-describedby={motivo ? 'importar-motivo' : undefined}
            >
              {i.importar}
            </BotaoSalvar>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** "Apagar tudo" (6.9, 9.4): só depois de digitar APAGAR; depois, o app vazio no Painel. */
function ApagarTudo({ onFechar }: { onFechar: () => void }) {
  const consultas = useQueryClient();
  const { usuario } = useSessao();
  const navegar = useNavigate();
  const [texto, setTexto] = useState('');
  const [apagando, setApagando] = useState(false);
  const [erro, setErro] = useState(false);
  const a = m.apagarDialogo;
  const confirmado = texto === a.palavra;

  async function apagar() {
    if (!confirmado || !usuario) return;
    setApagando(true);
    setErro(false);
    try {
      await apagarTudo();
      await consultas.refetchQueries({ queryKey: chaveDosFatos(usuario.id) });
    } catch {
      setApagando(false);
      setErro(true);
      return;
    }
    toast(a.apagado);
    onFechar();
    void navegar('/');
  }

  return (
    <Dialog
      open
      onOpenChange={(x) => {
        if (!x) onFechar();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{a.titulo}</DialogTitle>
          <DialogDescription>{a.descricao}</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void apagar();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="apagar-confirmacao">{a.campo}</Label>
            <Input
              id="apagar-confirmacao"
              value={texto}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              aria-invalid={erro}
              aria-describedby={erro ? 'apagar-erro' : undefined}
              className="h-12"
              onChange={(e) => {
                setTexto(e.target.value);
              }}
            />
          </div>
          {erro && (
            <p id="apagar-erro" role="alert" className="text-label-md text-error">
              {a.erro}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="text" onClick={onFechar}>
              {a.voltar}
            </Button>
            <BotaoSalvar salvando={apagando} disabled={!confirmado} variant="destructive">
              {apagando ? m.apagando : a.confirmar}
            </BotaoSalvar>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Dados (6.9, 9.2, 10): exportar, importar, dados de exemplo e apagar tudo. */
export function Dados({ d }: { d: Derivado }) {
  const { executar, salvando } = useComando();
  const { usuario } = useSessao();
  const [dialogo, setDialogo] = useState<'importar' | 'apagar' | null>(null);
  const vazia = baseVazia(d.fatos);
  const fechar = () => {
    setDialogo(null);
  };

  async function exportarBackup() {
    const nome = await salvarBackup(d);
    if (nome) toast(m.exportado(nome));
  }

  return (
    <Secao id="config-dados" titulo={m.titulo} salvando={salvando}>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void exportarBackup()}>{m.exportar}</Button>
        <Button
          variant="outlined"
          onClick={() => {
            setDialogo('importar');
          }}
        >
          {m.importar}
        </Button>
        <Button
          variant="outlined"
          disabled={!vazia || salvando || !usuario}
          aria-describedby={vazia ? undefined : 'config-exemplo-motivo'}
          onClick={() => {
            if (usuario)
              void executar(comandoDoExemplo(d.fatos, d.hoje, usuario.id, m.exemploCarregado));
          }}
        >
          {m.exemplo}
        </Button>
      </div>
      {!vazia && (
        <p id="config-exemplo-motivo" className="text-label-md text-on-surface-variant">
          {m.exemploBloqueado}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3 border-t border-surface-container-low pt-3">
        <p className="flex-1 basis-56 text-body-md text-on-surface-variant">{m.apagarTexto}</p>
        <Button
          variant="outlined"
          className="border-error text-error hover:bg-error/8"
          onClick={() => {
            setDialogo('apagar');
          }}
        >
          {m.apagar}
        </Button>
      </div>
      {dialogo === 'importar' && <Importar d={d} onFechar={fechar} />}
      {dialogo === 'apagar' && <ApagarTudo onFechar={fechar} />}
    </Secao>
  );
}
