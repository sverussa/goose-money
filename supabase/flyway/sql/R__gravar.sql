-- gravar(ops): única porta de escrita do app (PROMPT 2.1, 9.4; D14, D15, D36).
--
-- `ops` é uma lista de { tabela, acao: 'inserir' | 'alterar', id, dados }, com os nomes do
-- banco (snake_case). Tudo numa transação: se uma operação falha, nada é gravado. Não existe
-- apagar: excluir é `alterar` com is_deleted = true. `security invoker`: o RLS do usuário vale.
-- Devolve as linhas gravadas por tabela ({ tabela: [linha, ...] }, a última versão de cada id).
create or replace function public.gravar(ops jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  op jsonb;
  indice int := 0;
  tabela text;
  acao text;
  alvo uuid;
  dados jsonb;
  colunas text[];
  campos text[];
  desconhecidos text[];
  linha jsonb;
  gravadas jsonb := '{}';
  estado text;
  restricao text;
  mensagem text;
begin
  if jsonb_typeof(ops) is distinct from 'array' then
    raise exception 'gravar: ops precisa ser uma lista' using errcode = '22023';
  end if;

  begin
    for op in select * from jsonb_array_elements(ops) loop
      indice := indice + 1;
      tabela := op ->> 'tabela';
      acao := op ->> 'acao';
      dados := coalesce(op -> 'dados', '{}');
      begin
        alvo := (op ->> 'id')::uuid;
      exception when invalid_text_representation then
        alvo := null;
      end;

      if tabela is null or not tabela = any (public.tabelas_de_negocio()) then
        raise exception 'gravar: tabela % não aceita', coalesce(tabela, '(nula)') using errcode = '42501';
      end if;
      if acao is null or acao not in ('inserir', 'alterar') then
        raise exception 'gravar: ação % não existe (só inserir e alterar)', coalesce(acao, '(nula)')
          using errcode = '22023';
      end if;
      if alvo is null or jsonb_typeof(dados) <> 'object' then
        raise exception 'gravar: operação % sem id ou sem dados', indice using errcode = '22023';
      end if;

      select array_agg(a.attname::text) into colunas
      from pg_attribute a
      where a.attrelid = format('public.%I', tabela)::regclass and a.attnum > 0 and not a.attisdropped;

      select array_agg(k) filter (where not k = any (colunas)) into desconhecidos
      from jsonb_object_keys(dados) k;
      if desconhecidos is not null then
        raise exception 'gravar: colunas % não existem em %', desconhecidos, tabela using errcode = '42703';
      end if;

      -- O banco preenche id (pelo da operação) e as colunas de controle; o app não as escolhe.
      select coalesce(array_agg(k), '{}') into campos
      from jsonb_object_keys(dados) k
      where k not in ('id', 'created_at', 'created_by', 'updated_at');

      if acao = 'inserir' then
        execute format(
          'insert into public.%1$I (id%2$s) select $2%3$s from jsonb_populate_record(null::public.%1$I, $1) r returning to_jsonb(%1$I.*)',
          tabela,
          (select coalesce(string_agg(', ' || quote_ident(c), ''), '') from unnest(campos) c),
          (select coalesce(string_agg(', r.' || quote_ident(c), ''), '') from unnest(campos) c)
        ) into linha using dados, alvo;
      else
        if cardinality(campos) = 0 then
          -- Só colunas de controle: nada a mudar.
          execute format('select to_jsonb(t.*) from public.%I t where t.id = $1', tabela)
            into linha using alvo;
        else
          execute format(
            'update public.%1$I t set %2$s from jsonb_populate_record(null::public.%1$I, $1) r where t.id = $2 returning to_jsonb(t.*)',
            tabela,
            (select string_agg(format('%1$I = r.%1$I', c), ', ') from unnest(campos) c)
          ) into linha using dados, alvo;
        end if;
        -- Inexistente ou de outro usuário (o RLS esconde): nada foi alterado.
        if linha is null then
          raise exception 'gravar: % % não encontrado', tabela, alvo using errcode = 'P0002';
        end if;
      end if;

      gravadas := jsonb_set(
        gravadas || jsonb_build_object(tabela, coalesce(gravadas -> tabela, '{}')),
        array[tabela, alvo::text],
        linha
      );
    end loop;

    -- Checagens adiadas (soma das parcelas etc.) rodam aqui, para o erro sair com código.
    indice := null;
    tabela := null;
    set constraints all immediate;
  exception
    when unique_violation or foreign_key_violation or check_violation
      or not_null_violation or raise_exception then
      get stacked diagnostics estado = returned_sqlstate, restricao = constraint_name, mensagem = message_text;
      raise exception '%', mensagem using
        errcode = estado,
        detail = jsonb_build_object('tabela', tabela, 'operacao', indice, 'restricao', nullif(restricao, ''))::text;
  end;

  return (
    select coalesce(jsonb_object_agg(t, (select jsonb_agg(l) from jsonb_each(por_id) as x(i, l))), '{}')
    from jsonb_each(gravadas) as g(t, por_id)
  );
end;
$$;

revoke all on function public.gravar(jsonb) from public, anon;
grant execute on function public.gravar(jsonb) to authenticated;
