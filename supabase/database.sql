-- ====================================================================
-- EDUCA+ ERP EDUCACIONAL — COMPREHENSIVE CONSOLIDATED SUPABASE DATABASE SQL
-- PRODUCTION READY POSTGRESQL SCHEMA, RLS, STORAGE, REALTIME & SEED DATA
-- Safe to copy and execute directly into the Supabase SQL Editor
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- 2. DOMAIN ENUMS
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
    CREATE TYPE user_role_enum AS ENUM ('admin', 'gestor', 'professor', 'familia', 'aluno');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'school_status_enum') THEN
    CREATE TYPE school_status_enum AS ENUM ('ativo', 'suspenso', 'inativo', 'degustacao');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lost_found_status_enum') THEN
    CREATE TYPE lost_found_status_enum AS ENUM ('disponivel', 'reservado', 'entregue', 'arquivado');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'occurrence_severity_enum') THEN
    CREATE TYPE occurrence_severity_enum AS ENUM ('Informativa', 'Leve', 'Media', 'Grave', 'Gravissima');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'occurrence_status_enum') THEN
    CREATE TYPE occurrence_status_enum AS ENUM ('Registrada', 'Em Analise', 'Notificada Familia', 'Resolvida', 'Arquivada');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'announcement_target_enum') THEN
    CREATE TYPE announcement_target_enum AS ENUM ('todos', 'gestores', 'professores', 'familias', 'alunos', 'turma_especifica');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gate_entry_status_enum') THEN
    CREATE TYPE gate_entry_status_enum AS ENUM ('liberado', 'pendente', 'bloqueado', 'cancelado');
  END IF;
END $$;

-- 3. TABLES (ESCOLAS, USERS, PROFILES, STUDENTS, OCCURRENCES, LOST & FOUND, ETC.)
CREATE TABLE IF NOT EXISTS public.schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  legal_name VARCHAR(255),
  cnpj VARCHAR(20) UNIQUE,
  phone VARCHAR(30),
  email VARCHAR(255),
  street VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(2),
  zip_code VARCHAR(20),
  logo_url TEXT,
  subscription_plan VARCHAR(50) DEFAULT 'Pro SaaS Multi-Unidade',
  status school_status_enum DEFAULT 'ativo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  cpf VARCHAR(14),
  role user_role_enum NOT NULL DEFAULT 'familia',
  phone VARCHAR(30),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.school_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  unit_name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.school_units(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  grade VARCHAR(50) NOT NULL,
  shift VARCHAR(30) DEFAULT 'Matutino',
  academic_year INT DEFAULT 2026,
  max_capacity INT DEFAULT 35,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  registration_code VARCHAR(50) NOT NULL,
  grade VARCHAR(50) NOT NULL,
  class_name VARCHAR(50) NOT NULL,
  birth_date DATE,
  cpf VARCHAR(14),
  parent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  photo_url TEXT,
  medical_info JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(20) DEFAULT 'ativo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

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
  status lost_found_status_enum DEFAULT 'disponivel',
  registered_by VARCHAR(255),
  reserved_by_student VARCHAR(255),
  reserved_by_parent VARCHAR(255),
  reserved_at TIMESTAMPTZ,
  delivered_by VARCHAR(255),
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'Geral',
  author_name VARCHAR(255) NOT NULL,
  target_audience announcement_target_enum DEFAULT 'todos',
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  requires_signature BOOLEAN DEFAULT FALSE,
  requires_confirmation BOOLEAN DEFAULT FALSE,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.school_occurrences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  student_name VARCHAR(255) NOT NULL,
  grade VARCHAR(50) NOT NULL,
  type VARCHAR(50) NOT NULL,
  severity occurrence_severity_enum DEFAULT 'Informativa',
  description TEXT NOT NULL,
  registered_by VARCHAR(255) NOT NULL,
  status occurrence_status_enum DEFAULT 'Registrada',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.food_menus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  week_day VARCHAR(30) NOT NULL,
  menu_type VARCHAR(50) DEFAULT 'Almoço',
  main_dish VARCHAR(255) NOT NULL,
  side_dish VARCHAR(255),
  salad VARCHAR(255),
  dessert VARCHAR(255),
  beverage VARCHAR(255),
  nutritional_info JSONB DEFAULT '{}'::jsonb,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.gate_access_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  token_code VARCHAR(100) UNIQUE NOT NULL,
  authorized_person_name VARCHAR(255) NOT NULL,
  authorized_person_cpf VARCHAR(14),
  relationship VARCHAR(50) NOT NULL,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ NOT NULL,
  status gate_entry_status_enum DEFAULT 'liberado',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.integration_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  module_source VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  user_email VARCHAR(255),
  user_role VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_schools_code ON public.schools(code);
CREATE INDEX IF NOT EXISTS idx_schools_cnpj ON public.schools(cnpj) WHERE cnpj IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON public.profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_students_school_id ON public.students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_registration ON public.students(registration_code);
CREATE INDEX IF NOT EXISTS idx_lost_found_school_status ON public.lost_and_found(school_id, status);
CREATE INDEX IF NOT EXISTS idx_announcements_school_target ON public.announcements(school_id, target_audience);
CREATE INDEX IF NOT EXISTS idx_occurrences_school_student ON public.school_occurrences(school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_gate_tokens_code ON public.gate_access_tokens(token_code);
CREATE INDEX IF NOT EXISTS idx_audit_logs_school_user ON public.audit_logs(school_id, user_id);

-- 5. STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('educa_fotos', 'educa_fotos', true),
  ('educa_logos', 'educa_logos', true),
  ('educa_pdfs', 'educa_pdfs', true),
  ('educa_cardapios', 'educa_cardapios', true),
  ('educa_comunicados', 'educa_comunicados', true),
  ('educa_documentos', 'educa_documentos', true),
  ('achados_perdidos', 'achados_perdidos', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 6. ROW LEVEL SECURITY (RLS) & HELPER SECURITY FUNCTIONS
CREATE OR REPLACE FUNCTION public.get_auth_school_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''))::UUID,
    (SELECT school_id FROM public.profiles WHERE id = auth.uid()),
    (NULLIF(auth.jwt() -> 'user_metadata' ->> 'school_id', ''))::UUID
  );
