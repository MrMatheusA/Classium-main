-- ==============================================================================
-- MIGRATION 0060: OFFICIAL CLASS SCHEDULE REALTIME (GRADE HORÁRIA OFICIAL)
-- Complete integration of teacher's weekly/daily schedule, real-time status in
-- America/Sao_Paulo (Horário de Brasília), RPCs, RLS, and Realtime publication.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CLASSROOMS TABLE (SALAS DE AULA)
CREATE TABLE IF NOT EXISTS public.classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    code TEXT,
    capacity INTEGER DEFAULT 36,
    building TEXT DEFAULT 'Bloco Principal',
    floor TEXT DEFAULT '1º Andar',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default classrooms if table is empty
INSERT INTO public.classrooms (id, name, code, capacity, building, floor)
SELECT 'a0000001-0000-0000-0000-000000000008'::uuid, 'Sala 08', 'SL-08', 36, 'Bloco A', '1º Andar'
WHERE NOT EXISTS (SELECT 1 FROM public.classrooms WHERE name = 'Sala 08');

INSERT INTO public.classrooms (id, name, code, capacity, building, floor)
SELECT 'a0000001-0000-0000-0000-000000000004'::uuid, 'Sala Multimídia 04', 'SL-04', 40, 'Bloco B', 'Térreo'
WHERE NOT EXISTS (SELECT 1 FROM public.classrooms WHERE name = 'Sala Multimídia 04');

INSERT INTO public.classrooms (id, name, code, capacity, building, floor)
SELECT 'a0000001-0000-0000-0000-000000000012'::uuid, 'Sala 12', 'SL-12', 36, 'Bloco A', '2º Andar'
WHERE NOT EXISTS (SELECT 1 FROM public.classrooms WHERE name = 'Sala 12');

INSERT INTO public.classrooms (id, name, code, capacity, building, floor)
SELECT 'a0000001-0000-0000-0000-000000000002'::uuid, 'Laboratório Maker 02', 'LAB-02', 32, 'Bloco Tech', 'Térreo'
WHERE NOT EXISTS (SELECT 1 FROM public.classrooms WHERE name = 'Laboratório Maker 02');

-- 2. CLASS_SCHEDULES (GRADE HORÁRIA OFICIAL)
CREATE TABLE IF NOT EXISTS public.class_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    class_id TEXT NOT NULL,
    class_name TEXT NOT NULL DEFAULT '9º Ano A',
    day_of_week TEXT NOT NULL, -- 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'
    time_slot TEXT NOT NULL, -- '07:30 - 08:15'
    start_time TIME NOT NULL DEFAULT '07:30:00',
    end_time TIME NOT NULL DEFAULT '08:15:00',
    subject_id TEXT NOT NULL DEFAULT 's-port',
    subject_name TEXT NOT NULL DEFAULT 'Português',
    teacher_id TEXT NOT NULL DEFAULT 't-carlos',
    teacher_name TEXT NOT NULL DEFAULT 'Carlos Eduardo',
    room_id TEXT NOT NULL DEFAULT 'r-08',
    room_name TEXT NOT NULL DEFAULT 'Sala 08',
    status TEXT DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled'
    is_interval BOOLEAN DEFAULT false,
    schedule_date DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure all columns exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_schedules' AND column_name = 'schedule_date') THEN
        ALTER TABLE public.class_schedules ADD COLUMN schedule_date DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_schedules' AND column_name = 'is_interval') THEN
        ALTER TABLE public.class_schedules ADD COLUMN is_interval BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_schedules' AND column_name = 'room_name') THEN
        ALTER TABLE public.class_schedules ADD COLUMN room_name TEXT DEFAULT 'Sala 08';
    END IF;
END $$;

-- 3. SEED OFFICIAL CLASS SCHEDULE FOR TEACHER (Carlos Eduardo / t-carlos)
DELETE FROM public.class_schedules 
WHERE teacher_id IN ('t-carlos', 't-carlos-eduardo') OR teacher_name ILIKE '%Carlos Eduardo%';

