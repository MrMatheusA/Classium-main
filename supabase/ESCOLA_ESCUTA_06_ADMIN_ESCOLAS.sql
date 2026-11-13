-- =====================================================================
-- ESCOLA ESCUTA — ADMINISTRADOR COM PRIORIDADE (vê e gerencia todas as escolas)
-- Rode no SQL Editor. Pode rodar quantas vezes quiser.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Lista manual de administradores (garantia: quem está aqui vê tudo)
-- ---------------------------------------------------------------------
create table if not exists public.ee_super_usuarios (
  user_id    uuid primary key,
  criado_em  timestamptz not null default now()
);
alter table public.ee_super_usuarios enable row level security;
revoke all on public.ee_super_usuarios from anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Quem é administrador
-- ---------------------------------------------------------------------
create or replace function public.ee_e_super()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_papel text;
  v_ok    boolean := false;
  j       jsonb;
begin
  if auth.uid() is null then
    return false;
  end if;

  -- lista manual
  if exists (select 1 from public.ee_super_usuarios s where s.user_id = auth.uid()) then
    return true;
  end if;

  -- papel resolvido (resolve_my_access / profiles)
  select papel into v_papel from public.ee_meu_perfil() limit 1;
  if coalesce(v_papel, '') = any (public.ee_lista('papeis_super')) then
    return true;
  end if;

  -- papel no token (app_metadata / user_metadata)
  if lower(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')) = any (public.ee_lista('papeis_super'))
     or lower(coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '')) = any (public.ee_lista('papeis_super')) then
    return true;
  end if;

  -- resolve_my_access com marcação de admin (is_admin, is_super_admin...)
  if to_regprocedure('public.resolve_my_access()') is not null then
    begin
      execute 'select to_jsonb(r) from public.resolve_my_access() r limit 1' into j;
      if jsonb_typeof(j) = 'object' and j ? 'resolve_my_access' then
        j := j -> 'resolve_my_access';
      end if;
      if jsonb_typeof(j) = 'object' then
        if lower(coalesce(j->>'is_admin', j->>'is_super_admin', j->>'isAdmin', j->>'isSuperAdmin', j->>'is_master', 'false')) in ('true', 't', '1')
           or lower(coalesce(j->>'role', '')) = any (public.ee_lista('papeis_super')) then
          return true;
        end if;
      end if;
    exception when others then
      null;
    end;
  end if;

  -- profiles com marcação de admin
  if to_regclass('public.profiles') is not null then
    begin
      execute $q$
        select lower(coalesce(j->>'is_admin', j->>'is_super_admin', j->>'is_master', j->>'super_admin', 'false')) in ('true', 't', '1')
            or lower(coalesce(j->>'role', j->>'user_role', '')) = any (public.ee_lista('papeis_super'))
          from (select to_jsonb(p) as j from public.profiles p where p.id = $1) s
      $q$ into v_ok using auth.uid();
      if v_ok then
        return true;
      end if;
    exception when others then
      null;
    end;
  end if;

  return false;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Nome da escola (lê trade_name, name, nome, legal_name...)
