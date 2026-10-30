-- ====================================================================
-- EDUCA+ SAAS PLATFORM — PRODUCTION SUPABASE POSTGRESQL SCHEMA
-- Multi-Tenant, Row Level Security (RLS), Realtime, Audit Logs & Storage
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ESCOLAS (TENANTS)
CREATE TABLE IF NOT EXISTS public.schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  cnpj VARCHAR(20),
  city VARCHAR(100),
  state VARCHAR(2),
  subscription_plan VARCHAR(50) DEFAULT 'pro',
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PERFIS DE USUÁRIOS (INTEGRADO COM SUPABASE AUTH)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'gestor', 'professor', 'familia', 'aluno')),
  phone VARCHAR(30),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ESTUDANTES
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  grade VARCHAR(50) NOT NULL,
  class_name VARCHAR(50) NOT NULL,
  registration_code VARCHAR(50) NOT NULL,
  parent_id UUID REFERENCES public.profiles(id),
  photo_url TEXT,
  status VARCHAR(20) DEFAULT 'ativo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ACHADOS E PERDIDOS DIGITAL
CREATE TABLE IF NOT EXISTS public.lost_and_found (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  location_found VARCHAR(255),
  sector VARCHAR(100),
  date_found DATE DEFAULT CURRENT_DATE,
  time_found TIME DEFAULT CURRENT_TIME,
  photo_url TEXT,
  status VARCHAR(30) DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'reservado', 'entregue', 'arquivado')),
  registered_by VARCHAR(255),
  reserved_by_student VARCHAR(255),
  reserved_by_parent VARCHAR(255),
  reserved_at TIMESTAMPTZ,
  delivered_by VARCHAR(255),
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. COMUNICADOS E RECADOS (RADAR DA FAMÍLIA)
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'geral',
  author_name VARCHAR(255) NOT NULL,
  target_audience VARCHAR(50) DEFAULT 'todos',
  requires_signature BOOLEAN DEFAULT FALSE,
  requires_confirmation BOOLEAN DEFAULT FALSE,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. OCORRÊNCIAS & RADAR DE ROTINA
CREATE TABLE IF NOT EXISTS public.school_occurrences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  student_name VARCHAR(255) NOT NULL,
  grade VARCHAR(50) NOT NULL,
  type VARCHAR(50) NOT NULL,
  severity VARCHAR(30) DEFAULT 'Informativa',
  description TEXT NOT NULL,
  registered_by VARCHAR(255) NOT NULL,
  status VARCHAR(30) DEFAULT 'Registrada',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TRILHA DE AUDITORIA DE SEGURANÇA (AUDIT LOGS)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES public.schools(id),
  user_id UUID REFERENCES public.profiles(id),
  user_email VARCHAR(255),
  user_role VARCHAR(50),
  action VARCHAR(100) NOT NULL,
  entity VARCHAR(100) NOT NULL,
  details TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES — MULTI-TENANT ISOLATION
-- ====================================================================

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lost_and_found ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see data belonging to their own school_id
CREATE POLICY "Strict Multi-Tenant Isolation for Profiles"
  ON public.profiles FOR ALL
  USING (school_id = (auth.jwt() -> 'user_metadata' ->> 'school_id')::UUID);

CREATE POLICY "Strict Multi-Tenant Isolation for Students"
  ON public.students FOR ALL
  USING (school_id = (auth.jwt() -> 'user_metadata' ->> 'school_id')::UUID);

CREATE POLICY "Strict Multi-Tenant Isolation for Lost and Found"
  ON public.lost_and_found FOR ALL
  USING (school_id = (auth.jwt() -> 'user_metadata' ->> 'school_id')::UUID);

CREATE POLICY "Strict Multi-Tenant Isolation for Announcements"
  ON public.announcements FOR ALL
  USING (school_id = (auth.jwt() -> 'user_metadata' ->> 'school_id')::UUID);

CREATE POLICY "Strict Multi-Tenant Isolation for Occurrences"
  ON public.school_occurrences FOR ALL
  USING (school_id = (auth.jwt() -> 'user_metadata' ->> 'school_id')::UUID);

-- ====================================================================
-- INDEXES FOR HIGH PERFORMANCE & FAST REALTIME QUERYING
-- ====================================================================

CREATE INDEX IF NOT EXISTS idx_students_school_id ON public.students(school_id);
CREATE INDEX IF NOT EXISTS idx_lost_found_school_status ON public.lost_and_found(school_id, status);
CREATE INDEX IF NOT EXISTS idx_announcements_school_id ON public.announcements(school_id);
CREATE INDEX IF NOT EXISTS idx_occurrences_school_student ON public.school_occurrences(school_id, student_id);

