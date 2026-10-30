-- Migration 0051: Prime Activity Generator (Gerador de Atividade Prime) Enterprise
-- Tables, RLS, Storage policies, and Realtime synchronization for Classium Studio Prime

-- 1. Activities table (Documentos e Atividades Pedagógicas)
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    discipline_id UUID REFERENCES public.disciplines(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    grade VARCHAR(100) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    context TEXT,
    objective TEXT,
    bncc_code VARCHAR(100),
    doc_type VARCHAR(50) DEFAULT 'Atividade',
    difficulty VARCHAR(50) DEFAULT 'Médio',
    question_count INTEGER DEFAULT 5,
    page_count INTEGER DEFAULT 1,
    header_model VARCHAR(50) DEFAULT 'moderno',
    header_data JSONB DEFAULT '{}'::jsonb,
    instructions TEXT,
    content_html TEXT,
    document_payload JSONB DEFAULT '{}'::jsonb,
    estimated_time_minutes INTEGER DEFAULT 45,
    bncc_habilities TEXT[] DEFAULT ARRAY[]::TEXT[],
    status VARCHAR(50) DEFAULT 'draft',
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Activity Questions table
CREATE TABLE IF NOT EXISTS public.activity_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    question_type VARCHAR(50) NOT NULL,
    difficulty VARCHAR(50) DEFAULT 'Médio',
    question_text TEXT NOT NULL,
    options JSONB DEFAULT '[]'::jsonb,
    answer_key TEXT,
    image_url TEXT,
    image_caption TEXT,
    custom_layout JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. AI Generated Images & Illustrations
CREATE TABLE IF NOT EXISTS public.ai_generated_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
    prompt TEXT NOT NULL,
    style VARCHAR(50) DEFAULT 'pb_colorir',
    subject VARCHAR(100),
    category VARCHAR(100) DEFAULT 'ilustracao',
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. AI Generated Pedagogical Resources (Cruzadinhas, Caça-Palavras, Ligue-Colunas, etc.)
CREATE TABLE IF NOT EXISTS public.ai_generated_pedagogical_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
    resource_type VARCHAR(50) NOT NULL, -- 'cruzadinha', 'caca_palavras', 'ligue_colunas', 'caligrafia', 'labirinto'
    title VARCHAR(255) NOT NULL,
    resource_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    solution_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_activities_org_teacher ON public.activities(organization_id, teacher_id);
CREATE INDEX IF NOT EXISTS idx_activities_class ON public.activities(class_id);
CREATE INDEX IF NOT EXISTS idx_activities_subject_grade ON public.activities(subject, grade);
CREATE INDEX IF NOT EXISTS idx_activity_questions_activity ON public.activity_questions(activity_id);
CREATE INDEX IF NOT EXISTS idx_ai_generated_images_org ON public.ai_generated_images(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_pedag_resources_org ON public.ai_generated_pedagogical_resources(organization_id);

-- Enable RLS
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generated_pedagogical_resources ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "activities_org_tenant_policy" ON public.activities;
CREATE POLICY "activities_org_tenant_policy" ON public.activities
    FOR ALL
    USING (
        organization_id = (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
        OR organization_id = '11111111-1111-1111-1111-111111111111'::uuid
        OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin_master', 'ROLE_ADMIN_MASTER')
    )
    WITH CHECK (
        organization_id = (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
        OR organization_id = '11111111-1111-1111-1111-111111111111'::uuid
        OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin_master', 'ROLE_ADMIN_MASTER')
    );

DROP POLICY IF EXISTS "activity_questions_tenant_policy" ON public.activity_questions;
CREATE POLICY "activity_questions_tenant_policy" ON public.activity_questions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.activities a
            WHERE a.id = activity_questions.activity_id
            AND (
                a.organization_id = (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
                OR a.organization_id = '11111111-1111-1111-1111-111111111111'::uuid
                OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin_master', 'ROLE_ADMIN_MASTER')
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.activities a
            WHERE a.id = activity_questions.activity_id
            AND (
                a.organization_id = (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
                OR a.organization_id = '11111111-1111-1111-1111-111111111111'::uuid
                OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin_master', 'ROLE_ADMIN_MASTER')
            )
        )
    );

DROP POLICY IF EXISTS "ai_generated_images_tenant_policy" ON public.ai_generated_images;
CREATE POLICY "ai_generated_images_tenant_policy" ON public.ai_generated_images
    FOR ALL
    USING (
        organization_id = (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
        OR organization_id = '11111111-1111-1111-1111-111111111111'::uuid
        OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin_master', 'ROLE_ADMIN_MASTER')
    )
    WITH CHECK (
        organization_id = (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
        OR organization_id = '11111111-1111-1111-1111-111111111111'::uuid
        OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin_master', 'ROLE_ADMIN_MASTER')
    );

DROP POLICY IF EXISTS "ai_pedag_resources_tenant_policy" ON public.ai_generated_pedagogical_resources;
CREATE POLICY "ai_pedag_resources_tenant_policy" ON public.ai_generated_pedagogical_resources
    FOR ALL
    USING (
        organization_id = (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
        OR organization_id = '11111111-1111-1111-1111-111111111111'::uuid
        OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin_master', 'ROLE_ADMIN_MASTER')
    )
    WITH CHECK (
        organization_id = (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid
        OR organization_id = '11111111-1111-1111-1111-111111111111'::uuid
        OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin_master', 'ROLE_ADMIN_MASTER')
    );

-- Enable Realtime
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_questions;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_generated_images;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_generated_pedagogical_resources;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;
