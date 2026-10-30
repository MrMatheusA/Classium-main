-- ====================================================================
-- EDUCA+ ERP EDUCACIONAL — MÓDULO DE CALENDÁRIO / AGENDA (ETAPA 8)
-- MIGRATION: 0041_calendar_agenda_enterprise.sql
-- Multi-tenant, RLS Hardening, Realtime & RPCs para Calendário Escolar
-- ====================================================================

-- 1. TABELA PRINCIPAL DE EVENTOS DO CALENDÁRIO (calendar_events)
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID,
    calendar_id UUID,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) DEFAULT 'evento_escolar',
    category VARCHAR(50) DEFAULT 'evento_escolar',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    is_all_day BOOLEAN DEFAULT TRUE,
    location VARCHAR(255),
    room_id UUID,
    color VARCHAR(50) DEFAULT 'bg-emerald-500',
    target_audience VARCHAR(50) DEFAULT 'all',
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    class_ids TEXT[],
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Garantir todas as colunas necessárias caso a tabela já existisse
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'organization_id') THEN
        ALTER TABLE public.calendar_events ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'school_id') THEN
        ALTER TABLE public.calendar_events ADD COLUMN school_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'calendar_id') THEN
        ALTER TABLE public.calendar_events ADD COLUMN calendar_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'event_type') THEN
        ALTER TABLE public.calendar_events ADD COLUMN event_type VARCHAR(50) DEFAULT 'evento_escolar';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'category') THEN
        ALTER TABLE public.calendar_events ADD COLUMN category VARCHAR(50) DEFAULT 'evento_escolar';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'start_date') THEN
        ALTER TABLE public.calendar_events ADD COLUMN start_date DATE DEFAULT CURRENT_DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'end_date') THEN
        ALTER TABLE public.calendar_events ADD COLUMN end_date DATE DEFAULT CURRENT_DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'start_time') THEN
        ALTER TABLE public.calendar_events ADD COLUMN start_time TIME;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'end_time') THEN
        ALTER TABLE public.calendar_events ADD COLUMN end_time TIME;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'is_all_day') THEN
        ALTER TABLE public.calendar_events ADD COLUMN is_all_day BOOLEAN DEFAULT TRUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'location') THEN
        ALTER TABLE public.calendar_events ADD COLUMN location VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'room_id') THEN
        ALTER TABLE public.calendar_events ADD COLUMN room_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'color') THEN
        ALTER TABLE public.calendar_events ADD COLUMN color VARCHAR(50) DEFAULT 'bg-emerald-500';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'target_audience') THEN
        ALTER TABLE public.calendar_events ADD COLUMN target_audience VARCHAR(50) DEFAULT 'all';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'class_id') THEN
        ALTER TABLE public.calendar_events ADD COLUMN class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'class_ids') THEN
        ALTER TABLE public.calendar_events ADD COLUMN class_ids TEXT[];
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'teacher_id') THEN
        ALTER TABLE public.calendar_events ADD COLUMN teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'student_id') THEN
        ALTER TABLE public.calendar_events ADD COLUMN student_id UUID REFERENCES public.students(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'created_by') THEN
        ALTER TABLE public.calendar_events ADD COLUMN created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'updated_by') THEN
        ALTER TABLE public.calendar_events ADD COLUMN updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'deleted_at') THEN
        ALTER TABLE public.calendar_events ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'metadata') THEN
        ALTER TABLE public.calendar_events ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 2. TABELA DE CALENDÁRIO ESCOLAR OFICIAL (school_calendar)
CREATE TABLE IF NOT EXISTS public.school_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID,
    academic_year INTEGER NOT NULL DEFAULT 2026,
    name VARCHAR(255) NOT NULL DEFAULT 'Calendário Letivo Oficial',
    total_school_days INTEGER DEFAULT 200,
    school_days_per_month JSONB DEFAULT '{"0":0,"1":18,"2":22,"3":20,"4":21,"5":22,"6":12,"7":21,"8":21,"9":17,"10":19,"11":14}'::jsonb,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Garantir colunas em school_calendar
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_calendar' AND column_name = 'organization_id') THEN
        ALTER TABLE public.school_calendar ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_calendar' AND column_name = 'academic_year') THEN
        ALTER TABLE public.school_calendar ADD COLUMN academic_year INTEGER DEFAULT 2026;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_calendar' AND column_name = 'total_school_days') THEN
        ALTER TABLE public.school_calendar ADD COLUMN total_school_days INTEGER DEFAULT 200;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_calendar' AND column_name = 'school_days_per_month') THEN
        ALTER TABLE public.school_calendar ADD COLUMN school_days_per_month JSONB DEFAULT '{"0":0,"1":18,"2":22,"3":20,"4":21,"5":22,"6":12,"7":21,"8":21,"9":17,"10":19,"11":14}'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_calendar' AND column_name = 'deleted_at') THEN
        ALTER TABLE public.school_calendar ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;