-- ====================================================================
-- STORAGE BUCKET CONFIGURATION (PUBLIC & AUTHORIZED)
-- ====================================================================

INSERT INTO storage.buckets (id, name, public) VALUES 
  ('educa_fotos', 'educa_fotos', true),
  ('educa_logos', 'educa_logos', true),
  ('educa_pdfs', 'educa_pdfs', true),
  ('educa_cardapios', 'educa_cardapios', true),
  ('educa_comunicados', 'educa_comunicados', true),
  ('educa_documentos', 'educa_documentos', true)
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- 9. PAINEL PEDAGÓGICO — ESTRUTURA COMPLETA SUPABASE & RLS
-- ====================================================================

-- 9.1 ORGANIZATIONS & CLASSES & TEACHERS & DISCIPLINES
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.disciplines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.teachers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  specialty VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  grade VARCHAR(50) NOT NULL,
  shift VARCHAR(20) NOT NULL CHECK (shift IN ('Manhã', 'Tarde', 'Noite', 'Integral')),
  academic_year VARCHAR(10) DEFAULT '2026',
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9.2 ATTENDANCES (FREQUÊNCIAS E FALTAS DO ALUNO)
CREATE TABLE IF NOT EXISTS public.attendances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  discipline_id UUID NOT NULL REFERENCES public.disciplines(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  is_present BOOLEAN NOT NULL DEFAULT TRUE,
  justification TEXT,
  justified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  justification_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (student_id, class_id, discipline_id, attendance_date)
);

-- 9.3 BUSCATIVA ALERTS (MONITORAMENTO DE FALTAS CRÍTICAS E RETENÇÃO)
CREATE TABLE IF NOT EXISTS public.buscativa_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('5_consecutive_absences', '10_alternate_absences', '16_annual_absences', 'retention_51_absences', 'excessive_absences')),
  current_absences INTEGER NOT NULL,
  alert_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9.4 OCCURRENCES (OCORRÊNCIAS / ADVERTÊNCIAS PEDAGÓGICAS)
CREATE TABLE IF NOT EXISTS public.occurrences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  occurrence_date DATE NOT NULL DEFAULT CURRENT_DATE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('advertencia', 'elogio', 'observacao')),
  description TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  action_taken TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9.5 PEDAGOGICAL ALERTS (RADAR DE ADVERTÊNCIAS ESCALONADAS)
CREATE TABLE IF NOT EXISTS public.pedagogical_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('dialogue_suggestion', 'communicate_family', 'family_meeting', 'tutelar_council', 'critical_intervention')),
  current_warnings INTEGER NOT NULL,
  alert_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9.6 TEACHER AVAILABILITY & SUBSTITUTIONS (QUADRO DE SUBSTITUIÇÃO)
