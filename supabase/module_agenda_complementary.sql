-- ====================================================================
-- EDUCA+ ERP EDUCACIONAL — COMPLEMENTO DO MÓDULO AGENDA
-- SCRIPT SQL PRODUCTION-READY COM MULTI-TENANT E REALTIME
-- ====================================================================

-- 1. CONFIGURAÇÕES DA AGENDA (calendar_settings)
CREATE TABLE IF NOT EXISTS public.calendar_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    default_view VARCHAR(50) DEFAULT 'MONTH',
    allow_student_events BOOLEAN DEFAULT FALSE,
    allow_family_events BOOLEAN DEFAULT FALSE,
    reminder_defaults JSONB DEFAULT '{"push": true, "email": false}'::jsonb,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. CALENDÁRIO DE FERIADOS (holiday_calendar)
CREATE TABLE IF NOT EXISTS public.holiday_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    holiday_date DATE NOT NULL,
    is_recurring BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 3. CALENDÁRIO DE PROVAS (exam_calendar)
CREATE TABLE IF NOT EXISTS public.exam_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    class_id UUID,
    subject_id UUID,
    title VARCHAR(255) NOT NULL,
    exam_date TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER,
    weight DECIMAL(5,2),
    description TEXT,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 4. CALENDÁRIO DE REUNIÕES (meeting_calendar)
CREATE TABLE IF NOT EXISTS public.meeting_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    meeting_type VARCHAR(100),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    location_link TEXT,
    description TEXT,
    is_mandatory BOOLEAN DEFAULT FALSE,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 5. EVENTOS DO PROFESSOR (teacher_schedule_events)
CREATE TABLE IF NOT EXISTS public.teacher_schedule_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    teacher_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    event_type VARCHAR(100),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    description TEXT,
    is_available BOOLEAN DEFAULT FALSE,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 6. LOCAIS DE EVENTOS (calendar_locations)
CREATE TABLE IF NOT EXISTS public.calendar_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    building VARCHAR(100),
    floor VARCHAR(50),
    capacity INTEGER,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 7. CONFIRMAÇÕES DE EVENTOS (calendar_confirmations)
CREATE TABLE IF NOT EXISTS public.calendar_confirmations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    event_id UUID NOT NULL,
    profile_id UUID NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    confirmed_at TIMESTAMPTZ,
    signature_hash TEXT,
    comments TEXT,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);


-- ====================================================================
-- ÍNDICES
-- ====================================================================
DO $$
DECLARE
    t_name text;
BEGIN
    FOR t_name IN 
        SELECT unnest(ARRAY[
            'calendar_settings', 'holiday_calendar', 'exam_calendar', 
            'meeting_calendar', 'teacher_schedule_events', 'calendar_locations', 
            'calendar_confirmations'
        ])
    LOOP
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_school_id ON public.%I(school_id)', t_name, t_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_created_at ON public.%I(created_at)', t_name, t_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_metadata ON public.%I USING GIN (metadata)', t_name, t_name);
    END LOOP;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_holiday_date ON public.holiday_calendar(holiday_date);