INSERT INTO public.class_schedules 
(id, class_id, class_name, day_of_week, time_slot, start_time, end_time, subject_id, subject_name, teacher_id, teacher_name, room_id, room_name, is_interval)
VALUES
-- SEGUNDA-FEIRA (8 aulas no total do professor ao longo da semana)
('b0000001-0000-0000-0000-000000000001'::uuid, 'cls-9a', '9º Ano A', 'Segunda', '07:30 - 08:15', '07:30:00', '08:15:00', 's-port', 'Português', 't-carlos', 'Carlos Eduardo', 'r-08', 'Sala 08', false),
('b0000001-0000-0000-0000-000000000002'::uuid, 'cls-9a', '9º Ano A', 'Segunda', '08:15 - 09:00', '08:15:00', '09:00:00', 's-port', 'Português', 't-carlos', 'Carlos Eduardo', 'r-08', 'Sala 08', false),

-- TERÇA-FEIRA
('b0000001-0000-0000-0000-000000000003'::uuid, 'cls-8b', '8º Ano B', 'Terça', '07:30 - 08:15', '07:30:00', '08:15:00', 's-hist', 'História Contemporânea', 't-carlos', 'Carlos Eduardo', 'r-04', 'Sala Multimídia 04', false),
('b0000001-0000-0000-0000-000000000004'::uuid, 'cls-8b', '8º Ano B', 'Terça', '08:15 - 09:00', '08:15:00', '09:00:00', 's-hist', 'História Contemporânea', 't-carlos', 'Carlos Eduardo', 'r-04', 'Sala Multimídia 04', false),

-- QUARTA-FEIRA
('b0000001-0000-0000-0000-000000000005'::uuid, 'cls-7a', '7º Ano A', 'Quarta', '09:15 - 10:00', '09:15:00', '10:00:00', 's-port', 'Português', 't-carlos', 'Carlos Eduardo', 'r-12', 'Sala 12', false),
('b0000001-0000-0000-0000-000000000006'::uuid, 'cls-7a', '7º Ano A', 'Quarta', '10:00 - 10:45', '10:00:00', '10:45:00', 's-port', 'Português', 't-carlos', 'Carlos Eduardo', 'r-12', 'Sala 12', false),

-- QUINTA-FEIRA
('b0000001-0000-0000-0000-000000000007'::uuid, 'cls-9a', '9º Ano A', 'Quinta', '10:45 - 11:30', '10:45:00', '11:30:00', 's-rob', 'Robótica Educacional & IA', 't-carlos', 'Carlos Eduardo', 'r-02', 'Laboratório Maker 02', false),

-- SEXTA-FEIRA
('b0000001-0000-0000-0000-000000000008'::uuid, 'cls-8b', '8º Ano B', 'Sexta', '08:15 - 09:00', '08:15:00', '09:00:00', 's-rob', 'Robótica Educacional & IA', 't-carlos', 'Carlos Eduardo', 'r-02', 'Laboratório Maker 02', false);

