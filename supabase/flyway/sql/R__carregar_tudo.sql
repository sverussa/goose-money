-- carregar_tudo(): todos os registros não excluídos do usuário, numa chamada só (PROMPT 2.1,
-- 9.3, 9.4; D18, D41). Um objeto com uma chave por tabela de negócio e a lista de linhas
-- (`preferencias` também é lista; o app pega a única). O RLS já restringe ao dono; o filtro
-- por created_by repete a regra e usa os índices.
create or replace function public.carregar_tudo()
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  tabela text;
  linhas jsonb;
  tudo jsonb := '{}';
begin
  foreach tabela in array public.tabelas_de_negocio() loop
    execute format(
      'select coalesce(jsonb_agg(to_jsonb(t.*)), ''[]'') from public.%I t where not t.is_deleted and t.created_by = auth.uid()',
      tabela
    ) into linhas;
    tudo := tudo || jsonb_build_object(tabela, linhas);
  end loop;
  return tudo;
end;
$$;

revoke all on function public.carregar_tudo() from public, anon;
grant execute on function public.carregar_tudo() to authenticated;