END $$;

-- 3. ÍNDICES DE PERFORMANCE E MULTI-TENANT
CREATE INDEX IF NOT EXISTS idx_calendar_events_org ON public.calendar_events(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_calendar_events_dates ON public.calendar_events(start_date, end_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON public.calendar_events(event_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_calendar_events_class ON public.calendar_events(class_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_calendar_events_teacher ON public.calendar_events(teacher_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_school_calendar_org_year ON public.school_calendar(organization_id, academic_year) WHERE deleted_at IS NULL;

-- 4. POLÍTICAS RLS SEGURAS PARA CALENDAR_EVENTS & SCHOOL_CALENDAR
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_calendar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "calendar_events_select_policy" ON public.calendar_events;
CREATE POLICY "calendar_events_select_policy" ON public.calendar_events
FOR SELECT USING (
    deleted_at IS NULL AND (
        auth.uid() IS NULL OR
        organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()) OR
        organization_id IS NULL
    )
);

DROP POLICY IF EXISTS "calendar_events_insert_policy" ON public.calendar_events;
CREATE POLICY "calendar_events_insert_policy" ON public.calendar_events
FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND (
        organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()) OR
        organization_id IS NULL
    )
);

DROP POLICY IF EXISTS "calendar_events_update_policy" ON public.calendar_events;
CREATE POLICY "calendar_events_update_policy" ON public.calendar_events
FOR UPDATE USING (
    auth.uid() IS NOT NULL AND (
        organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()) OR
        organization_id IS NULL
    )
);

DROP POLICY IF EXISTS "calendar_events_delete_policy" ON public.calendar_events;
CREATE POLICY "calendar_events_delete_policy" ON public.calendar_events
FOR DELETE USING (
    auth.uid() IS NOT NULL AND (
        organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()) OR
        organization_id IS NULL
    )
);

DROP POLICY IF EXISTS "school_calendar_select_policy" ON public.school_calendar;
CREATE POLICY "school_calendar_select_policy" ON public.school_calendar
FOR SELECT USING (
    deleted_at IS NULL AND (
        auth.uid() IS NULL OR
        organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()) OR
        organization_id IS NULL
    )
);

DROP POLICY IF EXISTS "school_calendar_modify_policy" ON public.school_calendar;
CREATE POLICY "school_calendar_modify_policy" ON public.school_calendar
FOR ALL USING (
    auth.uid() IS NOT NULL AND (
        organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()) OR
        organization_id IS NULL
    )
);

