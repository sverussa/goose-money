-- apagar_tudo(): "Apagar tudo" de Configurações › Dados (PROMPT 6.9, 9.4). Exclusão lógica de
-- todos os registros do usuário, numa transação, menos as categorias de sistema e as
-- preferências. As linhas continuam no banco com is_deleted = true.
create or replace function public.apagar_tudo()
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  tabela text;
begin
  if auth.uid() is null then
    raise exception 'apagar_tudo: sem usuário autenticado' using errcode = '42501';
  end if;
  foreach tabela in array public.tabelas_de_negocio() loop
    continue when tabela = 'preferencias';
    execute format(
      'update public.%I set is_deleted = true where created_by = auth.uid() and not is_deleted%s',
      tabela,
      case when tabela = 'categorias' then ' and sistema is null' else '' end
    );
  end loop;
  -- As checagens adiadas (parcelas, dívidas, conta de pagamento) rodam aqui.
  set constraints all immediate;
end;
$$;

revoke all on function public.apagar_tudo() from public, anon;
grant execute on function public.apagar_tudo() to authenticated;