-- 4. RPC: GET TEACHER DAILY SCHEDULE WITH BRASÍLIA TIMEZONE STATUS
CREATE OR REPLACE FUNCTION public.get_teacher_daily_schedule(
    p_teacher_id TEXT DEFAULT 't-carlos',
    p_date DATE DEFAULT NULL
)
RETURNS TABLE (
    schedule_id UUID,
    class_id TEXT,
    class_name TEXT,
    subject_id TEXT,
    subject_name TEXT,
    room_id TEXT,
    room_name TEXT,
    day_of_week TEXT,
    time_slot TEXT,
    start_time TIME,
    end_time TIME,
    is_interval BOOLEAN,
    status TEXT,
    teacher_id TEXT,
    teacher_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_target_date DATE;
    v_current_sp_time TIME;
    v_current_sp_date DATE;
    v_dow INT;
    v_day_name TEXT;
BEGIN
    -- Obter data e hora no fuso horário de Brasília
    v_current_sp_date := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::DATE;
    v_current_sp_time := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::TIME;
    
    v_target_date := COALESCE(p_date, v_current_sp_date);
    
    -- Determinar o dia da semana em Português
    v_dow := EXTRACT(DOW FROM v_target_date);
    CASE v_dow
        WHEN 1 THEN v_day_name := 'Segunda';
        WHEN 2 THEN v_day_name := 'Terça';
        WHEN 3 THEN v_day_name := 'Quarta';
        WHEN 4 THEN v_day_name := 'Quinta';
        WHEN 5 THEN v_day_name := 'Sexta';
        WHEN 6 THEN v_day_name := 'Sábado';
        ELSE v_day_name := 'Segunda'; -- Domingo / default
    END CASE;

    RETURN QUERY
    SELECT
        cs.id AS schedule_id,
        cs.class_id,
        cs.class_name,
        cs.subject_id,
        cs.subject_name,
        cs.room_id,
        cs.room_name,
        cs.day_of_week,
        cs.time_slot,
        cs.start_time,
        cs.end_time,
        cs.is_interval,
        CASE
            -- Caso a data seja no passado OU hoje e a aula já passou do horário de término
            WHEN (v_target_date < v_current_sp_date) OR
                 (v_target_date = v_current_sp_date AND v_current_sp_time >= cs.end_time) THEN 'Finalizada'
            -- Caso hoje e horário atual está exatamente entre o início e fim da aula
            WHEN (v_target_date = v_current_sp_date AND v_current_sp_time >= cs.start_time AND v_current_sp_time < cs.end_time) THEN 'Em Andamento'
            -- Caso hoje e falte menos de 60 minutos para começar
            WHEN (v_target_date = v_current_sp_date AND v_current_sp_time < cs.start_time AND v_current_sp_time >= (cs.start_time - INTERVAL '60 minutes')::TIME) THEN 'Próxima Aula'
            -- Futura / Agendada
            ELSE 'Agendada'
        END AS status,
        cs.teacher_id,
        cs.teacher_name
    FROM
        public.class_schedules cs
    WHERE
        (p_teacher_id IS NULL OR cs.teacher_id = p_teacher_id OR cs.teacher_id ILIKE '%' || p_teacher_id || '%' OR cs.teacher_name ILIKE '%Carlos%')
        AND (
            cs.schedule_date = v_target_date 
            OR (cs.schedule_date IS NULL AND cs.day_of_week = v_day_name)
        )
    ORDER BY
        cs.start_time ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_teacher_daily_schedule(TEXT, DATE) TO authenticated, anon, service_role;

-- 5. RPC: GET TEACHER DAILY SUMMARY (RESUMO DO DIA & CARGA HORÁRIA)
CREATE OR REPLACE FUNCTION public.get_teacher_daily_summary(
    p_teacher_id TEXT DEFAULT 't-carlos',
    p_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_target_date DATE;
    v_current_sp_time TIME;
    v_current_sp_date DATE;
    v_dow INT;
    v_day_name TEXT;
    v_completed_classes INT := 0;
    v_total_classes_today INT := 0;
    v_current_class_info TEXT := 'Sem aula no momento';
    v_filled_diaries INT := 0;
    v_weekly_classes_count INT := 0;
BEGIN
    v_current_sp_date := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::DATE;
    v_current_sp_time := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::TIME;
    v_target_date := COALESCE(p_date, v_current_sp_date);

    v_dow := EXTRACT(DOW FROM v_target_date);
    CASE v_dow
        WHEN 1 THEN v_day_name := 'Segunda';
        WHEN 2 THEN v_day_name := 'Terça';
        WHEN 3 THEN v_day_name := 'Quarta';
        WHEN 4 THEN v_day_name := 'Quinta';
        WHEN 5 THEN v_day_name := 'Sexta';
        WHEN 6 THEN v_day_name := 'Sábado';
        ELSE v_day_name := 'Segunda';
    END CASE;

    -- Total de aulas na semana para este professor
    SELECT COUNT(*) INTO v_weekly_classes_count
    FROM public.class_schedules cs
    WHERE (p_teacher_id IS NULL OR cs.teacher_id = p_teacher_id OR cs.teacher_name ILIKE '%Carlos%')
      AND cs.is_interval = false;

    -- Total de aulas de hoje
    SELECT COUNT(*) INTO v_total_classes_today
    FROM public.class_schedules cs
    WHERE (p_teacher_id IS NULL OR cs.teacher_id = p_teacher_id OR cs.teacher_name ILIKE '%Carlos%')
      AND (cs.schedule_date = v_target_date OR (cs.schedule_date IS NULL AND cs.day_of_week = v_day_name))
      AND cs.is_interval = false;

    -- Aulas concluídas hoje
    SELECT COUNT(*) INTO v_completed_classes
    FROM public.class_schedules cs
    WHERE (p_teacher_id IS NULL OR cs.teacher_id = p_teacher_id OR cs.teacher_name ILIKE '%Carlos%')
      AND (cs.schedule_date = v_target_date OR (cs.schedule_date IS NULL AND cs.day_of_week = v_day_name))
      AND cs.is_interval = false
      AND ((v_target_date < v_current_sp_date) OR (v_target_date = v_current_sp_date AND v_current_sp_time >= cs.end_time));

    -- Aula atual em andamento
    SELECT (cs.subject_name || ' - ' || cs.class_name) INTO v_current_class_info
    FROM public.class_schedules cs
    WHERE (p_teacher_id IS NULL OR cs.teacher_id = p_teacher_id OR cs.teacher_name ILIKE '%Carlos%')
      AND (cs.schedule_date = v_target_date OR (cs.schedule_date IS NULL AND cs.day_of_week = v_day_name))
      AND cs.is_interval = false
      AND (v_target_date = v_current_sp_date AND v_current_sp_time >= cs.start_time AND v_current_sp_time < cs.end_time)
    LIMIT 1;

    IF v_current_class_info IS NULL THEN
        v_current_class_info := 'Sem aula no momento';
    END IF;

    -- Diários registrados nesta data
    SELECT COUNT(DISTINCT l.id) INTO v_filled_diaries
    FROM public.lessons l
    WHERE l.lesson_date = v_target_date;

    RETURN jsonb_build_object(
        'completed_classes', v_completed_classes,
        'total_classes_today', v_total_classes_today,
        'current_class_info', v_current_class_info,
        'filled_diaries', v_filled_diaries,
        'weekly_classes_count', v_weekly_classes_count,
        'day_name', v_day_name,
        'current_time_sp', to_char(v_current_sp_time, 'HH24:MI:SS')
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_teacher_daily_summary(TEXT, DATE) TO authenticated, anon, service_role;

-- 6. RPC: GET TEACHER WEEKLY SCHEDULE (VISUALIZAÇÃO SEMANAL COMPLETA)
CREATE OR REPLACE FUNCTION public.get_teacher_weekly_schedule(
    p_teacher_id TEXT DEFAULT 't-carlos'
)
RETURNS TABLE (
    schedule_id UUID,
    class_id TEXT,
    class_name TEXT,
    subject_id TEXT,
    subject_name TEXT,
    room_id TEXT,
    room_name TEXT,
    day_of_week TEXT,
    time_slot TEXT,
    start_time TIME,
    end_time TIME,
    is_interval BOOLEAN,
    teacher_id TEXT,
    teacher_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cs.id AS schedule_id,
        cs.class_id,
        cs.class_name,
        cs.subject_id,
        cs.subject_name,
        cs.room_id,
        cs.room_name,
        cs.day_of_week,
        cs.time_slot,
        cs.start_time,
        cs.end_time,
        cs.is_interval,
        cs.teacher_id,
        cs.teacher_name
    FROM
        public.class_schedules cs
    WHERE
        (p_teacher_id IS NULL OR cs.teacher_id = p_teacher_id OR cs.teacher_name ILIKE '%Carlos%')
    ORDER BY
        CASE cs.day_of_week
            WHEN 'Segunda' THEN 1
            WHEN 'Terça' THEN 2
            WHEN 'Quarta' THEN 3
            WHEN 'Quinta' THEN 4
            WHEN 'Sexta' THEN 5
            WHEN 'Sábado' THEN 6
            ELSE 7
        END,
        cs.start_time ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_teacher_weekly_schedule(TEXT) TO authenticated, anon, service_role;

-- 7. RLS POLICIES & REALTIME
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_classrooms_all ON public.classrooms;
CREATE POLICY p_classrooms_all ON public.classrooms FOR ALL USING (true);

DROP POLICY IF EXISTS p_class_schedules_all ON public.class_schedules;
CREATE POLICY p_class_schedules_all ON public.class_schedules FOR ALL USING (true);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.classrooms;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.class_schedules;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END
$$;