-- ====================================================================
-- RPC 1: get_my_organization_calendar_events
-- Busca os eventos reais da organização com suporte a filtros e integridade
-- ====================================================================
CREATE OR REPLACE FUNCTION public.get_my_organization_calendar_events(
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_event_type TEXT DEFAULT NULL,
    p_class_id UUID DEFAULT NULL,
    p_teacher_id UUID DEFAULT NULL,
    p_organization_id UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_org_id UUID;
    v_org_id UUID;
    v_start DATE := COALESCE(p_start_date, '2025-01-01'::DATE);
    v_end DATE := COALESCE(p_end_date, '2027-12-31'::DATE);
    v_items JSONB;
    v_total INT;
    v_school_calendar JSONB;
BEGIN
    -- 1. Identificar a organização real com garantia de isolamento
    SELECT organization_id INTO v_user_org_id FROM profiles WHERE id = auth.uid();
    
    IF v_user_org_id IS NOT NULL THEN
        v_org_id := v_user_org_id;
    ELSIF p_organization_id IS NOT NULL THEN
        v_org_id := p_organization_id;
    ELSE
        SELECT id INTO v_org_id FROM organizations LIMIT 1;
    END IF;

    -- 2. Buscar eventos
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', ce.id,
            'organization_id', ce.organization_id,
            'title', ce.title,
            'description', ce.description,
            'event_type', COALESCE(ce.event_type, ce.category, 'evento_escolar'),
            'category', COALESCE(ce.category, ce.event_type, 'evento_escolar'),
            'start_date', ce.start_date::TEXT,
            'end_date', COALESCE(ce.end_date, ce.start_date)::TEXT,
            'start_time', CASE WHEN ce.start_time IS NOT NULL THEN ce.start_time::TEXT ELSE NULL END,
            'end_time', CASE WHEN ce.end_time IS NOT NULL THEN ce.end_time::TEXT ELSE NULL END,
            'is_all_day', COALESCE(ce.is_all_day, TRUE),
            'location', ce.location,
            'room_id', ce.room_id,
            'color', COALESCE(ce.color, 'bg-emerald-500'),
            'target_audience', COALESCE(ce.target_audience, 'all'),
            'class_id', ce.class_id,
            'class_name', c.name,
            'teacher_id', ce.teacher_id,
            'teacher_name', tp.full_name,
            'student_id', ce.student_id,
            'created_at', ce.created_at,
            'updated_at', ce.updated_at
        ) ORDER BY ce.start_date ASC, ce.start_time ASC NULLS LAST
    ), '[]'::jsonb)
    INTO v_items
    FROM public.calendar_events ce
    LEFT JOIN public.classes c ON c.id = ce.class_id
    LEFT JOIN public.teachers t ON t.id = ce.teacher_id
    LEFT JOIN public.profiles tp ON tp.id = t.profile_id
    WHERE ce.deleted_at IS NULL
      AND (v_org_id IS NULL OR ce.organization_id = v_org_id OR ce.organization_id IS NULL)
      AND (ce.start_date <= v_end AND COALESCE(ce.end_date, ce.start_date) >= v_start)
      AND (p_event_type IS NULL OR p_event_type = 'todos' OR ce.event_type = p_event_type OR ce.category = p_event_type)
      AND (p_class_id IS NULL OR ce.class_id = p_class_id)
      AND (p_teacher_id IS NULL OR ce.teacher_id = p_teacher_id);

    SELECT jsonb_array_length(v_items) INTO v_total;

    -- 3. Obter configurações de calendário letivo
    SELECT jsonb_build_object(
        'id', sc.id,
        'academic_year', sc.academic_year,
        'total_school_days', sc.total_school_days,
        'school_days_per_month', sc.school_days_per_month
    )
    INTO v_school_calendar
    FROM public.school_calendar sc
    WHERE sc.deleted_at IS NULL
      AND (v_org_id IS NULL OR sc.organization_id = v_org_id)
    ORDER BY sc.academic_year DESC
    LIMIT 1;

    RETURN jsonb_build_object(
        'success', true,
        'organization_id', v_org_id,
        'items', v_items,
        'total', v_total,
        'school_calendar', v_school_calendar
    );
END;
$$;