CREATE INDEX IF NOT EXISTS idx_exam_date ON public.exam_calendar(exam_date);
CREATE INDEX IF NOT EXISTS idx_meeting_times ON public.meeting_calendar(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_teacher_schedule_times ON public.teacher_schedule_events(teacher_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_calendar_confirmations_event ON public.calendar_confirmations(event_id, profile_id);


-- ====================================================================
-- TRIGGERS PARA UPDATED_AT
-- ====================================================================
DO $$
DECLARE
    t_name text;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at_timestamp') THEN
        FOR t_name IN 
            SELECT unnest(ARRAY[
                'calendar_settings', 'holiday_calendar', 'exam_calendar', 
                'meeting_calendar', 'teacher_schedule_events', 'calendar_locations', 
                'calendar_confirmations'
            ])
        LOOP
            EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_upd ON public.%I', t_name, t_name);
            EXECUTE format('CREATE TRIGGER trg_%I_upd BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp()', t_name, t_name);
        END LOOP;
    ELSIF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        FOR t_name IN 
            SELECT unnest(ARRAY[
                'calendar_settings', 'holiday_calendar', 'exam_calendar', 
                'meeting_calendar', 'teacher_schedule_events', 'calendar_locations', 
                'calendar_confirmations'
            ])
        LOOP
            EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_upd ON public.%I', t_name, t_name);
            EXECUTE format('CREATE TRIGGER trg_%I_upd BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t_name, t_name);
        END LOOP;
    END IF;
END;
$$;


-- ====================================================================
-- ROW LEVEL SECURITY (RLS) E POLICIES
-- ====================================================================
DO $$
DECLARE
    t_name text;
BEGIN
    FOR t_name IN 
        SELECT unnest(ARRAY[
            'calendar_settings', 'holiday_calendar', 'exam_calendar', 
            'meeting_calendar', 'teacher_schedule_events', 'calendar_locations', 
            'calendar_confirmations'
        ])
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t_name);
        EXECUTE format('DROP POLICY IF EXISTS p_%I_access ON public.%I', t_name, t_name);
        
        IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'can_access_school') THEN
            EXECUTE format('CREATE POLICY p_%I_access ON public.%I FOR ALL USING (public.can_access_school(auth.uid(), school_id) AND deleted_at IS NULL)', t_name, t_name);
        ELSE
            EXECUTE format('CREATE POLICY p_%I_access ON public.%I FOR ALL USING (deleted_at IS NULL)', t_name, t_name);
        END IF;
    END LOOP;
END;
$$;


-- ====================================================================
-- SUPABASE REALTIME PUBLICATION
-- ====================================================================
DO $$
DECLARE
    t_name text;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
    
    FOR t_name IN 
        SELECT unnest(ARRAY[
            'calendar_settings', 'holiday_calendar', 'exam_calendar', 
            'meeting_calendar', 'teacher_schedule_events', 'calendar_locations', 
            'calendar_confirmations'
        ])
    LOOP
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t_name);
        EXCEPTION WHEN duplicate_object THEN
            NULL;
        END;
    END LOOP;
END;
$$;


-- ====================================================================
-- VIEWS
-- ====================================================================
CREATE OR REPLACE VIEW public.view_calendar_dashboard AS
SELECT 
    school_id,
    COUNT(id) AS total_exams,
    SUM(CASE WHEN exam_date >= NOW() AND exam_date < NOW() + INTERVAL '7 days' THEN 1 ELSE 0 END) AS exams_next_7_days
FROM public.exam_calendar
WHERE deleted_at IS NULL
GROUP BY school_id;

CREATE OR REPLACE VIEW public.view_events_today AS
SELECT 
    school_id,
    id,
    title,
    start_date AS event_start,
    end_date AS event_end,
    'agenda_event' AS source_type
FROM public.agenda_events
WHERE DATE(start_date AT TIME ZONE 'UTC') = CURRENT_DATE AND deleted_at IS NULL;

CREATE OR REPLACE VIEW public.view_upcoming_events AS
SELECT 
    school_id,
    id,
    title,
    start_date,
    end_date,
    status
FROM public.agenda_events
WHERE start_date >= NOW() AND deleted_at IS NULL
ORDER BY start_date ASC;

CREATE OR REPLACE VIEW public.view_teacher_schedule AS
SELECT 
    school_id,
    teacher_id,
    title,
    start_time,
    end_time,
    event_type,
    is_available
FROM public.teacher_schedule_events
WHERE deleted_at IS NULL
ORDER BY start_time ASC;

CREATE OR REPLACE VIEW public.view_school_calendar AS
SELECT 
    school_id,
    id,
    title,
    start_date,
    end_date,
    event_type,
    description
FROM public.school_calendar
WHERE deleted_at IS NULL
ORDER BY start_date ASC;

