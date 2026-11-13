-- #####################################################################
-- ESCOLA ESCUTA + WHATSAPP — INSTALAÇÃO COMPLETA (um arquivo só)
-- Cole tudo no SQL Editor do projeto do Classium e clique em Run.
--
-- ANTES: confirme que está no projeto certo. No canto superior do
-- Supabase deve aparecer o nome do projeto do Classium. Se o projeto
-- estiver pausado, clique em "Restore project" primeiro.
--
-- O que este arquivo faz:
--   PARTE 0 · Confere as tabelas do Classium (cria só o que faltar)
--   PARTE 1 · WhatsApp ClarixZap (fila + envio pelo banco)
--   PARTE 2 · Base do Escola Escuta (permissões, avisos, anexos)
--   PARTE 3 · Mural de Recados
--   PARTE 4 · Agenda Família
--   PARTE 5 · Agenda Diária
--   PARTE 6 · Participa
-- Pode rodar de novo: não apaga nem duplica nada.
--
-- DEPOIS (uma vez), para o WhatsApp funcionar, rode separado:
--   select vault.create_secret('SEU_TOKEN_DA_CLARIXZAP', 'clarixzap_token', 'Token da API ClarixZapBrasil');
-- #####################################################################


-- =====================================================================
-- PARTE 0 · Tabelas do Classium usadas pelos módulos
-- Se já existem, nada muda (só acrescenta coluna que faltar, vazia).
-- =====================================================================

create table if not exists public.classes (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid,
  name            text,
  shift           text,
  room            text,
  is_active       boolean default true,
  created_at      timestamptz default now()
);
alter table public.classes add column if not exists organization_id uuid;
alter table public.classes add column if not exists name text;
alter table public.classes add column if not exists shift text;
alter table public.classes add column if not exists room text;
alter table public.classes add column if not exists is_active boolean default true;

create table if not exists public.students (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid,
  full_name       text,
  name            text,
  class_id        uuid,
  status          text default 'Matriculado',
  created_at      timestamptz default now()
);
alter table public.students add column if not exists organization_id uuid;
alter table public.students add column if not exists full_name text;
alter table public.students add column if not exists name text;
alter table public.students add column if not exists class_id uuid;
alter table public.students add column if not exists status text;

create table if not exists public.guardians (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid,
  full_name       text,
  name            text,
  cpf             text,
  email           text,
  phone           text,
  created_at      timestamptz default now()
);
alter table public.guardians add column if not exists organization_id uuid;
alter table public.guardians add column if not exists full_name text;
alter table public.guardians add column if not exists name text;
alter table public.guardians add column if not exists email text;
alter table public.guardians add column if not exists phone text;

create table if not exists public.student_responsible_links (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid,
  student_id      uuid,
  guardian_id     uuid,
  created_at      timestamptz default now()
);
alter table public.student_responsible_links add column if not exists student_id uuid;
alter table public.student_responsible_links add column if not exists guardian_id uuid;

create table if not exists public.family_links (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid,
  student_id      uuid,
  guardian_id     uuid,
  created_at      timestamptz default now()
);
alter table public.family_links add column if not exists student_id uuid;
alter table public.family_links add column if not exists guardian_id uuid;

create index if not exists ee_idx_students_org   on public.students (organization_id);
create index if not exists ee_idx_students_class on public.students (class_id);
create index if not exists ee_idx_guardians_mail on public.guardians (lower(email));
create index if not exists ee_idx_srl_guardian   on public.student_responsible_links (guardian_id);
create index if not exists ee_idx_srl_student    on public.student_responsible_links (student_id);
create index if not exists ee_idx_fl_guardian    on public.family_links (guardian_id);
create index if not exists ee_idx_fl_student     on public.family_links (student_id);


-- =====================================================================
-- PARTE 1 · WHATSAPP CLARIXZAP
-- =====================================================================
-- =====================================================================
-- WhatsApp via ClarixZapBrasil — TUDO PELO SQL EDITOR (sem Edge Function)
--
-- Como funciona:
--   app → supabase.rpc('whatsapp_enviar') → fila (whatsapp_outbox)
--   → o banco chama a API da ClarixZap com pg_net
--   → a cada 10 s o pg_cron confere as respostas e manda o próximo lote
--

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- ---------------------------------------------------------------------
-- 1. Configuração: quem pode disparar
-- ---------------------------------------------------------------------
create table if not exists public.whatsapp_config (
  chave text primary key,
  valor text not null
);
alter table public.whatsapp_config enable row level security;

-- Papéis (coluna "role" da tabela profiles) que podem enviar WhatsApp.
-- Ajuste para os nomes que o seu sistema usa.
insert into public.whatsapp_config (chave, valor)
values ('papeis_permitidos', 'admin,super_admin,gestor,gestao,diretor,direcao,coordenador,coordenacao,secretaria,secretario,staff,manager,school_admin')
on conflict (chave) do nothing;

-- ---------------------------------------------------------------------
-- 2. Fila de envio
-- ---------------------------------------------------------------------
create table if not exists public.whatsapp_outbox (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid,
  announcement_id  uuid,
  origem           text not null default 'comunicacao',
  prioridade       smallint not null default 0,
  student_id       uuid,
  guardian_id      uuid,
  telefone         text not null,
  nome             text,
  texto            text not null,
  referencia       text not null unique,
  status           text not null default 'pending'
                   check (status in ('pending','sending','sent','failed','skipped')),
  tentativas       smallint not null default 0,
  proxima_tentativa_em timestamptz not null default now(),
  request_id       bigint,
  status_http      int,
  resposta         text,
  created_by       uuid,
  created_at       timestamptz not null default now(),
  enviado_em       timestamptz
);
alter table public.whatsapp_outbox add column if not exists request_id bigint;

create index if not exists whatsapp_outbox_fila_idx on public.whatsapp_outbox (status, prioridade desc, proxima_tentativa_em, created_at);
create index if not exists whatsapp_outbox_announcement_idx on public.whatsapp_outbox (announcement_id);
create index if not exists whatsapp_outbox_request_idx on public.whatsapp_outbox (request_id);

-- O app nunca lê/escreve direto na fila: só pelas funções abaixo.
alter table public.whatsapp_outbox enable row level security;

-- versão anterior (Edge Function) — não é mais usada
drop function if exists public.whatsapp_outbox_claim(int);

-- ---------------------------------------------------------------------
-- 3. Telefone BR → 55 + DDD + número (só dígitos)
-- ---------------------------------------------------------------------
create or replace function public.whatsapp_normalizar_telefone(p text)
returns text
language plpgsql
immutable
as $$
declare
  d text;
begin
  d := regexp_replace(coalesce(p, ''), '\D', '', 'g');
  d := regexp_replace(d, '^0+', '');
  if length(d) in (10, 11) then
    d := '55' || d;
  end if;
  if left(d, 2) <> '55' or length(d) not in (12, 13) then
    return null;
  end if;
  return d;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Permissão: só a equipe da escola (não pais/alunos logados no portal)
-- ---------------------------------------------------------------------
create or replace function public.whatsapp_pode_enviar()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role_jwt     text;
  v_role_profile text;
  v_permitidos   text[];
