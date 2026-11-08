import { type DataCivil, type Derivado, previsaoDeQuitacao } from '@goose-money/core';
import { Link } from 'react-router';

import { formatarData } from '@/app/formatacao';
import { mensagensCartoes } from '@/features/cartoes/mensagens';

import { mensagensPainel } from './mensagens';

const m = mensagensPainel.projecoes.quitacao;

/**
 * "Quando cada compromisso termina" (6.2): a última parcela de cada dívida e de cada compra
 * parcelada no cartão (`previsaoDeQuitacao`), por data.
 */
export function Quitacao({ d }: { d: Derivado }) {
  const { dividas, compras } = previsaoDeQuitacao(d);
  const linhas: { chave: string; texto: string; data: DataCivil; para: string }[] = [
    ...dividas.flatMap(({ dividaId, data }) => {
      const t = d.dividas.get(dividaId);
      return t
        ? [
            {
              chave: dividaId,
              texto: m.divida(t.divida.credor, t.resumo.pagas, t.resumo.total),
              data,
              para: `/dividas/${dividaId}`,
            },
          ]
        : [];
    }),
    ...compras.map(({ compraId, cartaoId, data }) => ({
      chave: compraId,
      texto: m.compra(
        d.porId.compras.get(compraId)?.descricao ?? mensagensCartoes.fatura.compra,
        d.porId.cartoes.get(cartaoId)?.nome ?? '',
      ),
      data,
      para: `/cartoes/${cartaoId}`,
    })),
  ].sort((a, b) => a.data.localeCompare(b.data));

  return (
    <section
      aria-labelledby="quitacao"
      className="flex flex-col gap-1 rounded-lg border border-surface-container-highest bg-surface-container-lowest px-5 py-4"
    >
      <h2 id="quitacao" className="mb-2 text-title-md">
        {m.titulo}
      </h2>
      {linhas.length === 0 ? (
        <p className="text-body-md text-on-surface-variant">{m.vazio}</p>
      ) : (
        <ul>
          {linhas.map((l) => (
            <li key={l.chave} className="border-t border-surface-container-high first:border-t-0">
              <Link
                to={l.para}
                className="flex min-h-11 items-center justify-between gap-3 text-body-md hover:bg-on-surface/8"
              >
                <span>{l.texto}</span>
                <span className="font-semibold">{formatarData(l.data)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
