-- ====================================================================
-- CLASSIUM EDUCATIONAL ENTERPRISE — CENTRAL DE RELATÓRIOS PEDAGÓGICOS
-- Arquivo: supabase/0050_pedagogical_reports_enterprise.sql
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABELA DE RELATÓRIOS PEDAGÓGICOS E INCLUSIVOS
CREATE TABLE IF NOT EXISTS public.pedagogical_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    student_name VARCHAR(255),
    student_class VARCHAR(150),
    student_age INTEGER,
    student_registration VARCHAR(100),
    attendance_rate VARCHAR(20) DEFAULT '95.0%',
    
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
    teacher_name VARCHAR(255),
    
    pedagogue_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    pedagogue_name VARCHAR(255),
    
    director_name VARCHAR(255) DEFAULT 'Direção Pedagógica Geral',
    
    title VARCHAR(255) NOT NULL,
    report_type VARCHAR(100) NOT NULL,
    purpose VARCHAR(100) NOT NULL DEFAULT 'pedagogico',
    specialist_target VARCHAR(150),
    
    report_content TEXT NOT NULL,
    structured_content JSONB DEFAULT '{}'::jsonb,
    
    status VARCHAR(50) NOT NULL DEFAULT 'pending_review', -- 'rascunho', 'pending_review', 'em_revisao', 'approved', 'rejected', 'archived'
    comments TEXT,
    version VARCHAR(20) DEFAULT 'v1.0',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- 2. ÍNDICES DE PERFORMANCE E MULTI-TENANT ISOLATION
CREATE INDEX IF NOT EXISTS idx_pedagogical_reports_org ON public.pedagogical_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_pedagogical_reports_student ON public.pedagogical_reports(student_id);
CREATE INDEX IF NOT EXISTS idx_pedagogical_reports_teacher ON public.pedagogical_reports(teacher_id);
CREATE INDEX IF NOT EXISTS idx_pedagogical_reports_status ON public.pedagogical_reports(status);
CREATE INDEX IF NOT EXISTS idx_pedagogical_reports_created ON public.pedagogical_reports(created_at DESC);

-- 3. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.pedagogical_reports ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS DE RLS SEGURAS E ISOLADAS POR TENANT

DROP POLICY IF EXISTS "pedagogical_reports_select_policy" ON public.pedagogical_reports;
CREATE POLICY "pedagogical_reports_select_policy" ON public.pedagogical_reports
FOR SELECT TO authenticated
USING (
    organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        UNION
        SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
);

DROP POLICY IF EXISTS "pedagogical_reports_insert_policy" ON public.pedagogical_reports;
CREATE POLICY "pedagogical_reports_insert_policy" ON public.pedagogical_reports
FOR INSERT TO authenticated
WITH CHECK (
    organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        UNION
        SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
);

DROP POLICY IF EXISTS "pedagogical_reports_update_policy" ON public.pedagogical_reports;
CREATE POLICY "pedagogical_reports_update_policy" ON public.pedagogical_reports
FOR UPDATE TO authenticated
USING (
    organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        UNION
        SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
)
WITH CHECK (
    organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        UNION
        SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
);

DROP POLICY IF EXISTS "pedagogical_reports_delete_policy" ON public.pedagogical_reports;
CREATE POLICY "pedagogical_reports_delete_policy" ON public.pedagogical_reports
FOR DELETE TO authenticated
USING (
    organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        UNION
        SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
);

-- 5. TRIGGER PARA ATUALIZAÇÃO AUTOMÁTICA DE updated_at
CREATE OR REPLACE FUNCTION public.handle_pedagogical_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_pedagogical_reports_updated_at ON public.pedagogical_reports;
CREATE TRIGGER trigger_pedagogical_reports_updated_at
BEFORE UPDATE ON public.pedagogical_reports
FOR EACH ROW EXECUTE FUNCTION public.handle_pedagogical_reports_updated_at();

-- 6. HABILITAR REALTIME IDEMPOTENTE
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'pedagogical_reports'
    ) THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.pedagogical_reports;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;
END $$;
