-- =====================================================================
-- CLASSIUM — IA DO GERADOR DE ATIVIDADES (Gemini, Groq e OpenRouter)
-- Tudo pelo SQL Editor (sem Edge Function). As chaves ficam no cofre
-- (Vault) do Supabase e NUNCA vão para o navegador.
--
-- Como funciona:
--   app → supabase.rpc('ia_gerar') → o banco chama a IA com pg_net
--   app → supabase.rpc('ia_resultado') a cada 1,5 s até ficar pronto
--   Se uma IA falhar ou bater o limite gratuito, o banco tenta a próxima.
--
-- Depois de rodar este arquivo, cadastre as chaves (passo no FINAL).
-- Pode rodar quantas vezes quiser.
-- =====================================================================

set lock_timeout = '10s';
create extension if not exists pg_net;

-- ---------------------------------------------------------------------
-- 1. Configuração (modelos e limites; dá para mudar sem mexer no app)
-- ---------------------------------------------------------------------
create table if not exists public.ia_config (
  chave text primary key,
  valor text not null
);
alter table public.ia_config enable row level security;
revoke all on public.ia_config from anon, authenticated;

insert into public.ia_config (chave, valor) values
  ('ordem',                 'gemini,groq,openrouter'),     -- ordem do "Automático"
  ('gemini_modelo',         'gemini-flash-latest'),        -- apelido do Flash atual (grátis)
  ('groq_modelo',           'llama-3.3-70b-versatile'),
  ('openrouter_modelo',     'openrouter/free'),            -- roteador dos modelos gratuitos
  ('limite_diario_usuario', '40'),                         -- pedidos por pessoa por dia
  ('max_tokens',            '8000'),
  ('tempo_limite_seg',      '90')
on conflict (chave) do nothing;

create or replace function public.ia_cfg(p_chave text, p_padrao text default null)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select valor from public.ia_config where chave = p_chave), p_padrao);
$$;

-- ---------------------------------------------------------------------
-- 2. Pedidos (histórico de uso; cada pessoa só vê os seus)
-- ---------------------------------------------------------------------
create table if not exists public.ia_pedidos (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid(),
  organization_id uuid,
  finalidade      text not null default 'atividade',
  motor_pedido    text not null default 'auto',
  json            boolean not null default true,
  sistema         text,
  prompt          text not null,
  provedores      text[] not null,
  tentativa       int not null default 1,
  provedor_atual  text,
  modelo_atual    text,
  request_id      bigint,
  enviado_em      timestamptz,
  status          text not null default 'processando' check (status in ('processando', 'concluido', 'erro')),
  resultado       text,
  erro            text,
  falhas          jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now(),
  concluido_em    timestamptz
);
create index if not exists ia_pedidos_user_dia on public.ia_pedidos (user_id, created_at desc);
alter table public.ia_pedidos enable row level security;
drop policy if exists ia_pedidos_meus on public.ia_pedidos;
create policy ia_pedidos_meus on public.ia_pedidos for select to authenticated using (user_id = auth.uid());
revoke all on public.ia_pedidos from anon, authenticated;
grant select on public.ia_pedidos to authenticated;