-- ---------------------------------------------------------------------
create or replace function public.ee_nome_escola(p_org uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v text;
  t text;
begin
  foreach t in array array['organizations', 'schools', 'escolas', 'institutions', 'instituicoes', 'unidades', 'tenants'] loop
    if to_regclass('public.' || t) is not null then
      begin
        execute format(
          'select coalesce(nullif(to_jsonb(x)->>''trade_name'',''''), nullif(to_jsonb(x)->>''name'',''''), nullif(to_jsonb(x)->>''nome'',''''),
                           nullif(to_jsonb(x)->>''nome_fantasia'',''''), nullif(to_jsonb(x)->>''legal_name'',''''), nullif(to_jsonb(x)->>''razao_social'',''''),
                           nullif(to_jsonb(x)->>''school_name'',''''))
             from public.%I x where x.id = $1', t)
          into v using p_org;
      exception when others then
        v := null;
      end;
      if v is not null then
        return v;
      end if;
    end if;
  end loop;
  return 'Escola ' || left(p_org::text, 8);
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Todas as escolas do sistema (tabelas de escola + escolas usadas nos dados)
-- ---------------------------------------------------------------------
create or replace function public.ee_todas_escolas()
returns table (organization_id uuid)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  t   text;
  ids uuid[] := '{}';
  r   uuid[];
begin
  foreach t in array array['organizations', 'schools', 'escolas', 'institutions', 'instituicoes', 'unidades', 'tenants'] loop
    if to_regclass('public.' || t) is not null then
      begin
        execute format('select coalesce(array_agg(distinct public.ee_uuid(to_jsonb(x)->>''id'')), ''{}'') from public.%I x', t) into r;
        ids := ids || r;
      exception when others then
        null;
      end;
    end if;
  end loop;

  foreach t in array array['classes', 'students', 'teachers', 'guardians', 'profiles', 'announcements', 'mural_recados'] loop
    if to_regclass('public.' || t) is not null then
      begin
        execute format(
          'select coalesce(array_agg(distinct public.ee_uuid(coalesce(to_jsonb(x)->>''organization_id'', to_jsonb(x)->>''school_id''))), ''{}'') from public.%I x', t)
          into r;
        ids := ids || r;
      exception when others then
        null;
      end;
    end if;
  end loop;

  return query select distinct u from unnest(ids) u where u is not null;
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Gestor: o administrador é gestor de todas as escolas
-- ---------------------------------------------------------------------
create or replace function public.ee_e_gestor(p_org uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_papel text;
  v_org   uuid;
begin
  if auth.uid() is null or p_org is null then
    return false;
  end if;
  if public.ee_e_super() then
    return true;
  end if;
  if exists (select 1 from public.ee_membros m where m.organization_id = p_org and m.user_id = auth.uid() and m.papel = 'gestor') then
    return true;
  end if;
  select papel, organization_id into v_papel, v_org from public.ee_meu_perfil() limit 1;
  return coalesce(v_papel, '') = any (public.ee_lista('papeis_gestor')) and v_org = p_org;
end;
$$;

-- ---------------------------------------------------------------------
-- 6. Escolas do usuário. Administrador: todas, como gestor.
-- ---------------------------------------------------------------------
create or replace function public.ee_minhas_escolas()
returns table (organization_id uuid, nome text, papel text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  if public.ee_e_super() then
    return query
      select e.organization_id, public.ee_nome_escola(e.organization_id), 'gestor'::text
        from public.ee_todas_escolas() e
       order by 2;
    return;
  end if;

  select p.organization_id into v_org from public.ee_meu_perfil() p limit 1;
  return query
    select x.org, public.ee_nome_escola(x.org), x.papel
      from (
        select distinct e.organization_id as org, 'familia'::text as papel from public.ee_meus_estudantes() e where e.organization_id is not null
        union
        select m.organization_id, m.papel from public.ee_membros m where m.user_id = auth.uid()
        union
        select v_org, case when public.ee_e_gestor(v_org) then 'gestor' else 'docente' end
         where v_org is not null and (public.ee_e_gestor(v_org) or public.ee_e_docente(v_org))
      ) x;
end;
$$;

grant execute on function public.ee_e_super() to authenticated;
grant execute on function public.ee_nome_escola(uuid) to authenticated;
grant execute on function public.ee_e_gestor(uuid) to authenticated;
grant execute on function public.ee_minhas_escolas() to authenticated;
revoke all on function public.ee_todas_escolas() from public, anon;
grant execute on function public.ee_todas_escolas() to authenticated;

-- ---------------------------------------------------------------------
-- 7. GARANTIA: todo usuário com papel de administrador já entra na lista
--    (se o seu admin não aparecer, use o passo 8)
-- ---------------------------------------------------------------------
do $$
begin
  if to_regclass('public.profiles') is not null then
    begin
      execute $q$
        insert into public.ee_super_usuarios (user_id)
        select p.id from public.profiles p
         where lower(coalesce(to_jsonb(p)->>'role', to_jsonb(p)->>'user_role', '')) = any (public.ee_lista('papeis_super'))
            or lower(coalesce(to_jsonb(p)->>'is_admin', to_jsonb(p)->>'is_super_admin', 'false')) in ('true','t','1')
        on conflict do nothing
      $q$;
    exception when others then
      null;
    end;
  end if;
  insert into public.ee_super_usuarios (user_id)
  select u.id from auth.users u
   where lower(coalesce(u.raw_app_meta_data->>'role', u.raw_user_meta_data->>'role', '')) = any (public.ee_lista('papeis_super'))
  on conflict do nothing;
end $$;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- 8. (SE PRECISAR) coloque o administrador pelo e-mail — troque o e-mail e rode só estas linhas:
--
-- insert into public.ee_super_usuarios (user_id)
-- select id from auth.users where lower(email) = lower('EMAIL_DO_ADMIN@exemplo.com')
-- on conflict do nothing;
--
-- Conferir: quem está na lista e quantas escolas o sistema encontrou
-- select u.email from public.ee_super_usuarios s join auth.users u on u.id = s.user_id;
-- select count(*) as escolas from public.ee_todas_escolas();
-- ---------------------------------------------------------------------
