import {
  aplicar,
  type Contexto,
  categoriasIniciais,
  criarConta,
  dataCivil,
  deMascara,
  derivar,
  exportar,
  type Fatos,
  fatosVazios,
  gerarSeed,
  indicadoresDaBarra,
  planejarImportacao,
  relatorio,
} from '@goose-money/core';
import { describe, expect, it } from 'vitest';

import {
  baseVazia,
  comandoDaImportacao,
  comandoDoExemplo,
  registrosGravados,
  resumoDoRelatorio,
} from './dados';

const HOJE = dataCivil('2026-11-04');
const USUARIO = '00000000-0000-4000-8000-000000000001';
const ctx: Contexto = {
  hoje: HOJE,
  agora: `${HOJE}T12:00:00Z`,
  usuario: USUARIO,
  novoId: () => crypto.randomUUID(),
};
/** Usuário novo: categorias iniciais (com outros ids) e preferências. */
const novo = (): Fatos => {
  const seed = gerarSeed(HOJE, USUARIO);
  return {
    ...fatosVazios(),
    categorias: categoriasIniciais(ctx),
    preferencias: seed.preferencias && { ...seed.preferencias, id: crypto.randomUUID() },
  };
};
const ids = (f: Fatos) =>
  Object.values(f)
    .flatMap((v) => (Array.isArray(v) ? (v as { id: string }[]) : v ? [v as { id: string }] : []))
    .map((x) => x.id)
    .sort();

describe('baseVazia', () => {
  it('ignora categorias e preferências; qualquer outro registro conta', () => {
    const f = novo();
    expect(baseVazia(f)).toBe(true);
    const conta = criarConta(f, ctx, {
      nome: 'Conta',
      instituicao: null,
      tipo: 'corrente',
      saldoInicial: deMascara('100'),
      dataSaldoInicial: HOJE,
      cor: 'categorica-1',
      incluirNoTotal: true,
    });
    expect(baseVazia(aplicar(f, conta.mudancas))).toBe(false);
  });
});

describe('comandoDoExemplo', () => {
  it('usa as categorias e as preferências do usuário e chega aos indicadores do seed', () => {
    const f = novo();
    const c = comandoDoExemplo(f, HOJE, USUARIO, 'ok');
    const depois = aplicar(f, c.mudancas);
    expect(depois.categorias.map((x) => x.id).sort()).toEqual(f.categorias.map((x) => x.id).sort());
    expect(depois.preferencias).toEqual(f.preferencias);
    const ref = new Set(depois.categorias.map((x) => x.id));
    expect(depois.lancamentos.every((l) => l.categoriaId === null || ref.has(l.categoriaId))).toBe(
      true,
    );
    expect(indicadoresDaBarra(derivar(depois, HOJE))).toEqual(
      indicadoresDaBarra(derivar(gerarSeed(HOJE, USUARIO), HOJE)),
    );
    expect(aplicar(depois, c.inversas)).toEqual(f);
  });

  it('sem as categorias padrão (Apagar tudo), insere as do seed', () => {
    const f = { ...novo(), categorias: novo().categorias.filter((x) => x.sistema !== null) };
    const depois = aplicar(f, comandoDoExemplo(f, HOJE, USUARIO, 'ok').mudancas);
    expect(depois.categorias).toHaveLength(gerarSeed(HOJE, USUARIO).categorias.length);
  });
});

describe('comandoDaImportacao', () => {
  const seed = gerarSeed(HOJE, USUARIO);
  const arquivo = JSON.parse(JSON.stringify(exportar(seed, `${HOJE}T13:00:00Z`))) as unknown;

  it('Substituir grava o arquivo inteiro e o Desfazer volta a base de antes', () => {
    const f = novo();
    const plano = planejarImportacao(arquivo, f, 'substituir');
    const c = comandoDaImportacao(f, plano, 'ok');
    const depois = aplicar(f, c.mudancas);
    expect(ids(depois)).toEqual(ids(seed));
    expect(registrosGravados(relatorio(plano))).toBe(ids(seed).length);
    expect(ids(aplicar(depois, c.inversas))).toEqual(ids(f));
  });

  it('Mesclar de novo o mesmo arquivo não muda nada', () => {
    const plano = planejarImportacao(arquivo, seed, 'mesclar');
    expect(comandoDaImportacao(seed, plano, 'ok').mudancas).toEqual([]);
    const r = resumoDoRelatorio(relatorio(plano));
    expect(r.mantidos).toBe(r.noArquivo);
    expect(r.novos + r.atualizados).toBe(0);
  });

  it('referência quebrada conta no resumo', () => {
    const a = arquivo as { dados: Fatos };
    const quebrado = {
      ...a,
      dados: {
        ...a.dados,
        parcelas: a.dados.parcelas.map((p, i) => (i === 0 ? { ...p, compraId: USUARIO } : p)),
      },
    };
    const r = relatorio(planejarImportacao(quebrado, novo(), 'substituir'));
    expect(r.valido).toBe(false);
    expect(resumoDoRelatorio(r).referencias).toBe(1);
    expect(r.erros[0]?.entidade).toBe('parcelas');
  });
});
