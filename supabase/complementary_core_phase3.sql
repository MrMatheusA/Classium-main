-- ====================================================================
-- EDUCA+ ERP EDUCACIONAL — COMPLEMENTARY CORE SQL (FASE 03)
-- ESTRUTURA ACADÊMICA ENTERPRISE
-- PRONTO PARA SER EXECUTADO DIRETAMENTE NO SQL EDITOR DO SUPABASE.
-- ====================================================================

-- 1) REDE DE ENSINO (education_networks)
CREATE TABLE IF NOT EXISTS public.education_networks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    network_type VARCHAR(50) CHECK (network_type IN ('Municipal', 'Estadual', 'Federal', 'Privada', 'Filantrópica')),
    cnpj VARCHAR(20),
    address TEXT,
    contact TEXT,
    status VARCHAR(20) DEFAULT 'Ativa',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID
);

-- 2) UNIDADES ESCOLARES (Complementar school_units)
ALTER TABLE public.school_units
    ADD COLUMN IF NOT EXISTS network_id UUID REFERENCES public.education_networks(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS director_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS vice_director_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS coordinator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS secretary_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Ativa',
    ADD COLUMN IF NOT EXISTS max_capacity INT,
    ADD COLUMN IF NOT EXISTS student_count INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS employee_count INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS created_by UUID,
    ADD COLUMN IF NOT EXISTS updated_by UUID,
    ADD COLUMN IF NOT EXISTS deleted_by UUID,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 3) ANO LETIVO (academic_years)
CREATE TABLE IF NOT EXISTS public.academic_years (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    year_number INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    school_days INT DEFAULT 200,
    status VARCHAR(20) CHECK (status IN ('Aberto', 'Fechado', 'Arquivado')) DEFAULT 'Aberto',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID
);

-- 4) PERÍODOS LETIVOS (academic_terms)
CREATE TABLE IF NOT EXISTS public.academic_terms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'Agendado',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID
);

-- 5) TURNOS (school_shifts)
CREATE TABLE IF NOT EXISTS public.school_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID
);

-- 6) SÉRIES (school_grades)
CREATE TABLE IF NOT EXISTS public.school_grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID
);

-- 12) SALAS (classrooms)
CREATE TABLE IF NOT EXISTS public.classrooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    capacity INT,
    block VARCHAR(50),
    room_type VARCHAR(50) DEFAULT 'Sala comum',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID
);

-- 7) TURMAS (Complementar classes)
ALTER TABLE public.classes
    ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.classrooms(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS block VARCHAR(50),
    ADD COLUMN IF NOT EXISTS capacity INT,
    ADD COLUMN IF NOT EXISTS regent_teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS coordinator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES public.school_shifts(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Ativa',
    ADD COLUMN IF NOT EXISTS created_by UUID,
    ADD COLUMN IF NOT EXISTS updated_by UUID,
    ADD COLUMN IF NOT EXISTS deleted_by UUID,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 8) DISCIPLINAS (subjects)
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID,
    UNIQUE (school_id, name)
);

ALTER TABLE public.subjects ALTER COLUMN school_id DROP NOT NULL;
INSERT INTO public.subjects (name) VALUES 
('Português'), ('Matemática'), ('Ciências'), ('História'), ('Geografia'), 
('Inglês'), ('Espanhol'), ('Educação Física'), ('Arte'), ('Ensino Religioso'), 
('Filosofia'), ('Sociologia'), ('Física'), ('Química'), ('Biologia'), 
('Tecnologia'), ('Robótica'), ('Projeto de Vida')
ON CONFLICT DO NOTHING;

-- 9) MATRÍCULAS (student_enrollments)
CREATE TABLE IF NOT EXISTS public.student_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES public.school_shifts(id) ON DELETE SET NULL,
    status VARCHAR(20) CHECK (status IN ('Ativa', 'Transferida', 'Cancelada', 'Concluída')) DEFAULT 'Ativa',
    enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID,
    UNIQUE(student_id, academic_year_id)
);

-- 10) VÍNCULO PROFESSOR (teacher_classes)
CREATE TABLE IF NOT EXISTS public.teacher_classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    class_count INT DEFAULT 1,
    workload_hours INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID,
    UNIQUE(teacher_id, subject_id, class_id)
);