-- ---------------------------------------------------------------------
-- 3. Chaves no cofre
-- ---------------------------------------------------------------------
create or replace function public.ia_chave(p_prov text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v text;
begin
  select decrypted_secret into v from vault.decrypted_secrets where name = 'ia_' || p_prov || '_key' limit 1;
  return nullif(trim(coalesce(v, '')), '');
exception when others then
  return null;
end;
$$;

-- Cadastra ou troca uma chave (só pelo SQL Editor)
create or replace function public.ia_definir_chave(p_prov text, p_chave text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_prov not in ('gemini', 'groq', 'openrouter') then
    raise exception 'Provedor inválido. Use gemini, groq ou openrouter.';
  end if;
  if coalesce(trim(p_chave), '') = '' or p_chave like 'COLE_%' then
    return p_prov || ': chave não informada (ignorado)';
  end if;
  select id into v_id from vault.secrets where name = 'ia_' || p_prov || '_key' limit 1;
  if v_id is null then
    perform vault.create_secret(trim(p_chave), 'ia_' || p_prov || '_key');
  else
    perform vault.update_secret(v_id, trim(p_chave));
  end if;
  return p_prov || ': chave salva';
end;
$$;
revoke all on function public.ia_definir_chave(text, text) from public, anon, authenticated;
revoke all on function public.ia_chave(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. Quem pode usar: docentes, gestão e administração
-- ---------------------------------------------------------------------
create or replace function public.ia_pode_usar()
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
  if public.ee_e_super() then
    return true;
  end if;
  select papel into v_papel from public.ee_meu_perfil() limit 1;
  if coalesce(v_papel, '') = any (public.ee_lista('papeis_docente') || public.ee_lista('papeis_gestor')) then
    return true;
  end if;
  if exists (select 1 from public.ee_membros m where m.user_id = auth.uid() and m.papel in ('gestor', 'docente')) then
    return true;
  end if;
  if to_regclass('public.teachers') is not null then
    begin
      if exists (select 1 from public.teachers t
                  where to_jsonb(t) ->> 'profile_id' = auth.uid()::text
                     or to_jsonb(t) ->> 'user_id' = auth.uid()::text
                     or lower(coalesce(to_jsonb(t) ->> 'email', '')) = lower(coalesce(auth.jwt() ->> 'email', '-'))) then
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
-- 5. Motores disponíveis (o app mostra quais estão configurados)
-- ---------------------------------------------------------------------
create or replace function public.ia_motores()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ordem text[] := string_to_array(replace(public.ia_cfg('ordem', 'gemini,groq,openrouter'), ' ', ''), ',');
begin
  return jsonb_build_object(
    'pode_usar', public.ia_pode_usar(),
    'ordem', to_jsonb(v_ordem),
    'limite_diario', public.ia_cfg('limite_diario_usuario', '40')::int,
    'usados_hoje', (select count(*) from public.ia_pedidos
                     where user_id = auth.uid() and created_at >= date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'),
    'motores', jsonb_build_array(
      jsonb_build_object('id', 'gemini',     'nome', 'Google Gemini',  'modelo', public.ia_cfg('gemini_modelo'),     'configurado', public.ia_chave('gemini') is not null),
      jsonb_build_object('id', 'groq',       'nome', 'Groq (Llama)',   'modelo', public.ia_cfg('groq_modelo'),       'configurado', public.ia_chave('groq') is not null),
      jsonb_build_object('id', 'openrouter', 'nome', 'OpenRouter',     'modelo', public.ia_cfg('openrouter_modelo'), 'configurado', public.ia_chave('openrouter') is not null)
    ));
end;
$$;

-- ---------------------------------------------------------------------
-- 6. Envia o pedido para o provedor da vez (assíncrono, pg_net)
-- ---------------------------------------------------------------------
create or replace function public.ia_disparar(p_pedido uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  p        public.ia_pedidos;
  v_prov   text;
  v_chave  text;
  v_modelo text;
  v_max    int := coalesce(nullif(public.ia_cfg('max_tokens', '8000'), '')::int, 8000);
  v_tempo  int := coalesce(nullif(public.ia_cfg('tempo_limite_seg', '90'), '')::int, 90) * 1000;
  v_req    bigint;
  v_msgs   jsonb;
  v_body   jsonb;
begin
  select * into p from public.ia_pedidos where id = p_pedido for update;
  if not found then
    return null;
  end if;
  v_prov  := p.provedores[p.tentativa];
  v_chave := public.ia_chave(v_prov);
  if v_prov is null or v_chave is null then
    update public.ia_pedidos set status = 'erro', erro = 'Nenhuma IA disponível para este pedido.', concluido_em = now() where id = p.id;
    return null;
  end if;

  v_msgs := jsonb_build_array(
              jsonb_build_object('role', 'system', 'content', coalesce(p.sistema, '')),
              jsonb_build_object('role', 'user',   'content', p.prompt));

  if v_prov = 'gemini' then
    v_modelo := public.ia_cfg('gemini_modelo', 'gemini-flash-latest');
    v_body := jsonb_build_object(
      'contents', jsonb_build_array(jsonb_build_object('role', 'user', 'parts', jsonb_build_array(jsonb_build_object('text', p.prompt)))),
      'generationConfig', jsonb_build_object('temperature', 0.7, 'maxOutputTokens', v_max)
                          || case when p.json then jsonb_build_object('responseMimeType', 'application/json') else '{}'::jsonb end);
    if coalesce(p.sistema, '') <> '' then
      v_body := v_body || jsonb_build_object('systemInstruction', jsonb_build_object('parts', jsonb_build_array(jsonb_build_object('text', p.sistema))));
    end if;
    select net.http_post(
      url := 'https://generativelanguage.googleapis.com/v1beta/models/' || v_modelo || ':generateContent',
      body := v_body,
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-goog-api-key', v_chave),
      timeout_milliseconds := v_tempo
    ) into v_req;

  elsif v_prov = 'groq' then
    v_modelo := public.ia_cfg('groq_modelo', 'llama-3.3-70b-versatile');
    v_body := jsonb_build_object('model', v_modelo, 'messages', v_msgs, 'temperature', 0.7, 'max_tokens', least(v_max, 8000))
              || case when p.json then jsonb_build_object('response_format', jsonb_build_object('type', 'json_object')) else '{}'::jsonb end;
    select net.http_post(
      url := 'https://api.groq.com/openai/v1/chat/completions',
      body := v_body,
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_chave),
      timeout_milliseconds := v_tempo
    ) into v_req;

  elsif v_prov = 'openrouter' then
    v_modelo := public.ia_cfg('openrouter_modelo', 'openrouter/free');
    v_body := jsonb_build_object('model', v_modelo, 'messages', v_msgs, 'temperature', 0.7, 'max_tokens', v_max);
    select net.http_post(
      url := 'https://openrouter.ai/api/v1/chat/completions',
      body := v_body,
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_chave,
                                    'X-Title', 'Classium - Gerador de Atividades'),
      timeout_milliseconds := v_tempo
    ) into v_req;
  else
    update public.ia_pedidos set status = 'erro', erro = 'Provedor desconhecido: ' || v_prov, concluido_em = now() where id = p.id;
    return null;
  end if;

  update public.ia_pedidos
     set request_id = v_req, enviado_em = now(), provedor_atual = v_prov, modelo_atual = v_modelo
   where id = p.id;
  return v_req;
end;
$$;
revoke all on function public.ia_disparar(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 7. Pede uma geração. Devolve o id do pedido.
--    p_motor: 'auto' (melhor disponível) ou 'gemini' | 'groq' | 'openrouter'
--    (a escolhida vem primeiro; as outras configuradas ficam de reserva)
-- ---------------------------------------------------------------------
create or replace function public.ia_gerar(
  p_finalidade text,
  p_sistema    text,
  p_prompt     text,
  p_motor      text default 'auto',
  p_org        uuid default null,
  p_json       boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ordem  text[] := string_to_array(replace(public.ia_cfg('ordem', 'gemini,groq,openrouter'), ' ', ''), ',');
  v_lista  text[] := '{}';
  v_prov   text;
  v_limite int := coalesce(nullif(public.ia_cfg('limite_diario_usuario', '40'), '')::int, 40);
  v_hoje   int;
  v_id     uuid;
begin
  if not public.ia_pode_usar() then
    raise exception 'A IA do gerador é para professores e equipe da escola.' using errcode = '42501';
  end if;
  if coalesce(trim(p_prompt), '') = '' then
    raise exception 'Pedido vazio.';
  end if;
  if length(p_prompt) + length(coalesce(p_sistema, '')) > 60000 then
    raise exception 'Pedido muito grande. Resuma o texto-base.';
  end if;

  select count(*) into v_hoje from public.ia_pedidos
   where user_id = auth.uid() and created_at >= date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
  if v_hoje >= v_limite then
    raise exception 'Você chegou ao limite de % gerações por dia. Amanhã libera de novo.', v_limite;
  end if;

  -- fila: a escolhida primeiro, depois as demais na ordem configurada
  if coalesce(p_motor, 'auto') <> 'auto' then
    v_lista := array[p_motor];
  end if;
  foreach v_prov in array v_ordem loop
    if not (v_prov = any (v_lista)) then
      v_lista := v_lista || v_prov;
    end if;
  end loop;
  select coalesce(array_agg(x order by o), '{}') into v_lista
    from unnest(v_lista) with ordinality u(x, o)
   where public.ia_chave(x) is not null;

  if coalesce(array_length(v_lista, 1), 0) = 0 then
    raise exception 'Nenhuma IA configurada. Peça à administração para cadastrar as chaves (Gemini, Groq ou OpenRouter).';
  end if;

  insert into public.ia_pedidos (organization_id, finalidade, motor_pedido, json, sistema, prompt, provedores)
  values (p_org, left(coalesce(p_finalidade, 'atividade'), 40), coalesce(p_motor, 'auto'), coalesce(p_json, true), p_sistema, p_prompt, v_lista)
  returning id into v_id;

  perform public.ia_disparar(v_id);
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 8. Resultado. O app chama a cada 1,5 s.
--    Se o provedor falhou (limite gratuito, chave, fora do ar), tenta o próximo.
-- ---------------------------------------------------------------------
create or replace function public.ia_resultado(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p        public.ia_pedidos;
  r        record;
  j        jsonb;
  v_texto  text;
  v_falha  text;
  v_tempo  int := coalesce(nullif(public.ia_cfg('tempo_limite_seg', '90'), '')::int, 90);
  v_nomes  jsonb := '{"gemini":"Gemini","groq":"Groq","openrouter":"OpenRouter"}'::jsonb;
begin
  select * into p from public.ia_pedidos where id = p_id for update;
  if not found or p.user_id <> auth.uid() then
    raise exception 'Pedido não encontrado.';
  end if;

  if p.status = 'concluido' then
    return jsonb_build_object('status', 'concluido', 'texto', p.resultado, 'provedor', p.provedor_atual, 'modelo', p.modelo_atual);
  elsif p.status = 'erro' then
    return jsonb_build_object('status', 'erro', 'erro', p.erro, 'falhas', p.falhas);
  end if;

  select status_code, content, error_msg, timed_out into r
    from net._http_response where id = p.request_id;

  if not found then
    -- ainda sem resposta
    if p.enviado_em is not null and p.enviado_em < now() - make_interval(secs => v_tempo + 15) then
      v_falha := 'sem resposta a tempo';
    else
      return jsonb_build_object('status', 'processando', 'provedor', p.provedor_atual, 'nome', v_nomes ->> p.provedor_atual, 'tentativa', p.tentativa);
    end if;
  elsif coalesce(r.status_code, 0) between 200 and 299 then
    begin
      j := r.content::jsonb;
      if p.provedor_atual = 'gemini' then
        select string_agg(x ->> 'text', '') into v_texto
          from jsonb_array_elements(coalesce(j #> '{candidates,0,content,parts}', '[]'::jsonb)) x;
        if v_texto is null and j #>> '{candidates,0,finishReason}' is not null then
          v_falha := 'resposta bloqueada (' || (j #>> '{candidates,0,finishReason}') || ')';
        end if;
      else
        v_texto := j #>> '{choices,0,message,content}';
      end if;
    exception when others then
      v_falha := 'resposta ilegível';
    end;
    if v_falha is null and coalesce(trim(v_texto), '') = '' then
      v_falha := 'resposta vazia';
    end if;
    if v_falha is null then
      update public.ia_pedidos set status = 'concluido', resultado = v_texto, concluido_em = now() where id = p.id;
      return jsonb_build_object('status', 'concluido', 'texto', v_texto, 'provedor', p.provedor_atual, 'modelo', p.modelo_atual);
    end if;
  else
    begin
      j := r.content::jsonb;
    exception when others then
      j := null;
    end;
    v_falha := case
                 when r.timed_out then 'tempo esgotado'
                 when r.status_code = 429 then 'limite do plano gratuito atingido'
                 when r.status_code in (401, 403) then 'chave inválida ou sem permissão'
                 when r.status_code = 404 then 'modelo não encontrado (' || coalesce(p.modelo_atual, '?') || ')'
                 when r.status_code >= 500 then 'serviço fora do ar'
                 else 'erro ' || coalesce(r.status_code::text, '?')
               end
               || coalesce(': ' || left(coalesce(j #>> '{error,message}', j #>> '{0,error,message}', r.error_msg), 200), '');
  end if;

  -- falhou: registra e tenta o próximo provedor
  update public.ia_pedidos
     set falhas = falhas || jsonb_build_object('provedor', p.provedor_atual, 'motivo', v_falha, 'em', now()),
         tentativa = tentativa + 1
   where id = p.id
   returning * into p;

  if p.tentativa <= coalesce(array_length(p.provedores, 1), 0) then
    perform public.ia_disparar(p.id);
    select * into p from public.ia_pedidos where id = p.id;
    if p.status = 'processando' then
      return jsonb_build_object('status', 'processando', 'provedor', p.provedor_atual, 'nome', v_nomes ->> p.provedor_atual,
                                'tentativa', p.tentativa,
                                'aviso', format('%s indisponível (%s). Tentando %s…',
                                                v_nomes ->> p.provedores[p.tentativa - 1], v_falha, v_nomes ->> p.provedor_atual));
    end if;
  end if;

  update public.ia_pedidos
     set status = 'erro',
         erro = 'Não foi possível gerar agora. ' || (select string_agg((f ->> 'provedor') || ': ' || (f ->> 'motivo'), ' · ') from jsonb_array_elements(falhas) f),
         concluido_em = now()
   where id = p.id
   returning * into p;
  return jsonb_build_object('status', 'erro', 'erro', p.erro, 'falhas', p.falhas);
end;
$$;

-- ---------------------------------------------------------------------
-- 9. Permissões
-- ---------------------------------------------------------------------
revoke all on function public.ia_cfg(text, text) from public, anon, authenticated;
revoke all on function public.ia_pode_usar()     from public, anon;
revoke all on function public.ia_motores()       from public, anon;
revoke all on function public.ia_gerar(text, text, text, text, uuid, boolean) from public, anon;
revoke all on function public.ia_resultado(uuid) from public, anon;
grant execute on function public.ia_pode_usar()  to authenticated;
grant execute on function public.ia_motores()    to authenticated;
grant execute on function public.ia_gerar(text, text, text, text, uuid, boolean) to authenticated;
grant execute on function public.ia_resultado(uuid) to authenticated;

-- limpeza: histórico de pedidos com mais de 90 dias (todo dia às 3h)
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'ia_limpeza';
    perform cron.schedule('ia_limpeza', '0 6 * * *', $c$delete from public.ia_pedidos where created_at < now() - interval '90 days'$c$);
  end if;
exception when others then
  null;
end $$;

notify pgrst, 'reload schema';

-- =====================================================================
-- PASSO FINAL — CADASTRE AS CHAVES (todas gratuitas, sem cartão)
--
--   Gemini:     https://aistudio.google.com/apikey        → "Create API key"
--   Groq:       https://console.groq.com/keys              → "Create API Key"
--   OpenRouter: https://openrouter.ai/settings/keys        → "Create Key"
--
-- Troque o texto COLE_... pela chave e rode só estas 3 linhas.
-- Pode deixar alguma sem chave: o sistema usa as que estiverem cadastradas.
-- Para trocar uma chave depois, rode a linha de novo com a chave nova.
-- =====================================================================
-- select public.ia_definir_chave('gemini',     'COLE_A_CHAVE_DO_GEMINI_AQUI');
-- select public.ia_definir_chave('groq',       'COLE_A_CHAVE_DA_GROQ_AQUI');
-- select public.ia_definir_chave('openrouter', 'COLE_A_CHAVE_DO_OPENROUTER_AQUI');
--
-- Conferir quais estão configuradas:
-- select name, length(decrypted_secret) as tamanho from vault.decrypted_secrets where name like 'ia_%';
