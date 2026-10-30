-- ====================================================================
-- EDUCA+ ERP EDUCACIONAL — STORAGE & RLS POLICIES (ENTERPRISE)
-- SCRIPT SQL PRODUCTION-READY PARA BUCKETS E POLÍTICAS DE ACESSO
-- ====================================================================

-- 1. CRIAÇÃO DOS BUCKETS
-- Public: Logos, banners, comunicados públicos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'educamais-public',
    'educamais-public',
    TRUE,
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO UPDATE 
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Private: Documentos financeiros, pedagógicos, médicos, contratos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'educamais-private',
    'educamais-private',
    FALSE,
    52428800, -- 50MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv']
) ON CONFLICT (id) DO UPDATE 
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Profiles: Fotos de perfil (Usuários, alunos, funcionários)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'educamais-profiles',
    'educamais-profiles',
    TRUE, -- Imagens de perfil geralmente são públicas para a UI
    5242880, -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO UPDATE 
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. TABELA DE REGISTRO DE ARQUIVOS (AUDITORIA E EXCLUSÃO LÓGICA)
CREATE TABLE IF NOT EXISTS public.file_registry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bucket_id VARCHAR NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR,
    school_id UUID,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    module VARCHAR(100), -- 'students', 'teachers', 'finance', 'marketplace', etc
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger de updated_at para a tabela de arquivos
DROP TRIGGER IF EXISTS trg_file_registry_upd ON public.file_registry;
CREATE TRIGGER trg_file_registry_upd BEFORE UPDATE ON public.file_registry FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS na tabela de registro de arquivos
ALTER TABLE public.file_registry ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICAS RLS (STORAGE OBJECTS)

-- Função auxiliar (se não existir) para pegar o school_id do path ou metadata
-- Para simplificar, confiaremos no JWT claims (app_schools) gerado na etapa de Auth

-- Políticas para 'educamais-public'
DROP POLICY IF EXISTS p_public_bucket_select ON storage.objects;
CREATE POLICY p_public_bucket_select ON storage.objects FOR SELECT USING (bucket_id = 'educamais-public');

DROP POLICY IF EXISTS p_public_bucket_insert ON storage.objects;
CREATE POLICY p_public_bucket_insert ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'educamais-public' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS p_public_bucket_update ON storage.objects;
CREATE POLICY p_public_bucket_update ON storage.objects FOR UPDATE USING (bucket_id = 'educamais-public' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS p_public_bucket_delete ON storage.objects;
CREATE POLICY p_public_bucket_delete ON storage.objects FOR DELETE USING (bucket_id = 'educamais-public' AND auth.role() = 'authenticated');

-- Políticas para 'educamais-profiles'
DROP POLICY IF EXISTS p_profiles_bucket_select ON storage.objects;
CREATE POLICY p_profiles_bucket_select ON storage.objects FOR SELECT USING (bucket_id = 'educamais-profiles');

DROP POLICY IF EXISTS p_profiles_bucket_insert ON storage.objects;
CREATE POLICY p_profiles_bucket_insert ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'educamais-profiles' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS p_profiles_bucket_update ON storage.objects;
CREATE POLICY p_profiles_bucket_update ON storage.objects FOR UPDATE USING (bucket_id = 'educamais-profiles' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS p_profiles_bucket_delete ON storage.objects;
CREATE POLICY p_profiles_bucket_delete ON storage.objects FOR DELETE USING (bucket_id = 'educamais-profiles' AND auth.role() = 'authenticated');

-- Políticas para 'educamais-private' (Apenas o próprio usuário, mesma escola ou admin)
-- Verifica se a pasta raiz do arquivo (school_id) bate com as escolas do usuário, ou se é dono
DROP POLICY IF EXISTS p_private_bucket_select ON storage.objects;
CREATE POLICY p_private_bucket_select ON storage.objects FOR SELECT 
USING (
    bucket_id = 'educamais-private' AND (
        auth.uid() = owner OR
        (auth.jwt()->'claims'->'app_schools')::jsonb ? (string_to_array(name, '/'))[1] OR
        'Educa+Admin' IN (SELECT jsonb_array_elements_text(auth.jwt()->'claims'->'app_roles'))
    )
);

DROP POLICY IF EXISTS p_private_bucket_insert ON storage.objects;
CREATE POLICY p_private_bucket_insert ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'educamais-private' AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS p_private_bucket_update ON storage.objects;
CREATE POLICY p_private_bucket_update ON storage.objects FOR UPDATE 
USING (
    bucket_id = 'educamais-private' AND (
        auth.uid() = owner OR
        'Educa+Admin' IN (SELECT jsonb_array_elements_text(auth.jwt()->'claims'->'app_roles'))
    )
);

DROP POLICY IF EXISTS p_private_bucket_delete ON storage.objects;
CREATE POLICY p_private_bucket_delete ON storage.objects FOR DELETE 
USING (
    bucket_id = 'educamais-private' AND (
        auth.uid() = owner OR
        'Educa+Admin' IN (SELECT jsonb_array_elements_text(auth.jwt()->'claims'->'app_roles'))
    )
);

-- 4. POLÍTICAS RLS (FILE REGISTRY)
DROP POLICY IF EXISTS p_file_registry_select ON public.file_registry;
CREATE POLICY p_file_registry_select ON public.file_registry FOR SELECT 
USING (
    is_deleted = FALSE AND (
        uploaded_by = auth.uid() OR
        public.can_access_school(auth.uid(), school_id)
    )
);

DROP POLICY IF EXISTS p_file_registry_insert ON public.file_registry;
CREATE POLICY p_file_registry_insert ON public.file_registry FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS p_file_registry_update ON public.file_registry;
CREATE POLICY p_file_registry_update ON public.file_registry FOR UPDATE 
USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'Educa+Admin'));
