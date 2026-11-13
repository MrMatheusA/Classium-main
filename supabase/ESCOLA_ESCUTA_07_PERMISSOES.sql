-- =====================================================================
-- ESCOLA ESCUTA — PERMISSÕES (corrige "permission denied for table ...")
-- Este projeto não dá acesso automático às tabelas novas. Aqui liberamos
-- o acesso para o usuário logado; quem vê o quê continua sendo decidido
-- pelas regras de segurança (RLS) de cada tabela.
-- Pode rodar quantas vezes quiser.
-- =====================================================================
set lock_timeout = '10s';  -- se o app estiver usando a tabela, espera no máximo 10 s

do $$
declare
  t record;
begin
  -- segurança: não libera nenhuma tabela que esteja sem RLS
  for t in
    select c.relname
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
       and c.relname ~ '^(ee_|mural_|agenda_|diario_|participa_|whatsapp_)'
  loop
    raise exception 'A tabela % está sem RLS. Rode antes: alter table public.% enable row level security;', t.relname, t.relname;
  end loop;

  -- tabelas da Escola Escuta (todas com RLS ligado)
  for t in
    select c.relname
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'p')
       and c.relname ~ '^(ee_|mural_|agenda_|diario_|participa_|whatsapp_)'
  loop
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t.relname);
    execute format('grant all on table public.%I to service_role', t.relname);
    execute format('revoke all on table public.%I from anon', t.relname);
  end loop;

  -- tabelas internas: o app nunca acessa direto (só pelas funções do banco)
  for t in
    select c.relname
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r'
       and c.relname in ('ee_super_usuarios', 'participa_segredos', 'participa_respostas', 'whatsapp_config', 'ee_config')
  loop
    execute format('revoke all on table public.%I from authenticated', t.relname);
  end loop;

  -- sequências (ids numéricos)
  for t in
    select c.relname
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'S'
       and c.relname ~ '^(ee_|mural_|agenda_|diario_|participa_|whatsapp_)'
  loop
    execute format('grant usage, select on sequence public.%I to authenticated, service_role', t.relname);
  end loop;

end $$;

notify pgrst, 'reload schema';

-- Conferir: "true" nas duas colunas (participa_respostas e participa_segredos ficam "false" de propósito: são privadas)
select c.relname as tabela,
       has_table_privilege('authenticated', c.oid, 'select') as app_pode_ler,
       c.relrowsecurity as rls_ligado
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r'
   and c.relname ~ '^(mural_|agenda_|diario_|participa_)'
 order by 1;
