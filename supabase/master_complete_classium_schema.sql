-- ==============================================================================
-- CLASSIUM / EDUCA+ - MASTER DATABASE SCHEMA & REALTIME INTEGRATION
-- Target Database: Supabase PostgreSQL (PostgREST + Realtime + Auth)
-- Versão: 2.0.0 (Produção Completa - Gestor, Docente, Família, Portaria, Estudante)
-- ==============================================================================

-- 1. HABILITAR EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. FUNÇÃO GENÉRICA DE ATUALIZAÇÃO AUTOMÁTICA DE TIMESTAMP (updated_at)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 3. NÚCLEO INSTITUCIONAL & ORGANIZAÇÃO (Gestor Master & Escolas)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    document_number VARCHAR(30), -- CNPJ
    inep_code VARCHAR(20),
    email VARCHAR(150),
    phone VARCHAR(30),
    address TEXT,
    city VARCHAR(100) DEFAULT 'São Paulo',
    state VARCHAR(5) DEFAULT 'SP',
    postal_code VARCHAR(20),
    logo_url TEXT,
    status VARCHAR(30) DEFAULT 'active',
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    inep_code VARCHAR(20),
    principal_name VARCHAR(150),
    email VARCHAR(150),
    phone VARCHAR(30),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(5),
    postal_code VARCHAR(20),
    status VARCHAR(30) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    year INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT false,
    status VARCHAR(30) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_academic_year_org UNIQUE (organization_id, year)
);

