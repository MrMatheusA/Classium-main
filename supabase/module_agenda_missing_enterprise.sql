-- ====================================================================
-- EDUCA+ ERP EDUCACIONAL — MÓDULO DE AGENDA ESCOLAR (MIGRATION COMPLEMENTAR)
-- SCRIPT SQL PRODUCTION-READY COM MULTI-TENANT E REALTIME
-- ====================================================================

BEGIN;

-- 1. TRABALHOS ACADÊMICOS (academic_assignments)
CREATE TABLE IF NOT EXISTS public.academic_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    class_id UUID,
    subject_id UUID,
    teacher_id UUID,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    max_score NUMERIC(5,2),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. AGENDA DO ALUNO (student_schedule_events)
CREATE TABLE IF NOT EXISTS public.student_schedule_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    student_id UUID NOT NULL,
    event_id UUID,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    is_mandatory BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 3. AGENDA DA FAMÍLIA (family_schedule_events)
CREATE TABLE IF NOT EXISTS public.family_schedule_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    family_id UUID NOT NULL,
    event_id UUID,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 4. RESERVA DE AMBIENTES (room_reservations)
CREATE TABLE IF NOT EXISTS public.room_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    room_id UUID NOT NULL,
    event_id UUID,
    reserved_by UUID NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    purpose TEXT,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 5. CARDÁPIO ESCOLAR (school_menus)
CREATE TABLE IF NOT EXISTS public.school_menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    menu_date DATE NOT NULL,
    meal_type VARCHAR(50) NOT NULL,
    items TEXT NOT NULL,
    allergens JSONB DEFAULT '[]'::jsonb,
    nutritional_info JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 6. LEMBRETES (agenda_reminders)
CREATE TABLE IF NOT EXISTS public.agenda_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    event_id UUID,
    target_profile_id UUID NOT NULL,
    reminder_time TIMESTAMPTZ NOT NULL,
    message TEXT,
    is_sent BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 7. RECORRÊNCIAS (agenda_recurrences)
CREATE TABLE IF NOT EXISTS public.agenda_recurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    base_event_id UUID NOT NULL,
    recurrence_rule TEXT NOT NULL, -- Ex: RRULE
    start_date DATE NOT NULL,
    end_date DATE,
    exceptions JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- ====================================================================
-- ÍNDICES DE ALTA PERFORMANCE
-- ====================================================================
DO $$
DECLARE
    t_name text;
BEGIN
    FOR t_name IN 
        SELECT unnest(ARRAY[
            'academic_assignments', 'student_schedule_events', 'family_schedule_events',
            'room_reservations', 'school_menus', 'agenda_reminders', 'agenda_recurrences'
        ])
    LOOP
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_school_id ON public.%I(school_id)', t_name, t_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_status ON public.%I(status)', t_name, t_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_created_at ON public.%I(created_at)', t_name, t_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_deleted_at ON public.%I(deleted_at)', t_name, t_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_metadata ON public.%I USING GIN (metadata)', t_name, t_name);
    END LOOP;
END;
$$;

-- Índices específicos (compostos)
CREATE INDEX IF NOT EXISTS idx_acad_assign_class_due ON public.academic_assignments(class_id, due_date);
CREATE INDEX IF NOT EXISTS idx_student_sched_time ON public.student_schedule_events(student_id, start_time);
CREATE INDEX IF NOT EXISTS idx_family_sched_time ON public.family_schedule_events(family_id, start_time);
CREATE INDEX IF NOT EXISTS idx_room_resv_time ON public.room_reservations(room_id, start_time);
CREATE INDEX IF NOT EXISTS idx_school_menus_date ON public.school_menus(menu_date);
CREATE INDEX IF NOT EXISTS idx_agenda_remind_time ON public.agenda_reminders(reminder_time);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) E POLICIES
-- ====================================================================
DO $$
DECLARE
    t_name text;
    has_can_access BOOLEAN;
BEGIN
    has_can_access := EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'can_access_school');
    
    FOR t_name IN 
        SELECT unnest(ARRAY[
            'academic_assignments', 'student_schedule_events', 'family_schedule_events',
            'room_reservations', 'school_menus', 'agenda_reminders', 'agenda_recurrences'
        ])
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t_name);
        EXECUTE format('DROP POLICY IF EXISTS p_%I_access ON public.%I', t_name, t_name);
        
        IF has_can_access THEN
            EXECUTE format('CREATE POLICY p_%I_access ON public.%I FOR ALL USING (public.can_access_school(auth.uid(), school_id) AND deleted_at IS NULL)', t_name, t_name);
        ELSE
            EXECUTE format('CREATE POLICY p_%I_access ON public.%I FOR ALL USING (deleted_at IS NULL)', t_name, t_name);
        END IF;
    END LOOP;
END;
$$;

-- ====================================================================
-- TRIGGERS PARA UPDATED_AT
-- ====================================================================
DO $$
DECLARE
    t_name text;
    fn_name text := '';
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at_timestamp') THEN
        fn_name := 'set_updated_at_timestamp';
    ELSIF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        fn_name := 'update_updated_at_column';
    END IF;

    IF fn_name != '' THEN
        FOR t_name IN 
            SELECT unnest(ARRAY[
                'academic_assignments', 'student_schedule_events', 'family_schedule_events',
                'room_reservations', 'school_menus', 'agenda_reminders', 'agenda_recurrences'
            ])
        LOOP
            EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_upd ON public.%I', t_name, t_name);
            EXECUTE format('CREATE TRIGGER trg_%I_upd BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.%I()', t_name, t_name, fn_name);
        END LOOP;
    END IF;
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
            'academic_assignments', 'student_schedule_events', 'family_schedule_events',
            'room_reservations', 'school_menus', 'agenda_reminders', 'agenda_recurrences'
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

COMMIT;