begin
  if auth.uid() is null then
    return false;
  end if;

  select string_to_array(lower(replace(valor, ' ', '')), ',')
    into v_permitidos
    from public.whatsapp_config
   where chave = 'papeis_permitidos';

  v_role_jwt := lower(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', ''));

  if to_regclass('public.profiles') is not null then
    begin
      execute 'select lower(role::text) from public.profiles where id = $1'
         into v_role_profile
        using auth.uid();
    exception when undefined_column then
      v_role_profile := null;
    end;
  end if;

  return coalesce(v_role_profile, v_role_jwt, '') = any (coalesce(v_permitidos, array[]::text[]));
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Dispara UMA mensagem da fila (chamada HTTP assíncrona via pg_net)
-- ---------------------------------------------------------------------
create or replace function public.whatsapp_disparar(p_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  r       public.whatsapp_outbox;
  v_token text;
  v_req   bigint;
begin
  select decrypted_secret into v_token
    from vault.decrypted_secrets
   where name = 'clarixzap_token'
   limit 1;

  if v_token is null then
    raise exception 'Token da ClarixZap não configurado. Rode: select vault.create_secret(''SEU_TOKEN'', ''clarixzap_token'');';
  end if;

  select * into r from public.whatsapp_outbox where id = p_id;
  if not found then
    return null;
  end if;

  select net.http_post(
    url                  := 'https://clarixzapbrasil.com.br/api/public/v1/enviar',
    body                 := jsonb_build_object(
                              'telefone',   r.telefone,
                              'nome',       coalesce(r.nome, ''),
                              'texto',      r.texto,
                              'referencia', r.referencia,
                              'melhorar',   false
                            ),
    headers              := jsonb_build_object(
                              'Content-Type',  'application/json',
                              'Authorization', 'Bearer ' || v_token
                            ),
    timeout_milliseconds := 15000
  ) into v_req;

  update public.whatsapp_outbox
     set status = 'sending',
         request_id = v_req,
         tentativas = tentativas + 1,
         proxima_tentativa_em = now()
   where id = p_id;

  return v_req;
end;
$$;

-- ---------------------------------------------------------------------
-- 6. Lê as respostas da ClarixZap e atualiza a fila
-- ---------------------------------------------------------------------
create or replace function public.whatsapp_conferir_respostas()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  x       record;
  v_ok    boolean;
  v_final boolean;
  n       int := 0;
begin
  for x in
    select o.id,
           o.tentativas,
           r.status_code,
           r.content,
           r.error_msg,
           (r.id is not null) as tem_resposta
      from public.whatsapp_outbox o
      left join net._http_response r on r.id = o.request_id
     where o.status = 'sending'
       and o.request_id is not null
       and (r.id is not null or o.proxima_tentativa_em < now() - interval '2 minutes')
     for update of o skip locked
  loop
    v_ok    := coalesce(x.status_code between 200 and 299, false);
    -- erro 4xx (menos 429) é problema do pedido: não adianta repetir
    v_final := v_ok
               or coalesce(x.status_code between 400 and 499 and x.status_code <> 429, false)
               or x.tentativas >= 3;

    update public.whatsapp_outbox
       set status = case when v_ok then 'sent' when v_final then 'failed' else 'pending' end,
           status_http = x.status_code,
           resposta = left(coalesce(x.content, x.error_msg, case when x.tem_resposta then null else 'sem resposta da ClarixZap' end), 1000),
           enviado_em = case when v_ok then now() else null end,
           proxima_tentativa_em = now() + make_interval(mins => 2 * greatest(1, x.tentativas))
     where id = x.id;

    n := n + 1;
  end loop;
  return n;
end;
$$;

-- ---------------------------------------------------------------------
-- 7. Processa a fila (o cron chama a cada 10 s)
--    3 mensagens a cada 10 s ≈ 18 por minuto (ritmo seguro para o WhatsApp)
-- ---------------------------------------------------------------------
create or replace function public.whatsapp_processar(p_limite int default 3)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  n    int := 0;
begin
  perform public.whatsapp_conferir_respostas();

  for v_id in
    select id
      from public.whatsapp_outbox
     where status = 'pending'
       and proxima_tentativa_em <= now()
     order by prioridade desc, created_at
     limit greatest(1, least(p_limite, 20))
     for update skip locked
  loop
    perform public.whatsapp_disparar(v_id);
    n := n + 1;
  end loop;

  return n;
end;
$$;

-- ---------------------------------------------------------------------
-- 8. O APP CHAMA ESTA: supabase.rpc('whatsapp_enviar', {...})
--    p_destinatarios = [{ "telefone": "...", "nome": "...", "guardian_id": "...", "student_id": "..." }]
--    {nome} no texto vira o primeiro nome do responsável.
-- ---------------------------------------------------------------------
create or replace function public.whatsapp_enviar(
  p_texto           text,
  p_destinatarios   jsonb,
  p_origem          text default 'comunicacao',
  p_organization_id uuid default null,
  p_announcement_id uuid default null,
  p_lote_id         text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lote       text := coalesce(nullif(trim(p_lote_id), ''), gen_random_uuid()::text);
  v_urgente    boolean := coalesce(p_origem, '') = 'urgente';
  v_uuid_re    text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
  d            jsonb;
  v_tel        text;
  v_nome       text;
  v_id         uuid;
  v_ids        uuid[] := '{}';
  v_invalidos  text[] := '{}';
  v_total      int;
  v_disparados int := 0;
  v_limite     int;
  i            int;
begin
  if not public.whatsapp_pode_enviar() then
    raise exception 'Seu perfil não tem permissão para enviar WhatsApp pela escola.' using errcode = '42501';
  end if;
  if coalesce(trim(p_texto), '') = '' then
    raise exception 'A mensagem está vazia.';
  end if;
  if length(p_texto) > 4000 then
    raise exception 'A mensagem passou de 4.000 caracteres.';
  end if;
  if p_destinatarios is null or jsonb_typeof(p_destinatarios) <> 'array' or jsonb_array_length(p_destinatarios) = 0 then
    raise exception 'Nenhum destinatário com telefone.';
  end if;
  if jsonb_array_length(p_destinatarios) > 3000 then
    raise exception 'Máximo de 3.000 destinatários por envio.';
  end if;

  for d in select value from jsonb_array_elements(p_destinatarios) loop
    v_id  := null;
    v_tel := public.whatsapp_normalizar_telefone(d ->> 'telefone');

    if v_tel is null then
      v_invalidos := v_invalidos || coalesce(d ->> 'nome', d ->> 'telefone', '?');
      continue;
    end if;

    v_nome := nullif(trim(coalesce(d ->> 'nome', '')), '');

    insert into public.whatsapp_outbox (
      organization_id, announcement_id, origem, prioridade,
      student_id, guardian_id, telefone, nome, texto, referencia, created_by
    )
    values (
      p_organization_id,
      p_announcement_id,
      coalesce(nullif(p_origem, ''), 'comunicacao'),
      case when v_urgente then 10 else 0 end,
      case when coalesce(d ->> 'student_id', '')  ~ v_uuid_re then (d ->> 'student_id')::uuid end,
      case when coalesce(d ->> 'guardian_id', '') ~ v_uuid_re then (d ->> 'guardian_id')::uuid end,
      v_tel,
      v_nome,
      trim(replace(p_texto, '{nome}', coalesce(split_part(v_nome, ' ', 1), ''))),
      v_lote || '-' || v_tel,          -- mesmo número no mesmo envio (irmãos) = uma mensagem só
      auth.uid()
    )
    on conflict (referencia) do nothing
    returning id into v_id;

    if v_id is not null then
      v_ids := v_ids || v_id;
    end if;
  end loop;

  v_total := coalesce(array_length(v_ids, 1), 0);
  if v_total = 0 then
    raise exception 'Nenhum telefone válido para enviar.';
  end if;

  -- Urgente (ou poucos números): dispara agora. O resto o cron leva.
  if v_urgente or v_total <= 6 then
    v_limite := least(v_total, case when v_urgente then 30 else 6 end);
    for i in 1 .. v_limite loop
      perform public.whatsapp_disparar(v_ids[i]);
      v_disparados := v_disparados + 1;
    end loop;
  end if;

  return jsonb_build_object(
    'lote_id',    v_lote,
    'total',      v_total,
    'disparados', v_disparados,
    'na_fila',    v_total - v_disparados,
    'invalidos',  to_jsonb(v_invalidos)
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 9. O APP CHAMA ESTA para saber como ficou: supabase.rpc('whatsapp_status', {...})
-- ---------------------------------------------------------------------
create or replace function public.whatsapp_status(
  p_lote_id         text default null,
  p_announcement_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb;
begin
  if not public.whatsapp_pode_enviar() then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  if p_lote_id is null and p_announcement_id is null then
    raise exception 'Informe p_lote_id ou p_announcement_id.';
  end if;

  perform public.whatsapp_conferir_respostas();

  select jsonb_build_object(
           'total',   count(*),
           'pending', count(*) filter (where status = 'pending'),
           'sending', count(*) filter (where status = 'sending'),
           'sent',    count(*) filter (where status = 'sent'),
           'failed',  count(*) filter (where status = 'failed'),
           'erros',   coalesce(
                        jsonb_agg(jsonb_build_object('telefone', telefone, 'status_http', status_http, 'resposta', left(resposta, 200)))
                          filter (where status = 'failed'),
                        '[]'::jsonb)
         )
    into v
    from public.whatsapp_outbox
   where (p_lote_id is not null and referencia like p_lote_id || '-%')
      or (p_announcement_id is not null and announcement_id = p_announcement_id);

  return v;
end;
$$;

-- ---------------------------------------------------------------------
-- 10. Permissões: o app só enxerga enviar e status
-- ---------------------------------------------------------------------
revoke all on function public.whatsapp_normalizar_telefone(text)  from public, anon;
revoke all on function public.whatsapp_pode_enviar()              from public, anon;
revoke all on function public.whatsapp_disparar(uuid)             from public, anon, authenticated;
revoke all on function public.whatsapp_conferir_respostas()       from public, anon, authenticated;
revoke all on function public.whatsapp_processar(int)             from public, anon, authenticated;
revoke all on function public.whatsapp_enviar(text, jsonb, text, uuid, uuid, text) from public, anon;
revoke all on function public.whatsapp_status(text, uuid)         from public, anon;

grant execute on function public.whatsapp_pode_enviar()                               to authenticated;
grant execute on function public.whatsapp_normalizar_telefone(text)                   to authenticated;
grant execute on function public.whatsapp_enviar(text, jsonb, text, uuid, uuid, text) to authenticated;
grant execute on function public.whatsapp_status(text, uuid)                          to authenticated;

-- ---------------------------------------------------------------------
-- 11. Agendamento: processa a fila a cada 10 segundos
-- ---------------------------------------------------------------------
select cron.unschedule(jobid) from cron.job where jobname = 'clarixzap-fila';
select cron.schedule('clarixzap-fila', '10 seconds', $cron$ select public.whatsapp_processar(3); $cron$);

-- Atualiza o cache da API para o app enxergar as funções novas na hora
notify pgrst, 'reload schema';

-- =====================================================================
-- TESTE rápido (rode logado como admin pelo app, ou troque por um número seu):
--   select * from public.whatsapp_outbox order by created_at desc limit 20;
-- =====================================================================

-- #####################################################################
-- PARTE 2
-- #####################################################################
-- =====================================================================
-- ESCOLA ESCUTA — 01 · BASE (rode primeiro, uma vez)
-- Permissões por escola, vínculos família ↔ estudante, avisos no portal,
-- histórico de autoria, anexos protegidos e seleção de público.
--
-- Usa as tabelas que o Classium já tem: students, guardians, classes,
-- student_responsible_links, family_links e (se existir) profiles.
-- Tudo o que pode variar no seu banco está centralizado aqui.
-- =====================================================================

create extension if not exists btree_gist;
create extension if not exists pg_cron;

-- ---------------------------------------------------------------------
-- Configuração: nomes de papéis usados na coluna profiles.role
-- (ajuste com UPDATE se o seu sistema usa outros nomes)
-- ---------------------------------------------------------------------
create table if not exists public.ee_config (
  chave text primary key,
  valor text not null
);
alter table public.ee_config enable row level security;

insert into public.ee_config (chave, valor) values
  ('papeis_super',   'admin,super_admin,admin_master,master'),
  ('papeis_gestor',  'gestor,equipe,gestao,diretor,direcao,coordenador,coordenacao,secretaria,secretario,school_admin,manager'),
  ('papeis_docente', 'docente,teacher,professor,professora'),
  ('mural_grande_alcance', '300'),
  ('agenda_whatsapp_lembrete', 'true')
on conflict (chave) do nothing;

-- incluir os papéis do Classium (resolve_my_access) em instalações anteriores
update public.ee_config set valor = valor || ',equipe' where chave = 'papeis_gestor' and valor not like '%equipe%';
update public.ee_config set valor = 'admin,' || valor where chave = 'papeis_super' and (',' || valor || ',') not like '%,admin,%';
update public.ee_config set valor = 'docente,' || valor where chave = 'papeis_docente' and (',' || valor || ',') not like '%,docente,%';

-- Atribuição manual (quando o profiles não tiver role/organização confiável)
create table if not exists public.ee_membros (
  organization_id uuid not null,
  user_id         uuid not null,
  papel           text not null check (papel in ('gestor', 'docente')),
  nome            text,
  created_at      timestamptz not null default now(),
  primary key (organization_id, user_id, papel)
);
alter table public.ee_membros enable row level security;

-- Turmas de cada docente (opcional: sem linhas aqui, o docente vê todas as turmas da escola)
create table if not exists public.ee_docente_turmas (
  user_id  uuid not null,
  class_id uuid not null,
  primary key (user_id, class_id)
);
alter table public.ee_docente_turmas enable row level security;

-- ---------------------------------------------------------------------
-- Funções de identidade (todas security definer, sem expor dados)
-- ---------------------------------------------------------------------
create or replace function public.ee_lista(p_chave text)
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(string_to_array(lower(replace((select valor from public.ee_config where chave = p_chave), ' ', '')), ','), '{}'::text[]);
$$;

create or replace function public.ee_uuid(p text)
returns uuid
language sql
immutable
as $$
  select case when p ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then p::uuid end;
$$;

-- Lê o perfil do usuário logado sem depender dos nomes exatos das colunas
create or replace function public.ee_meu_perfil()
returns table (papel text, organization_id uuid, nome text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  -- 1º: a mesma função que o app usa para decidir o portal (resolve_my_access)
  if to_regprocedure('public.resolve_my_access()') is not null then
    begin
      return query execute $q$
        select lower(coalesce(j->>'role', j->>'papel', j->>'perfil', '')),
               public.ee_uuid(coalesce(j->>'organization_id', j->>'organizationId', j->>'school_id', j->>'org_id', '')),
               coalesce(j->>'full_name', j->>'name', j->>'nome', auth.jwt()->>'email')
          from (select case when jsonb_typeof(x.v) = 'object' and x.v ? 'resolve_my_access' then x.v->'resolve_my_access' else x.v end as j
                  from (select to_jsonb(r) as v from public.resolve_my_access() r limit 1) x) s
         where coalesce(j->>'role', j->>'papel', j->>'perfil', '') <> ''
    $q$;
      if found then
        return;
      end if;
    exception when others then
      null;
    end;
  end if;

  -- 2º: tabela profiles
  if to_regclass('public.profiles') is null then
    return;
  end if;
  begin
    return query execute $q$
      select lower(coalesce(j->>'role', j->>'user_role', j->>'tipo', j->>'perfil', '')),
             public.ee_uuid(coalesce(j->>'organization_id', j->>'school_id', j->>'escola_id', '')),
             coalesce(j->>'full_name', j->>'name', j->>'nome', j->>'email')
        from (select to_jsonb(p) as j from public.profiles p where p.id = $1) s
    $q$ using auth.uid();
  exception when others then
    return;
  end;
end;
$$;

create or replace function public.ee_meu_nome()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v text;
begin
  select nome into v from public.ee_meu_perfil() limit 1;
  return coalesce(v, auth.jwt() ->> 'email', 'Usuário');
end;
$$;

create or replace function public.ee_e_super()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_papel text;
begin
  if auth.uid() is null then
    return false;
  end if;
  select papel into v_papel from public.ee_meu_perfil() limit 1;
  return coalesce(v_papel, '') = any (public.ee_lista('papeis_super'))
      or coalesce(lower(auth.jwt() -> 'app_metadata' ->> 'role'), '') = any (public.ee_lista('papeis_super'));
end;
$$;

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
  if exists (select 1 from public.ee_membros m where m.organization_id = p_org and m.user_id = auth.uid() and m.papel = 'gestor') then
    return true;
  end if;
  select papel, organization_id into v_papel, v_org from public.ee_meu_perfil() limit 1;
  if coalesce(v_papel, '') = any (public.ee_lista('papeis_super')) then
    return true;
  end if;
  return coalesce(v_papel, '') = any (public.ee_lista('papeis_gestor')) and v_org = p_org;
end;
$$;

create or replace function public.ee_e_docente(p_org uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_papel text;
  v_org   uuid;
  v_t     boolean;
begin
  if auth.uid() is null or p_org is null then
    return false;
  end if;
  if exists (select 1 from public.ee_membros m where m.organization_id = p_org and m.user_id = auth.uid() and m.papel = 'docente') then
    return true;
  end if;
  -- cadastro de professores do Classium (teachers)
  if to_regclass('public.teachers') is not null then
    begin
      execute $q$
        select exists (
          select 1 from (select to_jsonb(t) as j from public.teachers t) x
           where (j->>'profile_id' = $1 or j->>'user_id' = $1 or ($2 <> '' and lower(j->>'email') = $2))
             and coalesce(j->>'organization_id', j->>'school_id') = $3)
      $q$ into v_t using auth.uid()::text, lower(coalesce(auth.jwt() ->> 'email', '')), p_org::text;
      if v_t then
        return true;
      end if;
    exception when others then
      null;
    end;
  end if;
  select papel, organization_id into v_papel, v_org from public.ee_meu_perfil() limit 1;
  return coalesce(v_papel, '') = any (public.ee_lista('papeis_docente')) and v_org = p_org;
end;
$$;

-- Responsáveis (guardians) ligados ao usuário logado: por profile_id/user_id ou pelo e-mail
create or replace function public.ee_meus_guardian_ids()
returns setof uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null then
    return;
  end if;
  return query
    select g.id
      from public.guardians g
     where (v_email <> '' and lower(coalesce(g.email, '')) = v_email)
        or to_jsonb(g) ->> 'profile_id' = auth.uid()::text
        or to_jsonb(g) ->> 'user_id' = auth.uid()::text;
end;
$$;

-- Vínculos responsável ↔ estudante (todas as tabelas que o Classium usa)
create or replace function public.ee_vinculos()
returns table (student_id uuid, guardian_id uuid)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
    select l.student_id, l.guardian_id from public.student_responsible_links l where l.student_id is not null and l.guardian_id is not null
    union
    select f.student_id, f.guardian_id from public.family_links f where f.student_id is not null and f.guardian_id is not null;
  if to_regclass('public.student_guardians') is not null then
    begin
      return query execute 'select student_id::uuid, guardian_id::uuid from public.student_guardians where student_id is not null and guardian_id is not null';
    exception when others then
      null;
    end;
  end if;
end;
$$;

-- Estudantes com vínculo autorizado ao usuário logado
create or replace function public.ee_meus_estudantes()
returns table (student_id uuid, organization_id uuid, class_id uuid, guardian_id uuid, student_nome text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  return query
    with g as (select public.ee_meus_guardian_ids() as id),
    lk as (select v.student_id, v.guardian_id from public.ee_vinculos() v where v.guardian_id in (select id from g))
    select s.id, s.organization_id, s.class_id, lk.guardian_id, coalesce(s.full_name, s.name)::text
      from lk
      join public.students s on s.id = lk.student_id;

  -- e os filhos que o próprio app mostra no Portal da Família (get_my_family_children)
  if to_regprocedure('public.get_my_family_children()') is not null then
    begin
      return query execute $q$
        select s.id, s.organization_id, s.class_id, public.ee_uuid(c ->> 'guardian_id'), coalesce(s.full_name, s.name)::text
          from jsonb_array_elements(coalesce((select to_jsonb(r) from public.get_my_family_children() r limit 1) -> 'children', '[]'::jsonb)) c
          join public.students s on s.id = public.ee_uuid(c ->> 'student_id')
    $q$;
    exception when others then
      null;
    end;
  end if;
end;
$$;

create or replace function public.ee_e_familia(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.ee_meus_estudantes() e where e.organization_id = p_org);
$$;

create or replace function public.ee_membro_da_escola(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.ee_e_gestor(p_org) or public.ee_e_docente(p_org) or public.ee_e_familia(p_org);
$$;

-- Nome da escola (tenta organizations / schools)
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
  foreach t in array array['organizations', 'schools', 'escolas'] loop
    if to_regclass('public.' || t) is not null then
      begin
        execute format('select coalesce(to_jsonb(x)->>''name'', to_jsonb(x)->>''nome'', to_jsonb(x)->>''school_name'') from public.%I x where x.id = $1', t)
           into v using p_org;
      exception when others then
        v := null;
      end;
      if v is not null then
        return v;
      end if;
    end if;
  end loop;
  return 'Escola';
end;
$$;

-- Escolas do usuário logado e em que papel (o app usa para escolher a unidade)
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

-- ---------------------------------------------------------------------
-- Público: famílias (sem duplicar responsável com 2+ filhos) e docentes
-- p_publico = {"familias":"todas"|"turnos"|"turmas"|null, "turnos":[...],
--              "turmas":[uuid...], "docentes":"todos"|"selecionados"|null,
--              "docente_ids":[uuid...]}
-- ---------------------------------------------------------------------
create or replace function public.ee_docentes_da_escola(p_org uuid)
returns table (user_id uuid, nome text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  -- lista de docentes só para a gestão (ou chamadas internas, sem usuário logado)
  if auth.uid() is not null and not public.ee_e_gestor(p_org) then
    return;
  end if;
  return query
    select m.user_id, coalesce(m.nome, 'Docente')
      from public.ee_membros m
     where m.organization_id = p_org and m.papel = 'docente';

  if to_regclass('public.teachers') is not null then
    begin
      return query execute $q$
        select public.ee_uuid(coalesce(j->>'profile_id', j->>'user_id')), coalesce(j->>'full_name', j->>'name', j->>'nome', j->>'email', 'Docente')
          from (select to_jsonb(t) as j from public.teachers t) s
         where coalesce(j->>'organization_id', j->>'school_id') = $1::text
           and public.ee_uuid(coalesce(j->>'profile_id', j->>'user_id')) is not null
      $q$ using p_org;
    exception when others then
      null;
    end;
  end if;

  if to_regclass('public.profiles') is not null then
    begin
      return query execute $q$
        select public.ee_uuid(j->>'id'), coalesce(j->>'full_name', j->>'name', j->>'nome', j->>'email', 'Docente')
          from (select to_jsonb(p) as j from public.profiles p) s
         where lower(coalesce(j->>'role', j->>'user_role', j->>'tipo', '')) = any ($1)
           and coalesce(j->>'organization_id', j->>'school_id', j->>'escola_id') = $2::text
      $q$ using public.ee_lista('papeis_docente'), p_org;
    exception when others then
      null;
    end;
  end if;
end;
$$;

create or replace function public.ee_publico(p_org uuid, p_publico jsonb)
returns table (
  tipo text, guardian_id uuid, user_id uuid, student_id uuid, class_id uuid,
  shift text, nome text, telefone text, tem_acesso boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_fam     text := coalesce(p_publico ->> 'familias', '');
  v_doc     text := coalesce(p_publico ->> 'docentes', '');
  v_turnos  text[];
  v_turmas  uuid[];
  v_docids  uuid[];
begin
  select coalesce(array_agg(lower(x)), '{}') into v_turnos from jsonb_array_elements_text(coalesce(p_publico -> 'turnos', '[]'::jsonb)) x;
  select coalesce(array_agg(public.ee_uuid(x)), '{}') into v_turmas from jsonb_array_elements_text(coalesce(p_publico -> 'turmas', '[]'::jsonb)) x;
  select coalesce(array_agg(public.ee_uuid(x)), '{}') into v_docids from jsonb_array_elements_text(coalesce(p_publico -> 'docente_ids', '[]'::jsonb)) x;

  if v_fam in ('todas', 'turnos', 'turmas') then
    return query
      with alunos as (
        select s.id, s.class_id, lower(coalesce(c.shift, to_jsonb(s) ->> 'shift', '')) as shift
          from public.students s
          left join public.classes c on c.id = s.class_id
         where s.organization_id = p_org
           and coalesce(s.status, '') !~* '^(transferid|inativ|cancelad|evadid)'
      ),
      alvo as (
        select a.* from alunos a
         where v_fam = 'todas'
            or (v_fam = 'turnos' and a.shift = any (v_turnos))
            or (v_fam = 'turmas' and a.class_id = any (v_turmas))
      ),
      lk as (
        select v.student_id, v.guardian_id from public.ee_vinculos() v where v.student_id in (select id from alvo)
      )
      select distinct on (g.id)
             'familia'::text, g.id, null::uuid, a.id, a.class_id, a.shift,
             coalesce(g.full_name, g.name)::text, g.phone::text,
             (to_jsonb(g) ->> 'profile_id' is not null
               or exists (select 1 from auth.users u where lower(u.email) = lower(g.email)))
        from lk
        join alvo a on a.id = lk.student_id
        join public.guardians g on g.id = lk.guardian_id
       order by g.id, a.id;
  end if;

  if v_doc in ('todos', 'selecionados') then
    return query
      select distinct on (d.user_id)
             'docente'::text, null::uuid, d.user_id, null::uuid, null::uuid, null::text, d.nome, null::text, true
        from public.ee_docentes_da_escola(p_org) d
       where d.user_id is not null
         and (v_doc = 'todos' or d.user_id = any (v_docids))
       order by d.user_id;
  end if;
end;
$$;

-- O usuário logado faz parte do público?
create or replace function public.ee_publico_inclui_me(p_org uuid, p_publico jsonb)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_fam text := coalesce(p_publico ->> 'familias', '');
  v_doc text := coalesce(p_publico ->> 'docentes', '');
begin
  if auth.uid() is null then
    return false;
  end if;

  if v_fam in ('todas', 'turnos', 'turmas') and exists (
    select 1
      from public.ee_meus_estudantes() e
      left join public.classes c on c.id = e.class_id
     where e.organization_id = p_org
       and (v_fam = 'todas'
         or (v_fam = 'turnos' and lower(coalesce(c.shift, '')) in (select lower(x) from jsonb_array_elements_text(coalesce(p_publico -> 'turnos', '[]'::jsonb)) x))
         or (v_fam = 'turmas' and e.class_id::text in (select x from jsonb_array_elements_text(coalesce(p_publico -> 'turmas', '[]'::jsonb)) x)))
  ) then
    return true;
  end if;

  if v_doc in ('todos', 'selecionados') and public.ee_e_docente(p_org) then
    return v_doc = 'todos'
        or auth.uid()::text in (select x from jsonb_array_elements_text(coalesce(p_publico -> 'docente_ids', '[]'::jsonb)) x);
  end if;

  return false;
end;
$$;

-- Prévia do alcance (para a tela de publicação)
create or replace function public.ee_previa_publico(p_org uuid, p_publico jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v jsonb;
begin
  if not public.ee_e_gestor(p_org) then
    raise exception 'Somente a gestão da escola pode consultar o público.' using errcode = '42501';
  end if;
  select jsonb_build_object(
           'familias',   count(*) filter (where tipo = 'familia'),
           'docentes',   count(*) filter (where tipo = 'docente'),
           'total',      count(*),
           'sem_acesso', count(*) filter (where not tem_acesso),
           'sem_telefone', count(*) filter (where tipo = 'familia' and coalesce(telefone, '') = '')
         )
    into v
    from public.ee_publico(p_org, p_publico);
  return v;
end;
$$;

-- Turmas e turnos da escola (para os seletores)
create or replace function public.ee_turmas(p_org uuid)
returns table (id uuid, nome text, turno text, alunos bigint)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.name::text, c.shift::text,
         (select count(*) from public.students s where s.class_id = c.id)
    from public.classes c
   where c.organization_id = p_org
     and coalesce(c.is_active, true)
     and public.ee_membro_da_escola(p_org)
   order by c.name;
$$;

-- ---------------------------------------------------------------------
-- Avisos no portal (sino) — por usuário, por responsável ou para a gestão
-- ---------------------------------------------------------------------
create table if not exists public.ee_avisos (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  user_id         uuid,           -- usuário específico
  guardian_id     uuid,           -- responsável (família)
  para_gestao     boolean not null default false,
  modulo          text not null,  -- mural | agenda | diario | participa
  titulo          text not null,
  corpo           text,
  ref_id          uuid,
  created_at      timestamptz not null default now(),
  lido_em         timestamptz
);
create index if not exists ee_avisos_user_idx on public.ee_avisos (user_id, created_at desc);
create index if not exists ee_avisos_guardian_idx on public.ee_avisos (guardian_id, created_at desc);
create index if not exists ee_avisos_org_idx on public.ee_avisos (organization_id, para_gestao, created_at desc);
alter table public.ee_avisos enable row level security;

drop policy if exists ee_avisos_select on public.ee_avisos;
create policy ee_avisos_select on public.ee_avisos for select to authenticated using (
  user_id = auth.uid()
  or guardian_id in (select public.ee_meus_guardian_ids())
  or (para_gestao and public.ee_e_gestor(organization_id))
);
drop policy if exists ee_avisos_update on public.ee_avisos;
create policy ee_avisos_update on public.ee_avisos for update to authenticated using (
  user_id = auth.uid()
  or guardian_id in (select public.ee_meus_guardian_ids())
  or (para_gestao and public.ee_e_gestor(organization_id))
) with check (true);

create or replace function public.ee_avisar(
  p_org uuid, p_modulo text, p_titulo text, p_corpo text, p_ref uuid,
  p_user uuid default null, p_guardian uuid default null, p_gestao boolean default false
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.ee_avisos (organization_id, modulo, titulo, corpo, ref_id, user_id, guardian_id, para_gestao)
  values (p_org, p_modulo, left(p_titulo, 200), left(p_corpo, 500), p_ref, p_user, p_guardian, coalesce(p_gestao, false));
$$;

-- WhatsApp opcional: usa a fila da ClarixZap se ela estiver instalada
create or replace function public.ee_whatsapp(p_org uuid, p_telefone text, p_nome text, p_texto text, p_referencia text, p_urgente boolean default false)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tel text;
begin
  if to_regclass('public.whatsapp_outbox') is null or to_regprocedure('public.whatsapp_normalizar_telefone(text)') is null then
    return;
  end if;
  execute 'select public.whatsapp_normalizar_telefone($1)' into v_tel using p_telefone;
  if v_tel is null then
    return;
  end if;
  execute 'insert into public.whatsapp_outbox (organization_id, origem, prioridade, telefone, nome, texto, referencia)
           values ($1, $2, $3, $4, $5, $6, $7) on conflict (referencia) do nothing'
    using p_org, 'escola_escuta', case when p_urgente then 10 else 0 end, v_tel, p_nome, p_texto, p_referencia;
end;
$$;

-- ---------------------------------------------------------------------
-- Histórico de autoria (quem fez o quê e quando)
-- ---------------------------------------------------------------------
create table if not exists public.ee_historico (
  id              bigserial primary key,
  organization_id uuid,
  entidade        text not null,
  entidade_id     uuid,
  acao            text not null,
  autor_id        uuid default auth.uid(),
  autor_nome      text,
  dados           jsonb,
  created_at      timestamptz not null default now()
);
create index if not exists ee_historico_ent_idx on public.ee_historico (entidade, entidade_id, created_at desc);
alter table public.ee_historico enable row level security;
drop policy if exists ee_historico_select on public.ee_historico;
create policy ee_historico_select on public.ee_historico for select to authenticated using (public.ee_e_gestor(organization_id));

create or replace function public.ee_registrar(p_org uuid, p_entidade text, p_id uuid, p_acao text, p_dados jsonb default null)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.ee_historico (organization_id, entidade, entidade_id, acao, autor_id, autor_nome, dados)
  values (p_org, p_entidade, p_id, p_acao, auth.uid(), public.ee_meu_nome(), p_dados);
$$;

-- ---------------------------------------------------------------------
-- Anexos protegidos: bucket privado, pasta = id da escola
--   caminho:  {organization_id}/{modulo}/{id}/{arquivo}
--   leitura só para membros da escola; download por link assinado
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('escola-escuta', 'escola-escuta', false, 20971520)
on conflict (id) do nothing;

drop policy if exists ee_storage_select on storage.objects;
create policy ee_storage_select on storage.objects for select to authenticated using (
  bucket_id = 'escola-escuta'
  and public.ee_membro_da_escola(public.ee_uuid((storage.foldername(name))[1]))
);
drop policy if exists ee_storage_insert on storage.objects;
create policy ee_storage_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'escola-escuta'
  and (public.ee_e_gestor(public.ee_uuid((storage.foldername(name))[1]))
    or public.ee_e_docente(public.ee_uuid((storage.foldername(name))[1]))
    or ((storage.foldername(name))[2] = 'participa' and public.ee_e_familia(public.ee_uuid((storage.foldername(name))[1]))))
);
drop policy if exists ee_storage_delete on storage.objects;
create policy ee_storage_delete on storage.objects for delete to authenticated using (
  bucket_id = 'escola-escuta'
  and (owner = auth.uid() or public.ee_e_gestor(public.ee_uuid((storage.foldername(name))[1])))
);

-- membros: cada um vê o próprio; gestão vê e gerencia a escola
drop policy if exists ee_membros_select on public.ee_membros;
create policy ee_membros_select on public.ee_membros for select to authenticated using (user_id = auth.uid() or public.ee_e_gestor(organization_id));
drop policy if exists ee_membros_write on public.ee_membros;
create policy ee_membros_write on public.ee_membros for all to authenticated using (public.ee_e_gestor(organization_id)) with check (public.ee_e_gestor(organization_id));

-- ---------------------------------------------------------------------
-- Realtime: helper para publicar tabelas
-- ---------------------------------------------------------------------
create or replace function public.ee_realtime(p_tabela text)
returns void
language plpgsql
as $$
begin
  execute format('alter publication supabase_realtime add table public.%I', p_tabela);
exception when duplicate_object then null;
          when undefined_object then null;
end;
$$;
select public.ee_realtime('ee_avisos');

-- ---------------------------------------------------------------------
-- Permissões das funções
-- ---------------------------------------------------------------------
revoke execute on function public.ee_avisar(uuid, text, text, text, uuid, uuid, uuid, boolean) from public, anon, authenticated;
revoke execute on function public.ee_whatsapp(uuid, text, text, text, text, boolean) from public, anon, authenticated;
revoke execute on function public.ee_registrar(uuid, text, uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function public.ee_publico(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.ee_docentes_da_escola(uuid) from public, anon;
grant  execute on function public.ee_docentes_da_escola(uuid) to authenticated;

notify pgrst, 'reload schema';

-- #####################################################################
-- PARTE 3
-- #####################################################################
-- =====================================================================
-- ESCOLA ESCUTA — 02 · MURAL DE RECADOS
-- Só a gestão cria/edita/publica. Famílias e docentes leem o que é para eles,
-- veem anexos e registram ciência. Público é congelado na publicação
-- (um responsável com 2 filhos recebe uma vez só).
-- =====================================================================

create table if not exists public.mural_config (
  organization_id uuid primary key,
  titulo          text not null default 'Mural de Recados',
  apresentacao    text,
  banner_path     text,
  updated_by      uuid default auth.uid(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.mural_recados (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null,
  titulo              text not null default '',
  resumo              text,
  conteudo            text,
  tipo                text not null default 'aviso'
                      check (tipo in ('aviso', 'evento', 'orientacao', 'campanha', 'projeto', 'conquista')),
  imagem_path         text,
  publico             jsonb not null default '{}'::jsonb,
  inicio_em           timestamptz,
  fim_em              timestamptz,
  fixado              boolean not null default false,
  exige_ciencia       boolean not null default false,
  status              text not null default 'rascunho'
                      check (status in ('rascunho', 'programado', 'publicado', 'encerrado', 'arquivado', 'cancelado')),
  versao              int not null default 1,
  total_destinatarios int not null default 0,
  sem_acesso          int not null default 0,
  created_by          uuid default auth.uid(),
  created_at          timestamptz not null default now(),
  updated_by          uuid,
  updated_at          timestamptz not null default now(),
  publicado_em        timestamptz,
  publicado_por       uuid,
  constraint mural_periodo_ok check (fim_em is null or inicio_em is null or fim_em > inicio_em)
);
create index if not exists mural_recados_org_idx on public.mural_recados (organization_id, status, fixado desc, publicado_em desc);

create table if not exists public.mural_versoes (
  recado_id  uuid not null references public.mural_recados (id) on delete cascade,
  versao     int not null,
  titulo     text,
  resumo     text,
  conteudo   text,
  editado_por uuid,
  editado_em timestamptz not null default now(),
  primary key (recado_id, versao)
);

create table if not exists public.mural_anexos (
  id         uuid primary key default gen_random_uuid(),
  recado_id  uuid not null references public.mural_recados (id) on delete cascade,
  path       text not null,
  nome       text not null,
  mime       text,
  tamanho    bigint,
  created_at timestamptz not null default now()
);

create table if not exists public.mural_destinatarios (
  recado_id   uuid not null references public.mural_recados (id) on delete cascade,
  tipo        text not null check (tipo in ('familia', 'docente')),
  guardian_id uuid,
  user_id     uuid,
  student_id  uuid,
  class_id    uuid,
  shift       text
);
create unique index if not exists mural_dest_uniq on public.mural_destinatarios (recado_id, coalesce(guardian_id, user_id));
create index if not exists mural_dest_guardian_idx on public.mural_destinatarios (guardian_id);
create index if not exists mural_dest_user_idx on public.mural_destinatarios (user_id);

create table if not exists public.mural_leituras (
  recado_id      uuid not null references public.mural_recados (id) on delete cascade,
  user_id        uuid not null default auth.uid(),
  versao         int,
  destaque_em    timestamptz,
  visualizado_em timestamptz,
  ciencia_em     timestamptz,
  ciencia_versao int,
  primary key (recado_id, user_id)
);

-- ---------------------------------------------------------------------
-- Funções de acesso
-- ---------------------------------------------------------------------
create or replace function public.mural_sou_destinatario(p_recado uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.mural_destinatarios d
     where d.recado_id = p_recado
       and (d.user_id = auth.uid() or d.guardian_id in (select public.ee_meus_guardian_ids()))
  );
$$;

create or replace function public.mural_pode_ler(p_recado uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.mural_recados r
     where r.id = p_recado
       and (public.ee_e_gestor(r.organization_id)
         or (r.status in ('publicado', 'programado', 'encerrado')
             and (r.inicio_em is null or r.inicio_em <= now())
             and public.mural_sou_destinatario(r.id)))
  );
$$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.mural_config        enable row level security;
alter table public.mural_recados       enable row level security;
alter table public.mural_versoes       enable row level security;
alter table public.mural_anexos        enable row level security;
alter table public.mural_destinatarios enable row level security;
alter table public.mural_leituras      enable row level security;

drop policy if exists mural_config_select on public.mural_config;
create policy mural_config_select on public.mural_config for select to authenticated using (public.ee_membro_da_escola(organization_id));
drop policy if exists mural_config_write on public.mural_config;
create policy mural_config_write on public.mural_config for all to authenticated using (public.ee_e_gestor(organization_id)) with check (public.ee_e_gestor(organization_id));

drop policy if exists mural_recados_select on public.mural_recados;
create policy mural_recados_select on public.mural_recados for select to authenticated using (
  public.ee_e_gestor(organization_id)
  or (status in ('publicado', 'programado', 'encerrado')
      and (inicio_em is null or inicio_em <= now())
      and public.mural_sou_destinatario(id))
);
drop policy if exists mural_recados_insert on public.mural_recados;
create policy mural_recados_insert on public.mural_recados for insert to authenticated with check (public.ee_e_gestor(organization_id) and status = 'rascunho');
drop policy if exists mural_recados_update on public.mural_recados;
create policy mural_recados_update on public.mural_recados for update to authenticated using (public.ee_e_gestor(organization_id)) with check (public.ee_e_gestor(organization_id));
drop policy if exists mural_recados_delete on public.mural_recados;
create policy mural_recados_delete on public.mural_recados for delete to authenticated using (public.ee_e_gestor(organization_id) and status = 'rascunho');

drop policy if exists mural_versoes_select on public.mural_versoes;
create policy mural_versoes_select on public.mural_versoes for select to authenticated using (
  exists (select 1 from public.mural_recados r where r.id = recado_id and public.ee_e_gestor(r.organization_id))
);

drop policy if exists mural_anexos_select on public.mural_anexos;
create policy mural_anexos_select on public.mural_anexos for select to authenticated using (public.mural_pode_ler(recado_id));
drop policy if exists mural_anexos_write on public.mural_anexos;
create policy mural_anexos_write on public.mural_anexos for all to authenticated
  using (exists (select 1 from public.mural_recados r where r.id = recado_id and public.ee_e_gestor(r.organization_id)))
  with check (exists (select 1 from public.mural_recados r where r.id = recado_id and public.ee_e_gestor(r.organization_id)));

drop policy if exists mural_dest_select on public.mural_destinatarios;
create policy mural_dest_select on public.mural_destinatarios for select to authenticated using (
  exists (select 1 from public.mural_recados r where r.id = recado_id and public.ee_e_gestor(r.organization_id))
);

drop policy if exists mural_leituras_select on public.mural_leituras;
create policy mural_leituras_select on public.mural_leituras for select to authenticated using (
  user_id = auth.uid()
  or exists (select 1 from public.mural_recados r where r.id = recado_id and public.ee_e_gestor(r.organization_id))
);
-- gravação das leituras só pela função mural_registrar

-- ---------------------------------------------------------------------
-- Gatilhos: versões, autoria e bloqueio de "publicar sem passar pela função"
-- ---------------------------------------------------------------------
create or replace function public.mural_antes_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();

  if new.status in ('publicado', 'programado')
     and old.status not in ('publicado', 'programado')
     and coalesce(current_setting('ee.mural_publicando', true), '') <> '1' then
    raise exception 'Use o botão Publicar: ele confere o público antes.';
  end if;

  if old.status in ('publicado', 'programado')
     and (new.titulo is distinct from old.titulo
       or new.resumo is distinct from old.resumo
       or new.conteudo is distinct from old.conteudo) then
    new.versao := old.versao + 1;
    insert into public.mural_versoes (recado_id, versao, titulo, resumo, conteudo, editado_por)
    values (new.id, new.versao, new.titulo, new.resumo, new.conteudo, auth.uid())
    on conflict (recado_id, versao) do nothing;
  end if;

  if new.status is distinct from old.status
     or new.versao is distinct from old.versao
     or new.fixado is distinct from old.fixado then
    perform public.ee_registrar(new.organization_id, 'mural', new.id,
      case
        when new.status is distinct from old.status then 'status:' || new.status
        when new.versao is distinct from old.versao then 'nova_versao:' || new.versao
        else case when new.fixado then 'fixado' else 'desafixado' end
      end,
      jsonb_build_object('versao', new.versao));
  end if;
  return new;
end;
$$;

drop trigger if exists mural_antes_update on public.mural_recados;
create trigger mural_antes_update before update on public.mural_recados
for each row execute function public.mural_antes_update();

-- ---------------------------------------------------------------------
-- Prévia do público e publicação
-- ---------------------------------------------------------------------
create or replace function public.mural_previa(p_org uuid, p_publico jsonb)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select public.ee_previa_publico(p_org, p_publico);
$$;

create or replace function public.mural_publicar(p_recado uuid, p_confirmado boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r          public.mural_recados;
  v_total    int;
  v_fam      int;
  v_doc      int;
  v_sem      int;
  v_limite   int := coalesce(nullif((select valor from public.ee_config where chave = 'mural_grande_alcance'), '')::int, 300);
  v_status   text;
begin
  select * into r from public.mural_recados where id = p_recado for update;
  if not found then
    raise exception 'Recado não encontrado.';
  end if;
  if not public.ee_e_gestor(r.organization_id) then
    raise exception 'Somente a gestão da escola pode publicar no mural.' using errcode = '42501';
  end if;
  if coalesce(trim(r.titulo), '') = '' then
    raise exception 'Preencha o assunto do recado.';
  end if;
  if coalesce(trim(r.conteudo), '') = '' and coalesce(trim(r.resumo), '') = '' then
    raise exception 'Escreva o conteúdo do recado.';
  end if;
  -- trava contra divulgação coletiva de dados pessoais (CPF no texto)
  if coalesce(r.conteudo, '') || ' ' || coalesce(r.resumo, '') ~ '\d{3}\.?\d{3}\.?\d{3}-?\d{2}' then
    raise exception 'O texto parece conter um CPF. Não publique dados pessoais no mural.';
  end if;

  create temp table if not exists _mural_alvo on commit drop as
    select * from public.ee_publico(r.organization_id, r.publico) limit 0;
  truncate _mural_alvo;
  insert into _mural_alvo select * from public.ee_publico(r.organization_id, r.publico);

  select count(*), count(*) filter (where tipo = 'familia'), count(*) filter (where tipo = 'docente'), count(*) filter (where not tem_acesso)
    into v_total, v_fam, v_doc, v_sem
    from _mural_alvo;

  if v_total = 0 then
    raise exception 'Nenhum destinatário válido para este público. Confira turmas, turnos e vínculos.';
  end if;
  if v_total > v_limite and not coalesce(p_confirmado, false) then
    return jsonb_build_object('precisa_confirmar', true, 'total', v_total, 'familias', v_fam, 'docentes', v_doc, 'sem_acesso', v_sem);
  end if;

  delete from public.mural_destinatarios where recado_id = r.id;
  insert into public.mural_destinatarios (recado_id, tipo, guardian_id, user_id, student_id, class_id, shift)
  select r.id, a.tipo, a.guardian_id, a.user_id, a.student_id, a.class_id, a.shift
    from _mural_alvo a
  on conflict do nothing;

  v_status := case when r.inicio_em is not null and r.inicio_em > now() then 'programado' else 'publicado' end;

  perform set_config('ee.mural_publicando', '1', true);
  update public.mural_recados
     set status = v_status,
         inicio_em = coalesce(inicio_em, now()),
         publicado_em = coalesce(inicio_em, now()),
         publicado_por = auth.uid(),
         total_destinatarios = v_total,
         sem_acesso = v_sem
   where id = r.id;
  perform set_config('ee.mural_publicando', '', true);

  insert into public.mural_versoes (recado_id, versao, titulo, resumo, conteudo, editado_por)
  values (r.id, r.versao, r.titulo, r.resumo, r.conteudo, auth.uid())
  on conflict (recado_id, versao) do nothing;

  -- aviso no sino de cada destinatário
  insert into public.ee_avisos (organization_id, modulo, titulo, corpo, ref_id, user_id, guardian_id)
  select r.organization_id, 'mural', left(r.titulo, 200), left(coalesce(r.resumo, ''), 500), r.id, a.user_id, a.guardian_id
    from _mural_alvo a;

  return jsonb_build_object('ok', true, 'status', v_status, 'total', v_total, 'familias', v_fam, 'docentes', v_doc, 'sem_acesso', v_sem);
end;
$$;

-- Encerrar / arquivar / cancelar / fixar
create or replace function public.mural_alterar(p_recado uuid, p_acao text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.mural_recados;
begin
  select * into r from public.mural_recados where id = p_recado for update;
  if not found or not public.ee_e_gestor(r.organization_id) then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  case p_acao
    when 'fixar'     then update public.mural_recados set fixado = true  where id = r.id;
    when 'desafixar' then update public.mural_recados set fixado = false where id = r.id;
    when 'encerrar'  then update public.mural_recados set status = 'encerrado', fim_em = least(coalesce(fim_em, now()), now()) where id = r.id;
    when 'arquivar'  then update public.mural_recados set status = 'arquivado', fixado = false where id = r.id;
    when 'cancelar'  then update public.mural_recados set status = 'cancelado', fixado = false where id = r.id;
    when 'reabrir_rascunho' then
      if r.status <> 'programado' then
        raise exception 'Só um recado programado pode voltar a rascunho.';
      end if;
      update public.mural_recados set status = 'rascunho' where id = r.id;
    else raise exception 'Ação inválida: %', p_acao;
  end case;
end;
$$;

-- Leitor: destaque visto, recado aberto, ciência
create or replace function public.mural_registrar(p_recado uuid, p_acao text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_versao int;
  v_exige  boolean;
begin
  if not public.mural_pode_ler(p_recado) or not public.mural_sou_destinatario(p_recado) then
    return; -- gestor visualizando não conta como leitura
  end if;
  select versao, exige_ciencia into v_versao, v_exige from public.mural_recados where id = p_recado;

  insert into public.mural_leituras (recado_id, user_id, versao) values (p_recado, auth.uid(), v_versao)
  on conflict (recado_id, user_id) do nothing;

  if p_acao = 'destaque' then
    update public.mural_leituras set destaque_em = now(), versao = v_versao where recado_id = p_recado and user_id = auth.uid();
  elsif p_acao = 'visualizou' then
    update public.mural_leituras set visualizado_em = now(), versao = v_versao, destaque_em = coalesce(destaque_em, now())
     where recado_id = p_recado and user_id = auth.uid();
  elsif p_acao = 'ciencia' then
    if not v_exige then
      raise exception 'Este recado não pede ciência.';
    end if;
    update public.mural_leituras
       set ciencia_em = now(), ciencia_versao = v_versao, visualizado_em = coalesce(visualizado_em, now()), versao = v_versao
     where recado_id = p_recado and user_id = auth.uid();
  else
    raise exception 'Ação inválida.';
  end if;
end;
$$;

-- Gestão: acompanhamento de visualizações e ciências
create or replace function public.mural_acompanhamento(p_recado uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r public.mural_recados;
  v jsonb;
begin
  select * into r from public.mural_recados where id = p_recado;
  if not found or not public.ee_e_gestor(r.organization_id) then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;

  with dest as (
    select d.tipo, d.guardian_id, d.user_id,
           coalesce(g.full_name, g.name, doc.nome, 'Destinatário')::text as nome,
           coalesce(d.user_id,
                    public.ee_uuid(to_jsonb(g) ->> 'profile_id'),
                    (select u.id from auth.users u where lower(u.email) = lower(g.email) limit 1)) as leitor
      from public.mural_destinatarios d
      left join public.guardians g on g.id = d.guardian_id
      left join lateral (select x.nome from public.ee_docentes_da_escola(r.organization_id) x where x.user_id = d.user_id limit 1) doc on true
     where d.recado_id = r.id
  ),
  st as (
    select dest.*, l.visualizado_em, l.ciencia_em, l.ciencia_versao
      from dest left join public.mural_leituras l on l.recado_id = r.id and l.user_id = dest.leitor
  )
  select jsonb_build_object(
           'total',        count(*),
           'sem_acesso',   count(*) filter (where leitor is null),
           'visualizaram', count(*) filter (where visualizado_em is not null),
           'ciencias',     count(*) filter (where ciencia_em is not null),
           'versao_atual', r.versao,
           'lista', coalesce(jsonb_agg(jsonb_build_object(
                      'nome', nome, 'tipo', tipo, 'sem_acesso', leitor is null,
                      'visualizado_em', visualizado_em, 'ciencia_em', ciencia_em, 'ciencia_versao', ciencia_versao)
                      order by nome), '[]'::jsonb)
         )
    into v
    from st;
  return v;
end;
$$;

-- Programados viram publicados no horário (o leitor já enxerga pelo inicio_em;
-- isto só acerta o status para a gestão)
create or replace function public.mural_rotina()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('ee.mural_publicando', '1', true);
  update public.mural_recados set status = 'publicado' where status = 'programado' and inicio_em <= now();
  update public.mural_recados set status = 'encerrado' where status = 'publicado' and fim_em is not null and fim_em <= now();
end;
$$;

select cron.unschedule(jobid) from cron.job where jobname = 'ee-mural-rotina';
select cron.schedule('ee-mural-rotina', '*/5 * * * *', $c$ select public.mural_rotina(); $c$);

select public.ee_realtime('mural_recados');
select public.ee_realtime('mural_leituras');

revoke execute on function public.mural_rotina() from public, anon, authenticated;
notify pgrst, 'reload schema';

-- #####################################################################
-- PARTE 4
-- #####################################################################
-- =====================================================================
-- ESCOLA ESCUTA — 03 · AGENDA FAMÍLIA (atendimento às famílias)
-- Escola disponibiliza horários → família solicita → escola confirma
-- (quando exige aprovação) → atendimento → encaminhamentos registrados.
-- Duas reservas na mesma vaga são impossíveis também no banco
-- (exclusion constraint), mesmo com cliques simultâneos.
-- =====================================================================

create table if not exists public.agenda_setores (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  nome            text not null,
  descricao       text,
  assuntos        text[] not null default '{}',
  ordem           int not null default 0,
  ativo           boolean not null default true,
  created_at      timestamptz not null default now()
);

create table if not exists public.agenda_config (
  organization_id     uuid primary key,
  contatos_urgencia   text default 'Em caso de urgência, ligue para a secretaria da escola.',
  aviso_emergencia    text default 'Este agendamento não é um canal de emergência.',
  updated_at          timestamptz not null default now()
);

create table if not exists public.agenda_disponibilidades (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null,
  setor_id                 uuid not null references public.agenda_setores (id) on delete cascade,
  responsavel_user_id      uuid,
  responsavel_nome         text not null,
  dias_semana              int[] not null default '{1,2,3,4,5}',   -- 0 = domingo
  hora_inicio              time not null default '08:00',
  hora_fim                 time not null default '12:00',
  duracao_min              int not null default 30 check (duracao_min between 5 and 240),
  intervalo_min            int not null default 0 check (intervalo_min between 0 and 120),
  modalidade               text not null default 'presencial' check (modalidade in ('presencial', 'online', 'telefone')),
  local                    text,
  orientacoes              text,
  antecedencia_min_horas   int not null default 24 check (antecedencia_min_horas >= 0),
  prazo_cancelamento_horas int not null default 12 check (prazo_cancelamento_horas >= 0),
  modo_confirmacao         text not null default 'aprovacao' check (modo_confirmacao in ('automatico', 'aprovacao')),
  prazo_analise_horas      int not null default 24 check (prazo_analise_horas between 1 and 168),
  vigencia_inicio          date,
  vigencia_fim             date,
  ativo                    boolean not null default true,
  created_at               timestamptz not null default now(),
  constraint agenda_disp_horario_ok check (hora_fim > hora_inicio)
);

create table if not exists public.agenda_indisponibilidades (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null,
  setor_id            uuid references public.agenda_setores (id) on delete cascade,   -- null = escola toda
  responsavel_user_id uuid,                                                          -- null = todos do setor
  inicio              timestamptz not null,
  fim                 timestamptz not null,
  motivo              text not null,
  created_by          uuid default auth.uid(),
  created_at          timestamptz not null default now(),
  constraint agenda_indisp_ok check (fim > inicio)
);

create table if not exists public.agenda_agendamentos (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null,
  disponibilidade_id   uuid not null references public.agenda_disponibilidades (id),
  setor_id             uuid not null references public.agenda_setores (id),
  responsavel_user_id  uuid,
  responsavel_nome     text,
  student_id           uuid not null,
  student_nome         text,
  guardian_id          uuid,
  solicitante_user_id  uuid default auth.uid(),
  solicitante_nome     text,
  solicitante_telefone text,
  assunto              text not null,
  motivo               text,
  inicio               timestamptz not null,
  fim                  timestamptz not null,
  periodo              tstzrange generated always as (tstzrange(inicio, fim, '[)')) stored,
  status               text not null default 'aguardando'
                       check (status in ('aguardando', 'confirmado', 'proposta', 'recusado', 'cancelado',
                                         'realizado', 'nao_compareceu', 'remarcado', 'expirado')),
  expira_em            timestamptz,
  orientacao           text,             -- orientação ao recusar / observação da escola
  remarcado_de         uuid references public.agenda_agendamentos (id),
  remarcado_para       uuid references public.agenda_agendamentos (id),
  pendente_tratamento  boolean not null default false,  -- caiu numa indisponibilidade nova
  lembrete_em          timestamptz,
  cancelado_por        uuid,
  cancelado_em         timestamptz,
  motivo_cancelamento  text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  -- a mesma vaga não pode ter duas reservas ativas
  constraint agenda_vaga_unica exclude using gist (
    disponibilidade_id with =, periodo with &&
  ) where (status in ('aguardando', 'confirmado', 'proposta')),
  -- o mesmo profissional não atende duas famílias ao mesmo tempo
  constraint agenda_responsavel_livre exclude using gist (
    responsavel_user_id with =, periodo with &&
  ) where (status in ('aguardando', 'confirmado', 'proposta') and responsavel_user_id is not null)
);
create index if not exists agenda_ag_org_idx on public.agenda_agendamentos (organization_id, inicio);
create index if not exists agenda_ag_guardian_idx on public.agenda_agendamentos (guardian_id);
create index if not exists agenda_ag_student_idx on public.agenda_agendamentos (student_id);

create table if not exists public.agenda_registros (
  agendamento_id   uuid primary key references public.agenda_agendamentos (id) on delete cascade,
  compareceu       boolean not null,
  resumo           text,
  encaminhamentos  text,
  proximos_passos  text,
  visivel_familia  boolean not null default false,
  registrado_por   uuid default auth.uid(),
  registrado_nome  text,
  registrado_em    timestamptz not null default now()
);

create table if not exists public.agenda_eventos (
  id             bigserial primary key,
  agendamento_id uuid not null references public.agenda_agendamentos (id) on delete cascade,
  de_status      text,
  para_status    text,
  autor_id       uuid default auth.uid(),
  autor_nome     text,
  observacao     text,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.agenda_setores            enable row level security;
alter table public.agenda_config             enable row level security;
alter table public.agenda_disponibilidades   enable row level security;
alter table public.agenda_indisponibilidades enable row level security;
alter table public.agenda_agendamentos       enable row level security;
alter table public.agenda_registros          enable row level security;
alter table public.agenda_eventos            enable row level security;

drop policy if exists agenda_setores_select on public.agenda_setores;
create policy agenda_setores_select on public.agenda_setores for select to authenticated using (public.ee_membro_da_escola(organization_id));
drop policy if exists agenda_setores_write on public.agenda_setores;
create policy agenda_setores_write on public.agenda_setores for all to authenticated using (public.ee_e_gestor(organization_id)) with check (public.ee_e_gestor(organization_id));

drop policy if exists agenda_config_select on public.agenda_config;
create policy agenda_config_select on public.agenda_config for select to authenticated using (public.ee_membro_da_escola(organization_id));
drop policy if exists agenda_config_write on public.agenda_config;
create policy agenda_config_write on public.agenda_config for all to authenticated using (public.ee_e_gestor(organization_id)) with check (public.ee_e_gestor(organization_id));

drop policy if exists agenda_disp_select on public.agenda_disponibilidades;
create policy agenda_disp_select on public.agenda_disponibilidades for select to authenticated using (public.ee_membro_da_escola(organization_id));
drop policy if exists agenda_disp_write on public.agenda_disponibilidades;
create policy agenda_disp_write on public.agenda_disponibilidades for all to authenticated using (public.ee_e_gestor(organization_id)) with check (public.ee_e_gestor(organization_id));

drop policy if exists agenda_indisp_select on public.agenda_indisponibilidades;
create policy agenda_indisp_select on public.agenda_indisponibilidades for select to authenticated using (public.ee_e_gestor(organization_id));
drop policy if exists agenda_indisp_delete on public.agenda_indisponibilidades;
create policy agenda_indisp_delete on public.agenda_indisponibilidades for delete to authenticated using (public.ee_e_gestor(organization_id));

-- família vê só os próprios agendamentos; equipe vê os da escola / os seus
drop policy if exists agenda_ag_select on public.agenda_agendamentos;
create policy agenda_ag_select on public.agenda_agendamentos for select to authenticated using (
  public.ee_e_gestor(organization_id)
  or responsavel_user_id = auth.uid()
  or solicitante_user_id = auth.uid()
  or guardian_id in (select public.ee_meus_guardian_ids())
);

drop policy if exists agenda_reg_select on public.agenda_registros;
create policy agenda_reg_select on public.agenda_registros for select to authenticated using (
  exists (
    select 1 from public.agenda_agendamentos a
     where a.id = agendamento_id
       and (public.ee_e_gestor(a.organization_id)
         or a.responsavel_user_id = auth.uid()
         or (visivel_familia and (a.solicitante_user_id = auth.uid() or a.guardian_id in (select public.ee_meus_guardian_ids()))))
  )
);

drop policy if exists agenda_eventos_select on public.agenda_eventos;
create policy agenda_eventos_select on public.agenda_eventos for select to authenticated using (
  exists (
    select 1 from public.agenda_agendamentos a
     where a.id = agendamento_id
       and (public.ee_e_gestor(a.organization_id) or a.responsavel_user_id = auth.uid()
         or a.solicitante_user_id = auth.uid() or a.guardian_id in (select public.ee_meus_guardian_ids()))
  )
);

-- ---------------------------------------------------------------------
-- Histórico automático de cada mudança de situação
-- ---------------------------------------------------------------------
create or replace function public.agenda_log_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.agenda_eventos (agendamento_id, de_status, para_status, autor_id, autor_nome, observacao)
    values (new.id, case when tg_op = 'UPDATE' then old.status end, new.status, auth.uid(),
            case when auth.uid() is null then 'Sistema' else public.ee_meu_nome() end,
            coalesce(current_setting('ee.agenda_obs', true), ''));
  end if;
  return new;
end;
$$;

drop trigger if exists agenda_log_ins on public.agenda_agendamentos;
create trigger agenda_log_ins after insert on public.agenda_agendamentos
for each row execute function public.agenda_log_status();
drop trigger if exists agenda_log_upd on public.agenda_agendamentos;
create trigger agenda_log_upd before update on public.agenda_agendamentos
for each row execute function public.agenda_log_status();

-- ---------------------------------------------------------------------
-- Setores padrão (a gestão pode renomear, desativar e mudar assuntos)
-- ---------------------------------------------------------------------
create or replace function public.agenda_setores_padrao(p_org uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.ee_e_gestor(p_org) then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  if exists (select 1 from public.agenda_setores where organization_id = p_org) then
    return;
  end if;
  insert into public.agenda_setores (organization_id, nome, descricao, assuntos, ordem) values
    (p_org, 'Secretaria', 'Cadastro, matrícula e documentos',
      array['Cadastro', 'Matrícula', 'Atualização de dados', 'Solicitação de documentos'], 1),
    (p_org, 'Equipe Pedagógica', 'Aprendizagem e acompanhamento',
      array['Aprendizagem', 'Adaptação', 'Acompanhamento pedagógico', 'Orientação à família', 'Disciplinas'], 2),
    (p_org, 'Disciplina / Convivência', 'Rotina e convivência escolar',
      array['Rotina escolar', 'Convivência', 'Esclarecimento de situação'], 3),
    (p_org, 'Gestão / Direção', 'Atendimento com a direção',
      array['Administração escolar', 'Solicitação institucional', 'Atendimento com a direção'], 4);
  insert into public.agenda_config (organization_id) values (p_org) on conflict do nothing;
end;
$$;

-- ---------------------------------------------------------------------
-- Geração de horários
-- ---------------------------------------------------------------------
create or replace function public.agenda_slots(p_disp uuid, p_de date, p_ate date)
returns table (disponibilidade_id uuid, inicio timestamptz, fim timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  d       public.agenda_disponibilidades;
  v_dia   date;
  v_t     timestamptz;
  v_limite timestamptz;
  v_tz    text := 'America/Sao_Paulo';
begin
  select * into d from public.agenda_disponibilidades x where x.id = p_disp and x.ativo;
  if not found then
    return;
  end if;
  for v_dia in
    select g::date from generate_series(
      greatest(p_de, coalesce(d.vigencia_inicio, p_de)),
      least(p_ate, coalesce(d.vigencia_fim, p_ate), p_de + 62),
      interval '1 day') g
  loop
    continue when not (extract(dow from v_dia)::int = any (d.dias_semana));
    v_t      := (v_dia + d.hora_inicio) at time zone v_tz;
    v_limite := (v_dia + d.hora_fim) at time zone v_tz;
    while v_t + make_interval(mins => d.duracao_min) <= v_limite loop
      disponibilidade_id := d.id;
      inicio := v_t;
      fim    := v_t + make_interval(mins => d.duracao_min);
      return next;
      v_t := v_t + make_interval(mins => d.duracao_min + d.intervalo_min);
    end loop;
  end loop;
end;
$$;

-- Horários livres de um setor (a família NÃO vê reservas de outras famílias)
create or replace function public.agenda_horarios_livres(p_setor uuid, p_de date, p_ate date)
returns table (
  disponibilidade_id uuid, inicio timestamptz, fim timestamptz, responsavel_nome text,
  modalidade text, local text, orientacoes text, modo_confirmacao text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  select organization_id into v_org from public.agenda_setores where id = p_setor and ativo;
  if v_org is null or not public.ee_membro_da_escola(v_org) then
    return;
  end if;

  return query
    select s.disponibilidade_id, s.inicio, s.fim, d.responsavel_nome, d.modalidade, d.local, d.orientacoes, d.modo_confirmacao
      from public.agenda_disponibilidades d
      cross join lateral public.agenda_slots(d.id, p_de, p_ate) s
     where d.setor_id = p_setor
       and d.ativo
       and s.inicio >= now() + make_interval(hours => d.antecedencia_min_horas)
       and not exists (
         select 1 from public.agenda_indisponibilidades i
          where i.organization_id = d.organization_id
            and (i.setor_id is null or i.setor_id = d.setor_id)
            and (i.responsavel_user_id is null or i.responsavel_user_id = d.responsavel_user_id)
            and tstzrange(i.inicio, i.fim, '[)') && tstzrange(s.inicio, s.fim, '[)'))
       and not exists (
         select 1 from public.agenda_agendamentos a
          where a.status in ('aguardando', 'confirmado', 'proposta')
            and (a.status <> 'aguardando' or a.expira_em is null or a.expira_em > now())
            and (a.disponibilidade_id = d.id
              or (d.responsavel_user_id is not null and a.responsavel_user_id = d.responsavel_user_id))
            and a.periodo && tstzrange(s.inicio, s.fim, '[)'))
     order by s.inicio, d.responsavel_nome;
end;
$$;

-- Libera vagas de solicitações que passaram do prazo de análise
create or replace function public.agenda_expirar()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n int := 0;
  x record;
begin
  perform set_config('ee.agenda_obs', 'Prazo de análise encerrado sem resposta', true);
  for x in
    update public.agenda_agendamentos
       set status = 'expirado'
     where status = 'aguardando' and expira_em is not null and expira_em <= now()
    returning id, organization_id, guardian_id, solicitante_user_id, assunto
  loop
    perform public.ee_avisar(x.organization_id, 'agenda', 'Solicitação de atendimento não confirmada',
      'A escola não confirmou a tempo. Escolha outro horário, se ainda precisar.', x.id, x.solicitante_user_id, x.guardian_id);
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- ---------------------------------------------------------------------
-- Família: solicitar
-- ---------------------------------------------------------------------
create or replace function public.agenda_solicitar(
  p_disponibilidade uuid, p_inicio timestamptz, p_student uuid,
  p_assunto text, p_motivo text, p_telefone text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  d        public.agenda_disponibilidades;
  v_aluno  record;
  v_g      record;
  v_fim    timestamptz;
  v_status text;
  v_id     uuid;
  v_dia    date;
begin
  select * into d from public.agenda_disponibilidades where id = p_disponibilidade and ativo;
  if not found then
    raise exception 'Este horário não está mais disponível.';
  end if;

  select * into v_aluno from public.ee_meus_estudantes() e
   where e.student_id = p_student and e.organization_id = d.organization_id limit 1;
  if not found then
    raise exception 'Estudante sem vínculo autorizado com esta escola.' using errcode = '42501';
  end if;

  if coalesce(trim(p_assunto), '') = '' then
    raise exception 'Escolha o assunto.';
  end if;
  if length(coalesce(p_motivo, '')) > 600 then
    raise exception 'O motivo deve ser breve (até 600 caracteres).';
  end if;

  perform public.agenda_expirar();

  v_dia := (p_inicio at time zone 'America/Sao_Paulo')::date;
  if not exists (
    select 1 from public.agenda_horarios_livres(d.setor_id, v_dia, v_dia) h
     where h.disponibilidade_id = d.id and h.inicio = p_inicio
  ) then
    raise exception 'Este horário acabou de ficar indisponível. Escolha outro.';
  end if;

  -- no máximo 2 solicitações abertas por estudante no mesmo setor
  if (select count(*) from public.agenda_agendamentos a
       where a.student_id = p_student and a.setor_id = d.setor_id
         and a.status in ('aguardando', 'confirmado', 'proposta') and a.inicio > now()) >= 2 then
    raise exception 'Já existem 2 atendimentos abertos com este setor para este estudante.';
  end if;

  select g.id, coalesce(g.full_name, g.name) as nome, g.phone into v_g from public.guardians g where g.id = v_aluno.guardian_id;

  v_fim    := p_inicio + make_interval(mins => d.duracao_min);
  v_status := case when d.modo_confirmacao = 'automatico' then 'confirmado' else 'aguardando' end;

  begin
    insert into public.agenda_agendamentos (
      organization_id, disponibilidade_id, setor_id, responsavel_user_id, responsavel_nome,
      student_id, student_nome, guardian_id, solicitante_user_id, solicitante_nome, solicitante_telefone,
      assunto, motivo, inicio, fim, status, expira_em
    ) values (
      d.organization_id, d.id, d.setor_id, d.responsavel_user_id, d.responsavel_nome,
      p_student, v_aluno.student_nome, v_g.id, auth.uid(), coalesce(v_g.nome, public.ee_meu_nome()), coalesce(nullif(trim(p_telefone), ''), v_g.phone),
      trim(p_assunto), nullif(trim(p_motivo), ''), p_inicio, v_fim, v_status,
      case when v_status = 'aguardando' then least(now() + make_interval(hours => d.prazo_analise_horas), p_inicio) end
    ) returning id into v_id;
  exception when exclusion_violation then
    raise exception 'Este horário acabou de ser reservado por outra família. Escolha outro.';
  end;

  perform public.ee_avisar(d.organization_id, 'agenda',
    case when v_status = 'confirmado' then 'Novo atendimento confirmado' else 'Nova solicitação de atendimento' end,
    format('%s · %s · %s', coalesce(v_aluno.student_nome, 'Estudante'), trim(p_assunto),
           to_char(p_inicio at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI')),
    v_id, d.responsavel_user_id, null, d.responsavel_user_id is null);

  return jsonb_build_object('id', v_id, 'status', v_status,
    'expira_em', case when v_status = 'aguardando' then least(now() + make_interval(hours => d.prazo_analise_horas), p_inicio) end);
end;
$$;

-- ---------------------------------------------------------------------
-- Equipe: confirmar / recusar / realizado / não compareceu
-- ---------------------------------------------------------------------
create or replace function public.agenda_pode_gerir(p_org uuid, p_resp uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.ee_e_gestor(p_org) or (p_resp is not null and p_resp = auth.uid());
$$;

create or replace function public.agenda_responder(p_id uuid, p_acao text, p_obs text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  a        public.agenda_agendamentos;
  v_novo   text;
  v_titulo text;
begin
  select * into a from public.agenda_agendamentos where id = p_id for update;
  if not found or not public.agenda_pode_gerir(a.organization_id, a.responsavel_user_id) then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;

  v_novo := case p_acao
    when 'confirmar'      then case when a.status = 'aguardando' then 'confirmado' end
    when 'recusar'        then case when a.status in ('aguardando', 'confirmado') then 'recusado' end
    when 'realizado'      then case when a.status = 'confirmado' then 'realizado' end
    when 'nao_compareceu' then case when a.status = 'confirmado' then 'nao_compareceu' end
  end;
  if v_novo is null then
    raise exception 'Não é possível "%" um atendimento com situação "%".', p_acao, a.status;
  end if;
  if v_novo = 'recusado' and coalesce(trim(p_obs), '') = '' then
    raise exception 'Ao recusar, escreva uma orientação para a família.';
  end if;

  perform set_config('ee.agenda_obs', coalesce(p_obs, ''), true);
  update public.agenda_agendamentos
     set status = v_novo,
         orientacao = coalesce(nullif(trim(p_obs), ''), orientacao),
         expira_em = null,
         pendente_tratamento = false
   where id = a.id;

  v_titulo := case v_novo
    when 'confirmado'     then 'Atendimento confirmado'
    when 'recusado'       then 'Solicitação de atendimento recusada'
    when 'realizado'      then 'Atendimento realizado'
    when 'nao_compareceu' then 'Ausência registrada no atendimento'
  end;
  perform public.ee_avisar(a.organization_id, 'agenda', v_titulo,
    format('%s · %s', a.assunto, to_char(a.inicio at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI')),
    a.id, a.solicitante_user_id, a.guardian_id);

  if v_novo = 'confirmado' then
    perform public.ee_whatsapp(a.organization_id, a.solicitante_telefone, a.solicitante_nome,
      format('Atendimento confirmado: %s, %s com %s (%s).', a.assunto,
             to_char(a.inicio at time zone 'America/Sao_Paulo', 'DD/MM "às" HH24:MI'), coalesce(a.responsavel_nome, 'a escola'),
             coalesce(a.student_nome, 'estudante')),
      'agenda-conf-' || a.id);
  end if;
end;
$$;

-- Cancelar: família (dentro do prazo) ou equipe
create or replace function public.agenda_cancelar(p_id uuid, p_motivo text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  a        public.agenda_agendamentos;
  v_prazo  int;
  v_equipe boolean;
  v_fam    boolean;
begin
  select * into a from public.agenda_agendamentos where id = p_id for update;
  if not found then
    raise exception 'Atendimento não encontrado.';
  end if;
  v_equipe := public.agenda_pode_gerir(a.organization_id, a.responsavel_user_id);
  v_fam    := a.solicitante_user_id = auth.uid() or a.guardian_id in (select public.ee_meus_guardian_ids());
  if not (v_equipe or v_fam) then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  if a.status not in ('aguardando', 'confirmado', 'proposta') then
    raise exception 'Este atendimento não pode mais ser cancelado.';
  end if;
  if not v_equipe then
    select prazo_cancelamento_horas into v_prazo from public.agenda_disponibilidades where id = a.disponibilidade_id;
    if a.status = 'confirmado' and now() > a.inicio - make_interval(hours => coalesce(v_prazo, 0)) then
      raise exception 'O prazo para cancelar pelo portal terminou. Entre em contato com a escola.';
    end if;
  end if;

  perform set_config('ee.agenda_obs', coalesce(p_motivo, ''), true);
  update public.agenda_agendamentos
     set status = 'cancelado', cancelado_por = auth.uid(), cancelado_em = now(),
         motivo_cancelamento = nullif(trim(p_motivo), ''), pendente_tratamento = false
   where id = a.id;

  if v_equipe and not v_fam then
    perform public.ee_avisar(a.organization_id, 'agenda', 'Atendimento cancelado pela escola',
      coalesce(nullif(trim(p_motivo), ''), a.assunto), a.id, a.solicitante_user_id, a.guardian_id);
  else
    perform public.ee_avisar(a.organization_id, 'agenda', 'Família cancelou um atendimento',
      format('%s · %s', coalesce(a.student_nome, ''), to_char(a.inicio at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI')),
      a.id, a.responsavel_user_id, null, a.responsavel_user_id is null);
  end if;
end;
$$;

-- Remarcar (equipe): o horário antigo fica no histórico, ligado ao novo
create or replace function public.agenda_remarcar(p_id uuid, p_disponibilidade uuid, p_inicio timestamptz, p_obs text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  a      public.agenda_agendamentos;
  d      public.agenda_disponibilidades;
  v_novo uuid;
begin
  select * into a from public.agenda_agendamentos where id = p_id for update;
  if not found or not public.agenda_pode_gerir(a.organization_id, a.responsavel_user_id) then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  if a.status not in ('aguardando', 'confirmado', 'proposta') then
    raise exception 'Só é possível remarcar atendimentos em aberto.';
  end if;
  select * into d from public.agenda_disponibilidades where id = p_disponibilidade and organization_id = a.organization_id and ativo;
  if not found then
    raise exception 'Disponibilidade inválida.';
  end if;
  if not exists (select 1 from public.agenda_slots(d.id, (p_inicio at time zone 'America/Sao_Paulo')::date,
                                                   (p_inicio at time zone 'America/Sao_Paulo')::date) s where s.inicio = p_inicio) then
    raise exception 'O novo horário não faz parte da disponibilidade escolhida.';
  end if;

  perform set_config('ee.agenda_obs', coalesce(p_obs, 'Remarcado pela escola'), true);
  update public.agenda_agendamentos set status = 'remarcado', pendente_tratamento = false where id = a.id;

  begin
    insert into public.agenda_agendamentos (
      organization_id, disponibilidade_id, setor_id, responsavel_user_id, responsavel_nome,
      student_id, student_nome, guardian_id, solicitante_user_id, solicitante_nome, solicitante_telefone,
      assunto, motivo, inicio, fim, status, orientacao, remarcado_de
    ) values (
      a.organization_id, d.id, d.setor_id, d.responsavel_user_id, d.responsavel_nome,
      a.student_id, a.student_nome, a.guardian_id, a.solicitante_user_id, a.solicitante_nome, a.solicitante_telefone,
      a.assunto, a.motivo, p_inicio, p_inicio + make_interval(mins => d.duracao_min), 'proposta', nullif(trim(p_obs), ''), a.id
    ) returning id into v_novo;
  exception when exclusion_violation then
    raise exception 'O novo horário já está ocupado.';
  end;

  update public.agenda_agendamentos set remarcado_para = v_novo where id = a.id;

  perform public.ee_avisar(a.organization_id, 'agenda', 'A escola propôs um novo horário',
    format('%s · %s. Confirme ou recuse no portal.', a.assunto, to_char(p_inicio at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI')),
    v_novo, a.solicitante_user_id, a.guardian_id);
  return v_novo;
end;
$$;

-- Família responde à proposta de remarcação
create or replace function public.agenda_responder_proposta(p_id uuid, p_aceitar boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.agenda_agendamentos;
begin
  select * into a from public.agenda_agendamentos where id = p_id for update;
  if not found or not (a.solicitante_user_id = auth.uid() or a.guardian_id in (select public.ee_meus_guardian_ids())) then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  if a.status <> 'proposta' then
    raise exception 'Esta proposta já foi respondida.';
  end if;
  perform set_config('ee.agenda_obs', case when p_aceitar then 'Família aceitou o novo horário' else 'Família recusou o novo horário' end, true);
  update public.agenda_agendamentos
     set status = case when p_aceitar then 'confirmado' else 'cancelado' end,
         cancelado_por = case when p_aceitar then null else auth.uid() end,
         cancelado_em = case when p_aceitar then null else now() end
   where id = a.id;
  perform public.ee_avisar(a.organization_id, 'agenda',
    case when p_aceitar then 'Família aceitou o novo horário' else 'Família recusou o novo horário' end,
    format('%s · %s', coalesce(a.student_nome, ''), to_char(a.inicio at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI')),
    a.id, a.responsavel_user_id, null, a.responsavel_user_id is null);
end;
$$;

-- Registro do atendimento (comparecimento, encaminhamentos, próximos passos)
create or replace function public.agenda_registrar_atendimento(
  p_id uuid, p_compareceu boolean, p_resumo text, p_encaminhamentos text, p_proximos text, p_visivel_familia boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.agenda_agendamentos;
begin
  select * into a from public.agenda_agendamentos where id = p_id for update;
  if not found or not public.agenda_pode_gerir(a.organization_id, a.responsavel_user_id) then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  if a.status not in ('confirmado', 'realizado', 'nao_compareceu') then
    raise exception 'Só atendimentos confirmados podem ser registrados.';
  end if;

  insert into public.agenda_registros (agendamento_id, compareceu, resumo, encaminhamentos, proximos_passos, visivel_familia, registrado_nome)
  values (a.id, p_compareceu, p_resumo, p_encaminhamentos, p_proximos, coalesce(p_visivel_familia, false), public.ee_meu_nome())
  on conflict (agendamento_id) do update
     set compareceu = excluded.compareceu, resumo = excluded.resumo, encaminhamentos = excluded.encaminhamentos,
         proximos_passos = excluded.proximos_passos, visivel_familia = excluded.visivel_familia,
         registrado_por = auth.uid(), registrado_nome = excluded.registrado_nome, registrado_em = now();

  update public.agenda_agendamentos
     set status = case when p_compareceu then 'realizado' else 'nao_compareceu' end
   where id = a.id and status <> case when p_compareceu then 'realizado' else 'nao_compareceu' end;
end;
$$;

-- ---------------------------------------------------------------------
-- Indisponibilidades: alerta e exige tratamento dos atendimentos afetados
-- ---------------------------------------------------------------------
create or replace function public.agenda_bloquear(
  p_org uuid, p_setor uuid, p_responsavel uuid, p_inicio timestamptz, p_fim timestamptz, p_motivo text, p_forcar boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conf jsonb;
  v_id   uuid;
begin
  if not public.ee_e_gestor(p_org) then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  if p_fim <= p_inicio then
    raise exception 'O fim precisa ser depois do início.';
  end if;
  if coalesce(trim(p_motivo), '') = '' then
    raise exception 'Informe o motivo (férias, reunião, feriado…).';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', a.id, 'inicio', a.inicio, 'status', a.status, 'assunto', a.assunto,
           'student_nome', a.student_nome, 'solicitante_nome', a.solicitante_nome, 'responsavel_nome', a.responsavel_nome)
           order by a.inicio), '[]'::jsonb)
    into v_conf
    from public.agenda_agendamentos a
   where a.organization_id = p_org
     and a.status in ('aguardando', 'confirmado', 'proposta')
     and (p_setor is null or a.setor_id = p_setor)
     and (p_responsavel is null or a.responsavel_user_id = p_responsavel)
     and a.periodo && tstzrange(p_inicio, p_fim, '[)');

  if jsonb_array_length(v_conf) > 0 and not coalesce(p_forcar, false) then
    return jsonb_build_object('criado', false, 'conflitos', v_conf);
  end if;

  insert into public.agenda_indisponibilidades (organization_id, setor_id, responsavel_user_id, inicio, fim, motivo)
  values (p_org, p_setor, p_responsavel, p_inicio, p_fim, trim(p_motivo))
  returning id into v_id;

  -- nada é apagado: os afetados ficam marcados para a equipe remarcar ou cancelar
  update public.agenda_agendamentos
     set pendente_tratamento = true
   where id in (select (x ->> 'id')::uuid from jsonb_array_elements(v_conf) x);

  perform public.ee_registrar(p_org, 'agenda_indisponibilidade', v_id, 'criada',
    jsonb_build_object('inicio', p_inicio, 'fim', p_fim, 'afetados', jsonb_array_length(v_conf)));

  return jsonb_build_object('criado', true, 'id', v_id, 'conflitos', v_conf);
end;
$$;

-- Lembretes 1 dia antes (portal + WhatsApp, se configurado)
create or replace function public.agenda_lembretes()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  x       record;
  n       int := 0;
  v_whats boolean := coalesce((select valor from public.ee_config where chave = 'agenda_whatsapp_lembrete'), 'false') = 'true';
begin
  for x in
    select a.* from public.agenda_agendamentos a
     where a.status = 'confirmado' and a.lembrete_em is null
       and a.inicio between now() + interval '2 hours' and now() + interval '26 hours'
     for update skip locked
  loop
    perform public.ee_avisar(x.organization_id, 'agenda', 'Lembrete de atendimento',
      format('%s · %s com %s', x.assunto, to_char(x.inicio at time zone 'America/Sao_Paulo', 'DD/MM "às" HH24:MI'), coalesce(x.responsavel_nome, 'a escola')),
      x.id, x.solicitante_user_id, x.guardian_id);
    if v_whats then
      perform public.ee_whatsapp(x.organization_id, x.solicitante_telefone, x.solicitante_nome,
        format('Lembrete: atendimento na escola %s com %s. Assunto: %s.',
               to_char(x.inicio at time zone 'America/Sao_Paulo', 'DD/MM "às" HH24:MI'), coalesce(x.responsavel_nome, 'a equipe'), x.assunto),
        'agenda-lembrete-' || x.id);
    end if;
    update public.agenda_agendamentos set lembrete_em = now() where id = x.id;
    n := n + 1;
  end loop;
  return n;
end;
$$;

select cron.unschedule(jobid) from cron.job where jobname in ('ee-agenda-expirar', 'ee-agenda-lembretes');
select cron.schedule('ee-agenda-expirar',   '*/5 * * * *', $c$ select public.agenda_expirar(); $c$);
select cron.schedule('ee-agenda-lembretes', '*/30 * * * *', $c$ select public.agenda_lembretes(); $c$);

select public.ee_realtime('agenda_agendamentos');

revoke execute on function public.agenda_expirar() from public, anon;
revoke execute on function public.agenda_lembretes() from public, anon, authenticated;
revoke execute on function public.agenda_slots(uuid, date, date) from public, anon, authenticated;
notify pgrst, 'reload schema';

-- #####################################################################
-- PARTE 5
-- #####################################################################
-- =====================================================================
-- ESCOLA ESCUTA — 04 · AGENDA DIÁRIA (docente ↔ família)
-- Docente registra → publica ou envia para aprovação → família recebe
-- → registra ciência ou resposta → docente acompanha.
-- Um único registro (com versões) serve à agenda do docente, à
-- comunicação da família e ao painel da família.
-- =====================================================================

create table if not exists public.diario_categorias (
  organization_id   uuid not null,
  categoria         text not null,
  publicacao_direta boolean not null,
  primary key (organization_id, categoria)
);

create table if not exists public.diario_registros (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null,
  ano_letivo           text,
  class_id             uuid,
  class_nome           text,
  student_id           uuid,              -- null = turma inteira
  student_nome         text,
  categoria            text not null check (categoria in
                        ('atividades', 'materiais', 'projetos', 'rotina', 'devolutivas', 'cuidados', 'avaliacoes')),
  titulo               text not null,
  texto                text not null,
  data_atividade       date,
  prazo                date,
  tipo_resposta        text not null default 'nenhuma' check (tipo_resposta in ('nenhuma', 'ciencia', 'material', 'livre')),
  prioridade           text not null default 'normal' check (prioridade in ('normal', 'alta')),
  status               text not null default 'rascunho'
                       check (status in ('rascunho', 'aguardando_aprovacao', 'devolvido', 'publicado', 'cancelado')),
  versao               int not null default 1,
  autor_user_id        uuid not null default auth.uid(),
  autor_nome           text,
  setor_expedidor      text,
  evento_calendario_id text,               -- evento já publicado pela gestão
  solicitar_calendario boolean not null default false,  -- pedir inclusão (a gestão decide)
  motivo_devolucao     text,
  aprovado_por         uuid,
  publicado_em         timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint diario_alvo_ok check (class_id is not null or student_id is not null)
);
create index if not exists diario_reg_org_idx on public.diario_registros (organization_id, status, publicado_em desc);
create index if not exists diario_reg_class_idx on public.diario_registros (class_id);
create index if not exists diario_reg_student_idx on public.diario_registros (student_id);
create index if not exists diario_reg_autor_idx on public.diario_registros (autor_user_id);

create table if not exists public.diario_versoes (
  registro_id uuid not null references public.diario_registros (id) on delete cascade,
  versao      int not null,
  titulo      text,
  texto       text,
  editado_por uuid,
  editado_em  timestamptz not null default now(),
  primary key (registro_id, versao)
);

create table if not exists public.diario_anexos (
  id          uuid primary key default gen_random_uuid(),
  registro_id uuid not null references public.diario_registros (id) on delete cascade,
  path        text not null,
  nome        text not null,
  mime        text,
  tamanho     bigint,
  created_at  timestamptz not null default now()
);

create table if not exists public.diario_respostas (
  registro_id   uuid not null references public.diario_registros (id) on delete cascade,
  student_id    uuid not null,
  guardian_id   uuid,
  user_id       uuid not null default auth.uid(),
  user_nome     text,
  ciencia_em    timestamptz,
  ciencia_versao int,
  resposta_tipo text check (resposta_tipo in ('confirmo', 'nao_possivel', 'esclarecimento', 'texto')),
  resposta_texto text,
  respondido_em timestamptz,
  primary key (registro_id, student_id, user_id)
);

-- ---------------------------------------------------------------------
-- Regras de categoria (a escola pode mudar)
-- ---------------------------------------------------------------------
create or replace function public.diario_publicacao_direta(p_org uuid, p_categoria text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select c.publicacao_direta from public.diario_categorias c where c.organization_id = p_org and c.categoria = p_categoria),
    p_categoria in ('atividades', 'materiais', 'projetos', 'rotina', 'devolutivas')
  );
$$;

-- Estudantes que o registro alcança
create or replace function public.diario_alvo(p_registro uuid)
returns table (student_id uuid, student_nome text)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, coalesce(s.full_name, s.name)::text
    from public.diario_registros r
    join public.students s
      on (r.student_id is not null and s.id = r.student_id)
      or (r.student_id is null and s.class_id = r.class_id and coalesce(s.status, '') !~* '^(transferid|inativ|cancelad|evadid)')
   where r.id = p_registro;
$$;

create or replace function public.diario_familia_ve(p_registro uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.diario_registros r
      join public.ee_meus_estudantes() e
        on e.organization_id = r.organization_id
       and ((r.student_id is not null and e.student_id = r.student_id)
         or (r.student_id is null and e.class_id = r.class_id))
     where r.id = p_registro and r.status = 'publicado'
  );
$$;

create or replace function public.diario_docente_da_turma(p_org uuid, p_class uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tem   boolean;
  v_minha boolean;
begin
  if public.ee_e_gestor(p_org) then
    return true;
  end if;
  if not public.ee_e_docente(p_org) then
    return false;
  end if;
  -- 1º: turmas liberadas à mão (ee_docente_turmas)
  if exists (select 1 from public.ee_docente_turmas t where t.user_id = auth.uid()) then
    return exists (select 1 from public.ee_docente_turmas t where t.user_id = auth.uid() and t.class_id = p_class);
  end if;
  -- 2º: turmas do professor no Classium (teachers + class_teachers)
  if to_regclass('public.teachers') is not null and to_regclass('public.class_teachers') is not null then
    begin
      execute $q$
        select count(*) > 0, coalesce(bool_or(ct.class_id::text = $3::text), false)
          from public.teachers t
          join public.class_teachers ct on ct.teacher_id = t.id
         where to_jsonb(t)->>'profile_id' = $1 or to_jsonb(t)->>'user_id' = $1
            or ($2 <> '' and lower(to_jsonb(t)->>'email') = $2)
      $q$ into v_tem, v_minha using auth.uid()::text, lower(coalesce(auth.jwt() ->> 'email', '')), p_class;
      if v_tem then
        return v_minha;
      end if;
    exception when others then
      null;
    end;
  end if;
  -- sem vínculo cadastrado: todas as turmas da escola
  return true;
end;
$$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.diario_categorias enable row level security;
alter table public.diario_registros  enable row level security;
alter table public.diario_versoes    enable row level security;
alter table public.diario_anexos     enable row level security;
alter table public.diario_respostas  enable row level security;

drop policy if exists diario_cat_select on public.diario_categorias;
create policy diario_cat_select on public.diario_categorias for select to authenticated using (public.ee_membro_da_escola(organization_id));
drop policy if exists diario_cat_write on public.diario_categorias;
create policy diario_cat_write on public.diario_categorias for all to authenticated using (public.ee_e_gestor(organization_id)) with check (public.ee_e_gestor(organization_id));

drop policy if exists diario_reg_select on public.diario_registros;
create policy diario_reg_select on public.diario_registros for select to authenticated using (
  public.ee_e_gestor(organization_id)
  or autor_user_id = auth.uid()
  or public.diario_familia_ve(id)
);
drop policy if exists diario_reg_insert on public.diario_registros;
create policy diario_reg_insert on public.diario_registros for insert to authenticated with check (
  autor_user_id = auth.uid()
  and public.diario_docente_da_turma(organization_id, class_id)
);
drop policy if exists diario_reg_update on public.diario_registros;
create policy diario_reg_update on public.diario_registros for update to authenticated
  using (public.ee_e_gestor(organization_id) or (autor_user_id = auth.uid() and status <> 'cancelado'))
  with check (public.ee_e_gestor(organization_id) or autor_user_id = auth.uid());
drop policy if exists diario_reg_delete on public.diario_registros;
create policy diario_reg_delete on public.diario_registros for delete to authenticated using (autor_user_id = auth.uid() and status = 'rascunho');

drop policy if exists diario_versoes_select on public.diario_versoes;
create policy diario_versoes_select on public.diario_versoes for select to authenticated using (
  exists (select 1 from public.diario_registros r where r.id = registro_id and (public.ee_e_gestor(r.organization_id) or r.autor_user_id = auth.uid()))
);

drop policy if exists diario_anexos_select on public.diario_anexos;
create policy diario_anexos_select on public.diario_anexos for select to authenticated using (
  exists (select 1 from public.diario_registros r where r.id = registro_id
           and (public.ee_e_gestor(r.organization_id) or r.autor_user_id = auth.uid() or public.diario_familia_ve(r.id)))
);
drop policy if exists diario_anexos_write on public.diario_anexos;
create policy diario_anexos_write on public.diario_anexos for all to authenticated
  using (exists (select 1 from public.diario_registros r where r.id = registro_id and (r.autor_user_id = auth.uid() or public.ee_e_gestor(r.organization_id))))
  with check (exists (select 1 from public.diario_registros r where r.id = registro_id and (r.autor_user_id = auth.uid() or public.ee_e_gestor(r.organization_id))));

drop policy if exists diario_resp_select on public.diario_respostas;
create policy diario_resp_select on public.diario_respostas for select to authenticated using (
  user_id = auth.uid()
  or exists (select 1 from public.diario_registros r where r.id = registro_id and (r.autor_user_id = auth.uid() or public.ee_e_gestor(r.organization_id)))
);

-- ---------------------------------------------------------------------
-- Gatilho: regras de publicação, versões e avisos
-- ---------------------------------------------------------------------
create or replace function public.diario_antes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gestor boolean := public.ee_e_gestor(new.organization_id);
begin
  new.updated_at := now();

  if tg_op = 'INSERT' then
    new.autor_user_id := coalesce(new.autor_user_id, auth.uid());
    new.autor_nome    := coalesce(new.autor_nome, public.ee_meu_nome());
    if new.class_nome is null and new.class_id is not null then
      select name into new.class_nome from public.classes where id = new.class_id;
    end if;
    if new.student_id is not null then
      select coalesce(full_name, name), coalesce(new.class_id, class_id)
        into new.student_nome, new.class_id
        from public.students where id = new.student_id and organization_id = new.organization_id;
      if new.student_nome is null then
        raise exception 'Estudante não pertence a esta escola.';
      end if;
    end if;
  end if;

  -- cuidados/ocorrências: sempre individual e prioridade alta
  if new.categoria = 'cuidados' then
    if new.student_id is null then
      raise exception 'Cuidados e ocorrências são registrados por estudante, nunca para a turma toda.';
    end if;
    new.prioridade := 'alta';
    if new.tipo_resposta = 'nenhuma' then
      new.tipo_resposta := 'ciencia';
    end if;
  end if;

  -- docente não publica direto o que exige revisão; não aprova a si mesmo
  if new.status = 'publicado' and (tg_op = 'INSERT' or old.status <> 'publicado') and not v_gestor then
    if not public.diario_publicacao_direta(new.organization_id, new.categoria) then
      new.status := 'aguardando_aprovacao';
    end if;
  end if;
  if tg_op = 'UPDATE' and not v_gestor and old.status = 'aguardando_aprovacao' and new.status = 'publicado' then
    new.status := 'aguardando_aprovacao';
  end if;

  if new.status = 'publicado' and (tg_op = 'INSERT' or old.status <> 'publicado') then
    new.publicado_em := now();
    if v_gestor and new.autor_user_id <> auth.uid() then
      new.aprovado_por := auth.uid();
    end if;
  end if;

  -- editar algo já publicado gera nova versão (o histórico fica)
  if tg_op = 'UPDATE' and old.status = 'publicado' and new.status = 'publicado'
     and (new.titulo is distinct from old.titulo or new.texto is distinct from old.texto) then
    new.versao := old.versao + 1;
  end if;
  return new;
end;
$$;

drop trigger if exists diario_antes on public.diario_registros;
create trigger diario_antes before insert or update on public.diario_registros
for each row execute function public.diario_antes();

create or replace function public.diario_depois()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  x record;
begin
  if tg_op = 'INSERT' or new.versao <> old.versao then
    insert into public.diario_versoes (registro_id, versao, titulo, texto, editado_por)
    values (new.id, new.versao, new.titulo, new.texto, auth.uid())
    on conflict (registro_id, versao) do nothing;
  end if;

  if new.status = 'aguardando_aprovacao' and (tg_op = 'INSERT' or old.status <> 'aguardando_aprovacao') then
    perform public.ee_avisar(new.organization_id, 'diario',
      case when new.categoria = 'cuidados' then 'URGENTE: ocorrência aguardando revisão' else 'Registro da agenda diária para aprovar' end,
      format('%s · %s · %s', coalesce(new.autor_nome, 'Docente'), coalesce(new.student_nome, new.class_nome, ''), new.titulo),
      new.id, null, null, true);
  end if;

  if new.status = 'devolvido' and tg_op = 'UPDATE' and old.status <> 'devolvido' then
    perform public.ee_avisar(new.organization_id, 'diario', 'Registro devolvido para ajuste',
      coalesce(new.motivo_devolucao, new.titulo), new.id, new.autor_user_id);
  end if;

  if new.status = 'publicado' and (tg_op = 'INSERT' or old.status <> 'publicado' or new.versao <> old.versao) then
    for x in
      select distinct on (lk.guardian_id) lk.guardian_id, g.phone, coalesce(g.full_name, g.name) as nome, a.student_nome
        from public.diario_alvo(new.id) a
        join public.ee_vinculos() lk on lk.student_id = a.student_id
        join public.guardians g on g.id = lk.guardian_id
    loop
      perform public.ee_avisar(new.organization_id, 'diario',
        case when tg_op = 'UPDATE' and old.status = 'publicado' then 'Recado atualizado: ' else '' end || new.titulo,
        format('%s · %s', coalesce(new.autor_nome, 'Escola'), coalesce(x.student_nome, '')),
        new.id, null, x.guardian_id);
      if new.prioridade = 'alta' then
        perform public.ee_whatsapp(new.organization_id, x.phone, x.nome,
          format('%s — %s: %s', coalesce(x.student_nome, 'Estudante'), new.titulo, left(new.texto, 600)),
          'diario-' || new.id || '-v' || new.versao || '-' || x.guardian_id, new.categoria = 'cuidados');
      end if;
    end loop;
  end if;

  if new.solicitar_calendario and (tg_op = 'INSERT' or not old.solicitar_calendario) then
    perform public.ee_avisar(new.organization_id, 'diario', 'Pedido de inclusão no Calendário Escolar',
      format('%s pediu incluir: %s (%s)', coalesce(new.autor_nome, 'Docente'), new.titulo, coalesce(to_char(new.data_atividade, 'DD/MM/YYYY'), 'sem data')),
      new.id, null, null, true);
  end if;
  return null;
end;
$$;

drop trigger if exists diario_depois on public.diario_registros;
create trigger diario_depois after insert or update on public.diario_registros
for each row execute function public.diario_depois();

-- ---------------------------------------------------------------------
-- Gestão: aprovar / devolver / cancelar
-- ---------------------------------------------------------------------
create or replace function public.diario_moderar(p_id uuid, p_acao text, p_motivo text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.diario_registros;
begin
  select * into r from public.diario_registros where id = p_id for update;
  if not found or not public.ee_e_gestor(r.organization_id) then
    raise exception 'Somente a gestão aprova registros.' using errcode = '42501';
  end if;
  if p_acao = 'aprovar' then
    if r.status <> 'aguardando_aprovacao' then
      raise exception 'Este registro não está aguardando aprovação.';
    end if;
    update public.diario_registros set status = 'publicado' where id = r.id;
  elsif p_acao = 'devolver' then
    if coalesce(trim(p_motivo), '') = '' then
      raise exception 'Explique ao docente o que ajustar.';
    end if;
    update public.diario_registros set status = 'devolvido', motivo_devolucao = trim(p_motivo) where id = r.id;
  elsif p_acao = 'cancelar' then
    update public.diario_registros set status = 'cancelado', motivo_devolucao = nullif(trim(p_motivo), '') where id = r.id;
  else
    raise exception 'Ação inválida.';
  end if;
  perform public.ee_registrar(r.organization_id, 'diario', r.id, p_acao, jsonb_build_object('motivo', p_motivo));
end;
$$;

-- ---------------------------------------------------------------------
-- Família: ciência e resposta (ações diferentes!)
-- ---------------------------------------------------------------------
create or replace function public.diario_responder(p_registro uuid, p_student uuid, p_tipo text, p_texto text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r     public.diario_registros;
  v_g   uuid;
begin
  select * into r from public.diario_registros where id = p_registro;
  if not found or not public.diario_familia_ve(p_registro) then
    raise exception 'Registro não disponível.' using errcode = '42501';
  end if;
  select e.guardian_id into v_g from public.ee_meus_estudantes() e
   where e.student_id = p_student and e.student_id in (select a.student_id from public.diario_alvo(r.id) a)
   limit 1;
  if v_g is null then
    raise exception 'Este estudante não está vinculado a você neste registro.' using errcode = '42501';
  end if;
  if p_tipo not in ('ciencia', 'confirmo', 'nao_possivel', 'esclarecimento', 'texto') then
    raise exception 'Resposta inválida.';
  end if;
  if p_tipo in ('esclarecimento', 'texto') and coalesce(trim(p_texto), '') = '' then
    raise exception 'Escreva sua mensagem.';
  end if;

  insert into public.diario_respostas (registro_id, student_id, guardian_id, user_id, user_nome)
  values (r.id, p_student, v_g, auth.uid(), public.ee_meu_nome())
  on conflict (registro_id, student_id, user_id) do nothing;

  if p_tipo = 'ciencia' then
    update public.diario_respostas set ciencia_em = now(), ciencia_versao = r.versao
     where registro_id = r.id and student_id = p_student and user_id = auth.uid();
  else
    update public.diario_respostas
       set resposta_tipo = p_tipo, resposta_texto = nullif(trim(p_texto), ''), respondido_em = now(),
           ciencia_em = coalesce(ciencia_em, now()), ciencia_versao = coalesce(ciencia_versao, r.versao)
     where registro_id = r.id and student_id = p_student and user_id = auth.uid();
    if p_tipo in ('nao_possivel', 'esclarecimento', 'texto') then
      perform public.ee_avisar(r.organization_id, 'diario', 'Resposta da família: ' || r.titulo,
        coalesce(nullif(trim(p_texto), ''), 'Não será possível.'), r.id, r.autor_user_id);
    end if;
  end if;
end;
$$;

-- Docente/gestão: quem viu, deu ciência, respondeu
create or replace function public.diario_acompanhamento(p_registro uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r public.diario_registros;
  v jsonb;
begin
  select * into r from public.diario_registros where id = p_registro;
  if not found or not (r.autor_user_id = auth.uid() or public.ee_e_gestor(r.organization_id)) then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  select jsonb_build_object(
           'total', count(*),
           'ciencias', count(*) filter (where x.ciencia_em is not null),
           'respostas', count(*) filter (where x.resposta_tipo is not null),
           'lista', coalesce(jsonb_agg(jsonb_build_object(
              'student_id', x.student_id, 'student_nome', x.student_nome, 'ciencia_em', x.ciencia_em,
              'resposta_tipo', x.resposta_tipo, 'resposta_texto', x.resposta_texto, 'quem', x.user_nome) order by x.student_nome), '[]'::jsonb))
    into v
    from (
      select a.student_id, a.student_nome, resp.ciencia_em, resp.resposta_tipo, resp.resposta_texto, resp.user_nome
        from public.diario_alvo(r.id) a
        left join lateral (
          select * from public.diario_respostas d where d.registro_id = r.id and d.student_id = a.student_id
           order by d.respondido_em desc nulls last, d.ciencia_em desc nulls last limit 1
        ) resp on true
    ) x;
  return v;
end;
$$;

-- Turmas e estudantes que o docente pode usar
create or replace function public.diario_minhas_turmas(p_org uuid)
returns table (class_id uuid, class_nome text, turno text, estudantes jsonb)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.name::text, c.shift::text,
         coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'nome', coalesce(s.full_name, s.name)) order by coalesce(s.full_name, s.name))
                     from public.students s where s.class_id = c.id
                      and coalesce(s.status, '') !~* '^(transferid|inativ|cancelad|evadid)'), '[]'::jsonb)
    from public.classes c
   where c.organization_id = p_org
     and coalesce(c.is_active, true)
     and public.diario_docente_da_turma(p_org, c.id)
   order by c.name;
$$;

select public.ee_realtime('diario_registros');
select public.ee_realtime('diario_respostas');
notify pgrst, 'reload schema';

-- #####################################################################
-- PARTE 6
-- #####################################################################
-- =====================================================================
-- ESCOLA ESCUTA — 05 · PARTICIPA
-- Ouvir → Analisar → Decidir → Informar → Acompanhar.
-- Pesquisas, enquetes, consultas, avaliação de eventos, necessidades,
-- sugestões, inscrições (reuniões, projetos), conselhos/assembleias
-- e devolutivas. Respostas confidenciais/anônimas NUNCA são legíveis
-- linha a linha: a gestão só recebe resultados agregados, com
-- agrupamento de grupos pequenos.
-- (Votações formais/eleições ficam fora, como pede o documento.)
-- =====================================================================

create table if not exists public.participa_iniciativas (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null,
  tipo               text not null check (tipo in ('pesquisa', 'enquete', 'consulta', 'avaliacao_evento', 'necessidades')),
  titulo             text not null default '',
  descricao          text,
  contexto           text,                      -- consultas: apresentação do contexto
  criterios_analise  text,
  carater            text not null default 'orientativa' check (carater in ('orientativa', 'formal')),
  publico            jsonb not null default '{"familias":"todas"}'::jsonb,
  abre_em            timestamptz,
  fecha_em           timestamptz,
  unidade_resposta   text not null default 'responsavel' check (unidade_resposta in ('responsavel', 'familia', 'estudante')),
  privacidade        text not null default 'confidencial' check (privacidade in ('identificada', 'confidencial', 'anonima')),
  responsavel_nome   text,
  politica_resultado text not null default 'apos_encerrar' check (politica_resultado in ('imediato', 'apos_encerrar', 'somente_gestao')),
  texto_confirmacao  text default 'Obrigado! Sua participação foi registrada.',
  permite_editar     boolean not null default false,
  tempo_estimado_min int default 3,
  minimo_privacidade int not null default 5 check (minimo_privacidade between 3 and 50),
  encontro_id        uuid,                      -- avaliação vinculada ao evento original
  status             text not null default 'rascunho' check (status in ('rascunho', 'publicada', 'encerrada', 'arquivada')),
  total_elegivel     int,
  created_by         uuid default auth.uid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  publicada_em       timestamptz,
  constraint participa_periodo_ok check (fecha_em is null or abre_em is null or fecha_em > abre_em)
);

create table if not exists public.participa_perguntas (
  id            uuid primary key default gen_random_uuid(),
  iniciativa_id uuid not null references public.participa_iniciativas (id) on delete cascade,
  ordem         int not null default 0,
  tipo          text not null check (tipo in ('unica', 'multipla', 'escala', 'texto', 'prioridades')),
  enunciado     text not null,
  opcoes        jsonb not null default '[]'::jsonb,   -- ["Opção A", "Opção B"] ; escala: rótulos 1..N
  obrigatoria   boolean not null default true,
  max_escolhas  int                                  -- multipla/prioridades
);

-- quem já participou (sem guardar o que respondeu)
create table if not exists public.participa_participacoes (
  iniciativa_id uuid not null references public.participa_iniciativas (id) on delete cascade,
  chave         text not null,           -- unidade de resposta (pessoa, família ou estudante)
  user_id       uuid not null default auth.uid(),
  respondeu_em  timestamptz not null default now(),
  primary key (iniciativa_id, chave)
);

-- o que foi respondido (identidade só se a iniciativa for identificada)
create table if not exists public.participa_respostas (
  id            uuid primary key default gen_random_uuid(),
  iniciativa_id uuid not null references public.participa_iniciativas (id) on delete cascade,
  chave_hash    text not null,
  tipo_participante text not null,       -- familia | docente
  user_id       uuid,                    -- só identificada
  student_id    uuid,                    -- só identificada
  class_id      uuid,                    -- não guardado em anônima
  turno         text,                    -- não guardado em anônima
  respostas     jsonb not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (iniciativa_id, chave_hash)
);

create table if not exists public.participa_segredos (
  iniciativa_id uuid primary key references public.participa_iniciativas (id) on delete cascade,
  sal           text not null default md5(random()::text || clock_timestamp()::text || random()::text)
);

create table if not exists public.participa_sugestoes (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null,
  autor_user_id    uuid not null default auth.uid(),
  autor_nome       text,
  autor_tipo       text,
  identificada     boolean not null default true,
  categoria        text not null,
  titulo           text not null,
  descricao        text not null,
  proposta         text,
  anexo_path       text,
  status           text not null default 'recebida' check (status in
                   ('recebida', 'em_analise', 'aguardando_esclarecimento', 'planejada', 'implementada', 'encerrada')),
  resposta_gestao  text,
  justificativa    text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.participa_sugestao_eventos (
  id          bigserial primary key,
  sugestao_id uuid not null references public.participa_sugestoes (id) on delete cascade,
  status      text,
  texto       text,
  autor_nome  text,
  created_at  timestamptz not null default now()
);

create table if not exists public.participa_encontros (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null,
  tipo             text not null check (tipo in ('reuniao', 'palestra', 'oficina', 'encontro', 'projeto', 'assembleia', 'conselho')),
  titulo           text not null default '',
  descricao        text,
  formas_participacao text,              -- projetos
  requisitos       text,
  inicio           timestamptz,
  fim              timestamptz,
  local            text,
  publico          jsonb not null default '{"familias":"todas"}'::jsonb,
  vagas            int check (vagas is null or vagas > 0),
  inscricao_ate    timestamptz,
  lista_espera     boolean not null default true,
  requer_confirmacao boolean not null default false,
  pauta            text,
  materiais        text,
  ata              text,
  ata_aprovada     boolean not null default false,
  encaminhamentos  jsonb not null default '[]'::jsonb,   -- [{acao, responsavel, prazo, status}]
  status           text not null default 'rascunho' check (status in ('rascunho', 'publicado', 'encerrado', 'cancelado')),
  created_by       uuid default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.participa_inscricoes (
  id           uuid primary key default gen_random_uuid(),
  encontro_id  uuid not null references public.participa_encontros (id) on delete cascade,
  user_id      uuid not null default auth.uid(),
  nome         text,
  tipo_participante text,
  student_id   uuid,
  disponibilidade text,
  observacao   text,
  status       text not null default 'confirmada' check (status in ('confirmada', 'pendente', 'espera', 'cancelada', 'recusada')),
  presente     boolean,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (encontro_id, user_id)
);

create table if not exists public.participa_devolutivas (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  iniciativa_id   uuid references public.participa_iniciativas (id) on delete set null,
  encontro_id     uuid references public.participa_encontros (id) on delete set null,
  titulo          text not null,
  o_que_ouvimos   text,
  decisoes        text,
  acoes           jsonb not null default '[]'::jsonb,   -- [{acao, prazo, status}]
  limitacoes      text,
  publico         jsonb not null default '{"familias":"todas","docentes":"todos"}'::jsonb,
  status          text not null default 'rascunho' check (status in ('rascunho', 'publicada')),
  publicada_em    timestamptz,
  created_by      uuid default auth.uid(),
  created_at      timestamptz not null default now()
);

create table if not exists public.participa_anexos (
  id          uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  dono_tipo   text not null check (dono_tipo in ('iniciativa', 'encontro', 'devolutiva')),
  dono_id     uuid not null,
  path        text not null,
  nome        text not null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Acesso
-- ---------------------------------------------------------------------
create or replace function public.participa_iniciativa_visivel(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.participa_iniciativas i
     where i.id = p_id
       and (public.ee_e_gestor(i.organization_id)
         or (i.status in ('publicada', 'encerrada')
             and (i.abre_em is null or i.abre_em <= now())
             and public.ee_publico_inclui_me(i.organization_id, i.publico)))
  );
$$;

create or replace function public.participa_encontro_visivel(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.participa_encontros e
     where e.id = p_id
       and (public.ee_e_gestor(e.organization_id)
         or (e.status in ('publicado', 'encerrado') and public.ee_publico_inclui_me(e.organization_id, e.publico)))
  );
$$;

alter table public.participa_iniciativas    enable row level security;
alter table public.participa_perguntas      enable row level security;
alter table public.participa_participacoes  enable row level security;
alter table public.participa_respostas      enable row level security;
alter table public.participa_segredos       enable row level security;
alter table public.participa_sugestoes      enable row level security;
alter table public.participa_sugestao_eventos enable row level security;
alter table public.participa_encontros      enable row level security;
alter table public.participa_inscricoes     enable row level security;
alter table public.participa_devolutivas    enable row level security;
alter table public.participa_anexos         enable row level security;

drop policy if exists p_ini_select on public.participa_iniciativas;
create policy p_ini_select on public.participa_iniciativas for select to authenticated using (public.participa_iniciativa_visivel(id));
drop policy if exists p_ini_write on public.participa_iniciativas;
create policy p_ini_write on public.participa_iniciativas for all to authenticated
  using (public.ee_e_gestor(organization_id)) with check (public.ee_e_gestor(organization_id));

drop policy if exists p_perg_select on public.participa_perguntas;
create policy p_perg_select on public.participa_perguntas for select to authenticated using (public.participa_iniciativa_visivel(iniciativa_id));
drop policy if exists p_perg_write on public.participa_perguntas;
create policy p_perg_write on public.participa_perguntas for all to authenticated
  using (exists (select 1 from public.participa_iniciativas i where i.id = iniciativa_id and public.ee_e_gestor(i.organization_id) and i.status = 'rascunho'))
  with check (exists (select 1 from public.participa_iniciativas i where i.id = iniciativa_id and public.ee_e_gestor(i.organization_id) and i.status = 'rascunho'));

-- participações: cada um vê as suas (a gestão só vê números, pela função)
drop policy if exists p_part_select on public.participa_participacoes;
create policy p_part_select on public.participa_participacoes for select to authenticated using (user_id = auth.uid());
-- participa_respostas e participa_segredos: SEM políticas → ninguém lê direto

drop policy if exists p_sug_select on public.participa_sugestoes;
create policy p_sug_select on public.participa_sugestoes for select to authenticated using (autor_user_id = auth.uid());
drop policy if exists p_sugev_select on public.participa_sugestao_eventos;
create policy p_sugev_select on public.participa_sugestao_eventos for select to authenticated using (
  exists (select 1 from public.participa_sugestoes s where s.id = sugestao_id and (s.autor_user_id = auth.uid() or public.ee_e_gestor(s.organization_id)))
);

drop policy if exists p_enc_select on public.participa_encontros;
create policy p_enc_select on public.participa_encontros for select to authenticated using (public.participa_encontro_visivel(id));
drop policy if exists p_enc_write on public.participa_encontros;
create policy p_enc_write on public.participa_encontros for all to authenticated
  using (public.ee_e_gestor(organization_id)) with check (public.ee_e_gestor(organization_id));

drop policy if exists p_insc_select on public.participa_inscricoes;
create policy p_insc_select on public.participa_inscricoes for select to authenticated using (
  user_id = auth.uid()
  or exists (select 1 from public.participa_encontros e where e.id = encontro_id and public.ee_e_gestor(e.organization_id))
);

drop policy if exists p_dev_select on public.participa_devolutivas;
create policy p_dev_select on public.participa_devolutivas for select to authenticated using (
  public.ee_e_gestor(organization_id)
  or (status = 'publicada' and public.ee_publico_inclui_me(organization_id, publico))
);
drop policy if exists p_dev_write on public.participa_devolutivas;
create policy p_dev_write on public.participa_devolutivas for all to authenticated
  using (public.ee_e_gestor(organization_id)) with check (public.ee_e_gestor(organization_id));

drop policy if exists p_anx_select on public.participa_anexos;
create policy p_anx_select on public.participa_anexos for select to authenticated using (
  public.ee_e_gestor(organization_id)
  or (dono_tipo = 'iniciativa' and public.participa_iniciativa_visivel(dono_id))
  or (dono_tipo = 'encontro' and public.participa_encontro_visivel(dono_id))
  or (dono_tipo = 'devolutiva' and exists (select 1 from public.participa_devolutivas d where d.id = dono_id and d.status = 'publicada'
                                            and public.ee_publico_inclui_me(d.organization_id, d.publico)))
);
drop policy if exists p_anx_write on public.participa_anexos;
create policy p_anx_write on public.participa_anexos for all to authenticated
  using (public.ee_e_gestor(organization_id)) with check (public.ee_e_gestor(organization_id));

-- ---------------------------------------------------------------------
-- Publicar iniciativa / encontro / devolutiva
-- ---------------------------------------------------------------------
create or replace function public.participa_publicar(p_tipo text, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org     uuid;
  v_publico jsonb;
  v_titulo  text;
  v_total   int;
  v_modulo  text := 'participa';
begin
  if p_tipo = 'iniciativa' then
    select organization_id, publico, titulo into v_org, v_publico, v_titulo from public.participa_iniciativas where id = p_id for update;
  elsif p_tipo = 'encontro' then
    select organization_id, publico, titulo into v_org, v_publico, v_titulo from public.participa_encontros where id = p_id for update;
  elsif p_tipo = 'devolutiva' then
    select organization_id, publico, titulo into v_org, v_publico, v_titulo from public.participa_devolutivas where id = p_id for update;
  else
    raise exception 'Tipo inválido.';
  end if;

  if v_org is null or not public.ee_e_gestor(v_org) then
    raise exception 'Somente a gestão publica no Participa.' using errcode = '42501';
  end if;
  if coalesce(trim(v_titulo), '') = '' then
    raise exception 'Preencha o título.';
  end if;
  if p_tipo = 'iniciativa' and not exists (select 1 from public.participa_perguntas where iniciativa_id = p_id) then
    raise exception 'Adicione pelo menos uma pergunta.';
  end if;

  create temp table if not exists _p_alvo on commit drop as select * from public.ee_publico(v_org, v_publico) limit 0;
  truncate _p_alvo;
  insert into _p_alvo select * from public.ee_publico(v_org, v_publico);
  select count(*) into v_total from _p_alvo;
  if v_total = 0 then
    raise exception 'Nenhum participante elegível para este público.';
  end if;

  if p_tipo = 'iniciativa' then
    update public.participa_iniciativas
       set status = 'publicada', publicada_em = now(), abre_em = coalesce(abre_em, now()), total_elegivel = v_total, updated_at = now()
     where id = p_id;
    insert into public.participa_segredos (iniciativa_id) values (p_id) on conflict do nothing;
  elsif p_tipo = 'encontro' then
    update public.participa_encontros set status = 'publicado', updated_at = now() where id = p_id;
  else
    update public.participa_devolutivas set status = 'publicada', publicada_em = now() where id = p_id;
  end if;

  insert into public.ee_avisos (organization_id, modulo, titulo, corpo, ref_id, user_id, guardian_id)
  select v_org, v_modulo,
         case p_tipo when 'iniciativa' then 'Participe: ' when 'encontro' then 'Inscrições abertas: ' else 'Devolutiva: ' end || left(v_titulo, 170),
         null, p_id, a.user_id, a.guardian_id
    from _p_alvo a;

  perform public.ee_registrar(v_org, 'participa_' || p_tipo, p_id, 'publicado', jsonb_build_object('elegiveis', v_total));
  return jsonb_build_object('ok', true, 'elegiveis', v_total);
end;
$$;

-- perguntas ficam travadas depois de publicar (evita misturar versões)
create or replace function public.participa_trava_perguntas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  select status into v_status from public.participa_iniciativas where id = coalesce(new.iniciativa_id, old.iniciativa_id);
  if v_status is distinct from 'rascunho' then
    raise exception 'As perguntas não podem mudar depois da publicação. Duplique a iniciativa para criar uma nova versão.';
  end if;
  return coalesce(new, old);
end;
$$;
drop trigger if exists participa_trava_perguntas on public.participa_perguntas;
create trigger participa_trava_perguntas before insert or update or delete on public.participa_perguntas
for each row execute function public.participa_trava_perguntas();

-- Duplicar (nova versão) — copia perguntas, volta para rascunho
create or replace function public.participa_duplicar(p_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  i      public.participa_iniciativas;
  v_novo uuid;
begin
  select * into i from public.participa_iniciativas where id = p_id;
  if not found or not public.ee_e_gestor(i.organization_id) then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  insert into public.participa_iniciativas (organization_id, tipo, titulo, descricao, contexto, criterios_analise, carater, publico,
    unidade_resposta, privacidade, responsavel_nome, politica_resultado, texto_confirmacao, permite_editar, tempo_estimado_min,
    minimo_privacidade, encontro_id)
  values (i.organization_id, i.tipo, i.titulo || ' (nova versão)', i.descricao, i.contexto, i.criterios_analise, i.carater, i.publico,
    i.unidade_resposta, i.privacidade, i.responsavel_nome, i.politica_resultado, i.texto_confirmacao, i.permite_editar, i.tempo_estimado_min,
    i.minimo_privacidade, i.encontro_id)
  returning id into v_novo;
  insert into public.participa_perguntas (iniciativa_id, ordem, tipo, enunciado, opcoes, obrigatoria, max_escolhas)
  select v_novo, ordem, tipo, enunciado, opcoes, obrigatoria, max_escolhas from public.participa_perguntas where iniciativa_id = p_id;
  return v_novo;
end;
$$;

-- ---------------------------------------------------------------------
-- Responder
-- ---------------------------------------------------------------------
create or replace function public.participa_minha_chave(p_ini uuid, p_student uuid)
returns table (chave text, tipo_participante text, student_id uuid, class_id uuid, turno text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  i public.participa_iniciativas;
begin
  select * into i from public.participa_iniciativas where id = p_ini;
  if public.ee_e_docente(i.organization_id) and coalesce(i.publico ->> 'docentes', '') <> ''
     and not exists (select 1 from public.ee_meus_estudantes() e where e.organization_id = i.organization_id) then
    return query select 'u:' || auth.uid()::text, 'docente'::text, null::uuid, null::uuid, null::text;
    return;
  end if;

  if i.unidade_resposta = 'estudante' then
    return query
      select 's:' || e.student_id::text, 'familia'::text, e.student_id, e.class_id, lower(c.shift)::text
        from public.ee_meus_estudantes() e left join public.classes c on c.id = e.class_id
       where e.organization_id = i.organization_id and e.student_id = p_student
       limit 1;
  elsif i.unidade_resposta = 'familia' then
    -- a família é o conjunto de estudantes ligados ao responsável: pai e mãe dos mesmos filhos = 1 resposta
    return query
      select 'f:' || md5(string_agg(distinct e.student_id::text, ',' order by e.student_id::text)),
             'familia'::text, null::uuid, min(e.class_id::text)::uuid, min(lower(c.shift))::text
        from public.ee_meus_estudantes() e left join public.classes c on c.id = e.class_id
       where e.organization_id = i.organization_id
      having count(*) > 0;
  else
    return query
      select 'u:' || auth.uid()::text, 'familia'::text, null::uuid, min(e.class_id::text)::uuid, min(lower(c.shift))::text
        from public.ee_meus_estudantes() e left join public.classes c on c.id = e.class_id
       where e.organization_id = i.organization_id
      having count(*) > 0;
  end if;
end;
$$;

create or replace function public.participa_responder(p_ini uuid, p_respostas jsonb, p_student uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  i       public.participa_iniciativas;
  k       record;
  q       record;
  v_val   jsonb;
  v_hash  text;
  v_sal   text;
  v_ja    boolean;
begin
  select * into i from public.participa_iniciativas where id = p_ini;
  if not found or not public.participa_iniciativa_visivel(p_ini) or public.ee_e_gestor(i.organization_id) and not public.ee_publico_inclui_me(i.organization_id, i.publico) then
    raise exception 'Iniciativa não disponível para você.' using errcode = '42501';
  end if;
  if i.status <> 'publicada' or (i.abre_em is not null and i.abre_em > now()) or (i.fecha_em is not null and i.fecha_em <= now()) then
    raise exception 'O prazo de participação está encerrado.';
  end if;

  select * into k from public.participa_minha_chave(p_ini, p_student) limit 1;
  if k.chave is null then
    raise exception 'Escolha o estudante para responder.';
  end if;

  -- valida perguntas obrigatórias e formato
  for q in select * from public.participa_perguntas where iniciativa_id = p_ini order by ordem loop
    v_val := p_respostas -> q.id::text;
    if q.obrigatoria and (v_val is null or v_val = 'null'::jsonb or v_val = '""'::jsonb or v_val = '[]'::jsonb) then
      raise exception 'Responda: %', q.enunciado;
    end if;
    if v_val is not null and q.tipo in ('multipla', 'prioridades') and jsonb_typeof(v_val) <> 'array' then
      raise exception 'Resposta inválida em: %', q.enunciado;
    end if;
    if v_val is not null and q.max_escolhas is not null and jsonb_typeof(v_val) = 'array' and jsonb_array_length(v_val) > q.max_escolhas then
      raise exception 'Escolha no máximo % opções em: %', q.max_escolhas, q.enunciado;
    end if;
  end loop;

  select sal into v_sal from public.participa_segredos where iniciativa_id = p_ini;
  v_hash := md5(coalesce(v_sal, '') || k.chave);
  select exists (select 1 from public.participa_participacoes where iniciativa_id = p_ini and chave = k.chave) into v_ja;

  if v_ja and not i.permite_editar then
    raise exception 'Esta participação já foi registrada.';
  end if;

  insert into public.participa_participacoes (iniciativa_id, chave, user_id) values (p_ini, k.chave, auth.uid())
  on conflict (iniciativa_id, chave) do update set respondeu_em = now(), user_id = auth.uid();

  insert into public.participa_respostas (iniciativa_id, chave_hash, tipo_participante, user_id, student_id, class_id, turno, respostas)
  values (p_ini, v_hash, k.tipo_participante,
          case when i.privacidade = 'identificada' then auth.uid() end,
          case when i.privacidade = 'identificada' then k.student_id end,
          case when i.privacidade <> 'anonima' then k.class_id end,
          case when i.privacidade <> 'anonima' then k.turno end,
          p_respostas)
  on conflict (iniciativa_id, chave_hash) do update set respostas = excluded.respostas, updated_at = now();

  return jsonb_build_object('ok', true, 'editado', v_ja, 'mensagem', coalesce(i.texto_confirmacao, 'Participação registrada.'));
end;
$$;

-- ---------------------------------------------------------------------
-- Resultados agregados com proteção de grupos pequenos
-- p_recorte: unidade | turno | turma
-- ---------------------------------------------------------------------
create or replace function public.participa_resultados(p_ini uuid, p_recorte text default 'unidade')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  i        public.participa_iniciativas;
  v_gestor boolean;
  v_total  int;
  v_min    int;
  v_grupos jsonb := '[]'::jsonb;
  v_perg   jsonb := '[]'::jsonb;
  q        record;
  g        record;
  v_dist   jsonb;
  v_media  numeric;
  v_textos jsonb;
  v_recorte text := coalesce(p_recorte, 'unidade');
begin
  select * into i from public.participa_iniciativas where id = p_ini;
  if not found then
    raise exception 'Iniciativa não encontrada.';
  end if;
  v_gestor := public.ee_e_gestor(i.organization_id);
  if not v_gestor then
    if not public.participa_iniciativa_visivel(p_ini)
       or i.politica_resultado = 'somente_gestao'
       or (i.politica_resultado = 'apos_encerrar' and not (i.status = 'encerrada' or (i.fecha_em is not null and i.fecha_em <= now()))) then
      raise exception 'Os resultados ainda não estão disponíveis.';
    end if;
    v_recorte := 'unidade';
  end if;
  if i.privacidade = 'anonima' then
    v_recorte := 'unidade';  -- anônima: sem recortes
  end if;

  v_min := i.minimo_privacidade;
  select count(*) into v_total from public.participa_respostas where iniciativa_id = p_ini;

  if v_total < v_min then
    return jsonb_build_object(
      'total_respostas', v_total, 'total_elegivel', i.total_elegivel, 'minimo', v_min, 'protegido', true,
      'aviso', format('Resultados aparecem a partir de %s respostas, para proteger quem participou.', v_min));
  end if;

  -- grupos (turno/turma); grupos pequenos viram "Outros"
  create temp table if not exists _p_resp on commit drop as select r.*, ''::text as grupo from public.participa_respostas r limit 0;
  truncate _p_resp;
  insert into _p_resp
    select r.*, case v_recorte
                  when 'turno' then coalesce(nullif(r.turno, ''), 'Não informado')
                  when 'turma' then coalesce((select c.name from public.classes c where c.id = r.class_id), 'Não informado')
                  else 'Unidade'
                end
      from public.participa_respostas r where r.iniciativa_id = p_ini;

  update _p_resp set grupo = 'Outros (grupos pequenos agrupados)'
   where grupo in (select grupo from _p_resp group by grupo having count(*) < v_min);
  -- se "Outros" ainda for pequeno, junta tudo na unidade
  if (select count(*) from _p_resp where grupo like 'Outros%') between 1 and v_min - 1 then
    update _p_resp set grupo = 'Unidade';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('grupo', grupo, 'respostas', n) order by grupo), '[]'::jsonb)
    into v_grupos
    from (select grupo, count(*) n from _p_resp group by grupo) s;

  for q in select * from public.participa_perguntas where iniciativa_id = p_ini order by ordem loop
    v_dist := '[]'::jsonb; v_media := null; v_textos := null;

    if q.tipo in ('unica', 'escala') then
      select coalesce(jsonb_agg(jsonb_build_object('grupo', grupo, 'opcao', opcao, 'n', n) order by grupo, opcao), '[]'::jsonb)
        into v_dist
        from (select grupo, respostas ->> q.id::text as opcao, count(*) n
                from _p_resp where respostas ? q.id::text and respostas ->> q.id::text is not null
               group by grupo, respostas ->> q.id::text) s;
      if q.tipo = 'escala' then
        select round(avg((respostas ->> q.id::text)::numeric), 2) into v_media
          from _p_resp where (respostas ->> q.id::text) ~ '^\d+(\.\d+)?$';
      end if;
    elsif q.tipo in ('multipla', 'prioridades') then
      select coalesce(jsonb_agg(jsonb_build_object('grupo', grupo, 'opcao', opcao, 'n', n, 'pontos', pontos) order by grupo, pontos desc), '[]'::jsonb)
        into v_dist
        from (select r.grupo, e.value as opcao, count(*) n,
                     sum(case when q.tipo = 'prioridades'
                              then greatest(1, jsonb_array_length(r.respostas -> q.id::text) - e.ord::int + 1) else 1 end) pontos
                from _p_resp r
                cross join lateral jsonb_array_elements_text(case when jsonb_typeof(r.respostas -> q.id::text) = 'array'
                                                                  then r.respostas -> q.id::text else '[]'::jsonb end)
                                   with ordinality as e(value, ord)
               group by r.grupo, e.value) s;
    elsif q.tipo = 'texto' then
      -- comentários: só para a gestão, sem identificação, em ordem aleatória
      if v_gestor then
        select coalesce(jsonb_agg(t), '[]'::jsonb) into v_textos
          from (select respostas ->> q.id::text as t from _p_resp
                 where coalesce(trim(respostas ->> q.id::text), '') <> '' order by random() limit 200) s;
      end if;
      select jsonb_build_array(jsonb_build_object('grupo', 'Unidade', 'opcao', 'Comentários', 'n', count(*)))
        into v_dist from _p_resp where coalesce(trim(respostas ->> q.id::text), '') <> '';
    end if;

    v_perg := v_perg || jsonb_build_object('id', q.id, 'enunciado', q.enunciado, 'tipo', q.tipo, 'opcoes', q.opcoes,
                                           'distribuicao', v_dist, 'media', v_media, 'comentarios', v_textos);
  end loop;

  return jsonb_build_object(
    'total_respostas', v_total,
    'total_elegivel',  i.total_elegivel,
    'taxa',            case when coalesce(i.total_elegivel, 0) > 0 then round(100.0 * v_total / i.total_elegivel, 1) end,
    'minimo',          v_min,
    'recorte',         v_recorte,
    'grupos',          v_grupos,
    'perguntas',       v_perg,
    'aviso',           'Taxa de participação não indica representatividade: os resultados refletem apenas quem respondeu.'
  );
end;
$$;

-- Visão geral para a gestão
create or replace function public.participa_visao_geral(p_org uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.ee_e_gestor(p_org) then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'abertas', (select count(*) from public.participa_iniciativas where organization_id = p_org and status = 'publicada' and (fecha_em is null or fecha_em > now())),
    'respostas_30d', (select count(*) from public.participa_respostas r join public.participa_iniciativas i on i.id = r.iniciativa_id
                       where i.organization_id = p_org and r.created_at > now() - interval '30 days'),
    'sugestoes_novas', (select count(*) from public.participa_sugestoes where organization_id = p_org and status = 'recebida'),
    'encontros_proximos', (select count(*) from public.participa_encontros where organization_id = p_org and status = 'publicado' and inicio > now()),
    'devolutivas_pendentes', (select count(*) from public.participa_iniciativas i
                               where i.organization_id = p_org and (i.status = 'encerrada' or (i.status = 'publicada' and i.fecha_em <= now()))
                                 and not exists (select 1 from public.participa_devolutivas d where d.iniciativa_id = i.id and d.status = 'publicada')),
    'participacao', (select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'titulo', i.titulo, 'elegiveis', i.total_elegivel,
                              'respostas', (select count(*) from public.participa_participacoes pp where pp.iniciativa_id = i.id),
                              'fecha_em', i.fecha_em) order by i.publicada_em desc), '[]'::jsonb)
                       from public.participa_iniciativas i
                      where i.organization_id = p_org and i.status = 'publicada')
  );
end;
$$;

-- Encerrar iniciativas vencidas
create or replace function public.participa_rotina()
returns void
language sql
security definer
set search_path = public
as $$
  update public.participa_iniciativas set status = 'encerrada', updated_at = now()
   where status = 'publicada' and fecha_em is not null and fecha_em <= now();
$$;

-- ---------------------------------------------------------------------
-- Sugestões
-- ---------------------------------------------------------------------
create or replace function public.participa_sugerir(
  p_org uuid, p_categoria text, p_titulo text, p_descricao text, p_proposta text, p_identificada boolean, p_anexo text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id   uuid;
  v_tipo text;
begin
  if public.ee_e_familia(p_org) then
    v_tipo := 'familia';
  elsif public.ee_e_docente(p_org) then
    v_tipo := 'docente';
  else
    raise exception 'Você não tem vínculo com esta escola.' using errcode = '42501';
  end if;
  if coalesce(trim(p_titulo), '') = '' or coalesce(trim(p_descricao), '') = '' then
    raise exception 'Preencha título e descrição.';
  end if;
  insert into public.participa_sugestoes (organization_id, autor_nome, autor_tipo, identificada, categoria, titulo, descricao, proposta, anexo_path)
  values (p_org, case when p_identificada then public.ee_meu_nome() end, v_tipo, coalesce(p_identificada, true),
          coalesce(nullif(trim(p_categoria), ''), 'Geral'), trim(p_titulo), trim(p_descricao), nullif(trim(p_proposta), ''), p_anexo)
  returning id into v_id;
  insert into public.participa_sugestao_eventos (sugestao_id, status, texto, autor_nome) values (v_id, 'recebida', null, 'Sistema');
  perform public.ee_avisar(p_org, 'participa', 'Nova sugestão da comunidade', trim(p_titulo), v_id, null, null, true);
  return v_id;
end;
$$;

-- gestão lista sugestões; autoria só aparece se a pessoa se identificou
create or replace function public.participa_sugestoes_gestao(p_org uuid)
returns table (
  id uuid, categoria text, titulo text, descricao text, proposta text, status text, resposta_gestao text,
  justificativa text, identificada boolean, autor_nome text, autor_tipo text, anexo_path text, created_at timestamptz, updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.ee_e_gestor(p_org) then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  return query
    select s.id, s.categoria, s.titulo, s.descricao, s.proposta, s.status, s.resposta_gestao, s.justificativa, s.identificada,
           case when s.identificada then s.autor_nome else 'Confidencial' end, s.autor_tipo, s.anexo_path, s.created_at, s.updated_at
      from public.participa_sugestoes s
     where s.organization_id = p_org
     order by s.created_at desc;
end;
$$;

create or replace function public.participa_sugestao_atualizar(p_id uuid, p_status text, p_resposta text, p_justificativa text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.participa_sugestoes;
begin
  select * into s from public.participa_sugestoes where id = p_id for update;
  if not found or not public.ee_e_gestor(s.organization_id) then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  if p_status = 'encerrada' and coalesce(trim(p_justificativa), '') = '' then
    raise exception 'Para encerrar, escreva a justificativa.';
  end if;
  update public.participa_sugestoes
     set status = p_status, resposta_gestao = coalesce(nullif(trim(p_resposta), ''), resposta_gestao),
         justificativa = coalesce(nullif(trim(p_justificativa), ''), justificativa), updated_at = now()
   where id = s.id;
  insert into public.participa_sugestao_eventos (sugestao_id, status, texto, autor_nome)
  values (s.id, p_status, coalesce(nullif(trim(p_resposta), ''), nullif(trim(p_justificativa), '')), public.ee_meu_nome());
  perform public.ee_avisar(s.organization_id, 'participa', 'Sua sugestão foi atualizada', s.titulo, s.id, s.autor_user_id);
end;
$$;

-- ---------------------------------------------------------------------
-- Inscrições (vagas validadas com trava — sem estourar o limite)
-- ---------------------------------------------------------------------
create or replace function public.participa_inscrever(p_encontro uuid, p_student uuid default null, p_disponibilidade text default null, p_obs text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e        public.participa_encontros;
  v_ocup   int;
  v_status text;
  v_tipo   text;
begin
  select * into e from public.participa_encontros where id = p_encontro for update;
  if not found or e.status <> 'publicado' or not public.ee_publico_inclui_me(e.organization_id, e.publico) then
    raise exception 'Inscrição não disponível para você.' using errcode = '42501';
  end if;
  if e.inscricao_ate is not null and e.inscricao_ate <= now() then
    raise exception 'As inscrições estão encerradas.';
  end if;
  if p_student is not null and not exists (select 1 from public.ee_meus_estudantes() x where x.student_id = p_student) then
    raise exception 'Estudante sem vínculo autorizado.';
  end if;
  v_tipo := case when public.ee_e_familia(e.organization_id) then 'familia' else 'docente' end;

  select count(*) into v_ocup from public.participa_inscricoes where encontro_id = e.id and status in ('confirmada', 'pendente');
  if e.vagas is not null and v_ocup >= e.vagas then
    if not e.lista_espera then
      raise exception 'As vagas acabaram.';
    end if;
    v_status := 'espera';
  else
    v_status := case when e.requer_confirmacao then 'pendente' else 'confirmada' end;
  end if;

  insert into public.participa_inscricoes (encontro_id, user_id, nome, tipo_participante, student_id, disponibilidade, observacao, status)
  values (e.id, auth.uid(), public.ee_meu_nome(), v_tipo, p_student, nullif(trim(p_disponibilidade), ''), nullif(trim(p_obs), ''), v_status)
  on conflict (encontro_id, user_id) do update
     set status = case when participa_inscricoes.status in ('cancelada', 'recusada') then excluded.status else participa_inscricoes.status end,
         student_id = excluded.student_id, disponibilidade = excluded.disponibilidade, observacao = excluded.observacao, updated_at = now();

  select status into v_status from public.participa_inscricoes where encontro_id = e.id and user_id = auth.uid();
  return jsonb_build_object('status', v_status);
end;
$$;

create or replace function public.participa_promover_espera(p_encontro uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  e   public.participa_encontros;
  x   record;
begin
  select * into e from public.participa_encontros where id = p_encontro for update;
  if e.vagas is null then
    return;
  end if;
  for x in
    select id, user_id from public.participa_inscricoes where encontro_id = e.id and status = 'espera' order by created_at
    limit greatest(0, e.vagas - (select count(*) from public.participa_inscricoes where encontro_id = e.id and status in ('confirmada', 'pendente')))
  loop
    update public.participa_inscricoes set status = case when e.requer_confirmacao then 'pendente' else 'confirmada' end, updated_at = now() where id = x.id;
    perform public.ee_avisar(e.organization_id, 'participa', 'Abriu uma vaga para você', e.titulo, e.id, x.user_id);
  end loop;
end;
$$;

create or replace function public.participa_cancelar_inscricao(p_encontro uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.participa_inscricoes set status = 'cancelada', updated_at = now()
   where encontro_id = p_encontro and user_id = auth.uid() and status <> 'cancelada';
  perform public.participa_promover_espera(p_encontro);
end;
$$;

create or replace function public.participa_gerir_inscricao(p_id uuid, p_acao text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  x record;
begin
  select i.*, e.organization_id, e.titulo into x
    from public.participa_inscricoes i join public.participa_encontros e on e.id = i.encontro_id where i.id = p_id;
  if not found or not public.ee_e_gestor(x.organization_id) then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  update public.participa_inscricoes
     set status = case p_acao when 'confirmar' then 'confirmada' when 'recusar' then 'recusada' else status end,
         presente = case p_acao when 'presente' then true when 'ausente' then false else presente end,
         updated_at = now()
   where id = p_id;
  if p_acao in ('confirmar', 'recusar') then
    perform public.ee_avisar(x.organization_id, 'participa',
      case when p_acao = 'confirmar' then 'Inscrição confirmada' else 'Inscrição não confirmada' end, x.titulo, x.encontro_id, x.user_id);
  end if;
  if p_acao = 'recusar' then
    perform public.participa_promover_espera(x.encontro_id);
  end if;
end;
$$;

create or replace function public.participa_contagem_inscricoes(p_encontro uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when public.participa_encontro_visivel(p_encontro) then
    jsonb_build_object(
      'confirmadas', count(*) filter (where status = 'confirmada'),
      'pendentes',   count(*) filter (where status = 'pendente'),
      'espera',      count(*) filter (where status = 'espera'),
      'presentes',   count(*) filter (where presente))
  end
  from public.participa_inscricoes where encontro_id = p_encontro;
$$;

select cron.unschedule(jobid) from cron.job where jobname = 'ee-participa-rotina';
select cron.schedule('ee-participa-rotina', '*/10 * * * *', $c$ select public.participa_rotina(); $c$);

select public.ee_realtime('participa_iniciativas');
select public.ee_realtime('participa_encontros');
select public.ee_realtime('participa_inscricoes');
select public.ee_realtime('participa_devolutivas');
select public.ee_realtime('participa_sugestoes');

revoke execute on function public.participa_rotina() from public, anon, authenticated;
revoke execute on function public.participa_promover_espera(uuid) from public, anon, authenticated;
notify pgrst, 'reload schema';


-- =====================================================================
-- PARTE 6
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


-- =====================================================================
-- PARTE 7
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


-- =====================================================================
-- PARTE 8
-- =====================================================================
-- ESCOLA ESCUTA — INTEGRAÇÕES (Painel da Família, Participa → Mural,
-- Calendário Escolar, Agenda Diária nos Recados, evolução das pesquisas)
-- Rode no SQL Editor. Pode rodar quantas vezes quiser.
-- =====================================================================

set lock_timeout = '10s';

-- ---------------------------------------------------------------------
-- 1. Colunas novas
-- ---------------------------------------------------------------------
alter table public.mural_recados        add column if not exists participa_ref  uuid;          -- recado que divulga algo do Participa
alter table public.mural_recados        add column if not exists participa_tipo text;
alter table public.participa_encontros  add column if not exists evento_calendario_id text;    -- evento publicado no Calendário Escolar
alter table public.participa_iniciativas add column if not exists origem_id uuid;              -- edição anterior (para comparar)
alter table public.diario_registros     add column if not exists evento_calendario_titulo text;
alter table public.diario_registros     add column if not exists evento_calendario_data date;

create index if not exists mural_recados_participa_ref on public.mural_recados (participa_ref) where participa_ref is not null;
create index if not exists participa_iniciativas_origem on public.participa_iniciativas (origem_id) where origem_id is not null;

-- ---------------------------------------------------------------------
-- 2. Participa → Mural de Recados
--    Divulga a abertura de uma iniciativa/encontro ou uma devolutiva no
--    Mural, para o MESMO público. Não duplica: se já divulgou, devolve o recado.
-- ---------------------------------------------------------------------
create or replace function public.participa_divulgar_mural(p_tipo text, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org     uuid;
  v_publico jsonb;
  v_titulo  text;
  v_resumo  text;
  v_texto   text;
  v_tipo    text;
  v_fim     timestamptz;
  v_status  text;
  v_recado  uuid;
  v_res     jsonb;
begin
  if p_tipo = 'iniciativa' then
    select organization_id, publico, titulo, descricao, fecha_em, status
      into v_org, v_publico, v_titulo, v_texto, v_fim, v_status
      from public.participa_iniciativas where id = p_id;
    v_tipo   := 'campanha';
    v_resumo := 'Participe pelo menu Participa' || coalesce(' até ' || to_char(v_fim at time zone 'America/Sao_Paulo', 'DD/MM "às" HH24:MI'), '') || '.';
    if v_status <> 'publicada' then raise exception 'Publique a iniciativa antes de divulgar.'; end if;
  elsif p_tipo = 'encontro' then
    select organization_id, publico, titulo,
           concat_ws(E'\n\n', descricao,
                     'Quando: ' || to_char(inicio at time zone 'America/Sao_Paulo', 'DD/MM/YYYY "às" HH24:MI'),
                     'Local: ' || local,
                     case when inscricao_ate is not null then 'Inscrições até ' || to_char(inscricao_ate at time zone 'America/Sao_Paulo', 'DD/MM "às" HH24:MI') end),
           coalesce(inscricao_ate, inicio), status
      into v_org, v_publico, v_titulo, v_texto, v_fim, v_status
      from public.participa_encontros where id = p_id;
    v_tipo   := 'evento';
    v_resumo := 'Inscrições abertas no menu Participa.';
    if v_status <> 'publicado' then raise exception 'Publique o encontro antes de divulgar.'; end if;
  elsif p_tipo = 'devolutiva' then
    select organization_id, publico, titulo,
           concat_ws(E'\n\n',
                     case when coalesce(o_que_ouvimos, '') <> '' then 'O que ouvimos: ' || o_que_ouvimos end,
                     case when coalesce(decisoes, '') <> '' then 'O que decidimos: ' || decisoes end,
                     case when coalesce(limitacoes, '') <> '' then 'Limitações: ' || limitacoes end),
           null, status
      into v_org, v_publico, v_titulo, v_texto, v_fim, v_status
      from public.participa_devolutivas where id = p_id;
    v_tipo   := 'orientacao';
    v_resumo := 'A escola publicou o retorno sobre a participação da comunidade.';
    if v_status <> 'publicada' then raise exception 'Publique a devolutiva antes de divulgar.'; end if;
  else
    raise exception 'Tipo inválido.';
  end if;

  if v_org is null then
    raise exception 'Registro não encontrado.';
  end if;
  if not public.ee_e_gestor(v_org) then
    raise exception 'Somente a gestão divulga no mural.' using errcode = '42501';
  end if;

  -- já divulgado? não repete
  select id into v_recado from public.mural_recados
   where participa_ref = p_id and participa_tipo = p_tipo and status not in ('cancelado', 'arquivado')
   limit 1;
  if v_recado is not null then
    return jsonb_build_object('ok', true, 'recado_id', v_recado, 'ja_divulgado', true);
  end if;

  -- o mural exige fim depois do início: só usa o prazo se ainda estiver longe
  if v_fim is not null and v_fim < now() + interval '1 hour' then
    v_fim := null;
  end if;

  insert into public.mural_recados (organization_id, titulo, resumo, conteudo, tipo, publico, fim_em, status, participa_ref, participa_tipo)
  values (v_org,
          left(case p_tipo when 'devolutiva' then 'Devolutiva: ' else '' end || v_titulo, 200),
          v_resumo,
          coalesce(nullif(trim(v_texto), ''), v_resumo),
          v_tipo, coalesce(v_publico, '{}'::jsonb), v_fim, 'rascunho', p_id, p_tipo)
  returning id into v_recado;

  v_res := public.mural_publicar(v_recado, true);
  return jsonb_build_object('ok', true, 'recado_id', v_recado, 'mural', v_res);
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Nova edição de uma iniciativa guarda a anterior (para comparar)
-- ---------------------------------------------------------------------
create or replace function public.participa_duplicar(p_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  i      public.participa_iniciativas;
  v_novo uuid;
begin
  select * into i from public.participa_iniciativas where id = p_id;
  if not found or not public.ee_e_gestor(i.organization_id) then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  insert into public.participa_iniciativas (organization_id, tipo, titulo, descricao, contexto, criterios_analise, carater, publico,
    unidade_resposta, privacidade, responsavel_nome, politica_resultado, texto_confirmacao, permite_editar, tempo_estimado_min,
    minimo_privacidade, encontro_id, origem_id)
  values (i.organization_id, i.tipo, regexp_replace(i.titulo, '\s*\((nova versão|nova edição)\)$', '') || ' (nova edição)',
    i.descricao, i.contexto, i.criterios_analise, i.carater, i.publico,
    i.unidade_resposta, i.privacidade, i.responsavel_nome, i.politica_resultado, i.texto_confirmacao, i.permite_editar, i.tempo_estimado_min,
    i.minimo_privacidade, i.encontro_id, i.id)
  returning id into v_novo;
  insert into public.participa_perguntas (iniciativa_id, ordem, tipo, enunciado, opcoes, obrigatoria, max_escolhas)
  select v_novo, ordem, tipo, enunciado, opcoes, obrigatoria, max_escolhas from public.participa_perguntas where iniciativa_id = p_id;
  return v_novo;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Evolução entre edições comparáveis (só a gestão)
--    Compara perguntas com o MESMO enunciado entre as edições ligadas.
--    Só consolidado da unidade; edição com menos respostas que o mínimo
--    de privacidade aparece como protegida.
-- ---------------------------------------------------------------------
create or replace function public.participa_evolucao(p_ini uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  i        public.participa_iniciativas;
  v_ids    uuid[] := '{}';
  v_atual  uuid;
  v_n      int := 0;
  v_edicoes jsonb := '[]'::jsonb;
  v_perg   jsonb := '[]'::jsonb;
  e        record;
  q        record;
  v_serie  jsonb;
  v_ponto  jsonb;
  v_qid    uuid;
  v_total  int;
  v_media  numeric;
  v_dist   jsonb;
begin
  select * into i from public.participa_iniciativas where id = p_ini;
  if not found then
    raise exception 'Iniciativa não encontrada.';
  end if;
  if not public.ee_e_gestor(i.organization_id) then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;

  -- edições anteriores (até 6), da mais antiga para a atual
  v_atual := p_ini;
  while v_atual is not null and v_n < 7 loop
    v_ids := array_prepend(v_atual, v_ids);
    select origem_id into v_atual from public.participa_iniciativas
     where id = v_atual and organization_id = i.organization_id;
    v_n := v_n + 1;
  end loop;

  if array_length(v_ids, 1) < 2 then
    return jsonb_build_object('edicoes', '[]'::jsonb, 'perguntas', '[]'::jsonb,
      'aviso', 'Ainda não há edição anterior para comparar. Use "Nova edição" para repetir esta iniciativa e comparar os resultados.');
  end if;

  for e in
    select x.id, x.titulo, x.publicada_em, x.fecha_em, x.minimo_privacidade,
           (select count(*) from public.participa_respostas r where r.iniciativa_id = x.id) as respostas,
           u.ord
      from unnest(v_ids) with ordinality as u(id, ord)
      join public.participa_iniciativas x on x.id = u.id
     order by u.ord
  loop
    v_edicoes := v_edicoes || jsonb_build_object('id', e.id, 'titulo', e.titulo, 'publicada_em', e.publicada_em,
                                                 'fecha_em', e.fecha_em, 'respostas', e.respostas,
                                                 'protegida', e.respostas < e.minimo_privacidade);
  end loop;

  -- perguntas da edição atual que podem ser comparadas
  for q in select * from public.participa_perguntas where iniciativa_id = p_ini and tipo in ('unica', 'escala', 'multipla') order by ordem loop
    v_serie := '[]'::jsonb;
    for e in
      select x.id, x.minimo_privacidade, u.ord
        from unnest(v_ids) with ordinality as u(id, ord)
        join public.participa_iniciativas x on x.id = u.id
       order by u.ord
    loop
      select pq.id into v_qid from public.participa_perguntas pq
       where pq.iniciativa_id = e.id and lower(trim(pq.enunciado)) = lower(trim(q.enunciado)) and pq.tipo = q.tipo
       limit 1;
      select count(*) into v_total from public.participa_respostas r
       where r.iniciativa_id = e.id and v_qid is not null and r.respostas ? v_qid::text;

      if v_qid is null then
        v_ponto := jsonb_build_object('edicao_id', e.id, 'sem_pergunta', true);
      elsif v_total < e.minimo_privacidade then
        v_ponto := jsonb_build_object('edicao_id', e.id, 'protegido', true, 'respostas', v_total);
      else
        v_media := null;
        if q.tipo = 'multipla' then
          select coalesce(jsonb_agg(jsonb_build_object('opcao', opcao, 'pct', round(100.0 * n / v_total, 1)) order by n desc), '[]'::jsonb)
            into v_dist
            from (select el.value as opcao, count(*) n
                    from public.participa_respostas r
                    cross join lateral jsonb_array_elements_text(case when jsonb_typeof(r.respostas -> v_qid::text) = 'array'
                                                                      then r.respostas -> v_qid::text else '[]'::jsonb end) el
                   where r.iniciativa_id = e.id
                   group by el.value) s;
        else
          select coalesce(jsonb_agg(jsonb_build_object('opcao', opcao, 'pct', round(100.0 * n / v_total, 1)) order by opcao), '[]'::jsonb)
            into v_dist
            from (select r.respostas ->> v_qid::text as opcao, count(*) n
                    from public.participa_respostas r
                   where r.iniciativa_id = e.id and r.respostas ->> v_qid::text is not null
                   group by 1) s;
          if q.tipo = 'escala' then
            select round(avg((r.respostas ->> v_qid::text)::numeric), 2) into v_media
              from public.participa_respostas r
             where r.iniciativa_id = e.id and (r.respostas ->> v_qid::text) ~ '^\d+(\.\d+)?$';
          end if;
        end if;
        v_ponto := jsonb_build_object('edicao_id', e.id, 'respostas', v_total, 'media', v_media, 'distribuicao', v_dist);
      end if;
      v_serie := v_serie || v_ponto;
    end loop;
    v_perg := v_perg || jsonb_build_object('enunciado', q.enunciado, 'tipo', q.tipo, 'opcoes', q.opcoes, 'serie', v_serie);
  end loop;

  return jsonb_build_object(
    'edicoes', v_edicoes,
    'perguntas', v_perg,
    'aviso', 'Comparação só entre perguntas com o mesmo enunciado. Mudanças no público ou no período podem explicar diferenças.');
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Painel da Família: próximos atendimentos, participações abertas,
--    prazos próximos e registros da Agenda Diária (para o Início e Recados)
-- ---------------------------------------------------------------------
create or replace function public.ee_painel_familia()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_orgs   uuid[];
  v_guard  uuid[];
  v_atend  jsonb;
  v_inic   jsonb;
  v_enc    jsonb;
  v_diario jsonb;
begin
  if auth.uid() is null then
    return '{}'::jsonb;
  end if;
  select coalesce(array_agg(distinct organization_id), '{}') into v_orgs from public.ee_meus_estudantes();
  select coalesce(array_agg(g), '{}') into v_guard from public.ee_meus_guardian_ids() g;

  -- atendimentos marcados (Agenda Família)
  select coalesce(jsonb_agg(x order by x->>'inicio'), '[]'::jsonb) into v_atend
    from (select jsonb_build_object('id', a.id, 'assunto', a.assunto, 'inicio', a.inicio, 'fim', a.fim, 'status', a.status,
                                    'estudante', a.student_nome, 'setor', s.nome, 'expira_em', a.expira_em) as x
            from public.agenda_agendamentos a
            left join public.agenda_setores s on s.id = a.setor_id
           where (a.solicitante_user_id = auth.uid() or a.guardian_id = any (v_guard))
             and a.status in ('aguardando', 'confirmado', 'proposta')
             and a.fim >= now()
           order by a.inicio
           limit 5) s;

  -- iniciativas abertas que ainda não respondi (Participa)
  select coalesce(jsonb_agg(x order by (x->>'fecha_em') nulls last), '[]'::jsonb) into v_inic
    from (select jsonb_build_object('id', i.id, 'titulo', i.titulo, 'tipo', i.tipo, 'fecha_em', i.fecha_em,
                                    'tempo_estimado_min', i.tempo_estimado_min) as x
            from public.participa_iniciativas i
           where i.organization_id = any (v_orgs)
             and i.status = 'publicada'
             and (i.abre_em is null or i.abre_em <= now())
             and (i.fecha_em is null or i.fecha_em > now())
             and not exists (select 1 from public.participa_participacoes p where p.iniciativa_id = i.id and p.user_id = auth.uid())
             and public.participa_iniciativa_visivel(i.id)
           order by i.fecha_em nulls last
           limit 5) s;

  -- encontros, reuniões e assembleias que vêm aí (Participa)
  select coalesce(jsonb_agg(x order by (x->>'inicio') nulls last), '[]'::jsonb) into v_enc
    from (select jsonb_build_object('id', e.id, 'titulo', e.titulo, 'tipo', e.tipo, 'inicio', e.inicio, 'local', e.local,
                                    'inscricao_ate', e.inscricao_ate,
                                    'minha_inscricao', (select ins.status from public.participa_inscricoes ins
                                                         where ins.encontro_id = e.id and ins.user_id = auth.uid())) as x
            from public.participa_encontros e
           where e.organization_id = any (v_orgs)
             and e.status = 'publicado'
             and (e.inicio is null or e.inicio > now())
             and public.participa_encontro_visivel(e.id)
           order by e.inicio nulls last
           limit 5) s;

  -- Agenda Diária: últimos registros dos meus estudantes (o MESMO registro da Agenda Diária)
  select coalesce(jsonb_agg(x order by (x->>'publicado_em') desc), '[]'::jsonb) into v_diario
    from (select jsonb_build_object(
                   'id', r.id, 'titulo', r.titulo, 'categoria', r.categoria, 'prioridade', r.prioridade,
                   'estudante', coalesce(r.student_nome, r.class_nome), 'autor', coalesce(r.setor_expedidor, r.autor_nome),
                   'publicado_em', r.publicado_em, 'prazo', r.prazo, 'tipo_resposta', r.tipo_resposta,
                   'pendente', r.tipo_resposta <> 'nenhuma'
                               and not exists (select 1 from public.diario_respostas dr
                                                where dr.registro_id = r.id and dr.user_id = auth.uid()
                                                  and (dr.ciencia_em is not null or dr.respondido_em is not null))) as x
            from public.diario_registros r
           where r.organization_id = any (v_orgs)
             and r.status = 'publicado'
             and r.publicado_em > now() - interval '45 days'
             and public.diario_familia_ve(r.id)
           order by r.publicado_em desc
           limit 8) s;

  return jsonb_build_object('atendimentos', v_atend, 'participa', v_inic, 'encontros', v_enc, 'diario', v_diario);
end;
$$;

-- ---------------------------------------------------------------------
-- 6. Permissões das funções novas
-- ---------------------------------------------------------------------
revoke all on function public.participa_divulgar_mural(text, uuid) from public, anon;
revoke all on function public.participa_evolucao(uuid)            from public, anon;
revoke all on function public.ee_painel_familia()                 from public, anon;
grant execute on function public.participa_divulgar_mural(text, uuid) to authenticated;
grant execute on function public.participa_evolucao(uuid)            to authenticated;
grant execute on function public.ee_painel_familia()                 to authenticated;
grant execute on function public.participa_duplicar(uuid)            to authenticated;

notify pgrst, 'reload schema';