CREATE TABLE IF NOT EXISTS public.school_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL, -- Matutino, Vespertino, Noturno, Integral, 1º, 2º
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 4. CONTROLE DE ACESSO, USUÁRIOS E PERMISSÕES (RBAC)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY, -- Conecta ao auth.users(id) se aplicável
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(30),
    cpf VARCHAR(20),
    rg VARCHAR(30),
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'responsavel', -- gestor, professor, responsavel, aluno, funcionario, portaria, admin_master
    status VARCHAR(30) DEFAULT 'active',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    email VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    module VARCHAR(80) NOT NULL,
    can_view BOOLEAN DEFAULT false,
    can_create BOOLEAN DEFAULT false,
    can_edit BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    can_export BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    theme VARCHAR(20) DEFAULT 'light',
    notifications_enabled BOOLEAN DEFAULT true,
    email_alerts BOOLEAN DEFAULT true,
    push_alerts BOOLEAN DEFAULT true,
    language VARCHAR(10) DEFAULT 'pt-BR',
    preferences JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 5. RECURSOS HUMANOS, FUNCIONÁRIOS E CORPO DOCENTE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.professionals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID,
    full_name VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    email VARCHAR(150),
    phone VARCHAR(30),
    cpf VARCHAR(20),
    rg VARCHAR(30),
    birth_date DATE,
    gender VARCHAR(20),
    role VARCHAR(80) NOT NULL, -- Professor, Coordenador, Diretor, Secretário, Inspetor, Nutricionista, Motorista, Merendeira
    department VARCHAR(80),
    registration_number VARCHAR(50),
    hire_date DATE,
    workload_hours INT DEFAULT 40,
    status VARCHAR(30) DEFAULT 'active',
    address TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.school_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(150),
    phone VARCHAR(30),
    role VARCHAR(80) NOT NULL,
    shift VARCHAR(50),
    status VARCHAR(30) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID,
    name VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    email VARCHAR(150),
    phone VARCHAR(30),
    cpf VARCHAR(20),
    specialty VARCHAR(100),
    academic_degree VARCHAR(100),
    status VARCHAR(30) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inspectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(30),
    shift VARCHAR(50),
    station_area VARCHAR(100),
    status VARCHAR(30) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 6. MATRIZ CURRICULAR, DISCIPLINAS E TURMAS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.disciplines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50),
    workload_hours INT DEFAULT 80,
    segment VARCHAR(80), -- Fundamental I, Fundamental II, Ensino Médio
    description TEXT,
    color VARCHAR(30) DEFAULT '#3B82F6',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    discipline_id UUID REFERENCES public.disciplines(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50),
    grade VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL, -- Ex: 111, 112, 611, 1001
    grade VARCHAR(50) NOT NULL, -- 1º ANO, 6º ANO, 1ª SÉRIE EM
    shift VARCHAR(50) NOT NULL, -- Matutino, Vespertino, 1º, 2º, Integral
    room VARCHAR(50),
    max_capacity INT DEFAULT 35,
    max_students INT DEFAULT 35,
    academic_year VARCHAR(10) DEFAULT '2026',
    status VARCHAR(30) DEFAULT 'active',
    is_active BOOLEAN DEFAULT true,
    numeration_status BOOLEAN DEFAULT true,
    kit_escolar_status BOOLEAN DEFAULT true,
    uniform_status BOOLEAN DEFAULT true,
    school_days INT DEFAULT 200,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.class_teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL,
    subject VARCHAR(100) NOT NULL,
    discipline_id UUID REFERENCES public.disciplines(id) ON DELETE SET NULL,
    grade VARCHAR(50),
    shift VARCHAR(50),
    year INT DEFAULT 2026,
    is_class_leader BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 7. ESTUDANTES, RESPONSÁVEIS E MATRÍCULAS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.guardians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID,
    full_name VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    cpf VARCHAR(20) NOT NULL,
    rg VARCHAR(30),
    email VARCHAR(150),
    phone VARCHAR(30) NOT NULL,
    secondary_phone VARCHAR(30),
    kinship VARCHAR(50) DEFAULT 'Mãe', -- Mãe, Pai, Avó, Avô, Tutor Legal
    profession VARCHAR(100),
    address TEXT,
    neighborhood VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(5),
    postal_code VARCHAR(20),
    status VARCHAR(30) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    user_id UUID,
    full_name VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    registration_code VARCHAR(50) NOT NULL, -- RA
    inep_id VARCHAR(50),
    birth_date DATE,
    gender VARCHAR(20),
    sex VARCHAR(20),
    cpf VARCHAR(20),
    rg VARCHAR(30),
    birth_certificate VARCHAR(100),
    blood_type VARCHAR(10),
    has_special_needs BOOLEAN DEFAULT false,
    special_needs_description TEXT,
    medical_conditions TEXT,
    allergies TEXT,
    uses_transport BOOLEAN DEFAULT false,
    transport_route VARCHAR(100),
    status VARCHAR(30) DEFAULT 'Matriculado', -- Matriculado, Transferido, Evadido, Concluído
    avatar_url TEXT,
    
    -- Dados de contato rápido do responsável
    guardian_name VARCHAR(255),
    guardian_phone VARCHAR(30),
    guardian_relationship VARCHAR(50),
    guardian_cpf VARCHAR(20),
    
    address TEXT,
    neighborhood VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(5),
    postal_code VARCHAR(20),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.class_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    enrollment_number INT,
    status VARCHAR(30) DEFAULT 'active',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_class_student UNIQUE (class_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.student_responsible_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    guardian_id UUID REFERENCES public.guardians(id) ON DELETE CASCADE,
    guardian_name VARCHAR(255),
    relationship VARCHAR(50) NOT NULL,
    is_primary_contact BOOLEAN DEFAULT true,
    is_financial_responsible BOOLEAN DEFAULT true,
    is_pedagogical_responsible BOOLEAN DEFAULT true,
    can_pickup BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.family_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    guardian_id UUID NOT NULL REFERENCES public.guardians(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.student_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    uploaded_by UUID,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.student_dietary_restrictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    restriction_type VARCHAR(100) NOT NULL, -- Alergia, Intolerância, Diabético, Vegetariano, Religioso
    description TEXT,
    medical_report_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 8. PEDAGÓGICO: FREQUÊNCIA, DIÁRIO DE AULAS, NOTAS E MAPA DE SALA (Docente)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    teacher_id UUID,
    discipline_id UUID REFERENCES public.disciplines(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL, -- P (Presente), F (Falta), J (Justificada), A (Atraso)
    period INT DEFAULT 1,
    justification_reason TEXT,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_student_daily_attendance UNIQUE (class_id, student_id, date, period)
);

CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL,
    discipline_id UUID REFERENCES public.disciplines(id) ON DELETE SET NULL,
    subject VARCHAR(100),
    date DATE NOT NULL,
    period INT DEFAULT 1,
    topic VARCHAR(255) NOT NULL,
    description TEXT,
    homework TEXT,
    methodology TEXT,
    resources TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.seat_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    row_num INT NOT NULL,
    col_num INT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_class_seat_pos UNIQUE (class_id, row_num, col_num)
);

CREATE TABLE IF NOT EXISTS public.grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    discipline_id UUID REFERENCES public.disciplines(id) ON DELETE SET NULL,
    teacher_id UUID,
    academic_period VARCHAR(50) NOT NULL, -- 1º Bimestre, 2º Bimestre, 3º Bimestre, 4º Bimestre, Exame Final
    assessment_type VARCHAR(50) NOT NULL, -- Prova, Trabalho, Seminário, Participação, Média Bimestral
    score NUMERIC(4, 2) NOT NULL,
    max_score NUMERIC(4, 2) DEFAULT 10.00,
    weight NUMERIC(3, 2) DEFAULT 1.00,
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL,
    discipline_id UUID REFERENCES public.disciplines(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE,
    max_score NUMERIC(4, 2) DEFAULT 10.0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.student_conduct_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    teacher_id UUID,
    date DATE NOT NULL,
    type VARCHAR(50) NOT NULL, -- Elogio, Advertência, Ocorrência, Observação, Falta de Material
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    action_taken TEXT,
    parent_notified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    reporter_id UUID,
    reporter_name VARCHAR(150),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    gravity VARCHAR(30) DEFAULT 'leve', -- leve, media, grave
    date DATE NOT NULL,
    status VARCHAR(30) DEFAULT 'pendente',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pedagogical_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    teacher_id UUID,
    report_type VARCHAR(80) NOT NULL, -- Ata Final, Ficha Individual, Relatório Diagnóstico, Desempenho
    title VARCHAR(255) NOT NULL,
    content JSONB DEFAULT '{}'::jsonb,
    academic_year VARCHAR(10) DEFAULT '2026',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 9. HORÁRIOS DAS AULAS (Class Schedules)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.class_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL, -- 1 = Segunda, 2 = Terça, 3 = Quarta, 4 = Quinta, 5 = Sexta, 6 = Sábado
    period_number INT NOT NULL, -- 1ª aula, 2ª aula...
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    discipline_name VARCHAR(100) NOT NULL,
    teacher_name VARCHAR(150),
    room VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_class_period_schedule UNIQUE (class_id, day_of_week, period_number)
);

-- ==============================================================================
-- 10. CALENDÁRIO ESCOLAR & EVENTOS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL, -- letivo, feriado, reuniao, evento, conselho, avaliacao, recesso
    start_date DATE NOT NULL,
    end_date DATE,
    start_time TIME,
    end_time TIME,
    location VARCHAR(150),
    target_audience VARCHAR(50) DEFAULT 'all', -- all, gestao, professores, pais, alunos
    color VARCHAR(30) DEFAULT '#3B82F6',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.school_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    day_type VARCHAR(50) NOT NULL, -- letivo, feriado, recesso, planejamento, conselho
    description VARCHAR(255),
    academic_year VARCHAR(10) DEFAULT '2026',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_school_calendar_date UNIQUE (organization_id, date)
);

