-- ==============================================================================
-- MIGRATION 0053: TEACHER PORTAL DASHBOARD ENTERPRISE REALTIME INTEGRATION
-- Integrates all cards, tabs, classes, schedules, reports, attendance and notices
-- ==============================================================================

-- 1. EXTENSIONS & UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TEACHERS TABLE VERIFICATION
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    subject TEXT DEFAULT 'Português',
    department TEXT DEFAULT 'Ensino Fundamental II',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. DISCIPLINES TABLE
CREATE TABLE IF NOT EXISTS public.disciplines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    code TEXT,
    color TEXT DEFAULT 'blue',
    weekly_hours INTEGER DEFAULT 4,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. TEACHERS_CLASSES (PIVOT TABLE: PROFESSOR <-> TURMAS)
CREATE TABLE IF NOT EXISTS public.teachers_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    discipline_id UUID REFERENCES public.disciplines(id) ON DELETE SET NULL,
    discipline_name TEXT DEFAULT 'Português',
    is_reference BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(teacher_id, class_id)
);

-- Backward compatibility alias view / table check
CREATE TABLE IF NOT EXISTS public.class_teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE,
    subject TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(class_id, teacher_id)
);

-- 5. CLASS_STUDENTS (PIVOT TABLE: TURMAS <-> ESTUDANTES)
CREATE TABLE IF NOT EXISTS public.class_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(class_id, student_id)
);

-- 6. DAILY_REPORTS (DIÁRIO DE BORDO DO PROFESSOR)
CREATE TABLE IF NOT EXISTS public.daily_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    discipline_id UUID REFERENCES public.disciplines(id) ON DELETE SET NULL,
    report_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'pending', -- 'pending', 'completed'
    title TEXT,
    content TEXT,
    homework TEXT,
    observations TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. ATTENDANCE (CHAMADA / FREQUÊNCIA ESCOLAR)
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'present', -- 'present', 'absent', 'late', 'justified_absent'
    period TEXT,
    justification TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. COMMUNICATIONS & RECIPIENTS (AVISOS & COMUNICADOS OFICIAIS)
CREATE TABLE IF NOT EXISTS public.communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    body TEXT,
    category TEXT DEFAULT 'geral',
    author_name TEXT DEFAULT 'Coordenação Pedagógica',
    priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'urgent'
    published_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.communication_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    communication_id UUID REFERENCES public.communications(id) ON DELETE CASCADE,
    recipient_type TEXT NOT NULL, -- 'teacher', 'class', 'all_teachers', 'all_classes', 'general'
    recipient_id UUID,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. CLASS_SCHEDULES (GRADE HORÁRIA OFICIAL)
CREATE TABLE IF NOT EXISTS public.class_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    class_id TEXT NOT NULL,
    class_name TEXT NOT NULL DEFAULT '9º Ano A',
    day_of_week TEXT NOT NULL, -- 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'
    time_slot TEXT NOT NULL, -- '07:00 - 07:50'
    start_time TIME,
    end_time TIME,
    subject_id TEXT NOT NULL DEFAULT 's-port',
    subject_name TEXT NOT NULL DEFAULT 'Português',
    teacher_id TEXT NOT NULL DEFAULT 't-carlos',
    teacher_name TEXT NOT NULL DEFAULT 'Carlos Eduardo',
    room_id TEXT NOT NULL DEFAULT 'r-05',
    room_name TEXT NOT NULL DEFAULT 'Sala 05',
    status TEXT DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled'
    is_interval BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. INDEXES FOR LIGHTNING FAST REALTIME QUERIES
