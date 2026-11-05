-- Funções e grants padrão usados por todas as tabelas de negócio (PROMPT 9.4 e 12.2).

-- Trigger único de `updated_at`: atualiza a data a cada update (inclusive na
-- exclusão lógica) e impede que `created_at` e `created_by` mudem.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  new.created_at = old.created_at;
  new.created_by = old.created_by;
  return new;
end;
$$;

-- Exclusão sempre lógica: nenhuma tabela nova aceita `delete` dos papéis do app.
alter default privileges in schema public revoke delete on tables from authenticated, anon;

-- O papel `anon` não acessa tabelas nem funções novas.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke execute on functions from anon;
-- O Postgres dá `execute` em toda função nova a PUBLIC (e, por ele, ao `anon`);
-- esse padrão é global e não sai com o revoke por schema acima.
-- O `authenticated` continua com `execute` pelo padrão do Supabase no schema public.
alter default privileges revoke execute on functions from public;
