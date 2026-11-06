-- Lançamentos: todo movimento de caixa e todo lançamento previsto (MODELO-DADOS 3.5;
-- PROMPT 3.1 a 3.4, 3.7, 6.3, 7; D32, D59, D70, D75, D76, D79).
-- As chaves estrangeiras de cartao_id (V006) e divida_id, parcela_divida_id (V009) chegam com
-- as tabelas delas.

create table public.lancamentos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references auth.users on delete restrict,
  is_deleted boolean not null default false,
  tipo text not null check (tipo in (
    'receita', 'despesa', 'transferencia', 'ajuste', 'pagamento_fatura', 'captacao',
    'pagamento_divida', 'amortizacao'
  )),
  status text not null default 'efetivado' check (status in ('previsto', 'efetivado')),
  data date not null,
  valor bigint not null,
  descricao text,
  observacao text,
  conta_id uuid not null,
  conta_destino_id uuid,
  categoria_id uuid,
  cartao_id uuid,
  fatura_competencia text check (fatura_competencia ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  divida_id uuid,
  parcela_divida_id uuid,
  unique (id, created_by),
  foreign key (conta_id, created_by) references public.contas (id, created_by)
    on delete restrict deferrable initially deferred,
  foreign key (conta_destino_id, created_by) references public.contas (id, created_by)
    on delete restrict deferrable initially deferred,
  foreign key (categoria_id, created_by) references public.categorias (id, created_by)
    on delete restrict deferrable initially deferred,
  -- Só receita e despesa podem ser previstas (7.3).
  constraint lancamentos_previsto check (status = 'efetivado' or tipo in ('receita', 'despesa')),
  -- > 0, salvo o ajuste, com sinal e ≠ 0 (D76).
  constraint lancamentos_valor check (case when tipo = 'ajuste' then valor <> 0 else valor > 0 end),
  -- Campos por tipo (MODELO-DADOS 3.5): obrigatórios no tipo deles e nulos nos demais.
  constraint lancamentos_destino check (
    (conta_destino_id is not null) = (tipo = 'transferencia') and conta_destino_id <> conta_id
  ),
  constraint lancamentos_categoria check ((categoria_id is not null) = (tipo in ('receita', 'despesa', 'ajuste'))),
  constraint lancamentos_fatura check (
    (cartao_id is not null) = (tipo = 'pagamento_fatura')
    and (fatura_competencia is not null) = (tipo = 'pagamento_fatura')
  ),
  constraint lancamentos_divida check (
    (divida_id is not null) = (tipo in ('captacao', 'pagamento_divida', 'amortizacao'))
    and (parcela_divida_id is not null) = (tipo = 'pagamento_divida')
  )
);

-- Consultas do Motor e do extrato.
create index lancamentos_por_data on public.lancamentos (created_by, data) where not is_deleted;
create index lancamentos_por_conta on public.lancamentos (conta_id) where not is_deleted;
-- Uma parcela de dívida é paga por um lançamento só.
create unique index lancamentos_parcela_divida_unica on public.lancamentos (created_by, parcela_divida_id)
  where parcela_divida_id is not null and not is_deleted;

create trigger set_updated_at before update on public.lancamentos
  for each row execute function public.set_updated_at();

-- D79: lançamento efetivado não tem data depois de hoje; algo futuro é "Previsto".
-- "Hoje" no fuso de Brasília, o do produto.
create function public.lancamentos_efetivado_sem_futuro()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'efetivado'
    and new.data > (now() at time zone 'America/Sao_Paulo')::date
    and (tg_op = 'INSERT' or (new.status, new.data) is distinct from (old.status, old.data)) then
    raise exception 'Lançamento efetivado não pode ter data futura. Marque como "Previsto".'
      using errcode = '23514', constraint = 'lancamentos_efetivado_sem_futuro';
  end if;
  return new;
end;
$$;

create trigger lancamentos_efetivado_sem_futuro before insert or update on public.lancamentos
  for each row execute function public.lancamentos_efetivado_sem_futuro();

alter table public.lancamentos enable row level security;
create policy lancamentos_select on public.lancamentos for select to authenticated
  using (created_by = (select auth.uid()));
create policy lancamentos_insert on public.lancamentos for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy lancamentos_update on public.lancamentos for update to authenticated
  using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));

revoke delete on public.lancamentos from authenticated, anon;
revoke all on public.lancamentos from anon;
