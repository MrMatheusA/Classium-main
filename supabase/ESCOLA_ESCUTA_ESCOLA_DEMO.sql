-- =====================================================================
-- CRIA UMA ESCOLA DE DEMONSTRAÇÃO (tabela organizations)
-- Troque o nome abaixo se quiser. Pode rodar mais de uma vez: não duplica.
-- Preenche sozinho as colunas obrigatórias que a sua tabela tiver.
-- =====================================================================
do $$
declare
  v_nome   text := 'Escola Classium Demonstração';   -- << nome da escola
  v_id     uuid;
  c        record;
  cols     text[] := '{}';
  vals     text[] := '{}';
  v_val    text;
begin
  -- já existe uma escola com esse nome? então não cria de novo
  execute 'select id from public.organizations x where coalesce(to_jsonb(x)->>''name'', to_jsonb(x)->>''trade_name'', to_jsonb(x)->>''legal_name'', to_jsonb(x)->>''nome'') = $1 limit 1'
     into v_id using v_nome;
  if v_id is not null then
    raise notice 'Escola já existe: % (%)', v_nome, v_id;
    return;
  end if;

  for c in
    select column_name, data_type, udt_name, is_nullable, column_default
      from information_schema.columns
     where table_schema = 'public' and table_name = 'organizations'
     order by ordinal_position
  loop
    v_val := null;
    -- colunas de nome: sempre preenche
    if c.column_name in ('name', 'nome', 'trade_name', 'legal_name', 'nome_fantasia', 'razao_social', 'school_name') then
      v_val := quote_literal(v_nome);
    elsif c.column_name = 'id' and c.column_default is null then
      v_val := quote_literal(gen_random_uuid()::text) || '::uuid';
    -- outras obrigatórias sem valor padrão: valor neutro pelo tipo
    elsif c.is_nullable = 'NO' and c.column_default is null then
      v_val := case
        when c.column_name in ('slug', 'subdomain', 'code', 'codigo') then quote_literal('demo-' || substr(md5(random()::text), 1, 6))
        when c.column_name ilike '%status%' then quote_literal('active')
        when c.column_name ilike '%cnpj%' or c.column_name ilike '%document%' then quote_literal('00000000000000')
        when c.column_name ilike '%email%' then quote_literal('contato@escolademo.com.br')
        when c.data_type in ('text', 'character varying', 'character') then quote_literal('')
        when c.data_type in ('integer', 'bigint', 'smallint', 'numeric', 'real', 'double precision') then '0'
        when c.data_type = 'boolean' then 'true'
        when c.data_type = 'uuid' then quote_literal(gen_random_uuid()::text) || '::uuid'
        when c.data_type in ('json', 'jsonb') then quote_literal('{}') || '::' || c.udt_name
        when c.data_type like 'timestamp%' or c.data_type = 'date' then 'now()'
        when c.data_type = 'ARRAY' then quote_literal('{}')
        when c.data_type = 'USER-DEFINED' then
          (select quote_literal(e.enumlabel) || '::' || quote_ident(c.udt_name)
             from pg_enum e join pg_type t on t.oid = e.enumtypid
            where t.typname = c.udt_name order by e.enumsortorder limit 1)
        else null
      end;
    end if;
    if v_val is not null then
      cols := cols || quote_ident(c.column_name);
      vals := vals || v_val;
    end if;
  end loop;

  execute format('insert into public.organizations (%s) values (%s) returning id',
                 array_to_string(cols, ', '), array_to_string(vals, ', '))
     into v_id;
  raise notice 'Escola criada: % (%)', v_nome, v_id;
end $$;

-- Conferir
select id, public.ee_nome_escola(id) as escola from public.organizations;