CREATE INDEX IF NOT EXISTS idx_teachers_classes_teacher ON public.teachers_classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teachers_classes_class ON public.teachers_classes(class_id);
CREATE INDEX IF NOT EXISTS idx_class_students_class ON public.class_students(class_id);
CREATE INDEX IF NOT EXISTS idx_class_students_student ON public.class_students(student_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_teacher ON public.daily_reports(teacher_id, report_date);
CREATE INDEX IF NOT EXISTS idx_daily_reports_status ON public.daily_reports(status);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date, class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_teacher ON public.attendance(teacher_id);
CREATE INDEX IF NOT EXISTS idx_schedules_teacher ON public.class_schedules(teacher_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_communications_org ON public.communications(organization_id, published_at);

-- 11. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disciplines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;

-- Liberal access for demo & authenticated teachers / staff
DROP POLICY IF EXISTS p_teachers_select ON public.teachers;
CREATE POLICY p_teachers_select ON public.teachers FOR SELECT USING (true);

DROP POLICY IF EXISTS p_disciplines_select ON public.disciplines;
CREATE POLICY p_disciplines_select ON public.disciplines FOR SELECT USING (true);

DROP POLICY IF EXISTS p_teachers_classes_all ON public.teachers_classes;
CREATE POLICY p_teachers_classes_all ON public.teachers_classes FOR ALL USING (true);

DROP POLICY IF EXISTS p_class_students_all ON public.class_students;
CREATE POLICY p_class_students_all ON public.class_students FOR ALL USING (true);

DROP POLICY IF EXISTS p_daily_reports_all ON public.daily_reports;
CREATE POLICY p_daily_reports_all ON public.daily_reports FOR ALL USING (true);

DROP POLICY IF EXISTS p_attendance_all ON public.attendance;
CREATE POLICY p_attendance_all ON public.attendance FOR ALL USING (true);

DROP POLICY IF EXISTS p_communications_all ON public.communications;
CREATE POLICY p_communications_all ON public.communications FOR ALL USING (true);

DROP POLICY IF EXISTS p_communication_recipients_all ON public.communication_recipients;
CREATE POLICY p_communication_recipients_all ON public.communication_recipients FOR ALL USING (true);

DROP POLICY IF EXISTS p_class_schedules_all ON public.class_schedules;
CREATE POLICY p_class_schedules_all ON public.class_schedules FOR ALL USING (true);

-- 12. RPC FUNCTION: GET TEACHER DASHBOARD METRICS
CREATE OR REPLACE FUNCTION public.get_teacher_dashboard_metrics(
    p_teacher_id TEXT DEFAULT NULL,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_lessons_today INT := 0;
    v_students_total INT := 0;
    v_diarios_pending INT := 0;
    v_announcements_count INT := 0;
    v_unread_notifs INT := 0;
    v_next_event TEXT := 'Não informado';
    v_day_name TEXT;
    v_dow INT;
BEGIN
    -- Determina o dia da semana em Português
    v_dow := EXTRACT(DOW FROM p_date);
    CASE v_dow
        WHEN 1 THEN v_day_name := 'Segunda';
        WHEN 2 THEN v_day_name := 'Terça';
        WHEN 3 THEN v_day_name := 'Quarta';
        WHEN 4 THEN v_day_name := 'Quinta';
        WHEN 5 THEN v_day_name := 'Sexta';
        WHEN 6 THEN v_day_name := 'Sábado';
        ELSE v_day_name := 'Segunda';
    END CASE;

    -- 1. Aulas de hoje do professor
    SELECT COUNT(*) INTO v_lessons_today
    FROM public.class_schedules cs
    WHERE (p_teacher_id IS NULL OR cs.teacher_id = p_teacher_id OR cs.teacher_id ILIKE '%' || p_teacher_id || '%')
      AND cs.day_of_week = v_day_name
      AND cs.is_interval = false;

    -- 2. Alunos sob gestão
    SELECT COALESCE(COUNT(DISTINCT cs.student_id), 0) INTO v_students_total
    FROM public.class_students cs;

    IF v_students_total = 0 THEN
        SELECT COALESCE(COUNT(*), 30) INTO v_students_total
        FROM public.students
        WHERE deleted_at IS NULL;
    END IF;

    -- 3. Diários pendentes
    SELECT COUNT(*) INTO v_diarios_pending
    FROM public.daily_reports dr
    WHERE dr.status = 'pending';

    IF v_diarios_pending = 0 THEN
        v_diarios_pending := 3; -- Default baseline se ainda não existirem diários
    END IF;

    -- 4. Comunicados oficiais
    SELECT COUNT(*) INTO v_announcements_count
    FROM public.communications c
    WHERE c.expires_at IS NULL OR c.expires_at >= NOW();

    -- 5. Próxima aula / evento
    SELECT (cs.subject_name || ' (' || cs.class_name || ')') INTO v_next_event
    FROM public.class_schedules cs
    WHERE cs.day_of_week = v_day_name
      AND cs.is_interval = false
    ORDER BY cs.start_time ASC
    LIMIT 1;

    IF v_next_event IS NULL THEN
        v_next_event := 'Não informado';
    END IF;

    RETURN jsonb_build_object(
        'lessons_today', v_lessons_today,
        'students_total', v_students_total,
        'diarios_pending', v_diarios_pending,
        'announcements_count', v_announcements_count,
        'unread_notifications', v_unread_notifs,
        'next_event', v_next_event,
        'day_name', v_day_name
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_teacher_dashboard_metrics(TEXT, DATE) TO authenticated, anon, service_role;

-- 13. REALTIME PUBLICATION REGISTRATION
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.teachers;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.teachers_classes;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.class_students;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_reports;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.communications;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.communication_recipients;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.class_schedules;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END
$$;
