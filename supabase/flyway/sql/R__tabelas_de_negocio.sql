-- Lista única das tabelas de negócio (MODELO-DADOS), usada por gravar, carregar_tudo e
-- apagar_tudo. Cada tarefa que cria uma tabela a acrescenta aqui.
create or replace function public.tabelas_de_negocio()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['categorias', 'contas', 'preferencias', 'lancamentos',
    'cartoes', 'cartao_ciclos', 'compras', 'parcelas', 'itens_fatura',
    'dividas', 'parcelas_divida']
$$;

revoke all on function public.tabelas_de_negocio() from public, anon;
grant execute on function public.tabelas_de_negocio() to authenticated;
