-- Categorias e subcategorias (MODELO-DADOS 3.1; PROMPT 6.9; D35, D40, D62, D63, D77).

create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references auth.users on delete restrict,
  is_deleted boolean not null default false,
  nome text not null check (btrim(nome) <> ''),
  tipo text not null check (tipo in ('receita', 'despesa', 'ambos')),
  icone text not null check (btrim(icone) <> ''),
  cor text check (cor ~ '^[a-z][a-z0-9-]*$'),
  categoria_pai_id uuid,
  sistema text check (sistema in ('a_classificar', 'juros_encargos', 'tarifas', 'ajuste_saldo')),
  unique (id, created_by),
  foreign key (categoria_pai_id, created_by) references public.categorias (id, created_by)
    on delete restrict deferrable initially deferred,
  constraint categorias_pai_diferente check (categoria_pai_id <> id),
  -- Categoria de sistema: tipo fixo, cor neutra (nula) e sem pai; `ambos` só nelas.
  constraint categorias_sistema check (
    case sistema
      when 'a_classificar' then tipo = 'ambos'
      when 'ajuste_saldo' then tipo = 'ambos'
      when 'juros_encargos' then tipo = 'despesa'
      when 'tarifas' then tipo = 'despesa'
      else tipo <> 'ambos'
    end
    and (sistema is null or (cor is null and categoria_pai_id is null))
  )
);

-- O core acha as categorias de sistema por esta chave, nunca pelo nome.
create unique index categorias_sistema_unica on public.categorias (created_by, sistema)
  where sistema is not null and not is_deleted;
-- Nome único entre irmãs do mesmo tipo (sem diferenciar maiúsculas e espaços nas pontas).
create unique index categorias_nome_unico on public.categorias (
  created_by, tipo, coalesce(categoria_pai_id, '00000000-0000-0000-0000-000000000000'), lower(btrim(nome))
) where not is_deleted;
create index categorias_pai on public.categorias (categoria_pai_id) where categoria_pai_id is not null;

create trigger set_updated_at before update on public.categorias
  for each row execute function public.set_updated_at();

-- Categoria de sistema não se edita nem se exclui; nenhuma vira (ou deixa de ser) de sistema.
create function public.categorias_sistema_imutavel()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.sistema is distinct from old.sistema
    or (old.sistema is not null
      and (new.nome, new.tipo, new.icone, new.cor, new.categoria_pai_id, new.is_deleted)
        is distinct from (old.nome, old.tipo, old.icone, old.cor, old.categoria_pai_id, old.is_deleted)) then
    raise exception 'Categoria de sistema não pode ser alterada nem excluída'
      using errcode = '23514', constraint = 'categorias_sistema_imutavel';
  end if;
  return new;
end;
$$;

create trigger categorias_sistema_imutavel before update on public.categorias
  for each row execute function public.categorias_sistema_imutavel();

-- Um nível só (D35): a pai não tem pai, a filha não tem filhas e tem o tipo da pai; a pai
-- excluída não deixa filhas ativas.
-- Adiada até o fim da transação, para o lote de gravar valer em qualquer ordem.
create function public.categorias_um_nivel()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  atual public.categorias;
begin
  select * into atual from public.categorias where id = new.id;
  -- Excluir uma pai exclui as subcategorias na mesma chamada (D49).
  if atual.is_deleted then
    if exists (select from public.categorias f where f.categoria_pai_id = atual.id and not f.is_deleted) then
      raise exception 'Excluir uma categoria pai exclui também as subcategorias'
        using errcode = '23514', constraint = 'categorias_um_nivel';
    end if;
    return null;
  end if;
  if atual.categoria_pai_id is not null and not exists (
    select from public.categorias p
    where p.id = atual.categoria_pai_id and p.categoria_pai_id is null and p.tipo = atual.tipo
      and not p.is_deleted
  ) then
    raise exception 'Subcategoria precisa de uma categoria pai ativa, de um nível só e do mesmo tipo'
      using errcode = '23514', constraint = 'categorias_um_nivel';
  end if;
  if exists (
    select from public.categorias f
    where f.categoria_pai_id = atual.id and not f.is_deleted
      and (atual.categoria_pai_id is not null or f.tipo <> atual.tipo)
  ) then
    raise exception 'Subcategoria precisa de uma categoria pai ativa, de um nível só e do mesmo tipo'
      using errcode = '23514', constraint = 'categorias_um_nivel';
  end if;
  return null;
end;
$$;

create constraint trigger categorias_um_nivel after insert or update on public.categorias
  deferrable initially deferred
  for each row execute function public.categorias_um_nivel();

alter table public.categorias enable row level security;
create policy categorias_select on public.categorias for select to authenticated
  using (created_by = (select auth.uid()));
create policy categorias_insert on public.categorias for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy categorias_update on public.categorias for update to authenticated
  using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));

revoke delete on public.categorias from authenticated, anon;
revoke all on public.categorias from anon;