$$;

CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS VARCHAR
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT role::text FROM public.profiles WHERE id = auth.uid()),
    auth.jwt() -> 'user_metadata' ->> 'role',
    'familia'
  );
$$;

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lost_and_found ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Schools Policies
DROP POLICY IF EXISTS "RLS_Schools_Select" ON public.schools;
CREATE POLICY "RLS_Schools_Select" ON public.schools FOR SELECT USING (id = public.get_auth_school_id());

-- Profiles Policies
DROP POLICY IF EXISTS "RLS_Profiles_Select" ON public.profiles;
CREATE POLICY "RLS_Profiles_Select" ON public.profiles FOR SELECT USING (school_id = public.get_auth_school_id() OR id = auth.uid());
DROP POLICY IF EXISTS "RLS_Profiles_Update" ON public.profiles;
CREATE POLICY "RLS_Profiles_Update" ON public.profiles FOR UPDATE USING (id = auth.uid() OR (school_id = public.get_auth_school_id() AND public.get_auth_user_role() IN ('admin', 'gestor')));

-- Students Policies
DROP POLICY IF EXISTS "RLS_Students_Select" ON public.students;
CREATE POLICY "RLS_Students_Select" ON public.students FOR SELECT USING (school_id = public.get_auth_school_id() OR parent_id = auth.uid());
DROP POLICY IF EXISTS "RLS_Students_Write" ON public.students;
CREATE POLICY "RLS_Students_Write" ON public.students FOR ALL USING (school_id = public.get_auth_school_id() AND public.get_auth_user_role() IN ('admin', 'gestor', 'professor'));

-- Classes Policies
DROP POLICY IF EXISTS "RLS_Classes_Select" ON public.classes;
CREATE POLICY "RLS_Classes_Select" ON public.classes FOR SELECT USING (school_id = public.get_auth_school_id());
DROP POLICY IF EXISTS "RLS_Classes_Write" ON public.classes;
CREATE POLICY "RLS_Classes_Write" ON public.classes FOR ALL USING (school_id = public.get_auth_school_id() AND public.get_auth_user_role() IN ('admin', 'gestor'));

-- Lost and Found Policies
DROP POLICY IF EXISTS "RLS_LostFound_Select" ON public.lost_and_found;
CREATE POLICY "RLS_LostFound_Select" ON public.lost_and_found FOR SELECT USING (school_id = public.get_auth_school_id());
DROP POLICY IF EXISTS "RLS_LostFound_Insert" ON public.lost_and_found;
CREATE POLICY "RLS_LostFound_Insert" ON public.lost_and_found FOR INSERT WITH CHECK (school_id = public.get_auth_school_id());
DROP POLICY IF EXISTS "RLS_LostFound_Update" ON public.lost_and_found;
CREATE POLICY "RLS_LostFound_Update" ON public.lost_and_found FOR UPDATE USING (school_id = public.get_auth_school_id());

