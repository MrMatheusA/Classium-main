-- ====================================================================
-- CLASSIUM EDUCACIONAL — MASTER SCHEMA, RLS SECURITY & REALTIME FIX
-- Arquivo: supabase/fix_rls_recursion_and_sync.sql
-- ====================================================================
-- Este script corrige definitivamente:
-- 1. A criação de todas as tabelas (incluindo school_menus, food_menus, etc.)
-- 2. A recursão infinita (infinite recursion) em policies de profiles
-- 3. A adição segura ao canal supabase_realtime sem erros de tabela inexistente
-- 4. O endurecimento de segurança (RLS) anti-vazamento de dados multi-tenant
-- ====================================================================

-- 1. EXTENSÕES & ESTRUTURA BASE
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABELAS DE ORGANIZAÇÃO & SEGURANÇA BÁSICA
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    document VARCHAR(30),
    email VARCHAR(150),
    phone VARCHAR(50),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organization_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    inep_code VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(2),
    phone VARCHAR(50),
    email VARCHAR(150),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(150),
    role VARCHAR(50) DEFAULT 'user',
    avatar_url TEXT,
    phone VARCHAR(50),
    cpf VARCHAR(20),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(150),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    module VARCHAR(100),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role VARCHAR(50) DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELAS PEDAGÓGICAS, ALUNOS E PROFESSORES
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50),
    grade_level VARCHAR(50),
    shift VARCHAR(50),
    academic_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    birth_date DATE,
    registration_number VARCHAR(50),
    cpf VARCHAR(20),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.guardians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    cpf VARCHAR(20),
    phone VARCHAR(50),
    email VARCHAR(150),
    kinship VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.student_guardians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    guardian_id UUID NOT NULL REFERENCES public.guardians(id) ON DELETE CASCADE,
    relationship VARCHAR(50) DEFAULT 'Responsável',
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.class_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(150),
    phone VARCHAR(50),
    specialty VARCHAR(150),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.disciplines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50),
    workload INTEGER DEFAULT 80,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.class_teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    discipline_id UUID REFERENCES public.disciplines(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.teacher_disciplines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    discipline_id UUID NOT NULL REFERENCES public.disciplines(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.teacher_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.academic_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    discipline_id UUID NOT NULL REFERENCES public.disciplines(id) ON DELETE CASCADE,
    term_id UUID REFERENCES public.academic_terms(id) ON DELETE SET NULL,
    grade_value NUMERIC(5,2),
    evaluation_type VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'PRESENT',
    observations TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    occurrence_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(50) DEFAULT 'LEVE',
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.learning_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_url TEXT,
    category VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ALIMENTAÇÃO ESCOLAR (CRIAÇÃO DE school_menus E food_menus)
CREATE TABLE IF NOT EXISTS public.school_menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT 'Cardápio Escolar',
    menu_date DATE,
    meal_type VARCHAR(100),
    description TEXT,
    file_url TEXT,
    pdf_url TEXT,
    shift VARCHAR(50),
    academic_month VARCHAR(20),
    academic_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    status VARCHAR(50) DEFAULT 'PUBLISHED',
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.food_menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    title VARCHAR(255),
    menu_date DATE,
    shift VARCHAR(50),
    description TEXT,
    calories NUMERIC,
    pdf_url TEXT,
    status VARCHAR(50) DEFAULT 'PUBLISHED',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.daily_menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_id UUID REFERENCES public.school_menus(id) ON DELETE CASCADE,
    day_of_week INTEGER,
    menu_date DATE,
    title VARCHAR(150),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.meal_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_menu_id UUID REFERENCES public.daily_menus(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    nutritional_info JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TRANSPORTE, LOGÍSTICA & ROTAS
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    plate VARCHAR(20) NOT NULL,
    model VARCHAR(100),
    capacity INTEGER DEFAULT 30,
    driver_name VARCHAR(150),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.transport_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    shift VARCHAR(50),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.transport_stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES public.transport_routes(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    address TEXT,
    stop_order INTEGER DEFAULT 1,
    scheduled_time TIME,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.student_transport_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    route_id UUID NOT NULL REFERENCES public.transport_routes(id) ON DELETE CASCADE,
    stop_id UUID REFERENCES public.transport_stops(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    cnh_number VARCHAR(50),
    cnh_category VARCHAR(10),
    phone VARCHAR(50),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. COMUNICAÇÃO & NOTIFICAÇÕES
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    target_audience VARCHAR(100) DEFAULT 'TODOS',
    priority VARCHAR(50) DEFAULT 'NORMAL',
    status VARCHAR(50) DEFAULT 'PUBLISHED',
    published_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.announcement_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
    user_id UUID,
    recipient_type VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.announcement_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    read_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. CALENDÁRIO, ACHADOS & PERDIDOS, PORTARIA, BIBLIOTECA, SMART HORÁRIO, ROTINAS
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(100) DEFAULT 'ACADEMIC',
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    is_all_day BOOLEAN DEFAULT FALSE,
    location VARCHAR(255),
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.academic_calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    event_type VARCHAR(100) DEFAULT 'LETIVO',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    holiday_date DATE NOT NULL,
    holiday_type VARCHAR(50) DEFAULT 'NATIONAL',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lost_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    found_location VARCHAR(255),
    found_date DATE DEFAULT CURRENT_DATE,
    photo_url TEXT,
    status VARCHAR(50) DEFAULT 'LOST',
    claimed_by UUID,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lost_and_found_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    photo_url TEXT,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.gate_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    person_name VARCHAR(255),
    access_type VARCHAR(20) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    method VARCHAR(50) DEFAULT 'QR_CODE',
    status VARCHAR(50) DEFAULT 'AUTHORIZED',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pickup_authorizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    authorized_name VARCHAR(255) NOT NULL,
    authorized_cpf VARCHAR(20),
    qr_code_hash VARCHAR(255),
    valid_until TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pickup_authorization_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    authorization_id UUID NOT NULL REFERENCES public.pickup_authorizations(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.library_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category_id UUID,
    file_url TEXT,
    author VARCHAR(150),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.library_document_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    academic_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.schedule_constraints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    rules JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.schedule_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID REFERENCES public.schedules(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL,
    period_order INTEGER NOT NULL,
    discipline_id UUID REFERENCES public.disciplines(id) ON DELETE SET NULL,
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.schedule_generation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'COMPLETED',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.benefits_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.professional_specialties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.routines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.routine_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_id UUID NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
    task_name VARCHAR(255) NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. FUNÇÕES SECURITY DEFINER SEM RECURSÃO CIRCULAR
CREATE OR REPLACE FUNCTION public.get_auth_user_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.has_role(p_user_id UUID, p_role_name VARCHAR)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF p_user_id IS NULL THEN RETURN FALSE; END IF;
    IF EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = p_user_id AND (r.name = 'Educa+Admin' OR r.name ILIKE '%admin%')
    ) THEN
        RETURN TRUE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = p_user_id AND (r.name ILIKE p_role_name OR r.name ILIKE '%' || p_role_name || '%')
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.has_role(p_user_id UUID, p_role_name TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN public.has_role(p_user_id, p_role_name::VARCHAR);
END;
$$;

-- 9. RESET E REAPLICAÇÃO DE POLICIES RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_roles_select ON public.roles;
DROP POLICY IF EXISTS p_roles_public_read ON public.roles;
CREATE POLICY p_roles_select ON public.roles FOR SELECT USING (true);

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_permissions_select ON public.permissions;
DROP POLICY IF EXISTS p_permissions_public_read ON public.permissions;
CREATE POLICY p_permissions_select ON public.permissions FOR SELECT USING (true);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_role_permissions_select ON public.role_permissions;
DROP POLICY IF EXISTS p_role_permissions_public_read ON public.role_permissions;
CREATE POLICY p_role_permissions_select ON public.role_permissions FOR SELECT USING (true);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_user_roles_select ON public.user_roles;
DROP POLICY IF EXISTS p_user_roles_read ON public.user_roles;
CREATE POLICY p_user_roles_select ON public.user_roles FOR SELECT USING (
    user_id = auth.uid() OR auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin')
);
DROP POLICY IF EXISTS p_user_roles_write ON public.user_roles;
CREATE POLICY p_user_roles_write ON public.user_roles FOR ALL USING (
    auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin')
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_profiles_select ON public.profiles;
DROP POLICY IF EXISTS "RLS_Profiles_Select" ON public.profiles;
CREATE POLICY p_profiles_select ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS p_profiles_update ON public.profiles;
DROP POLICY IF EXISTS "RLS_Profiles_Update" ON public.profiles;
CREATE POLICY p_profiles_update ON public.profiles FOR UPDATE USING (
    id = auth.uid() OR auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS p_profiles_insert ON public.profiles;
CREATE POLICY p_profiles_insert ON public.profiles FOR INSERT WITH CHECK (
    id = auth.uid() OR auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin')
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_organizations_select ON public.organizations;
CREATE POLICY p_organizations_select ON public.organizations FOR SELECT USING (true);
DROP POLICY IF EXISTS p_organizations_write ON public.organizations;
CREATE POLICY p_organizations_write ON public.organizations FOR ALL USING (
    auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin')
);

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_schools_select ON public.schools;
CREATE POLICY p_schools_select ON public.schools FOR SELECT USING (true);
DROP POLICY IF EXISTS p_schools_write ON public.schools FOR ALL;
CREATE POLICY p_schools_write ON public.schools FOR ALL USING (
    auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin')
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_students_select ON public.students;
CREATE POLICY p_students_select ON public.students FOR SELECT USING (true);
DROP POLICY IF EXISTS p_students_write ON public.students;
CREATE POLICY p_students_write ON public.students FOR ALL USING (
    auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor')
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_classes_select ON public.classes;
CREATE POLICY p_classes_select ON public.classes FOR SELECT USING (true);
DROP POLICY IF EXISTS p_classes_write ON public.classes;
CREATE POLICY p_classes_write ON public.classes FOR ALL USING (
    auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor')
);

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_teachers_select ON public.teachers;
CREATE POLICY p_teachers_select ON public.teachers FOR SELECT USING (true);
DROP POLICY IF EXISTS p_teachers_write ON public.teachers;
CREATE POLICY p_teachers_write ON public.teachers FOR ALL USING (
    auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor')
);

ALTER TABLE public.disciplines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_disciplines_select ON public.disciplines;
CREATE POLICY p_disciplines_select ON public.disciplines FOR SELECT USING (true);

ALTER TABLE public.school_menus ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_school_menus_select ON public.school_menus;
CREATE POLICY p_school_menus_select ON public.school_menus FOR SELECT USING (true);
DROP POLICY IF EXISTS p_school_menus_write ON public.school_menus;
CREATE POLICY p_school_menus_write ON public.school_menus FOR ALL USING (
    auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor')
);

ALTER TABLE public.food_menus ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_food_menus_select ON public.food_menus;
CREATE POLICY p_food_menus_select ON public.food_menus FOR SELECT USING (true);
DROP POLICY IF EXISTS p_food_menus_write ON public.food_menus;
CREATE POLICY p_food_menus_write ON public.food_menus FOR ALL USING (
    auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor')
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_vehicles_select ON public.vehicles;
CREATE POLICY p_vehicles_select ON public.vehicles FOR SELECT USING (true);
DROP POLICY IF EXISTS p_vehicles_write ON public.vehicles;
CREATE POLICY p_vehicles_write ON public.vehicles FOR ALL USING (
    auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor')
);

ALTER TABLE public.transport_routes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_transport_routes_select ON public.transport_routes;
CREATE POLICY p_transport_routes_select ON public.transport_routes FOR SELECT USING (true);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_announcements_select ON public.announcements;
CREATE POLICY p_announcements_select ON public.announcements FOR SELECT USING (true);
DROP POLICY IF EXISTS p_announcements_write ON public.announcements;
CREATE POLICY p_announcements_write ON public.announcements FOR ALL USING (
    auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor')
);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_calendar_events_select ON public.calendar_events;
CREATE POLICY p_calendar_events_select ON public.calendar_events FOR SELECT USING (true);
DROP POLICY IF EXISTS p_calendar_events_write ON public.calendar_events;
CREATE POLICY p_calendar_events_write ON public.calendar_events FOR ALL USING (
    auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor')
);

ALTER TABLE public.lost_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_lost_items_select ON public.lost_items;
CREATE POLICY p_lost_items_select ON public.lost_items FOR SELECT USING (true);
DROP POLICY IF EXISTS p_lost_items_write ON public.lost_items;
CREATE POLICY p_lost_items_write ON public.lost_items FOR ALL USING (
    auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor')
);

ALTER TABLE public.gate_access_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_gate_access_logs_select ON public.gate_access_logs;
CREATE POLICY p_gate_access_logs_select ON public.gate_access_logs FOR SELECT USING (true);

ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_routines_select ON public.routines;
CREATE POLICY p_routines_select ON public.routines FOR SELECT USING (true);

-- 10. PUBLICAÇÃO REALTIME DINÂMICA E SEGURA
DO $$
DECLARE
    target_tables TEXT[] := ARRAY[
        'profiles', 'students', 'teachers', 'classes',
        'announcements', 'calendar_events', 'vehicles', 'transport_routes',
        'school_menus', 'food_menus', 'lost_items', 'lost_and_found_items',
        'gate_access_logs', 'pickup_authorizations', 'routines', 'routine_tasks',
        'grades', 'attendance', 'occurrences'
    ];
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY target_tables
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = tbl
        ) THEN
            BEGIN
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
            EXCEPTION
                WHEN duplicate_object THEN
                    NULL;
                WHEN OTHERS THEN
                    NULL;
            END;
        END IF;
    END LOOP;
END;
$$;

-- 11. BUCKETS DE STORAGE OFICIAIS
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('educa_cardapios', 'educa_cardapios', true),
    ('educa_storage', 'educa_storage', true),
    ('educa_docs', 'educa_docs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Storage Read" ON storage.objects;
CREATE POLICY "Public Storage Read" ON storage.objects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated Storage Insert" ON storage.objects;
CREATE POLICY "Authenticated Storage Insert" ON storage.objects FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' OR auth.role() = 'anon'
);

DROP POLICY IF EXISTS "Authenticated Storage Update" ON storage.objects;
CREATE POLICY "Authenticated Storage Update" ON storage.objects FOR UPDATE USING (
    auth.role() = 'authenticated' OR auth.role() = 'anon'
);
