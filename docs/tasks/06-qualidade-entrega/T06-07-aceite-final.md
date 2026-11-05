# T06-07 · Aceite final do MVP

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 6 · Qualidade e entrega | Aceite | T06-01 a T06-06 | `docs/aceite-mvp` |

**Referências:** PROMPT 11 (todos os critérios) · DESIGN-HANDOFF 9 · `docs/DECISOES.md`

## Objetivo

Conferir que todos os critérios de aceite da spec viraram testes que passam, e fechar a documentação.

## Escopo

- `docs/ACEITE.md`: tabela com cada critério de 11.1 a 11.8, o teste que o cobre (arquivo e nome) e o resultado.
- Qualquer critério sem teste ganha teste antes de fechar.
- Checklist visual da seção 9 do handoff marcado tela por tela.
- Revisão do `DECISOES.md`: nenhuma decisão das tarefas ficou sem registro; "Em aberto" só com o que for explicitamente adiado.
- README: badge "versão pública", "Como rodar" e estrutura atualizados; funcionalidades do MVP marcadas.
- `CLAUDE.md`: "Project status" atualizado.

## Fora do escopo

Funcionalidades das fases 2 e 3 do roadmap.

## Passos

1. Montar a tabela de aceite.
2. Escrever os testes que faltarem.
3. Atualizar os documentos.

## Critérios de aceite

- [ ] Todo critério de 11.1 a 11.8 aponta para um teste que passa no CI.
- [ ] `make check` e `make test-e2e` passam limpos.
- [ ] Nenhuma decisão sem registro no `DECISOES.md`.
