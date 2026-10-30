-- ====================================================================
-- ESQUEMA DE BANCO DE DADOS SUPABASE PARA "ENCONTRE UM ESPECIALISTA"
-- Título: Encontre um Especialista (Classium Conecta & Rede de Parceiros)
-- ====================================================================

-- 1. ENUM DE STATUS DE APROVAÇÃO
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'professional_approval_status') THEN
        CREATE TYPE professional_approval_status AS ENUM ('pending_approval', 'approved', 'rejected', 'suspended');
    END IF;
END$$;

-- 2. TABELA DE CATEGORIAS DE PROFISSIONAIS (professional_categories)
CREATE TABLE IF NOT EXISTS public.professional_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    icon_name TEXT DEFAULT 'UserCheck',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserção inicial de categorias padrão
INSERT INTO public.professional_categories (name, description, icon_name)
VALUES 
    ('Profissionais da Educação', 'Professores de reforço, alfabetizadores, pedagogos e educadores inclusivos (AEE)', 'GraduationCap'),
    ('Profissionais da Saúde', 'Psicólogos, psicanalistas, psicopedagogos, dentistas, oftalmologistas e terapeutas', 'HeartPulse'),
    ('Serviços Domésticos', 'Empregadas domésticas, cuidadoras infantis, babás e acompanhantes', 'Home'),
    ('Outros Especialistas', 'Instrutores de idiomas, música, esportes, robótica e oratória', 'Sparkles')
ON CONFLICT (name) DO NOTHING;

-- 3. TABELA DE PROFISSIONAIS (professionals)
CREATE TABLE IF NOT EXISTS public.professionals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL DEFAULT '',
    display_name TEXT,
    professional_title TEXT NOT NULL DEFAULT 'Especialista', -- Ex: 'Psicólogo Clínico', 'Professor de Matemática'
    role_category TEXT DEFAULT 'Profissionais da Educação', -- Educação, Saúde, Serviços Domésticos, Outros
    specialties TEXT[] DEFAULT '{}', -- Array Ex: ['Psicologia Infantil', 'TDAH', 'AEE']
    description TEXT,
    hourly_rate NUMERIC(10, 2) DEFAULT 0.00,
    rating NUMERIC(3, 2) DEFAULT 5.0,
    review_count INT DEFAULT 0,
    city TEXT DEFAULT 'São Paulo',
    state TEXT DEFAULT 'SP',
    address TEXT,
    location_label TEXT DEFAULT 'São Paulo - SP',
    profile_picture_url TEXT,
    cover_picture_url TEXT,
    contact_email TEXT,
    contact_phone TEXT DEFAULT '',
    whatsapp TEXT DEFAULT '',
    website_url TEXT,
    instagram_url TEXT,
    plan_tier TEXT DEFAULT 'ouro', -- basico, prata, ouro, diamante, premium
    is_verified BOOLEAN DEFAULT true,
    cpf_validated BOOLEAN DEFAULT true,
    status professional_approval_status NOT NULL DEFAULT 'approved', -- Default approved for verified demo partners
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migração / Atualização de colunas caso a tabela 'professionals' já existisse previamente no Supabase
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS professional_title TEXT DEFAULT 'Especialista';
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS role_category TEXT DEFAULT 'Profissionais da Educação';
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS specialties TEXT[] DEFAULT '{}';
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 2) DEFAULT 5.0;
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS review_count INT DEFAULT 0;
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'São Paulo';
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'SP';
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS location_label TEXT DEFAULT 'São Paulo - SP';
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS cover_picture_url TEXT;
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS contact_phone TEXT DEFAULT '';
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS whatsapp TEXT DEFAULT '';
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS plan_tier TEXT DEFAULT 'ouro';
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT true;
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS cpf_validated BOOLEAN DEFAULT true;
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS status professional_approval_status DEFAULT 'approved';

-- 4. TABELA DE VÍNCULO PROFISSIONAL <-> CATEGORIA
CREATE TABLE IF NOT EXISTS public.professional_category_links (
    professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES public.professional_categories(id) ON DELETE CASCADE NOT NULL,
    PRIMARY KEY (professional_id, category_id)
);

-- 5. ÍNDICES DE DESEMPENHO E BUSCA
CREATE INDEX IF NOT EXISTS idx_professionals_status ON public.professionals(status);
CREATE INDEX IF NOT EXISTS idx_professionals_role_category ON public.professionals(role_category);
CREATE INDEX IF NOT EXISTS idx_professionals_city ON public.professionals(city);
CREATE INDEX IF NOT EXISTS idx_professionals_user_id ON public.professionals(user_id);

-- 6. STORAGE BUCKET DEDICADO PARA FOTOS DE PERFIL DE PROFISSIONAIS
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'professional_profile_pictures', 
  'professional_profile_pictures', 
  true, 
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760;

-- 7. POLÍTICAS DE SEGURANÇA ROW LEVEL SECURITY (RLS)
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_category_links ENABLE ROW LEVEL SECURITY;

-- POLICIES FOR professionals
DROP POLICY IF EXISTS p_professionals_select ON public.professionals;
CREATE POLICY p_professionals_select ON public.professionals
    FOR SELECT USING (
      status = 'approved' OR 
      auth.uid() = user_id OR 
      auth.jwt() ->> 'email' LIKE '%admin%' OR
      auth.jwt() ->> 'email' LIKE '%renatotcheka%' OR
      auth.jwt() ->> 'email' LIKE '%gatomestre%'
    );

DROP POLICY IF EXISTS p_professionals_insert ON public.professionals;
CREATE POLICY p_professionals_insert ON public.professionals
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS p_professionals_update ON public.professionals;
CREATE POLICY p_professionals_update ON public.professionals
    FOR UPDATE USING (
      auth.uid() = user_id OR 
      auth.jwt() ->> 'email' LIKE '%admin%' OR
      auth.jwt() ->> 'email' LIKE '%renatotcheka%' OR
      auth.jwt() ->> 'email' LIKE '%gatomestre%'
    );

DROP POLICY IF EXISTS p_professionals_delete ON public.professionals;
CREATE POLICY p_professionals_delete ON public.professionals
    FOR DELETE USING (
      auth.jwt() ->> 'email' LIKE '%admin%' OR
      auth.jwt() ->> 'email' LIKE '%renatotcheka%' OR
      auth.jwt() ->> 'email' LIKE '%gatomestre%'
    );

-- POLICIES FOR STORAGE
DROP POLICY IF EXISTS p_storage_prof_pictures_select ON storage.objects;
CREATE POLICY p_storage_prof_pictures_select ON storage.objects
    FOR SELECT USING (bucket_id = 'professional_profile_pictures');

DROP POLICY IF EXISTS p_storage_prof_pictures_insert ON storage.objects;
CREATE POLICY p_storage_prof_pictures_insert ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'professional_profile_pictures');

-- 8. PUBLICAÇÃO SUPABASE REALTIME
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.professionals;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.professional_categories;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END
$$;
