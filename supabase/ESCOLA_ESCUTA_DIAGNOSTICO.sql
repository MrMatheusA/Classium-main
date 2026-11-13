-- =====================================================================
-- ESCOLA ESCUTA — DIAGNÓSTICO DO ADMINISTRADOR
-- 1) Troque o e-mail na ÚLTIMA linha pelo e-mail com que você entra no app
-- 2) Rode tudo no SQL Editor e me mande o resultado (print da tabela)
-- Não altera nenhum dado.
-- =====================================================================

create or replace function public.ee_diagnostico(p_email text)
returns table (passo text, resultado text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_txt text;
  t     text;
  n     bigint;
begin
  select id into v_uid from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  passo := '1. usuário encontrado em auth.users'; resultado := coalesce(v_uid::text, 'NÃO — confira o e-mail'); return next;
  if v_uid is null then
    return;
  end if;

  -- age como esse usuário (só dentro desta consulta)
  perform set_config('request.jwt.claim.sub', v_uid::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated', 'email', p_email)::text, true);

  passo := '2. auth.uid() como o usuário'; resultado := coalesce(auth.uid()::text, 'NULO'); return next;
  passo := '3. está em ee_super_usuarios'; resultado := (exists (select 1 from public.ee_super_usuarios where user_id = v_uid))::text; return next;

  begin
    execute 'select to_jsonb(r)::text from public.resolve_my_access() r limit 1' into v_txt;
  exception when others then
    v_txt := 'erro: ' || sqlerrm;
  end;
  passo := '4. resolve_my_access()'; resultado := left(coalesce(v_txt, 'vazio'), 400); return next;

  select coalesce(string_agg(coalesce(papel, '?') || ' / org ' || coalesce(organization_id::text, 'sem escola'), '; '), 'vazio') into v_txt from public.ee_meu_perfil();
  passo := '5. ee_meu_perfil()'; resultado := v_txt; return next;

  passo := '6. ee_e_super() (é administrador?)'; resultado := public.ee_e_super()::text; return next;

  foreach t in array array['organizations', 'schools', 'escolas', 'institutions', 'instituicoes', 'unidades', 'tenants', 'classes', 'students', 'teachers', 'profiles'] loop
    if to_regclass('public.' || t) is not null then
      execute format('select count(*) from public.%I', t) into n;
      passo := '7. linhas em ' || t; resultado := n::text; return next;
    end if;
  end loop;

  select count(*) into n from public.ee_todas_escolas();
  passo := '8. escolas encontradas (ee_todas_escolas)'; resultado := n::text; return next;

  select coalesce(string_agg(nome || ' (' || papel || ')', '; '), 'NENHUMA') into v_txt from public.ee_minhas_escolas();
  passo := '9. ee_minhas_escolas() — o que o app recebe'; resultado := left(v_txt, 400); return next;

  -- tabelas que parecem ser de escola (para eu ajustar se o nome for outro)
  select coalesce(string_agg(table_name, ', '), 'nenhuma') into v_txt
    from information_schema.tables
   where table_schema = 'public'
     and (table_name ilike '%org%' or table_name ilike '%school%' or table_name ilike '%escola%' or table_name ilike '%unidade%' or table_name ilike '%tenant%' or table_name ilike '%institu%');
  passo := '10. tabelas com cara de escola'; resultado := v_txt; return next;
end;
$$;

revoke all on function public.ee_diagnostico(text) from public, anon, authenticated;

select * from public.ee_diagnostico('EMAIL_DO_ADMIN@exemplo.com');
