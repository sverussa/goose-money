-- inicializar_usuario(): categorias de sistema, categorias padrão e preferências de um usuário
-- novo (PROMPT 5.3, 6.9, 7.2; D39, D40, D64, D65). O app chama logo depois do login e da
-- confirmação do cadastro, antes de carregar os dados. Idempotente: as categorias de sistema
-- que faltarem são criadas; as padrão e as preferências, só no primeiro acesso (sem
-- preferências), para não recriar uma categoria padrão que o usuário excluiu.
-- A lista é a de `categoriasIniciais` (packages/core/src/seed); um teste confere as duas.
create or replace function public.inicializar_usuario()
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  usuario uuid := auth.uid();
begin
  if usuario is null then
    raise exception 'inicializar_usuario: sem usuário autenticado' using errcode = '42501';
  end if;
  -- Duas abas no primeiro acesso: uma inicializa, a outra espera e não duplica.
  perform pg_advisory_xact_lock(hashtextextended('inicializar_usuario:' || usuario::text, 0));

  insert into categorias (nome, tipo, icone, sistema)
  select s.nome, s.tipo, s.icone, s.sistema
  from (values
    ('A classificar', 'ambos', 'circle-help', 'a_classificar', 1),
    ('Juros e encargos', 'despesa', 'percent', 'juros_encargos', 2),
    ('Tarifas', 'despesa', 'receipt', 'tarifas', 3),
    ('Ajuste de saldo', 'ambos', 'scale', 'ajuste_saldo', 4)
  ) as s (nome, tipo, icone, sistema, ordem)
  where not exists (
    select from categorias c where c.sistema = s.sistema and not c.is_deleted
  )
  order by s.ordem;

  if exists (select from preferencias) then
    return;
  end if;

  insert into categorias (nome, tipo, icone, cor)
  values
    ('Moradia', 'despesa', 'house', 'categorica-1'),
    ('Transporte', 'despesa', 'car', 'categorica-2'),
    ('Alimentação', 'despesa', 'utensils', 'categorica-3'),
    ('Compras', 'despesa', 'shopping-bag', 'categorica-4'),
    ('Saúde e bem-estar', 'despesa', 'heart-pulse', 'categorica-5'),
    ('Assinaturas', 'despesa', 'repeat', 'categorica-6'),
    ('Lazer', 'despesa', 'party-popper', 'categorica-7'),
    ('Outras', 'despesa', 'ellipsis', 'categorica-8'),
    ('Renda', 'receita', 'banknote', 'categorica-8')
  -- Nome já usado (backup importado antes da inicialização): fica o do usuário.
  on conflict do nothing;

  -- Padrões da tabela: limite de alerta R$ 500,00, horizonte de 12 meses, valores à mostra.
  insert into preferencias default values;
end;
$$;

revoke all on function public.inicializar_usuario() from public, anon;
grant execute on function public.inicializar_usuario() to authenticated;