-- Announcements Policies
DROP POLICY IF EXISTS "RLS_Announcements_Select" ON public.announcements;
CREATE POLICY "RLS_Announcements_Select" ON public.announcements FOR SELECT USING (school_id = public.get_auth_school_id());
DROP POLICY IF EXISTS "RLS_Announcements_Write" ON public.announcements;
CREATE POLICY "RLS_Announcements_Write" ON public.announcements FOR ALL USING (school_id = public.get_auth_school_id() AND public.get_auth_user_role() IN ('admin', 'gestor', 'professor'));

-- Occurrences Policies
DROP POLICY IF EXISTS "RLS_Occurrences_Select" ON public.school_occurrences;
CREATE POLICY "RLS_Occurrences_Select" ON public.school_occurrences FOR SELECT USING (school_id = public.get_auth_school_id() OR student_id IN (SELECT id FROM public.students WHERE parent_id = auth.uid()));
DROP POLICY IF EXISTS "RLS_Occurrences_Write" ON public.school_occurrences;
CREATE POLICY "RLS_Occurrences_Write" ON public.school_occurrences FOR ALL USING (school_id = public.get_auth_school_id() AND public.get_auth_user_role() IN ('admin', 'gestor', 'professor'));

-- Food Menus Policies
DROP POLICY IF EXISTS "RLS_FoodMenus_Select" ON public.food_menus;
CREATE POLICY "RLS_FoodMenus_Select" ON public.food_menus FOR SELECT USING (school_id = public.get_auth_school_id());
DROP POLICY IF EXISTS "RLS_FoodMenus_Write" ON public.food_menus;
CREATE POLICY "RLS_FoodMenus_Write" ON public.food_menus FOR ALL USING (school_id = public.get_auth_school_id() AND public.get_auth_user_role() IN ('admin', 'gestor'));

-- Gate Access Tokens Policies
DROP POLICY IF EXISTS "RLS_GateTokens_Select" ON public.gate_access_tokens;
CREATE POLICY "RLS_GateTokens_Select" ON public.gate_access_tokens FOR SELECT USING (school_id = public.get_auth_school_id() OR student_id IN (SELECT id FROM public.students WHERE parent_id = auth.uid()));
DROP POLICY IF EXISTS "RLS_GateTokens_Insert" ON public.gate_access_tokens;
CREATE POLICY "RLS_GateTokens_Insert" ON public.gate_access_tokens FOR INSERT WITH CHECK (school_id = public.get_auth_school_id());

-- Audit Logs Policies (Read Only for Admin/Gestor, Insert for App)
DROP POLICY IF EXISTS "RLS_AuditLogs_Select" ON public.audit_logs;
CREATE POLICY "RLS_AuditLogs_Select" ON public.audit_logs FOR SELECT USING (school_id = public.get_auth_school_id() AND public.get_auth_user_role() IN ('admin', 'gestor'));
DROP POLICY IF EXISTS "RLS_AuditLogs_Insert" ON public.audit_logs;
CREATE POLICY "RLS_AuditLogs_Insert" ON public.audit_logs FOR INSERT WITH CHECK (school_id = public.get_auth_school_id());

-- 7. PL/PGSQL FUNCTIONS & PROCEDURES
CREATE OR REPLACE FUNCTION public.reservar_item_achado(
  p_item_id UUID,
  p_student_name VARCHAR,
  p_parent_name VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
BEGIN
  SELECT * INTO v_item FROM public.lost_and_found WHERE id = p_item_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Item não encontrado.');
  END IF;

  IF v_item.status <> 'disponivel' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Item não está disponível.');
  END IF;

  UPDATE public.lost_and_found
  SET 
    status = 'reservado',
    reserved_by_student = p_student_name,
    reserved_by_parent = p_parent_name,
    reserved_at = NOW(),
    updated_at = NOW()
  WHERE id = p_item_id;

  RETURN jsonb_build_object('success', true, 'message', 'Item reservado com sucesso.', 'item_id', p_item_id);
END;
$$;

-- 8. TRIGGERS
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_schools_updated_at BEFORE UPDATE ON public.schools FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();
CREATE TRIGGER trg_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- 9. INITIAL SEED DATA
INSERT INTO public.schools (id, code, name, cnpj, city, state, subscription_plan)
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'ESC-SEDE-01', 'Colégio Educa+ Internacional (Unidade Sede)', '12.345.678/0001-90', 'São Paulo', 'SP', 'Enterprise Multi-Tenant SaaS')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.classes (id, school_id, name, grade, shift)
VALUES ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Turma 5º Ano A', '5º Ano', 'Matutino')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, school_id, class_id, name, registration_code, grade, class_name)
VALUES ('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Lucas Santos Andrade', 'MAT-2026-001', '5º Ano', 'Turma 5º A')
ON CONFLICT (id) DO NOTHING;