CREATE TABLE IF NOT EXISTS public.event_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    status VARCHAR(30) DEFAULT 'confirmed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 11. COMUNICAÇÃO, RECADOS, AVISOS URGENTES & CIRCULARES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    sender_id UUID,
    sender_name VARCHAR(150) NOT NULL,
    sender_role VARCHAR(50) DEFAULT 'Gestão Escolar',
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) NOT NULL, -- urgente, informativo, pedagógico, financeiro, evento
    priority VARCHAR(20) DEFAULT 'normal', -- baixa, normal, alta, urgente
    target_type VARCHAR(50) DEFAULT 'all', -- all, class, student, grade, shift
    target_ids JSONB DEFAULT '[]'::jsonb, -- IDs das turmas ou destinatários específicos
    requires_signature BOOLEAN DEFAULT false,
    attachment_url TEXT,
    scheduled_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    status VARCHAR(30) DEFAULT 'published',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(30) DEFAULT 'medium', -- low, medium, high, urgent
    target_audience VARCHAR(50) DEFAULT 'all',
    target_class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    created_by VARCHAR(150),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.announcement_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_announcement_user_read UNIQUE (announcement_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.communication_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    communication_id UUID NOT NULL REFERENCES public.communications(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL, -- User ID or Guardian ID
    recipient_type VARCHAR(50) DEFAULT 'guardian',
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    is_signed BOOLEAN DEFAULT false,
    signed_at TIMESTAMPTZ,
    signature_data TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.document_acknowledgements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    communication_id UUID REFERENCES public.communications(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    guardian_id UUID REFERENCES public.guardians(id) ON DELETE SET NULL,
    acknowledged_by VARCHAR(150) NOT NULL,
    signature_hash TEXT,
    acknowledged_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 12. ALIMENTAÇÃO, NUTRIÇÃO & CARDÁPIO ESCOLAR PNAE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.school_menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    day_of_week VARCHAR(30) NOT NULL, -- Segunda-feira, Terça-feira...
    meal_type VARCHAR(50) NOT NULL, -- Café da Manhã, Lanche da Manhã, Almoço, Lanche da Tarde, Jantar
    title VARCHAR(255) NOT NULL,
    menu_description TEXT NOT NULL,
    calories INT,
    allergens TEXT,
    nutritional_info JSONB DEFAULT '{}'::jsonb,
    is_special_diet BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.school_menus_pnae_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    month VARCHAR(20) NOT NULL,
    year INT NOT NULL DEFAULT 2026,
    segment VARCHAR(80) DEFAULT 'Ensino Fundamental',
    file_url TEXT NOT NULL,
    uploaded_by VARCHAR(150),
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.food_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    item_name VARCHAR(150) NOT NULL,
    category VARCHAR(80), -- Grãos, Laticínios, Carnes, Hortifruti, Perecíveis
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
    unit VARCHAR(20) NOT NULL, -- kg, L, un, pct
    expiration_date DATE,
    status VARCHAR(30) DEFAULT 'ok', -- ok, low, expired
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.food_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(30),
    phone VARCHAR(30),
    email VARCHAR(150),
    category VARCHAR(100),
    is_family_farming BOOLEAN DEFAULT false, -- Agricultura Familiar (PNAE)
    status VARCHAR(30) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.meal_service_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    meal_type VARCHAR(50) NOT NULL,
    shift VARCHAR(50),
    meals_served INT NOT NULL DEFAULT 0,
    temperature_celsius NUMERIC(4, 1),
    responsible_cook VARCHAR(150),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 13. TRANSPORTE ESCOLAR & FROTA
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.transport_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    route_name VARCHAR(150) NOT NULL,
    route_code VARCHAR(50),
    plate VARCHAR(20) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INT DEFAULT 2024,
    driver_name VARCHAR(150) NOT NULL,
    driver_phone VARCHAR(30),
    driver_cnh VARCHAR(30),
    monitor_name VARCHAR(150),
    monitor_phone VARCHAR(30),
    capacity INT NOT NULL DEFAULT 30,
    status VARCHAR(30) DEFAULT 'Em trânsito', -- Em trânsito, Na escola, Parado, Manutenção
    shift VARCHAR(50) DEFAULT 'Matutino / Vespertino',
    gps_lat NUMERIC(10, 7),
    gps_lng NUMERIC(10, 7),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.transport_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES public.transport_vehicles(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    pickup_point VARCHAR(255) NOT NULL,
    pickup_time TIME,
    dropoff_time TIME,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_transport_student UNIQUE (vehicle_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.transport_boarding_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES public.transport_vehicles(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    event_type VARCHAR(30) NOT NULL, -- embarque_ida, desembarque_escola, embarque_volta, desembarque_casa
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    recorded_by VARCHAR(150)
);

-- ==============================================================================
-- 14. PORTARIA, CONTROLE DE ACESSO & FILA DE RETIRADA
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.portarias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(100),
    status VARCHAR(30) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.gate_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    person_type VARCHAR(50) NOT NULL, -- student, staff, visitor, guardian
    person_id UUID,
    person_name VARCHAR(255) NOT NULL,
    direction VARCHAR(20) NOT NULL, -- entry, exit
    gate_name VARCHAR(100) DEFAULT 'Portaria Principal',
    method VARCHAR(50) DEFAULT 'qr_code', -- qr_code, manual, facial, biometric
    authorized_by VARCHAR(150),
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.student_exits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    authorized_person_name VARCHAR(255) NOT NULL,
    authorized_person_doc VARCHAR(30),
    relationship VARCHAR(50),
    exit_type VARCHAR(50) DEFAULT 'regular', -- regular, antecipada, emergencia, transporte
    exit_reason TEXT,
    gate_operator_id UUID,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pickup_authorizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    guardian_id UUID REFERENCES public.guardians(id) ON DELETE CASCADE,
    authorized_name VARCHAR(255) NOT NULL,
    authorized_cpf VARCHAR(20) NOT NULL,
    authorized_phone VARCHAR(30),
    relationship VARCHAR(50),
    valid_from DATE NOT NULL,
    valid_until DATE,
    is_active BOOLEAN DEFAULT true,
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pickup_authorization_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    authorization_id UUID NOT NULL REFERENCES public.pickup_authorizations(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    CONSTRAINT uq_pickup_auth_student UNIQUE (authorization_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL, -- student, guardian, staff, visitor
    entity_id UUID NOT NULL,
    code_hash VARCHAR(255) UNIQUE NOT NULL,
    valid_until TIMESTAMPTZ,
    is_revoked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 15. ACHADOS E PERDIDOS (Lost and Found)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.lost_and_found_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(80) NOT NULL, -- Casaco/Uniforme, Material Escolar, Garrafa, Mochila, Eletrônico, Outros
    description TEXT,
    location_found VARCHAR(150),
    date_found DATE NOT NULL,
    photo_url TEXT,
    status VARCHAR(30) DEFAULT 'Disponível', -- Disponível, Reservado, Entregue, Doado
    claimed_by_student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    claimed_by_name VARCHAR(255),
    claimed_at TIMESTAMPTZ,
    delivered_by VARCHAR(150),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lost_and_found_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.lost_and_found_items(id) ON DELETE CASCADE,
    guardian_id UUID REFERENCES public.guardians(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    status VARCHAR(30) DEFAULT 'pending', -- pending, approved, cancelled
    requested_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 16. AUDITORIA, ASSINATURAS DIGITAIS & FILAS DE INTEGRAÇÃO
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(80),
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.digital_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    document_id UUID NOT NULL,
    signer_name VARCHAR(255) NOT NULL,
    signer_cpf VARCHAR(20),
    signer_ip VARCHAR(50),
    signature_data TEXT NOT NULL,
    signed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.partner_ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    partner_name VARCHAR(150) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    banner_url TEXT NOT NULL,
    target_link TEXT,
    category VARCHAR(50) DEFAULT 'general',
    is_active BOOLEAN DEFAULT true,
    views_count INT DEFAULT 0,
    clicks_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.integration_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(30) DEFAULT 'pending',
    attempts INT DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- ==============================================================================
-- 17. GATILHOS DE ATUALIZAÇÃO AUTOMÁTICA (updated_at)
-- ==============================================================================

DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND column_name = 'updated_at'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_set_updated_at ON public.%I;', t);
        EXECUTE format('CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();', t);
    END LOOP;
END;
$$;

-- ==============================================================================
-- 18. SEGURANÇA ROW LEVEL SECURITY (RLS) & POLÍTICAS DE ACESSO
-- ==============================================================================

DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
        
        -- Drop políticas anteriores para evitar duplicidades
        EXECUTE format('DROP POLICY IF EXISTS "Public and authenticated read policy" ON public.%I;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Public and authenticated write policy" ON public.%I;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Public and authenticated update policy" ON public.%I;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Public and authenticated delete policy" ON public.%I;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Full Access Policy" ON public.%I;', tbl);
        
        -- Criar política unificada permissiva para ambiente escolar integrado
        EXECUTE format('CREATE POLICY "Full Access Policy" ON public.%I FOR ALL USING (true) WITH CHECK (true);', tbl);
    END LOOP;
END;
$$;

-- ==============================================================================
-- 19. HABILITAR SUPABASE REALTIME EM TEMPO REAL (Replication & Publication)
-- ==============================================================================

-- Definir REPLICA IDENTITY FULL em todas as tabelas para suportar payload completo em deletes/updates
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL;', tbl);
    END LOOP;
END;
$$;

-- Adicionar tabelas à publicação realtime do Supabase
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
    LOOP
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
        EXCEPTION
            WHEN duplicate_object THEN
                -- Já estava na publicação, ignorar
                NULL;
            WHEN undefined_object THEN
                -- Publicação ainda não criada, criar
                CREATE PUBLICATION supabase_realtime;
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
        END;
    END LOOP;
END;
$$;

-- ==============================================================================
-- 20. SEED DE DADOS OFICIAIS DA INSTITUIÇÃO (Fundação do Sistema 2026)
-- ==============================================================================

-- 20.1 Organização Padrão
INSERT INTO public.organizations (id, name, trade_name, document_number, inep_code, email, phone, city, state)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'INFOREDE EM VEREADOR JOSÉ FERREIRA DE AGUIAR',
    'Escola Municipal Vereador José Ferreira de Aguiar',
    '12.345.678/0001-90',
    '35012345',
    'contato@joseferreira.educacao.gov.br',
    '(11) 3456-7890',
    'São Paulo',
    'SP'
)
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name,
    trade_name = EXCLUDED.trade_name;

-- 20.2 Ano Letivo 2026
INSERT INTO public.academic_years (organization_id, year, name, start_date, end_date, is_current)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    2026,
    'Ano Letivo 2026',
    '2026-02-02',
    '2026-12-18',
    true
)
ON CONFLICT (organization_id, year) DO NOTHING;

-- 20.3 Disciplinas Padrão da Matriz BNCC
INSERT INTO public.disciplines (organization_id, name, code, workload_hours, segment, color)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'Língua Portuguesa', 'PORT', 160, 'Ensino Fundamental', '#3B82F6'),
    ('11111111-1111-1111-1111-111111111111', 'Matemática', 'MAT', 160, 'Ensino Fundamental', '#10B981'),
    ('11111111-1111-1111-1111-111111111111', 'História', 'HIST', 80, 'Ensino Fundamental', '#F59E0B'),
    ('11111111-1111-1111-1111-111111111111', 'Geografia', 'GEO', 80, 'Ensino Fundamental', '#8B5CF6'),
    ('11111111-1111-1111-1111-111111111111', 'Ciências', 'CIEN', 80, 'Ensino Fundamental', '#EC4899'),
    ('11111111-1111-1111-1111-111111111111', 'Língua Inglesa', 'ING', 80, 'Ensino Fundamental', '#06B6D4'),
    ('11111111-1111-1111-1111-111111111111', 'Educação Física', 'EDFIS', 80, 'Ensino Fundamental', '#84CC16'),
    ('11111111-1111-1111-1111-111111111111', 'Arte', 'ART', 80, 'Ensino Fundamental', '#F97316'),
    ('11111111-1111-1111-1111-111111111111', 'Ensino Religioso', 'EREL', 40, 'Ensino Fundamental', '#64748B')
ON CONFLICT DO NOTHING;

-- 20.4 As 43 Turmas Oficiais da Matriz Institucional
INSERT INTO public.classes (organization_id, code, name, grade, shift, room, max_capacity, academic_year, numeration_status, kit_escolar_status, uniform_status, school_days)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'EF12A', '111', '1º ANO', '2º', '01', 35, '2026', true, true, true, 200),
    ('11111111-1111-1111-1111-111111111111', 'EF12B', '112', '1º ANO', '2º', '02', 35, '2026', true, true, true, 200),
    ('11111111-1111-1111-1111-111111111111', 'EF12C', '113', '1º ANO', '2º', '03', 35, '2026', true, true, true, 200),
    ('11111111-1111-1111-1111-111111111111', 'EF12D', '114', '1º ANO', '2º', '04', 35, '2026', true, true, true, 200),
    ('11111111-1111-1111-1111-111111111111', 'EF12E', '115', '1º ANO', '2º', '05', 35, '2026', true, true, true, 200),
    ('11111111-1111-1111-1111-111111111111', 'EF22A', '211', '2º ANO', '2º', '06', 35, '2026', true, true, true, 200),
    ('11111111-1111-1111-1111-111111111111', 'EF22B', '212', '2º ANO', '2º', '10', 35, '2026', true, true, true, 200),
    ('11111111-1111-1111-1111-111111111111', 'EF22C', '213', '2º ANO', '2º', '08', 35, '2026', true, true, true, 200),
    ('11111111-1111-1111-1111-111111111111', 'EF22D', '214', '2º ANO', '2º', '07', 35, '2026', true, true, true, 200),
    ('11111111-1111-1111-1111-111111111111', 'EF22E', '215', '2º ANO', '2º', '09', 35, '2026', true, true, true, 200),
    ('11111111-1111-1111-1111-111111111111', 'EF32A', '311', '3º ANO', '2º', '14', 35, '2026', true, true, true, 200),
    ('11111111-1111-1111-1111-111111111111', 'EF32B', '312', '3º ANO', '2º', '15', 35, '2026', true, true, true, 200),
    ('11111111-1111-1111-1111-111111111111', 'EF32C', '313', '3º ANO', '2º', '19', 35, '2026', true, true, true, 200),
    ('11111111-1111-1111-1111-111111111111', 'EF32D', '314', '3º ANO', '2º', '20', 35, '2026', true, true, true, 200),
    ('11111111-1111-1111-1111-111111111111', 'EF32E', '315', '3º ANO', '2º', '22', 35, '2026', true, true, true, 200),
    ('11111111-1111-1111-1111-111111111111', 'EF32F', '316', '3º ANO', '2º', '21', 35, '2026', true, true, true, 200),
    ('11111111-1111-1111-1111-111111111111', 'EF42A', '421', '4º ANO', '2º', '18', 35, '2026', true, true, true, 200),
    ('11111111-1111-1111-1111-111111111111', 'EF42B', '422', '4º ANO', '2º', '12', 35, '2026', true, true, true, 200),
    ('11111111-1111-1111-1111-111111111111', 'EF42C', '423', '4º ANO', '2º', '13', 35, '2026', true, true, true, 200),
    ('11111111-1111-1111-1111-111111111111', 'EF42D', '424', '4º ANO', '2º', '11', 35, '2026', true, true, true, 200),
    ('11111111-1111-1111-1111-111111111111', 'EF42E', '425', '4º ANO', '2º', '17', 35, '2026', true, true, true, 200),
    ('11111111-1111-1111-1111-111111111111', 'EF51A', '521', '5º ANO', '1º', '19', 35, '2026', true, true, true, 200),
    ('11111111-1111-1111-1111-111111111111', 'EF51B', '522', '5º ANO', '1º', '20', 35, '2026', true, true, true, 200),
    ('11111111-1111-1111-1111-111111111111', 'EF51C', '523', '5º ANO', '1º', '21', 35, '2026', true, true, true, 200),
    ('11111111-1111-1111-1111-111111111111', 'EF51D', '524', '5º ANO', '1º', '22', 35, '2026', true, true, true, 200),
    ('11111111-1111-1111-1111-111111111111', 'EF61A', '611', '6º ANO', '1º', '01', 35, '2026', true, true, true, 200),
    ('11111111-1111-1111-1111-111111111111', 'EF61B', '612', '6º ANO', '1º', '02', 35, '2026', true, true, true, 200),
    ('11111111-1111-1111-1111-111111111111', 'EF61C', '613', '6º ANO', '1º', '03', 35, '2026', true, true, true, 200),
    ('11111111-1111-1111-1111-111111111111', 'EF71A', '711', '7º ANO', '1º', '04', 35, '2026', true, true, true, 200),
    ('11111111-1111-1111-1111-111111111111', 'EF71B', '712', '7º ANO', '1º', '05', 35, '2026', true, true, true, 200),
    ('11111111-1111-1111-1111-111111111111', 'EF71C', '713', '7º ANO', '1º', '06', 35, '2026', true, true, true, 200),
    ('11111111-1111-1111-1111-111111111111', 'EF81A', '811', '8º ANO', '1º', '07', 35, '2026', true, true, true, 200),
    ('11111111-1111-1111-1111-111111111111', 'EF81B', '812', '8º ANO', '1º', '08', 35, '2026', true, true, true, 200),
    ('11111111-1111-1111-1111-111111111111', 'EF81C', '813', '8º ANO', '1º', '09', 35, '2026', true, true, true, 200),
    ('11111111-1111-1111-1111-111111111111', 'EF91A', '911', '9º ANO', '1º', '10', 35, '2026', true, true, true, 200),
    ('11111111-1111-1111-1111-111111111111', 'EF91B', '912', '9º ANO', '1º', '11', 35, '2026', true, true, true, 200),
    ('11111111-1111-1111-1111-111111111111', 'EF91C', '913', '9º ANO', '1º', '12', 35, '2026', true, true, true, 200),
    ('11111111-1111-1111-1111-111111111111', 'EM11A', '1001', '1ª SÉRIE EM', '1º', '13', 35, '2026', true, true, true, 200),
    ('11111111-1111-1111-1111-111111111111', 'EM11B', '1002', '1ª SÉRIE EM', '1º', '14', 35, '2026', true, true, true, 200),
    ('11111111-1111-1111-1111-111111111111', 'EM21A', '2001', '2ª SÉRIE EM', '1º', '15', 35, '2026', true, true, true, 200),
    ('11111111-1111-1111-1111-111111111111', 'EM21B', '2002', '2ª SÉRIE EM', '1º', '16', 35, '2026', true, true, true, 200),
    ('11111111-1111-1111-1111-111111111111', 'EM31A', '3001', '3ª SÉRIE EM', '1º', '17', 35, '2026', true, true, true, 200),
    ('11111111-1111-1111-1111-111111111111', 'EM31B', '3002', '3ª SÉRIE EM', '1º', '18', 35, '2026', true, true, true, 200)
ON CONFLICT DO NOTHING;

-- 20.5 Notificação de Boas-Vindas no Mural Institucional
INSERT INTO public.communications (
    organization_id,
    sender_name,
    sender_role,
    title,
    content,
    category,
    priority,
    target_type,
    status
)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Secretaria Geral de Educação',
    'Gestão Escolar',
    'Boas-vindas ao Ano Letivo 2026 - Plataforma Classium Integrada',
    'Informamos a toda a comunidade escolar que o sistema integrado está ativo com sincronização em tempo real de turmas, diários de classe, frequências, cardápio e transporte.',
    'informativo',
    'normal',
    'all',
    'published'
)
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- FIM DO SCRIPT MASTER DE INTEGRAÇÃO
-- ==============================================================================
