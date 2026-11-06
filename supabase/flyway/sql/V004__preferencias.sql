-- Preferências do usuário, uma linha por usuário (MODELO-DADOS 3.14; PROMPT 5.3, 6.2, 6.9; D64, D65).

create table public.preferencias (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references auth.users on delete restrict,
  is_deleted boolean not null default false,
  limite_alerta bigint not null default 50000 check (limite_alerta >= 0),
  horizonte_padrao smallint not null default 12 check (horizonte_padrao in (3, 6, 12, 24)),
  ocultar_valores_ao_abrir boolean not null default false,
  unique (id, created_by)
);

create unique index preferencias_uma_por_usuario on public.preferencias (created_by)
  where not is_deleted;

create trigger set_updated_at before update on public.preferencias
  for each row execute function public.set_updated_at();

alter table public.preferencias enable row level security;
create policy preferencias_select on public.preferencias for select to authenticated
  using (created_by = (select auth.uid()));
create policy preferencias_insert on public.preferencias for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy preferencias_update on public.preferencias for update to authenticated
  using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));

revoke delete on public.preferencias from authenticated, anon;
revoke all on public.preferencias from anon;
