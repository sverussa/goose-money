import {
  aplicar,
  competencia,
  competenciaDe,
  type Contexto,
  dataCivil,
  deMascara,
  gerarSeed,
  ignorarOcorrencia,
  percentual,
  previsao,
  primeiraCompetenciaNaoConfirmada,
  type Recorrencia,
  resumoRendas,
  somarMeses,
  versaoVigente,
} from '@goose-money/core';
import { describe, expect, it } from 'vitest';

import {
  comandoDaRenda,
  composicaoDaRenda,
  dataDaConfirmacao,
  esquemaDaRenda,
  historicoDeVersoes,
  mesPorExtenso,
  opcoesAPartirDe,
  previaDaEdicao,
  rendasDoMes,
  valoresIniciaisDaRenda,
} from './rendas';

const HOJE = dataCivil('2026-11-04');
const MES = competenciaDe(HOJE);
const USUARIO = '00000000-0000-4000-8000-000000000001';
const fatos = gerarSeed(HOJE, USUARIO);
const ctx: Contexto = {
  hoje: HOJE,
  agora: `${HOJE}T12:00:00Z`,
  usuario: USUARIO,
  novoId: () => crypto.randomUUID(),
};
const renda = (nome: string) =>
  fatos.recorrencias.find((r) => r.descricao === nome && r.natureza === 'renda') as Recorrencia;
const salario = renda('Salário');
const freelance = renda('Freelance');
const versoesDe = (r: Recorrencia, f = fatos) =>
  f.recorrenciaVersoes.filter((v) => v.recorrenciaId === r.id);

describe('rendasDoMes e o cabeçalho', () => {
  it('só as rendas, cuja soma sem as ignoradas é o "Previsto no mês" de resumoRendas', () => {
    const lista = rendasDoMes(fatos, MES, HOJE);
    expect(lista.map((o) => o.recorrencia.descricao).sort()).toEqual(['Freelance', 'Salário']);
    expect(composicaoDaRenda(fatos, MES, HOJE).total).toBe(resumoRendas(fatos, MES, HOJE).previsto);
  });

  it('"novembro/2026" por extenso', () => {
    expect(mesPorExtenso(competencia('2026-11'))).toBe('novembro/2026');
  });
});

describe('dataDaConfirmacao', () => {
  it('a data prevista se já chegou; senão hoje (efetivado não pode ser futuro)', () => {
    expect(dataDaConfirmacao({ data: dataCivil('2026-11-20') }, HOJE)).toBe(HOJE);
    expect(dataDaConfirmacao({ data: dataCivil('2026-10-20') }, HOJE)).toBe('2026-10-20');
  });
});

describe('opcoesAPartirDe', () => {
  it('12 meses desde a primeira não confirmada', () => {
    const lista = opcoesAPartirDe(fatos, salario);
    expect(lista[0]).toBe(primeiraCompetenciaNaoConfirmada(fatos, salario));
    expect(lista).toHaveLength(12);
    expect(lista[11]).toBe(somarMeses(lista[0] ?? MES, 11));
  });

  it('para no fim da recorrência', () => {
    const primeira = primeiraCompetenciaNaoConfirmada(fatos, salario);
    const comFim = { ...salario, competenciaFim: somarMeses(primeira, 2) };
    expect(opcoesAPartirDe(fatos, comFim)).toHaveLength(3);
  });
});

describe('historicoDeVersoes', () => {
  it('da mais nova para a mais antiga, cada uma até a véspera da seguinte', () => {
    const versoes = versoesDe(freelance).sort((a, b) => (a.vigenteDesde < b.vigenteDesde ? 1 : -1));
    const h = historicoDeVersoes(fatos, freelance);
    expect(h.map((v) => [v.de, v.ate, v.valor])).toEqual([
      [versoes[0]?.vigenteDesde, null, versoes[0]?.valor],
      [
        versoes[1]?.vigenteDesde,
        somarMeses(versoes[0]?.vigenteDesde ?? MES, -1),
        versoes[1]?.valor,
      ],
    ]);
  });
});

describe('composicaoDaRenda', () => {
  it('uma fatia por fonte, da maior para a menor, e a maior na conclusão', () => {
    const { fatias, total, conclusao } = composicaoDaRenda(fatos, MES, HOJE);
    expect(fatias.map((x) => x.fonte)).toEqual(['Salário', 'Freelance']);
    const maior = fatias[0];
    expect(conclusao).toEqual({
      tipo: 'maior',
      fonte: 'Salário',
      fatia: percentual(maior?.valor ?? deMascara('0'), total),
    });
  });

  it('ignorada sai da composição; uma fonte só e nenhuma', () => {
    const sem = aplicar(fatos, ignorarOcorrencia(fatos, ctx, freelance.id, MES).mudancas);
    expect(composicaoDaRenda(sem, MES, HOJE).conclusao).toEqual({
      tipo: 'unica',
      fonte: 'Salário',
    });
    const nenhuma = { ...fatos, recorrencias: [] };
    expect(composicaoDaRenda(nenhuma, MES, HOJE)).toMatchObject({
      fatias: [],
      conclusao: { tipo: 'vazia' },
    });
  });
});

