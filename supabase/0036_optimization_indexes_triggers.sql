-- ====================================================================
-- EDUCA+ ERP EDUCACIONAL — ENTERPRISE OPTIMIZATIONS
-- INDEXES, TRIGGERS (moddatetime) AND CONSTRAINTS
-- ====================================================================

-- Habilitar a extensão moddatetime para os triggers de updated_at
CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions;

-- Função genérica caso a extensão não possa ser usada
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Exemplo de Triggers para updated_at nas tabelas principais
DROP TRIGGER IF EXISTS trg_schools_updated_at ON public.schools;
CREATE TRIGGER trg_schools_updated_at BEFORE UPDATE ON public.schools FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_students_updated_at ON public.students;
CREATE TRIGGER trg_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_system_profiles_updated_at ON public.system_profiles;
CREATE TRIGGER trg_system_profiles_updated_at BEFORE UPDATE ON public.system_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Índices B-Tree para Chaves Estrangeiras (Performance)
CREATE INDEX IF NOT EXISTS idx_schools_network_id ON public.schools(network_id);
CREATE INDEX IF NOT EXISTS idx_school_units_school_id ON public.school_units(school_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_profile_id ON public.user_roles(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON public.user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_school_id ON public.user_roles(school_id);

CREATE INDEX IF NOT EXISTS idx_students_school_id ON public.students(school_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_student_id ON public.student_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_school_id ON public.student_enrollments(school_id);
CREATE INDEX IF NOT EXISTS idx_guardians_profile_id ON public.guardians(profile_id);
CREATE INDEX IF NOT EXISTS idx_student_guardians_student_id ON public.student_guardians(student_id);
CREATE INDEX IF NOT EXISTS idx_student_guardians_guardian_id ON public.student_guardians(guardian_id);

CREATE INDEX IF NOT EXISTS idx_class_students_class_id ON public.class_students(class_id);
CREATE INDEX IF NOT EXISTS idx_class_students_student_id ON public.class_students(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_student_id ON public.grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_subject_id ON public.grades(subject_id);

-- Índices GIN para colunas JSONB
CREATE INDEX IF NOT EXISTS idx_integration_queue_payload ON public.integration_queue USING GIN (payload);
CREATE INDEX IF NOT EXISTS idx_notification_queue_data ON public.notification_queue USING GIN (data);
CREATE INDEX IF NOT EXISTS idx_school_settings_settings ON public.school_settings USING GIN (settings);
CREATE INDEX IF NOT EXISTS idx_system_settings_value ON public.system_settings USING GIN (value);
