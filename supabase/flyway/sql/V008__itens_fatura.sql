-- Itens de fatura: encargos, estornos, ajustes de compra e saldo anterior ao cadastro
-- (MODELO-DADOS 3.8; PROMPT 3.3, 3.5, 3.6; D38, D76). A alocação de pagamento não tem tabela:
-- são os campos cartao_id e fatura_competencia do lançamento `pagamento_fatura` (D59).

create table public.itens_fatura (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references auth.users on delete restrict,
  is_deleted boolean not null default false,
  cartao_id uuid not null,
  competencia text not null check (competencia ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  tipo text not null check (tipo in ('encargo', 'estorno', 'ajuste_compra', 'saldo_anterior_cadastro')),
  data date not null,
  valor bigint not null,
  descricao text,
  compra_id uuid,
  categoria_id uuid,
  unique (id, created_by),
  foreign key (cartao_id, created_by) references public.cartoes (id, created_by)
    on delete restrict deferrable initially deferred,
  foreign key (compra_id, created_by) references public.compras (id, created_by)
    on delete restrict deferrable initially deferred,
  foreign key (categoria_id, created_by) references public.categorias (id, created_by)
    on delete restrict deferrable initially deferred,
  -- Sinal e campos por tipo (MODELO-DADOS 3.8): estorno sem compra exige categoria; com compra,
  -- vale a da compra.
  constraint itens_fatura_por_tipo check (case tipo
    when 'encargo' then valor > 0 and compra_id is null and categoria_id is not null
    when 'saldo_anterior_cadastro' then valor > 0 and compra_id is null and categoria_id is null
    when 'estorno' then valor < 0 and (categoria_id is null) = (compra_id is not null)
    when 'ajuste_compra' then valor <> 0 and compra_id is not null and categoria_id is null
  end)
);

-- No máximo um "Saldo anterior ao cadastro" por cartão.
create unique index itens_fatura_saldo_anterior_unico on public.itens_fatura (created_by, cartao_id)
  where tipo = 'saldo_anterior_cadastro' and not is_deleted;
create index itens_fatura_por_cartao on public.itens_fatura (cartao_id, competencia) where not is_deleted;

create trigger set_updated_at before update on public.itens_fatura
  for each row execute function public.set_updated_at();

alter table public.itens_fatura enable row level security;
create policy itens_fatura_select on public.itens_fatura for select to authenticated
  using (created_by = (select auth.uid()));
create policy itens_fatura_insert on public.itens_fatura for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy itens_fatura_update on public.itens_fatura for update to authenticated
  using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));

revoke delete on public.itens_fatura from authenticated, anon;
revoke all on public.itens_fatura from anon;
