import { CreditCard, Landmark, Plus, ReceiptText } from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { MoneyText } from '@/components/MoneyText';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useFatos } from '@/queries/fatos';

import { formatarData } from '../formatacao';
import { mensagens } from '../mensagens';
import { buscarLancamentos, combina } from './busca';
import { itensDoMenu } from './navegacao';

const m = mensagens.busca;

/**
 * Busca global (Ctrl/Cmd + K, D45): telas, ações e lançamentos pela descrição. Escolher um
 * lançamento abre Lançamentos com ele em destaque (`?destaque=<id>`, T05-07).
 */
export function BuscaGlobal({
  aberta,
  onFechar,
  lancar,
}: {
  aberta: boolean;
  onFechar: () => void;
  lancar: () => void;
}) {
  const navegar = useNavigate();
  const fatos = useFatos();
  const [termo, setTermo] = useState('');

  const acoes = [
    { chave: 'lancar', rotulo: mensagens.acoes.lancar, Icone: Plus, fazer: lancar },
    {
      chave: 'nova-conta',
      rotulo: m.novaConta,
      Icone: Landmark,
      fazer: () => void navegar('/contas?acao=nova'),
    },
    {
      chave: 'pagar-fatura',
      rotulo: m.pagarFatura,
      Icone: CreditCard,
      fazer: () => void navegar('/cartoes?acao=pagar'),
    },
  ].filter((a) => combina(a.rotulo, termo));
  const telas = itensDoMenu.filter((i) => combina(i.rotulo, termo));
  const achados = fatos.estado === 'pronto' ? buscarLancamentos(fatos.dados, termo) : [];

  // A escolha roda depois que a busca termina de fechar: abrir o formulário de lançamento com a
  // busca ainda na tela faria os dois diálogos disputarem o foco.
  const escolhida = useRef<(() => void) | null>(null);
  function escolher(fazer: () => void) {
    escolhida.current = fazer;
    onFechar();
    setTermo('');
  }

  return (
    <CommandDialog
      title={m.titulo}
      description={m.descricao}
      open={aberta}
      onCloseAutoFocus={(e) => {
        const fazer = escolhida.current;
        escolhida.current = null;
        if (fazer) {
          e.preventDefault();
          fazer();
        }
      }}
      onOpenChange={(a) => {
        if (!a) {
          onFechar();
          setTermo('');
        }
      }}
    >
      <Command shouldFilter={false}>
        <CommandInput
          placeholder={m.placeholder}
          aria-label={m.titulo}
          value={termo}
          onValueChange={setTermo}
        />
        <CommandList>
          <CommandEmpty>{m.nada}</CommandEmpty>
          {telas.length > 0 && (
            <CommandGroup heading={m.telas}>
              {telas.map((i) => (
                <CommandItem
                  key={i.chave}
                  value={`tela-${i.chave}`}
                  onSelect={() => {
                    escolher(() => void navegar(i.rota));
                  }}
                >
                  <i.Icone aria-hidden />
                  {i.rotulo}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {acoes.length > 0 && (
            <CommandGroup heading={m.acoes}>
              {acoes.map((a) => (
                <CommandItem
                  key={a.chave}
                  value={`acao-${a.chave}`}
                  onSelect={() => {
                    escolher(a.fazer);
                  }}
                >
                  <a.Icone aria-hidden />
                  {a.rotulo}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {achados.length > 0 && (
            <CommandGroup heading={m.lancamentos}>
              {achados.map((l) => (
                <CommandItem
                  key={l.id}
                  value={`lancamento-${l.id}`}
                  onSelect={() => {
                    escolher(
                      () => void navegar(`/lancamentos?destaque=${encodeURIComponent(l.id)}`),
                    );
                  }}
                >
                  <ReceiptText aria-hidden />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{l.descricao}</span>
                    <span className="text-label-md font-normal text-on-surface-variant">
                      {formatarData(l.data)}
                    </span>
                  </span>
                  <MoneyText valor={l.valor} tipo={l.tipo} />
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