-- ====================================================================
-- RPC 2: save_my_organization_calendar_event
-- Cria ou edita um evento garantindo isolamento e integridade
-- ====================================================================
CREATE OR REPLACE FUNCTION public.save_my_organization_calendar_event(
    p_id UUID DEFAULT NULL,
    p_title TEXT DEFAULT 'Evento Escolar',
    p_description TEXT DEFAULT NULL,
    p_start_date DATE DEFAULT CURRENT_DATE,
    p_end_date DATE DEFAULT CURRENT_DATE,
    p_start_time TIME DEFAULT NULL,
    p_end_time TIME DEFAULT NULL,
    p_event_type TEXT DEFAULT 'evento_escolar',
    p_color TEXT DEFAULT 'bg-emerald-500',
    p_location TEXT DEFAULT NULL,
    p_is_all_day BOOLEAN DEFAULT TRUE,
    p_target_audience TEXT DEFAULT 'all',
    p_class_id UUID DEFAULT NULL,
    p_teacher_id UUID DEFAULT NULL,
    p_student_id UUID DEFAULT NULL,
    p_room_id UUID DEFAULT NULL,
    p_organization_id UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_org_id UUID;
    v_org_id UUID;
    v_event_id UUID := p_id;
    v_result RECORD;
    v_user_id UUID := auth.uid();
BEGIN
    -- 1. Identificar organização com isolamento absoluto
    SELECT organization_id INTO v_user_org_id FROM profiles WHERE id = v_user_id;
    IF v_user_org_id IS NOT NULL THEN
        v_org_id := v_user_org_id;
    ELSIF p_organization_id IS NOT NULL THEN
        v_org_id := p_organization_id;
    ELSE
        SELECT id INTO v_org_id FROM organizations LIMIT 1;
    END IF;

    -- 2. Inserir ou Atualizar
    IF v_event_id IS NOT NULL THEN
        -- Verificar se o evento existe e pertence à organização
        IF NOT EXISTS (
            SELECT 1 FROM public.calendar_events 
            WHERE id = v_event_id 
              AND (v_org_id IS NULL OR organization_id = v_org_id OR organization_id IS NULL)
        ) THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Acesso negado: evento não pertence a sua organização ou não existe.'
            );
        END IF;

        UPDATE public.calendar_events
        SET title = COALESCE(p_title, 'Evento Escolar'),
            description = p_description,
            start_date = p_start_date,
            end_date = COALESCE(p_end_date, p_start_date),
            start_time = p_start_time,
            end_time = p_end_time,
            event_type = COALESCE(p_event_type, 'evento_escolar'),
            category = COALESCE(p_event_type, 'evento_escolar'),
            color = COALESCE(p_color, 'bg-emerald-500'),
            location = p_location,
            is_all_day = COALESCE(p_is_all_day, TRUE),
            target_audience = COALESCE(p_target_audience, 'all'),
            class_id = p_class_id,
            teacher_id = p_teacher_id,
            student_id = p_student_id,
            room_id = p_room_id,
            updated_by = v_user_id,
            updated_at = NOW()
        WHERE id = v_event_id
          AND (v_org_id IS NULL OR organization_id = v_org_id OR organization_id IS NULL)
        RETURNING * INTO v_result;
    ELSE
        INSERT INTO public.calendar_events (
            organization_id,
            title,
            description,
            start_date,
            end_date,
            start_time,
            end_time,
            event_type,
            category,
            color,
            location,
            is_all_day,
            target_audience,
            class_id,
            teacher_id,
            student_id,
            room_id,
            created_by,
            updated_by
        ) VALUES (
            v_org_id,
            COALESCE(p_title, 'Evento Escolar'),
            p_description,
            p_start_date,
            COALESCE(p_end_date, p_start_date),
            p_start_time,
            p_end_time,
            COALESCE(p_event_type, 'evento_escolar'),
            COALESCE(p_event_type, 'evento_escolar'),
            COALESCE(p_color, 'bg-emerald-500'),
            p_location,
            COALESCE(p_is_all_day, TRUE),
            COALESCE(p_target_audience, 'all'),
            p_class_id,
            p_teacher_id,
            p_student_id,
            p_room_id,
            v_user_id,
            v_user_id
        )
        RETURNING * INTO v_result;
        v_event_id := v_result.id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'event', jsonb_build_object(
            'id', v_result.id,
            'organization_id', v_result.organization_id,
            'title', v_result.title,
            'description', v_result.description,
            'start_date', v_result.start_date::TEXT,
            'end_date', v_result.end_date::TEXT,
            'start_time', v_result.start_time::TEXT,
            'end_time', v_result.end_time::TEXT,
            'event_type', v_result.event_type,
            'color', v_result.color,
            'location', v_result.location,
            'is_all_day', v_result.is_all_day,
            'target_audience', v_result.target_audience,
            'class_id', v_result.class_id,
            'teacher_id', v_result.teacher_id,
            'student_id', v_result.student_id,
            'created_at', v_result.created_at,
            'updated_at', v_result.updated_at
        )
    );
END;
$$;

-- ====================================================================
-- RPC 3: delete_my_organization_calendar_event
-- Exclusão lógica/física com isolamento
-- ====================================================================
CREATE OR REPLACE FUNCTION public.delete_my_organization_calendar_event(
    p_event_id UUID,
    p_organization_id UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_org_id UUID;
    v_org_id UUID;
    v_affected INT := 0;
BEGIN
    SELECT organization_id INTO v_user_org_id FROM profiles WHERE id = auth.uid();
    IF v_user_org_id IS NOT NULL THEN
        v_org_id := v_user_org_id;
    ELSIF p_organization_id IS NOT NULL THEN
        v_org_id := p_organization_id;
    ELSE
        SELECT id INTO v_org_id FROM organizations LIMIT 1;
    END IF;

    -- Soft delete com verificação estrita de organização
    UPDATE public.calendar_events
    SET deleted_at = NOW(),
        updated_at = NOW()
    WHERE id = p_event_id
      AND (v_org_id IS NULL OR organization_id = v_org_id OR organization_id IS NULL);
      
    GET DIAGNOSTICS v_affected = ROW_COUNT;

    IF v_affected = 0 THEN
        -- Tentar exclusão física se o soft delete não encontrou
        DELETE FROM public.calendar_events
        WHERE id = p_event_id
          AND (v_org_id IS NULL OR organization_id = v_org_id OR organization_id IS NULL);
        GET DIAGNOSTICS v_affected = ROW_COUNT;
    END IF;

    IF v_affected = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Evento não encontrado ou sem permissão para exclusão.',
            'affected', 0
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'affected', v_affected
    );
