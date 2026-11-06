-- Compras no cartão e parcelas (MODELO-DADOS 3.6, 3.7; PROMPT 3.5, 3.6; D60, D78).
-- "Paga antes do cadastro" é derivada (competência < competencia_inicial do cartão, D60).

create table public.compras (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references auth.users on delete restrict,
  is_deleted boolean not null default false,
  cartao_id uuid not null,
  data date not null,
  descricao text,
  categoria_id uuid not null,
  observacao text,
  valor_total bigint not null check (valor_total > 0),
  numero_parcelas smallint not null default 1 check (numero_parcelas >= 1),
  cancelada boolean not null default false,
  unique (id, created_by),
  foreign key (cartao_id, created_by) references public.cartoes (id, created_by)
    on delete restrict deferrable initially deferred,
  foreign key (categoria_id, created_by) references public.categorias (id, created_by)
    on delete restrict deferrable initially deferred
);

create index compras_por_cartao on public.compras (cartao_id) where not is_deleted;

create trigger set_updated_at before update on public.compras
  for each row execute function public.set_updated_at();

alter table public.compras enable row level security;
create policy compras_select on public.compras for select to authenticated
  using (created_by = (select auth.uid()));
create policy compras_insert on public.compras for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy compras_update on public.compras for update to authenticated
  using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));

revoke delete on public.compras from authenticated, anon;
revoke all on public.compras from anon;

create table public.parcelas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references auth.users on delete restrict,
  is_deleted boolean not null default false,
  compra_id uuid not null,
  numero smallint not null check (numero >= 1),
  valor bigint not null check (valor > 0),
  competencia text not null check (competencia ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  unique (id, created_by),
  foreign key (compra_id, created_by) references public.compras (id, created_by)
    on delete restrict deferrable initially deferred
);

create unique index parcelas_numero_unico on public.parcelas (created_by, compra_id, numero)
  where not is_deleted;
create index parcelas_por_compra on public.parcelas (compra_id) where not is_deleted;

create trigger set_updated_at before update on public.parcelas
  for each row execute function public.set_updated_at();

alter table public.parcelas enable row level security;
create policy parcelas_select on public.parcelas for select to authenticated
  using (created_by = (select auth.uid()));
create policy parcelas_insert on public.parcelas for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy parcelas_update on public.parcelas for update to authenticated
  using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));

revoke delete on public.parcelas from authenticated, anon;
revoke all on public.parcelas from anon;

-- Invariantes de 3.6 no fim da transação (o lote de gravar vale em qualquer ordem):
-- compra ativa e não cancelada tem as parcelas 1..n somando o valor total; cancelada (3.6) só
-- mantém parcelas entre 1 e n; excluída não deixa parcelas ativas (exclusão em conjunto).
create function public.compras_parcelas_conferem()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  alvos uuid[];
  alvo uuid;
  c public.compras;
  quantas int;
  no_intervalo int;
  soma bigint;
begin
  if tg_table_name = 'compras' then
    alvos := array[new.id];
  elsif tg_op = 'UPDATE' and old.compra_id <> new.compra_id then
    alvos := array[new.compra_id, old.compra_id];
  else
    alvos := array[new.compra_id];
  end if;
  foreach alvo in array alvos loop
    select * into c from public.compras where id = alvo;
    continue when not found;
    select count(*), count(*) filter (where numero <= c.numero_parcelas), coalesce(sum(valor), 0)
      into quantas, no_intervalo, soma
      from public.parcelas where compra_id = alvo and not is_deleted;
    if (case
      when c.is_deleted then quantas > 0
      when c.cancelada then no_intervalo <> quantas
      else quantas <> c.numero_parcelas or no_intervalo <> quantas or soma <> c.valor_total
    end) then
      raise exception 'Parcelas da compra não conferem: % de % parcelas, soma % de %',
        quantas, c.numero_parcelas, soma, c.valor_total
        using errcode = '23514', constraint = 'compras_parcelas_conferem';
    end if;
  end loop;
  return null;
end;
$$;

create constraint trigger compras_parcelas_conferem after insert or update on public.compras
  deferrable initially deferred
  for each row execute function public.compras_parcelas_conferem();
create constraint trigger compras_parcelas_conferem after insert or update on public.parcelas
  deferrable initially deferred
  for each row execute function public.compras_parcelas_conferem();