-- 11) HORÁRIOS (class_schedules)
CREATE TABLE IF NOT EXISTS public.class_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    room_id UUID REFERENCES public.classrooms(id) ON DELETE SET NULL,
    day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6), 
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID
);

-- 13) CALENDÁRIO ESCOLAR (school_calendar)
CREATE TABLE IF NOT EXISTS public.school_calendar (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    event_type VARCHAR(50) DEFAULT 'Eventos',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID
);

-- 14) FREQUÊNCIA CONFIGURAÇÕES (attendance_settings)
CREATE TABLE IF NOT EXISTS public.attendance_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    config_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID,
    UNIQUE(school_id)
);

-- 15) BOLETINS (grading_models)
CREATE TABLE IF NOT EXISTS public.grading_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    config_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID
);

-- 16) DOCUMENTOS (academic_documents)
CREATE TABLE IF NOT EXISTS public.academic_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    file_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID
);

-- 17) STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('educa_boletins', 'educa_boletins', false),
  ('educa_certificados', 'educa_certificados', false),
  ('educa_historicos', 'educa_historicos', false),
  ('educa_documentos_escolares', 'educa_documentos_escolares', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated Upload for Educa Docs" ON storage.objects;
CREATE POLICY "Authenticated Upload for Educa Docs" ON storage.objects FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Read Access for Educa Docs" ON storage.objects;
CREATE POLICY "Read Access for Educa Docs" ON storage.objects FOR SELECT USING (auth.role() = 'authenticated');

-- 21) TRIGGERS E AUDIT
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at_timestamp') THEN
    CREATE FUNCTION public.set_updated_at_timestamp() RETURNS TRIGGER AS $F$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $F$ LANGUAGE plpgsql;
  END IF;
END $$;

CREATE TRIGGER trg_education_networks_updated_at BEFORE UPDATE ON public.education_networks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();
CREATE TRIGGER trg_academic_years_updated_at BEFORE UPDATE ON public.academic_years FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();
CREATE TRIGGER trg_academic_terms_updated_at BEFORE UPDATE ON public.academic_terms FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();
CREATE TRIGGER trg_school_shifts_updated_at BEFORE UPDATE ON public.school_shifts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();
CREATE TRIGGER trg_school_grades_updated_at BEFORE UPDATE ON public.school_grades FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();
CREATE TRIGGER trg_classrooms_updated_at BEFORE UPDATE ON public.classrooms FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();
CREATE TRIGGER trg_subjects_updated_at BEFORE UPDATE ON public.subjects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();
CREATE TRIGGER trg_student_enrollments_updated_at BEFORE UPDATE ON public.student_enrollments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();
CREATE TRIGGER trg_teacher_classes_updated_at BEFORE UPDATE ON public.teacher_classes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();
CREATE TRIGGER trg_class_schedules_updated_at BEFORE UPDATE ON public.class_schedules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();
CREATE TRIGGER trg_school_calendar_updated_at BEFORE UPDATE ON public.school_calendar FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();
CREATE TRIGGER trg_attendance_settings_updated_at BEFORE UPDATE ON public.attendance_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();
CREATE TRIGGER trg_grading_models_updated_at BEFORE UPDATE ON public.grading_models FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();
CREATE TRIGGER trg_academic_documents_updated_at BEFORE UPDATE ON public.academic_documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'universal_audit_logger') THEN
    CREATE TRIGGER trg_audit_academic_years AFTER INSERT OR UPDATE OR DELETE ON public.academic_years FOR EACH ROW EXECUTE FUNCTION public.universal_audit_logger();
    CREATE TRIGGER trg_audit_student_enrollments AFTER INSERT OR UPDATE OR DELETE ON public.student_enrollments FOR EACH ROW EXECUTE FUNCTION public.universal_audit_logger();
    CREATE TRIGGER trg_audit_grading_models AFTER INSERT OR UPDATE OR DELETE ON public.grading_models FOR EACH ROW EXECUTE FUNCTION public.universal_audit_logger();
  END IF;
END $$;