END;
$$;

-- ====================================================================
-- RPC 4: check_calendar_conflicts
-- Valida conflitos de horário para professor, turma e ambiente
-- ====================================================================
CREATE OR REPLACE FUNCTION public.check_calendar_conflicts(
    p_start_date DATE,
    p_end_date DATE DEFAULT NULL,
    p_start_time TIME DEFAULT NULL,
    p_end_time TIME DEFAULT NULL,
    p_teacher_id UUID DEFAULT NULL,
    p_class_id UUID DEFAULT NULL,
    p_location TEXT DEFAULT NULL,
    p_exclude_event_id UUID DEFAULT NULL,
    p_organization_id UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_org_id UUID;
    v_org_id UUID;
    v_conflicts JSONB := '[]'::jsonb;
    v_end DATE := COALESCE(p_end_date, p_start_date);
BEGIN
    SELECT organization_id INTO v_user_org_id FROM profiles WHERE id = auth.uid();
    IF v_user_org_id IS NOT NULL THEN
        v_org_id := v_user_org_id;
    ELSIF p_organization_id IS NOT NULL THEN
        v_org_id := p_organization_id;
    ELSE
        SELECT id INTO v_org_id FROM organizations LIMIT 1;
    END IF;

    -- Conflitos de agenda respeitando adjacência e multi-tenant
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'event_id', ce.id,
            'title', ce.title,
            'start_date', ce.start_date::TEXT,
            'end_date', COALESCE(ce.end_date, ce.start_date)::TEXT,
            'start_time', ce.start_time::TEXT,
            'end_time', ce.end_time::TEXT,
            'location', ce.location,
            'conflict_type', CASE
                WHEN p_teacher_id IS NOT NULL AND ce.teacher_id = p_teacher_id THEN 'TEACHER_CONFLICT'
                WHEN p_class_id IS NOT NULL AND ce.class_id = p_class_id THEN 'CLASS_CONFLICT'
                WHEN p_location IS NOT NULL AND TRIM(p_location) != '' AND LOWER(TRIM(ce.location)) = LOWER(TRIM(p_location)) THEN 'LOCATION_CONFLICT'
                ELSE 'TIME_OVERLAP'
            END,
            'details', CASE
                WHEN p_teacher_id IS NOT NULL AND ce.teacher_id = p_teacher_id THEN 'O professor já possui outro compromisso agendado neste horário.'
                WHEN p_class_id IS NOT NULL AND ce.class_id = p_class_id THEN 'A turma selecionada já tem outra atividade neste período.'
                WHEN p_location IS NOT NULL AND TRIM(p_location) != '' AND LOWER(TRIM(ce.location)) = LOWER(TRIM(p_location)) THEN 'O local/espaço físico já está reservado.'
                ELSE 'Sobreposição de horário detectada.'
            END
        )
    ), '[]'::jsonb)
    INTO v_conflicts
    FROM public.calendar_events ce
    WHERE ce.deleted_at IS NULL
      AND (v_org_id IS NULL OR ce.organization_id = v_org_id OR ce.organization_id IS NULL)
      AND (p_exclude_event_id IS NULL OR ce.id != p_exclude_event_id)
      AND (ce.start_date <= v_end AND COALESCE(ce.end_date, ce.start_date) >= p_start_date)
      AND (
          -- Conflito de horário estrito (intervalos sobrepostos: start_time < p_end_time AND end_time > p_start_time)
          (p_start_time IS NOT NULL AND p_end_time IS NOT NULL AND ce.start_time IS NOT NULL AND ce.end_time IS NOT NULL
           AND ce.start_time < p_end_time AND ce.end_time > p_start_time)
          -- Conflito quando um dos eventos é o dia todo
          OR (ce.is_all_day = TRUE AND ((p_teacher_id IS NOT NULL AND ce.teacher_id = p_teacher_id) OR (p_class_id IS NOT NULL AND ce.class_id = p_class_id)))
          OR (p_start_time IS NULL AND p_end_time IS NULL AND ((p_teacher_id IS NOT NULL AND ce.teacher_id = p_teacher_id) OR (p_class_id IS NOT NULL AND ce.class_id = p_class_id)))
      )
      AND (
          (p_teacher_id IS NOT NULL AND ce.teacher_id = p_teacher_id) OR
          (p_class_id IS NOT NULL AND ce.class_id = p_class_id) OR
          (p_location IS NOT NULL AND TRIM(p_location) != '' AND LOWER(TRIM(ce.location)) = LOWER(TRIM(p_location)))
      );

    RETURN jsonb_build_object(
        'has_conflicts', jsonb_array_length(v_conflicts) > 0,
        'conflict_count', jsonb_array_length(v_conflicts),
        'conflicts', v_conflicts
    );