CREATE TABLE IF NOT EXISTS public.teacher_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  day_of_week VARCHAR(20) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.substitutions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  substitute_teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  discipline_id UUID NOT NULL REFERENCES public.disciplines(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  substitution_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  reason TEXT,
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- RLS POLICIES FOR PEDAGOGICAL TABLES
-- ====================================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disciplines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buscativa_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedagogical_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.substitutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization RLS for Classes" ON public.classes FOR ALL
  USING (organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::UUID);

CREATE POLICY "Organization RLS for Attendances" ON public.attendances FOR ALL
  USING (organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::UUID);

CREATE POLICY "Organization RLS for Buscativa" ON public.buscativa_alerts FOR ALL
  USING (organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::UUID);

CREATE POLICY "Organization RLS for Occurrences" ON public.occurrences FOR ALL
  USING (organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::UUID);

CREATE POLICY "Organization RLS for Pedagogical Alerts" ON public.pedagogical_alerts FOR ALL
  USING (organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::UUID);

CREATE POLICY "Organization RLS for Teacher Availability" ON public.teacher_availability FOR ALL
  USING (organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::UUID);

CREATE POLICY "Organization RLS for Substitutions" ON public.substitutions FOR ALL
  USING (organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::UUID);

-- ====================================================================
-- AUTOMATED TRIGGERS & PL/PGSQL FUNCTIONS FOR IA PEDAGÓGICA
-- ====================================================================

-- Function to evaluate attendance and automatically trigger Buscativa Alerts
CREATE OR REPLACE FUNCTION public.fn_process_buscativa_alerts()
RETURNS TRIGGER AS $$
DECLARE
  v_total_absences INTEGER;
  v_student_org UUID;
BEGIN
  v_student_org := NEW.organization_id;

  -- Calculate total unexcused absences for the current academic year
  SELECT COUNT(*) INTO v_total_absences
  FROM public.attendances
  WHERE student_id = NEW.student_id
    AND is_present = FALSE
    AND (justification IS NULL OR justification = '');

  -- Check thresholds for Buscativa Alerts
  IF v_total_absences >= 51 THEN
    INSERT INTO public.buscativa_alerts (student_id, organization_id, alert_type, current_absences, notes)
    VALUES (NEW.student_id, v_student_org, 'retention_51_absences', v_total_absences, 'Sinalizado para retenção automática por exceder o limite legal de 50 faltas anuais.')
    ON CONFLICT DO NOTHING;
  ELSIF v_total_absences >= 16 THEN
    INSERT INTO public.buscativa_alerts (student_id, organization_id, alert_type, current_absences, notes)
    VALUES (NEW.student_id, v_student_org, '16_annual_absences', v_total_absences, 'Atingiu 16 faltas no ano letivo. Alerta crítico emitido para o Conselho Tutelar/Equipe Pedagógica.')
    ON CONFLICT DO NOTHING;
  ELSIF v_total_absences >= 10 THEN
    INSERT INTO public.buscativa_alerts (student_id, organization_id, alert_type, current_absences, notes)
    VALUES (NEW.student_id, v_student_org, '10_alternate_absences', v_total_absences, 'Atingiu 10 faltas alternadas. Necessidade de contato imediato com a família.')
    ON CONFLICT DO NOTHING;
  ELSIF v_total_absences >= 5 THEN
    INSERT INTO public.buscativa_alerts (student_id, organization_id, alert_type, current_absences, notes)
    VALUES (NEW.student_id, v_student_org, '5_consecutive_absences', v_total_absences, 'Atingiu 5 faltas registradas. Início do protocolo de Busca Ativa Escolar.')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_evaluate_buscativa
AFTER INSERT OR UPDATE ON public.attendances
FOR EACH ROW
WHEN (NEW.is_present = FALSE)
EXECUTE FUNCTION public.fn_process_buscativa_alerts();

-- Function to evaluate occurrences and trigger Escalated Pedagogical Alerts
CREATE OR REPLACE FUNCTION public.fn_process_pedagogical_alerts()
RETURNS TRIGGER AS $$
DECLARE
  v_warning_count INTEGER;
BEGIN
  -- Count total warnings/advertencias for student
  SELECT COUNT(*) INTO v_warning_count
  FROM public.occurrences
  WHERE student_id = NEW.student_id
    AND type = 'advertencia';

  IF v_warning_count >= 25 THEN
    INSERT INTO public.pedagogical_alerts (student_id, organization_id, alert_type, current_warnings, notes)
    VALUES (NEW.student_id, NEW.organization_id, 'critical_intervention', v_warning_count, 'Caso Crítico: Acima de 25 ocorrências. Requer intervenção multidisciplinar rigorosa.')
    ON CONFLICT DO NOTHING;
  ELSIF v_warning_count >= 20 THEN
    INSERT INTO public.pedagogical_alerts (student_id, organization_id, alert_type, current_warnings, notes)
    VALUES (NEW.student_id, NEW.organization_id, 'tutelar_council', v_warning_count, '20 Advertências: Encaminhamento imediato ao Conselho Tutelar e convocação de reunião de pais.')
    ON CONFLICT DO NOTHING;
  ELSIF v_warning_count >= 15 THEN
    INSERT INTO public.pedagogical_alerts (student_id, organization_id, alert_type, current_warnings, notes)
    VALUES (NEW.student_id, NEW.organization_id, 'family_meeting', v_warning_count, '15 Advertências: Convocação formal da família para reunião presencial.')
    ON CONFLICT DO NOTHING;
  ELSIF v_warning_count >= 10 THEN
    INSERT INTO public.pedagogical_alerts (student_id, organization_id, alert_type, current_warnings, notes)
    VALUES (NEW.student_id, NEW.organization_id, 'communicate_family', v_warning_count, '10 Advertências: Notificação formal emitida às famílias.')
    ON CONFLICT DO NOTHING;
  ELSIF v_warning_count >= 5 THEN
    INSERT INTO public.pedagogical_alerts (student_id, organization_id, alert_type, current_warnings, notes)
    VALUES (NEW.student_id, NEW.organization_id, 'dialogue_suggestion', v_warning_count, '5 Advertências: Sugestão de diálogo individualizado com a equipe pedagógica.')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_evaluate_occurrences
AFTER INSERT OR UPDATE ON public.occurrences
FOR EACH ROW
EXECUTE FUNCTION public.fn_process_pedagogical_alerts();