-- 20) ÍNDICES
CREATE INDEX IF NOT EXISTS idx_academic_years_school ON public.academic_years(school_id);
CREATE INDEX IF NOT EXISTS idx_academic_terms_year ON public.academic_terms(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_school_shifts_school ON public.school_shifts(school_id);
CREATE INDEX IF NOT EXISTS idx_classrooms_school ON public.classrooms(school_id);
CREATE INDEX IF NOT EXISTS idx_subjects_school ON public.subjects(school_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON public.student_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class ON public.student_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_teacher_classes_teacher ON public.teacher_classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_classes_class ON public.teacher_classes(class_id);
CREATE INDEX IF NOT EXISTS idx_schedules_class ON public.class_schedules(class_id);
CREATE INDEX IF NOT EXISTS idx_schedules_teacher ON public.class_schedules(teacher_id);
CREATE INDEX IF NOT EXISTS idx_calendar_school ON public.school_calendar(school_id);
CREATE INDEX IF NOT EXISTS idx_acad_docs_student ON public.academic_documents(student_id);

-- 18) RLS
ALTER TABLE public.education_networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_documents ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl_name text;
  pol_select text;
  pol_write text;
BEGIN
  FOR tbl_name IN 
    SELECT unnest(ARRAY['academic_years', 'school_shifts', 'school_grades', 'classrooms', 'subjects', 'school_calendar', 'attendance_settings', 'grading_models', 'academic_documents'])
  LOOP
    pol_select := format('CREATE POLICY "RLS_%I_Select" ON public.%I FOR SELECT USING (school_id = public.get_auth_school_id() OR public.is_engine_master() OR school_id IS NULL);', tbl_name, tbl_name);
    pol_write := format('CREATE POLICY "RLS_%I_Write" ON public.%I FOR ALL USING (school_id = public.get_auth_school_id() AND public.get_auth_user_role() IN (''admin'', ''gestor'') OR public.is_engine_master());', tbl_name, tbl_name);
    
    EXECUTE format('DROP POLICY IF EXISTS "RLS_%I_Select" ON public.%I;', tbl_name, tbl_name);
    EXECUTE pol_select;
    
    EXECUTE format('DROP POLICY IF EXISTS "RLS_%I_Write" ON public.%I;', tbl_name, tbl_name);
    EXECUTE pol_write;
  END LOOP;
END $$;

DROP POLICY IF EXISTS "RLS_EduNetworks_Select" ON public.education_networks;
CREATE POLICY "RLS_EduNetworks_Select" ON public.education_networks FOR SELECT USING (true);
DROP POLICY IF EXISTS "RLS_EduNetworks_Write" ON public.education_networks;
CREATE POLICY "RLS_EduNetworks_Write" ON public.education_networks FOR ALL USING (public.is_engine_master());

DROP POLICY IF EXISTS "RLS_StudentEnrollments_Select" ON public.student_enrollments;
CREATE POLICY "RLS_StudentEnrollments_Select" ON public.student_enrollments FOR SELECT USING (true); 
DROP POLICY IF EXISTS "RLS_StudentEnrollments_Write" ON public.student_enrollments;
CREATE POLICY "RLS_StudentEnrollments_Write" ON public.student_enrollments FOR ALL USING (public.get_auth_user_role() IN ('admin', 'gestor') OR public.is_engine_master());

DROP POLICY IF EXISTS "RLS_TeacherClasses_Select" ON public.teacher_classes;
CREATE POLICY "RLS_TeacherClasses_Select" ON public.teacher_classes FOR SELECT USING (true);
DROP POLICY IF EXISTS "RLS_TeacherClasses_Write" ON public.teacher_classes;
CREATE POLICY "RLS_TeacherClasses_Write" ON public.teacher_classes FOR ALL USING (public.get_auth_user_role() IN ('admin', 'gestor') OR public.is_engine_master());

DROP POLICY IF EXISTS "RLS_ClassSchedules_Select" ON public.class_schedules;
CREATE POLICY "RLS_ClassSchedules_Select" ON public.class_schedules FOR SELECT USING (true);
DROP POLICY IF EXISTS "RLS_ClassSchedules_Write" ON public.class_schedules;
CREATE POLICY "RLS_ClassSchedules_Write" ON public.class_schedules FOR ALL USING (public.get_auth_user_role() IN ('admin', 'gestor') OR public.is_engine_master());

-- 22) REALTIME
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE 
    public.education_networks, 
    public.academic_years, 
    public.academic_terms, 
    public.school_shifts, 
    public.school_grades, 
    public.classrooms, 
    public.subjects, 
    public.student_enrollments, 
    public.teacher_classes, 
    public.class_schedules, 
    public.school_calendar, 
    public.attendance_settings, 
    public.grading_models, 
    public.academic_documents;
EXCEPTION WHEN OTHERS THEN
END $$;
