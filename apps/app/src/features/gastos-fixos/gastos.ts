import {
  type Competencia,
  type DataCivil,
  type Derivado,
  faturaDoGastoNoCartao,
  type Fatos,
  type OcorrenciaDoMes,
  pendencias,
  somarDias,
  somarMeses,
  versaoVigente,
} from '@goose-money/core';

import { formatarData, formatarMes, formatarMesCurto, formatarMoeda } from '@/app/formatacao';
import type { EstadoDoChip } from '@/components/estados';
import { doMes } from '@/features/recorrencias/recorrencias';

import { mensagensGastos as m } from './mensagens';

// Gastos fixos (3.8, 6.8): o que a tela mostra, lido do core. O formulário e a confirmação são os
// de `features/recorrencias`, comuns com Rendas.

/** Os gastos fixos da competência, pagos, ignorados ou previstos, em ordem de data (core). */
export const gastosDoMes = (fatos: Fatos, mes: Competencia, hoje: DataCivil): OcorrenciaDoMes[] =>
  doMes(fatos, mes, hoje, 'gasto');

const ddmm = (d: DataCivil) => formatarData(d).slice(0, 5);
const nomeDoMes = (c: Competencia) =>
  (formatarMes(c).split(' ')[0] ?? '').toLocaleLowerCase('pt-BR');
const chave = (x: { recorrenciaId: string; competencia: Competencia }) =>
  `${x.recorrenciaId}:${x.competencia}`;

/** Os gastos que vencem logo, pela mesma regra das Pendências do Painel (core). */
export const aVencerLogo = (d: Derivado): Set<string> =>
  new Set(pendencias(d).flatMap((p) => (p.tipo === 'gasto' ? [chave(p)] : [])));

/** Status do mês (3.8) → chip e rótulo; prevista que vence logo fica "Vence hoje/amanhã". */
export function chipDoGasto(
  o: OcorrenciaDoMes,
  hoje: DataCivil,
  logo: Set<string>,
): { estado: EstadoDoChip; rotulo: string } {
  const data = ddmm(o.data);
  if (o.status === 'confirmada') return { estado: 'faturaPaga', rotulo: m.chip.confirmada(data) };
  if (o.status === 'ignorada') return { estado: 'faturaTransportada', rotulo: m.chip.ignorada };
  if (o.status === 'vencida') return { estado: 'vencido', rotulo: m.chip.vencida(data) };
  if (!logo.has(chave(o))) return { estado: 'previsto', rotulo: m.chip.prevista(data) };
  const rotulo =
    o.data === hoje
      ? m.chip.venceHoje
      : o.data === somarDias(hoje, 1)
        ? m.chip.venceAmanha
        : m.chip.venceEm(data);
  return { estado: 'venceEmBreve', rotulo };
}

/**
 * A linha de detalhe (GastosFixos.dc.html): categoria, conta ou cartão e a fatura; o dia que não
 * existe no mês (3.8); e o valor real do mês anterior, quando foi diferente.
 */
export function detalheDoGasto(d: Derivado, o: OcorrenciaDoMes): string {
  const partes = [d.porId.categorias.get(o.categoriaId)?.nome ?? ''];
  if (o.contaId) partes.push(d.porId.contas.get(o.contaId)?.nome ?? '');
  const fatura = faturaDoGastoNoCartao(d.fatos, o);
  if (o.cartaoId && fatura) {
    partes.push(d.porId.cartoes.get(o.cartaoId)?.nome ?? '');
    partes.push(m.detalhe.caiNaFatura(formatarMesCurto(fatura)));
  }
  const versao = versaoVigente(
    d.fatos.recorrenciaVersoes.filter((v) => v.recorrenciaId === o.recorrenciaId),
    o.competencia,
  );
  const dia = Number(o.data.slice(8));
  if (o.status !== 'confirmada' && versao && versao.dia > dia)
    partes.push(m.detalhe.diaAjustado(versao.dia, dia, nomeDoMes(o.competencia)));
  const mesAnterior = somarMeses(o.competencia, -1);
  const anterior = gastosDoMes(d.fatos, mesAnterior, d.hoje).find(
    (x) => x.recorrenciaId === o.recorrenciaId && x.status === 'confirmada',
  );
  if (anterior && anterior.valor !== o.valor)
    partes.push(m.detalhe.anterior(nomeDoMes(mesAnterior), formatarMoeda(anterior.valor)));
  return partes.filter(Boolean).join(' · ');
}
