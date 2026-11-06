-- Dívidas e parcelas gravadas na contratação (MODELO-DADOS 3.9, 3.10; PROMPT 3.3, 3.7, 6.6;
-- D3, D66, D70). Saldo devedor, status da parcela e juros pagos são derivados.

create table public.dividas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references auth.users on delete restrict,
  is_deleted boolean not null default false,
  tipo text not null check (tipo in ('emprestimo', 'financiamento')),
  credor text not null check (btrim(credor) <> ''),
  valor_contratado bigint not null check (valor_contratado > 0),
  data_contratacao date not null,
  destino_do_valor text not null check (destino_do_valor in ('creditado_em_conta', 'pago_a_terceiro')),
  sistema_amortizacao text not null check (sistema_amortizacao in ('price', 'sac', 'parcela_informada')),
  taxa_mensal numeric check (taxa_mensal >= 0),
  valor_parcela_informada bigint check (valor_parcela_informada > 0),
  numero_parcelas smallint not null check (numero_parcelas >= 1),
  data_primeira_parcela date not null,
  conta_debito_id uuid not null,
  categoria_id uuid,
  unique (id, created_by),
  foreign key (conta_debito_id, created_by) references public.contas (id, created_by)
    on delete restrict deferrable initially deferred,
  foreign key (categoria_id, created_by) references public.categorias (id, created_by)
    on delete restrict deferrable initially deferred,
  -- Price e SAC têm taxa; parcela informada tem o valor da parcela, que cobre o contratado.
  constraint dividas_sistema check (case sistema_amortizacao
    when 'parcela_informada' then taxa_mensal is null and valor_parcela_informada is not null
      and valor_parcela_informada * numero_parcelas >= valor_contratado
    else taxa_mensal is not null and valor_parcela_informada is null
  end),
  -- Categoria só no pago a terceiro (D66).
  constraint dividas_categoria check ((categoria_id is not null) = (destino_do_valor = 'pago_a_terceiro'))
);

create trigger set_updated_at before update on public.dividas
  for each row execute function public.set_updated_at();

alter table public.dividas enable row level security;
create policy dividas_select on public.dividas for select to authenticated
  using (created_by = (select auth.uid()));
create policy dividas_insert on public.dividas for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy dividas_update on public.dividas for update to authenticated
  using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));

revoke delete on public.dividas from authenticated, anon;
revoke all on public.dividas from anon;

create table public.parcelas_divida (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references auth.users on delete restrict,
  is_deleted boolean not null default false,
  divida_id uuid not null,
  numero smallint not null check (numero >= 1),
  vencimento date not null,
  valor bigint not null check (valor >= 0),
  juros bigint not null check (juros >= 0),
  amortizacao bigint not null check (amortizacao >= 0),
  paga_antes_do_cadastro boolean not null default false,
  unique (id, created_by),
  -- O pagamento aponta para a parcela e para a dívida dela.
  unique (id, divida_id, created_by),
  foreign key (divida_id, created_by) references public.dividas (id, created_by)
    on delete restrict deferrable initially deferred,
  constraint parcelas_divida_valor check (valor = juros + amortizacao)
);

create unique index parcelas_divida_numero_unico on public.parcelas_divida (created_by, divida_id, numero)
  where not is_deleted;
create index parcelas_divida_por_divida on public.parcelas_divida (divida_id) where not is_deleted;

create trigger set_updated_at before update on public.parcelas_divida
  for each row execute function public.set_updated_at();

alter table public.parcelas_divida enable row level security;
create policy parcelas_divida_select on public.parcelas_divida for select to authenticated
  using (created_by = (select auth.uid()));
create policy parcelas_divida_insert on public.parcelas_divida for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy parcelas_divida_update on public.parcelas_divida for update to authenticated
  using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));

revoke delete on public.parcelas_divida from authenticated, anon;
revoke all on public.parcelas_divida from anon;

-- Vínculos dos lançamentos de captação, pagamento e amortização.
alter table public.lancamentos add foreign key (divida_id, created_by)
  references public.dividas (id, created_by) on delete restrict deferrable initially deferred;
alter table public.lancamentos add foreign key (parcela_divida_id, divida_id, created_by)
  references public.parcelas_divida (id, divida_id, created_by) on delete restrict deferrable initially deferred;
create index lancamentos_por_divida on public.lancamentos (divida_id) where divida_id is not null and not is_deleted;

-- Parcela paga (antes do cadastro ou com pagamento ativo) nunca muda de valor (D3).
create function public.parcelas_divida_paga_imutavel()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.valor, new.juros, new.amortizacao) is distinct from (old.valor, old.juros, old.amortizacao)
    and (old.paga_antes_do_cadastro or exists (
      select from public.lancamentos l
      where l.parcela_divida_id = old.id and l.tipo = 'pagamento_divida' and not l.is_deleted
    )) then
    raise exception 'Parcela paga não pode ter valor, juros ou amortização alterados'
      using errcode = '23514', constraint = 'parcelas_divida_paga_imutavel';
  end if;
  return new;
end;
$$;

create trigger parcelas_divida_paga_imutavel before update on public.parcelas_divida
  for each row execute function public.parcelas_divida_paga_imutavel();

-- Invariante de D3 no fim da transação: numa dívida ativa, as amortizações das parcelas ativas
-- mais os lançamentos `amortizacao` somam o valor contratado (saldo devedor final zero); dívida
-- excluída não deixa parcelas ativas (exclusão em conjunto).
create function public.dividas_amortizacoes_conferem()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  alvos uuid[];
  alvo uuid;
  d public.dividas;
  quantas int;
  amortizado bigint;
begin
  if tg_table_name = 'dividas' then
    alvos := array[new.id];
  elsif tg_op = 'UPDATE' and old.divida_id is distinct from new.divida_id then
    alvos := array[new.divida_id, old.divida_id];
  else
    alvos := array[new.divida_id];
  end if;
  foreach alvo in array alvos loop
    continue when alvo is null;
    select * into d from public.dividas where id = alvo;
    continue when not found;
    select count(*), coalesce(sum(amortizacao), 0) into quantas, amortizado
      from public.parcelas_divida where divida_id = alvo and not is_deleted;
    amortizado := amortizado + coalesce((
      select sum(valor) from public.lancamentos
      where divida_id = alvo and tipo = 'amortizacao' and not is_deleted
    ), 0);
    if (case when d.is_deleted then quantas > 0 else amortizado <> d.valor_contratado end) then
      raise exception 'Amortizações da dívida somam % e o valor contratado é %', amortizado, d.valor_contratado
        using errcode = '23514', constraint = 'dividas_amortizacoes_conferem';
    end if;
  end loop;
  return null;
end;
$$;

create constraint trigger dividas_amortizacoes_conferem after insert or update on public.dividas
  deferrable initially deferred
  for each row execute function public.dividas_amortizacoes_conferem();
create constraint trigger dividas_amortizacoes_conferem after insert or update on public.parcelas_divida
  deferrable initially deferred
  for each row execute function public.dividas_amortizacoes_conferem();
-- Só os lançamentos de dívida: a importação de milhares de lançamentos não paga a checagem.
create constraint trigger dividas_amortizacoes_conferem after insert or update on public.lancamentos
  deferrable initially deferred
  for each row when (new.divida_id is not null)
  execute function public.dividas_amortizacoes_conferem();