describe('formulário', () => {
  it('nova: a conta e "A classificar" já escolhidas, começa no mês de hoje', () => {
    const v = valoresIniciaisDaRenda(fatos, HOJE, null);
    expect(v.inicio).toBe(MES);
    expect(v.contaId).not.toBe('');
    expect(v.categoriaId).toBe(fatos.categorias.find((c) => c.sistema === 'a_classificar')?.id);
    expect(esquemaDaRenda.safeParse(v).success).toBe(false);
  });

  it('editar: a versão vigente na primeira competência não confirmada', () => {
    const v = valoresIniciaisDaRenda(fatos, HOJE, null, freelance);
    const aPartirDe = primeiraCompetenciaNaoConfirmada(fatos, freelance);
    expect(v.aPartirDe).toBe(aPartirDe);
    expect(v.valor).toBe(versaoVigente(versoesDe(freelance), aPartirDe)?.valor);
    expect(esquemaDaRenda.safeParse(v).success).toBe(true);
  });

  it('o fim não pode ser antes do início', () => {
    const v = valoresIniciaisDaRenda(fatos, HOJE, null, freelance);
    const r = esquemaDaRenda.safeParse({ ...v, fim: somarMeses(competencia(v.inicio), -1) });
    expect(r.success).toBe(false);
  });

  it('nova grava a recorrência e a primeira versão, vigente desde o início', () => {
    const v = {
      ...valoresIniciaisDaRenda(fatos, HOJE, null),
      descricao: 'Aluguel recebido',
      valor: deMascara('90000'),
      dia: 31,
    };
    const depois = aplicar(fatos, comandoDaRenda(fatos, ctx, v).mudancas);
    const r = depois.recorrencias.find((x) => x.descricao === 'Aluguel recebido') as Recorrencia;
    expect(r).toMatchObject({ natureza: 'renda', competenciaInicio: MES, ativa: true });
    expect(previsao(r, depois.recorrenciaVersoes, MES)).toMatchObject({
      valor: v.valor,
      data: '2026-11-30',
    });
  });

  it('editar sem mudança não grava nada', () => {
    const v = valoresIniciaisDaRenda(fatos, HOJE, null, salario);
    expect(comandoDaRenda(fatos, ctx, v, salario).mudancas).toEqual([]);
  });

  it('novo valor "a partir de": versão nova; o mês anterior e os gravados não mudam (3.8)', () => {
    const v = valoresIniciaisDaRenda(fatos, HOJE, null, salario);
    const dezembro = somarMeses(MES, 1);
    const novo = { ...v, aPartirDe: dezembro, valor: deMascara('700000') };
    const comando = comandoDaRenda(fatos, ctx, novo, salario);
    expect(comando.mudancas.map((m) => m.entidade)).toEqual(['recorrenciaVersoes']);
    const depois = aplicar(fatos, comando.mudancas);
    const valorEm = (f: typeof fatos, c: typeof MES) =>
      rendasDoMes(f, c, HOJE).find((o) => o.recorrenciaId === salario.id)?.valor;
    expect(valorEm(depois, MES)).toBe(valorEm(fatos, MES));
    expect(valorEm(depois, dezembro)).toBe(novo.valor);
    expect(valorEm(depois, somarMeses(MES, 6))).toBe(novo.valor);
    expect(valorEm(depois, somarMeses(MES, -2))).toBe(valorEm(fatos, somarMeses(MES, -2)));

    const previa = previaDaEdicao(fatos, HOJE, salario, comando, dezembro);
    expect(previa.historico[0]).toMatchObject({ de: dezembro, valor: novo.valor, ate: null });
    expect(previa.nova).toBe(previa.historico[0]?.id);
    expect(previa.anterior).toEqual({ competencia: MES, valor: valorEm(fatos, MES) });
  });

  it('descrição e valor juntos: os dois comandos numa gravação, com o Desfazer dos dois', () => {
    const v = valoresIniciaisDaRenda(fatos, HOJE, null, freelance);
    const comando = comandoDaRenda(
      fatos,
      ctx,
      { ...v, descricao: 'Freela', autoConfirmar: true, valor: deMascara('150000') },
      freelance,
    );
    expect(comando.mudancas.map((m) => m.entidade)).toEqual(['recorrencias', 'recorrenciaVersoes']);
    const depois = aplicar(fatos, comando.mudancas);
    expect(depois.recorrencias.find((r) => r.id === freelance.id)).toMatchObject({
      descricao: 'Freela',
      autoConfirmar: true,
    });
    const desfeito = aplicar(depois, comando.inversas);
    expect(desfeito.recorrencias.find((r) => r.id === freelance.id)).toEqual(freelance);
    expect(versoesDe(freelance, desfeito)).toHaveLength(versoesDe(freelance).length);
  });

  it('prévia sem comando: o histórico atual, sem a marca de nova', () => {
    const previa = previaDaEdicao(fatos, HOJE, freelance, null, freelance.competenciaInicio);
    expect(previa.nova).toBeNull();
    expect(previa.anterior).toBeNull();
    expect(previa.historico).toHaveLength(versoesDe(freelance).length);
  });
});
