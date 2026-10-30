
-- =========================================================================================
-- MÓDULO: ASSINATURAS DIGITAIS AVANÇADAS E TERMOS DE ACEITE
-- =========================================================================================

CREATE TABLE IF NOT EXISTS public.digital_signatures_advanced (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    document_title VARCHAR(255) NOT NULL,
    document_type VARCHAR(100) NOT NULL, -- e.g., 'ENROLLMENT_CONTRACT', 'TRIP_AUTHORIZATION'
    document_url TEXT NOT NULL,
    signer_profile_id UUID NOT NULL, -- reference to system_profiles
    student_id UUID, -- reference to students (optional, if related to a specific student)
    ip_address VARCHAR(45),
    user_agent TEXT,
    signature_hash TEXT NOT NULL,
    signed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    status VARCHAR(50) DEFAULT 'SIGNED', -- 'PENDING', 'SIGNED', 'REVOKED'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_digital_signatures_school_id ON public.digital_signatures_advanced(school_id);
CREATE INDEX IF NOT EXISTS idx_digital_signatures_signer_id ON public.digital_signatures_advanced(signer_profile_id);

ALTER TABLE public.digital_signatures_advanced ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view signatures from their school" ON public.digital_signatures_advanced
    FOR SELECT USING (school_id IN (SELECT school_id FROM public.user_roles WHERE profile_id = auth.uid()));

-- =========================================================================================
-- MÓDULO: GAMIFICAÇÃO E RECOMPENSAS
-- =========================================================================================

CREATE TABLE IF NOT EXISTS public.gamification_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    student_id UUID NOT NULL,
    points INTEGER NOT NULL,
    reason VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'ACADEMIC', 'BEHAVIOR', 'ATTENDANCE', 'EXTRA'
    awarded_by UUID, -- reference to profile_id of teacher/staff
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_gamification_points_school_id ON public.gamification_points(school_id);
CREATE INDEX IF NOT EXISTS idx_gamification_points_student_id ON public.gamification_points(student_id);

ALTER TABLE public.gamification_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view gamification points from their school" ON public.gamification_points
    FOR SELECT USING (school_id IN (SELECT school_id FROM public.user_roles WHERE profile_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.gamification_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url TEXT,
    points_required INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_gamification_badges_school_id ON public.gamification_badges(school_id);

ALTER TABLE public.gamification_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view badges from their school" ON public.gamification_badges
    FOR SELECT USING (school_id IN (SELECT school_id FROM public.user_roles WHERE profile_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.gamification_student_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    student_id UUID NOT NULL,
    badge_id UUID NOT NULL,
    awarded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_gamification_student_badges_school_id ON public.gamification_student_badges(school_id);
CREATE INDEX IF NOT EXISTS idx_gamification_student_badges_student_id ON public.gamification_student_badges(student_id);

ALTER TABLE public.gamification_student_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view student badges from their school" ON public.gamification_student_badges
    FOR SELECT USING (school_id IN (SELECT school_id FROM public.user_roles WHERE profile_id = auth.uid()));

-- =========================================================================================
-- MÓDULO: RECURSOS HUMANOS (RH E FOLHA DE PAGAMENTO BÁSICA)
-- =========================================================================================

CREATE TABLE IF NOT EXISTS public.hr_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    profile_id UUID NOT NULL, -- reference to system_profiles
    employee_type VARCHAR(50) NOT NULL, -- 'TEACHER', 'STAFF', 'MANAGEMENT'
    hire_date DATE NOT NULL,
    termination_date DATE,
    salary_basis NUMERIC(10, 2),
    salary_type VARCHAR(50) DEFAULT 'MONTHLY', -- 'MONTHLY', 'HOURLY'
    status VARCHAR(50) DEFAULT 'ACTIVE',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_hr_employees_school_id ON public.hr_employees(school_id);
CREATE INDEX IF NOT EXISTS idx_hr_employees_profile_id ON public.hr_employees(profile_id);

ALTER TABLE public.hr_employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view hr employees from their school" ON public.hr_employees
    FOR SELECT USING (school_id IN (SELECT school_id FROM public.user_roles WHERE profile_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.hr_payroll_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    reference_month DATE NOT NULL, -- First day of the month e.g., '2026-07-01'
    base_salary NUMERIC(10, 2) NOT NULL,
    bonuses NUMERIC(10, 2) DEFAULT 0,
    deductions NUMERIC(10, 2) DEFAULT 0,
    net_salary NUMERIC(10, 2) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'PAID'
    payment_date DATE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_hr_payroll_records_school_id ON public.hr_payroll_records(school_id);
CREATE INDEX IF NOT EXISTS idx_hr_payroll_records_employee_id ON public.hr_payroll_records(employee_id);

ALTER TABLE public.hr_payroll_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view hr payroll records from their school" ON public.hr_payroll_records
    FOR SELECT USING (school_id IN (SELECT school_id FROM public.user_roles WHERE profile_id = auth.uid()));

-- =========================================================================================
-- MÓDULO: BIBLIOTECA ESCOLAR E EMPRÉSTIMOS
-- =========================================================================================

CREATE TABLE IF NOT EXISTS public.library_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    isbn VARCHAR(50),
    publisher VARCHAR(255),
    publication_year INTEGER,
    category VARCHAR(100),
    total_copies INTEGER DEFAULT 1,
    available_copies INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    cover_image_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_library_books_school_id ON public.library_books(school_id);

ALTER TABLE public.library_books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view library books from their school" ON public.library_books
    FOR SELECT USING (school_id IN (SELECT school_id FROM public.user_roles WHERE profile_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.library_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    book_id UUID NOT NULL,
    borrower_profile_id UUID NOT NULL, -- Can be student or staff
    loan_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    return_date DATE,
    status VARCHAR(50) DEFAULT 'BORROWED', -- 'BORROWED', 'RETURNED', 'OVERDUE', 'LOST'
    fine_amount NUMERIC(10, 2) DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_library_loans_school_id ON public.library_loans(school_id);
CREATE INDEX IF NOT EXISTS idx_library_loans_book_id ON public.library_loans(book_id);
CREATE INDEX IF NOT EXISTS idx_library_loans_borrower_id ON public.library_loans(borrower_profile_id);

ALTER TABLE public.library_loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view library loans from their school" ON public.library_loans
    FOR SELECT USING (school_id IN (SELECT school_id FROM public.user_roles WHERE profile_id = auth.uid()));


-- =========================================================================================
-- MÓDULO: CRM DE CAPTAÇÃO AVANÇADO E FUNNELS
-- =========================================================================================

CREATE TABLE IF NOT EXISTS public.crm_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    student_name VARCHAR(255) NOT NULL,
    guardian_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    source VARCHAR(100), -- 'WEBSITE', 'REFERRAL', 'SOCIAL_MEDIA', 'WALK_IN'
    status VARCHAR(50) DEFAULT 'NEW', -- 'NEW', 'CONTACTED', 'VISITED', 'ENROLLED', 'LOST'
    interested_grade VARCHAR(100),
    expected_enrollment_year INTEGER,
    assigned_to UUID, -- profile_id of admission staff
    last_contact_date TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_crm_leads_school_id ON public.crm_leads(school_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON public.crm_leads(status);

ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view CRM leads from their school" ON public.crm_leads
    FOR SELECT USING (school_id IN (SELECT school_id FROM public.user_roles WHERE profile_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.crm_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    lead_id UUID NOT NULL,
    interaction_type VARCHAR(50) NOT NULL, -- 'CALL', 'EMAIL', 'MEETING', 'TOUR'
    interaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    notes TEXT,
    conducted_by UUID NOT NULL, -- profile_id
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_crm_interactions_school_id ON public.crm_interactions(school_id);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_lead_id ON public.crm_interactions(lead_id);

ALTER TABLE public.crm_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view CRM interactions from their school" ON public.crm_interactions
    FOR SELECT USING (school_id IN (SELECT school_id FROM public.user_roles WHERE profile_id = auth.uid()));

-- =========================================================================================
-- FOREIGN KEYS PARA OS NOVOS MÓDULOS
-- =========================================================================================

ALTER TABLE public.digital_signatures_advanced 
    ADD CONSTRAINT fk_digital_signatures_advanced_school 
    FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE RESTRICT;

ALTER TABLE public.gamification_points 
    ADD CONSTRAINT fk_gamification_points_school 
    FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE RESTRICT;

ALTER TABLE public.gamification_points 
    ADD CONSTRAINT fk_gamification_points_student 
    FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE RESTRICT;

ALTER TABLE public.gamification_badges 
    ADD CONSTRAINT fk_gamification_badges_school 
    FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE RESTRICT;

ALTER TABLE public.gamification_student_badges 
    ADD CONSTRAINT fk_gamification_student_badges_school 
    FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE RESTRICT;

ALTER TABLE public.gamification_student_badges 
    ADD CONSTRAINT fk_gamification_student_badges_student 
    FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE RESTRICT;

ALTER TABLE public.gamification_student_badges 
    ADD CONSTRAINT fk_gamification_student_badges_badge 
    FOREIGN KEY (badge_id) REFERENCES public.gamification_badges(id) ON DELETE RESTRICT;

ALTER TABLE public.hr_employees 
    ADD CONSTRAINT fk_hr_employees_school 
    FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE RESTRICT;

ALTER TABLE public.hr_payroll_records 
    ADD CONSTRAINT fk_hr_payroll_records_school 
    FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE RESTRICT;

ALTER TABLE public.hr_payroll_records 
    ADD CONSTRAINT fk_hr_payroll_records_employee 
    FOREIGN KEY (employee_id) REFERENCES public.hr_employees(id) ON DELETE RESTRICT;

ALTER TABLE public.library_books 
    ADD CONSTRAINT fk_library_books_school 
    FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE RESTRICT;

ALTER TABLE public.library_loans 
    ADD CONSTRAINT fk_library_loans_school 
    FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE RESTRICT;

ALTER TABLE public.library_loans 
    ADD CONSTRAINT fk_library_loans_book 
    FOREIGN KEY (book_id) REFERENCES public.library_books(id) ON DELETE RESTRICT;

ALTER TABLE public.crm_leads 
    ADD CONSTRAINT fk_crm_leads_school 
    FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE RESTRICT;

ALTER TABLE public.crm_interactions 
    ADD CONSTRAINT fk_crm_interactions_school 
    FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE RESTRICT;

ALTER TABLE public.crm_interactions 
    ADD CONSTRAINT fk_crm_interactions_lead 
    FOREIGN KEY (lead_id) REFERENCES public.crm_leads(id) ON DELETE RESTRICT;