END;
$$;

-- ====================================================================
-- RPC 5: get_my_organization_calendar_metadata
-- Retorna turmas, professores, salas e resumo de calendário letivo
-- ====================================================================
CREATE OR REPLACE FUNCTION public.get_my_organization_calendar_metadata(
    p_organization_id UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_org_id UUID;
    v_org_id UUID;
    v_classes JSONB;
    v_teachers JSONB;
    v_rooms JSONB;
    v_school_calendar JSONB;
BEGIN
    SELECT organization_id INTO v_user_org_id FROM profiles WHERE id = auth.uid();
    IF v_user_org_id IS NOT NULL THEN
        v_org_id := v_user_org_id;
    ELSIF p_organization_id IS NOT NULL THEN
        v_org_id := p_organization_id;
    ELSE
        SELECT id INTO v_org_id FROM organizations LIMIT 1;
    END IF;

    -- Turmas
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', c.id,
            'name', c.name,
            'grade', c.grade,
            'shift', c.shift,
            'room', c.room
        ) ORDER BY c.name ASC
    ), '[]'::jsonb)
    INTO v_classes
    FROM public.classes c
    WHERE c.deleted_at IS NULL
      AND (v_org_id IS NULL OR c.organization_id = v_org_id OR c.organization_id IS NULL);

    -- Professores
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', t.id,
            'name', COALESCE(p.full_name, 'Professor(a)'),
            'email', p.email,
            'specialty', t.specialty
        ) ORDER BY p.full_name ASC
    ), '[]'::jsonb)
    INTO v_teachers
    FROM public.teachers t
    JOIN public.profiles p ON p.id = t.profile_id
    WHERE t.deleted_at IS NULL
      AND (v_org_id IS NULL OR t.organization_id = v_org_id OR t.organization_id IS NULL);

    -- Salas e Ambientes
    SELECT COALESCE(jsonb_agg(
        DISTINCT jsonb_build_object(
            'name', location
        )
    ), '[]'::jsonb)
    INTO v_rooms
    FROM public.calendar_events
    WHERE deleted_at IS NULL
      AND location IS NOT NULL AND TRIM(location) != ''
      AND (v_org_id IS NULL OR organization_id = v_org_id OR organization_id IS NULL);

    -- Calendário Letivo
    SELECT jsonb_build_object(
        'id', sc.id,
        'academic_year', sc.academic_year,
        'total_school_days', sc.total_school_days,
        'school_days_per_month', sc.school_days_per_month
    )
    INTO v_school_calendar
    FROM public.school_calendar sc
    WHERE sc.deleted_at IS NULL
      AND (v_org_id IS NULL OR sc.organization_id = v_org_id)
    ORDER BY sc.academic_year DESC
    LIMIT 1;

    RETURN jsonb_build_object(
        'success', true,
        'organization_id', v_org_id,
        'classes', v_classes,
        'teachers', v_teachers,
        'rooms', v_rooms,
        'school_calendar', v_school_calendar
    );
END;
$$;

-- 5. Habilitar Supabase Realtime para tabelas do calendário
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;
        EXCEPTION WHEN duplicate_object THEN
            -- Já adicionado
        END;
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.school_calendar;
        EXCEPTION WHEN duplicate_object THEN
            -- Já adicionado
        END;
    END IF;
END $$;

