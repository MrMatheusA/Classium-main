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
