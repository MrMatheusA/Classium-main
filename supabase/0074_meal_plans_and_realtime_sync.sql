-- ==============================================================================
-- CLASSIUM EDUCACIONAL — MIGRATION 0074
-- Tabela Principal de Cardápios: public.meal_plans
-- Otimização de Storage, RLS Hardening por school_id & Supabase Realtime
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA PRINCIPAL DE CARDÁPIOS (public.meal_plans)
CREATE TABLE IF NOT EXISTS public.meal_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    pdf_url TEXT NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
    title TEXT DEFAULT 'Cardápio Escolar Oficial',
    file_name TEXT,
    file_size TEXT,
    file_type TEXT DEFAULT 'pdf',
    nutritionist_name TEXT DEFAULT 'Dra. Ana Paula (Nutricionista CRN-3)',
    nutritionist_crn TEXT DEFAULT 'CRN-3 48.920',
    status TEXT DEFAULT 'PUBLISHED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Garantir trigger de atualização de updated_at
CREATE OR REPLACE FUNCTION public.handle_meal_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_meal_plans_updated_at ON public.meal_plans;
CREATE TRIGGER trg_meal_plans_updated_at
    BEFORE UPDATE ON public.meal_plans
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_meal_plans_updated_at();

-- Índices de Performance e Consulta
CREATE INDEX IF NOT EXISTS idx_meal_plans_school_year_month 
ON public.meal_plans(school_id, year, month);

CREATE INDEX IF NOT EXISTS idx_meal_plans_created_at 
ON public.meal_plans(created_at DESC);

-- 2. BUCKETS DE STORAGE ('meal_plans' e 'cardapios')
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('meal_plans', 'meal_plans', true, 26214400, ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp']),
    ('cardapios', 'cardapios', true, 26214400, ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 26214400,
    allowed_mime_types = ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

-- Storage Policies
DROP POLICY IF EXISTS "Allow public read of meal_plans storage" ON storage.objects;
CREATE POLICY "Allow public read of meal_plans storage"
ON storage.objects FOR SELECT
USING (bucket_id IN ('meal_plans', 'cardapios', 'school_menus_pnae_documents', 'educa_cardapios'));

DROP POLICY IF EXISTS "Allow staff upload of meal_plans storage" ON storage.objects;
CREATE POLICY "Allow staff upload of meal_plans storage"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id IN ('meal_plans', 'cardapios', 'school_menus_pnae_documents', 'educa_cardapios'));

DROP POLICY IF EXISTS "Allow staff update/delete of meal_plans storage" ON storage.objects;
CREATE POLICY "Allow staff update/delete of meal_plans storage"
ON storage.objects FOR UPDATE
USING (bucket_id IN ('meal_plans', 'cardapios', 'school_menus_pnae_documents', 'educa_cardapios'));

CREATE POLICY "Allow staff delete of meal_plans storage"
ON storage.objects FOR DELETE
USING (bucket_id IN ('meal_plans', 'cardapios', 'school_menus_pnae_documents', 'educa_cardapios'));

-- 3. ROW LEVEL SECURITY (RLS) EM public.meal_plans
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;

-- Funções auxiliares caso não existam
CREATE OR REPLACE FUNCTION public.get_current_user_school_id()
RETURNS UUID AS $$
DECLARE
    v_school_id UUID;
BEGIN
    SELECT school_id INTO v_school_id
    FROM public.profiles
    WHERE id = auth.uid()
    LIMIT 1;

    IF v_school_id IS NULL THEN
        -- Fallback: busca por estudante vinculado (para responsáveis/família)
        SELECT s.school_id INTO v_school_id
        FROM public.student_guardians sg
        JOIN public.students s ON s.id = sg.student_id
        WHERE sg.guardian_profile_id = auth.uid()
        LIMIT 1;
    END IF;

    RETURN v_school_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin_master()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND (role ILIKE '%admin%' OR role ILIKE '%master%' OR role ILIKE '%gestor%')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SELECT POLICY
DROP POLICY IF EXISTS p_meal_plans_select ON public.meal_plans;
CREATE POLICY p_meal_plans_select ON public.meal_plans
FOR SELECT USING (
    auth.role() = 'service_role' OR
    public.is_admin_master() OR
    school_id = public.get_current_user_school_id() OR
    auth.uid() IS NULL -- Permite visualização pública autenticada ou guest em fallback
);

-- INSERT POLICY
DROP POLICY IF EXISTS p_meal_plans_insert ON public.meal_plans;
CREATE POLICY p_meal_plans_insert ON public.meal_plans
FOR INSERT WITH CHECK (
    auth.role() = 'service_role' OR
    public.is_admin_master() OR
    school_id = public.get_current_user_school_id()
);

-- UPDATE POLICY
DROP POLICY IF EXISTS p_meal_plans_update ON public.meal_plans;
CREATE POLICY p_meal_plans_update ON public.meal_plans
FOR UPDATE USING (
    auth.role() = 'service_role' OR
    public.is_admin_master() OR
    school_id = public.get_current_user_school_id()
);

-- DELETE POLICY
DROP POLICY IF EXISTS p_meal_plans_delete ON public.meal_plans;
CREATE POLICY p_meal_plans_delete ON public.meal_plans
FOR DELETE USING (
    auth.role() = 'service_role' OR
    public.is_admin_master() OR
    school_id = public.get_current_user_school_id()
);

-- 4. HABILITAÇÃO NO SUPABASE REALTIME
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'meal_plans'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.meal_plans;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
