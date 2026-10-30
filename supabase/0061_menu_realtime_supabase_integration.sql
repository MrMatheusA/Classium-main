-- ==============================================================================
-- MIGRATION 0061: MENU 100% SUPABASE INTEGRATION & REALTIME ENGINE CONSOLIDATION
-- Connects all navigation menu tabs, removes mock/faker fallbacks,
-- creates partner_ads / educational_partners, activity_generations, 
-- teacher_preferences, and registers all tables to supabase_realtime.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. EDUCATIONAL PARTNERS & CAREER BENEFITS TABLE (CARREIRA & BENEFÍCIOS)
CREATE TABLE IF NOT EXISTS public.educational_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    logo TEXT NOT NULL,
    banner TEXT,
    rating NUMERIC(3, 2) DEFAULT 5.0,
    review_count INTEGER DEFAULT 100,
    category TEXT NOT NULL DEFAULT 'formacao', -- 'formacao', 'cursos', 'livros', 'universidades', 'carreira', 'marketplace', 'bemestar', 'financeira', 'tecnologia', 'parceiras'
    sub_category TEXT,
    plan TEXT DEFAULT 'ouro', -- 'prata', 'ouro', 'diamante'
    highlights JSONB DEFAULT '[]'::jsonb,
    duration TEXT,
    modality TEXT DEFAULT 'Online',
    price TEXT,
    original_price TEXT,
    discount_badge TEXT,
    vip_exclusive BOOLEAN DEFAULT false,
    is_mentis_therapy BOOLEAN DEFAULT false,
    whatsapp TEXT,
    website TEXT,
    catalog_pdf_url TEXT,
    description TEXT,
    official_partner_seal BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'aprovado', -- 'aprovado', 'pendente', 'suspenso'
    views INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    leads_generated INTEGER DEFAULT 0,
    location TEXT DEFAULT 'Nacional',
    primary_button_link TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    official_message TEXT,
    promo_text TEXT,
    plan_title TEXT,
    primary_button_text TEXT,
    secondary_button_text TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed initial educational marketplace partners if empty
INSERT INTO public.educational_partners (
    id, name, logo, banner, rating, review_count, category, sub_category, 
    plan, highlights, duration, modality, price, original_price, discount_badge, 
    vip_exclusive, is_mentis_therapy, whatsapp, website, catalog_pdf_url, 
    description, official_partner_seal, status, views, clicks, leads_generated, location
)
SELECT 
    'e0000001-0000-0000-0000-000000000001'::uuid,
    'Mentis Therapy',
    'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&auto=format&fit=crop&q=80',
    5.0, 1420, 'bemestar', 'Saúde Mental do Educador', 'diamante',
    '["Saúde Mental e Prevenção do Burnout Docente", "Terapia Online com Psicólogos Especializados", "Desenvolvimento Emocional e Inteligência Relacional", "Bem-estar do Professor e Gestor Escolar", "Atendimento Especializado com Sigilo Absoluto"]'::jsonb,
    'Atendimento Continuado', 'Teleconsulta 100% Online', 'R$ 89,90 / sessão', 'R$ 180,00', '20% OFF Exclusivo Classium',
    true, true, '5511998877665', 'https://mentistherapy.com.br', 'https://mentistherapy.com.br/guia-saude-mental-professor.pdf',
    'A plataforma oficial parceira do Classium focada integralmente no cuidado psicológico, saúde emocional e qualidade de vida de professores, pedagogos e gestores educacionais.',
    true, 'aprovado', 18450, 4320, 1240, 'Atendimento em todo o Brasil'
WHERE NOT EXISTS (SELECT 1 FROM public.educational_partners WHERE name = 'Mentis Therapy');

INSERT INTO public.educational_partners (
    id, name, logo, banner, rating, review_count, category, sub_category, 
    plan, highlights, duration, modality, price, original_price, discount_badge, 
    vip_exclusive, is_mentis_therapy, whatsapp, website, 
    description, official_partner_seal, status, views, clicks, leads_generated, location
)
SELECT 
    'e0000001-0000-0000-0000-000000000002'::uuid,
    'UNIASSELVI',
    'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&auto=format&fit=crop&q=80',
    4.9, 980, 'formacao', 'Pós-graduação', 'diamante',
    '["Pós-Graduação EAD com Tutoria Exclusiva", "Cursos nas Áreas de Gestão, Docência e Educação Especial", "Nota Máxima no MEC com Certificação Reconhecida"]'::jsonb,
    '6 a 12 meses', 'EAD com Encontros Virtuais', 'A partir de R$ 99,00 /mês', 'R$ 249,00', 'Bolsas de até 60% para Educadores',
    false, false, '5547998881234', 'https://uniasselvi.com.br',
    'A UNIASSELVI é uma das maiores instituições de ensino superior do Brasil, oferecendo cursos de graduação e pós-graduação com foco em inovação e prática pedagógica.',
    true, 'aprovado', 12100, 2890, 780, 'Nacional'
WHERE NOT EXISTS (SELECT 1 FROM public.educational_partners WHERE name = 'UNIASSELVI');

INSERT INTO public.educational_partners (
    id, name, logo, rating, review_count, category, sub_category, 
    plan, highlights, duration, modality, price, discount_badge, 
    vip_exclusive, whatsapp, website, catalog_pdf_url, 
    description, official_partner_seal, status, views, clicks, leads_generated, location
)
SELECT 
    'e0000001-0000-0000-0000-000000000003'::uuid,
    'Editora FTD Educação',
    'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=150&auto=format&fit=crop&q=80',
    4.9, 1150, 'livros', 'Editoras & BNCC', 'diamante',
    '["Coleções Didáticas Alinhadas à BNCC", "Livros de Literatura e Leitura de Deleite", "Plataforma e Catálogos Digitais Interativos"]'::jsonb,
    'Catálogo Anual 2026', 'Impresso & Digital', 'Condições Especiais para Escolas', 'Amostras Grátis para Gestores',
    false, '5511988887777', 'https://ftd.com.br', 'https://ftd.com.br/catalogo-bncc-2026.pdf',
    'Soluções educacionais completas para Educação Infantil, Ensino Fundamental e Ensino Médio. Materiais didáticos inovadores e formação docente.',
    true, 'aprovado', 15300, 3410, 920, 'Atendimento Escolar em Todo o Brasil'
WHERE NOT EXISTS (SELECT 1 FROM public.educational_partners WHERE name = 'Editora FTD Educação');

-- 2. ACTIVITY GENERATIONS TABLE (GERADOR DE ATIVIDADES PRIME / EDUCA STUDIO)
CREATE TABLE IF NOT EXISTS public.activity_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    subject TEXT NOT NULL DEFAULT 'Português',
    grade_level TEXT NOT NULL DEFAULT '9º Ano',
    activity_type TEXT NOT NULL DEFAULT 'prova', -- 'prova', 'cruzadinha', 'caca_palavras', 'simulado', 'projeto', 'exercicio'
    difficulty TEXT DEFAULT 'medio',
    bncc_codes JSONB DEFAULT '[]'::jsonb,
    content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    content_html TEXT,
    header_template TEXT DEFAULT 'padrao',
    is_favorite BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TEACHER PREFERENCES & CONFIGURATIONS TABLE
CREATE TABLE IF NOT EXISTS public.teacher_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id TEXT NOT NULL UNIQUE,
    theme TEXT DEFAULT 'dark',
    glassmorphism_enabled BOOLEAN DEFAULT true,
    seat_glow_enabled BOOLEAN DEFAULT true,
    whatsapp_batch_sync BOOLEAN DEFAULT true,
    digital_signature_status TEXT DEFAULT 'valid',
    notifications_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.teacher_preferences (teacher_id, glassmorphism_enabled, seat_glow_enabled, whatsapp_batch_sync)
VALUES ('t-carlos', true, true, true)
ON CONFLICT (teacher_id) DO NOTHING;

-- 4. CONSOLIDATE CLASS_SCHEDULES FOR ALL TEACHERS AND PROFILES
-- Ensures the schedule records exist and match Carlos Eduardo and any teacher profile
DELETE FROM public.class_schedules 
WHERE teacher_id IN ('t-carlos', 't-carlos-eduardo') OR teacher_name ILIKE '%Carlos Eduardo%';

INSERT INTO public.class_schedules 
(id, class_id, class_name, day_of_week, time_slot, start_time, end_time, subject_id, subject_name, teacher_id, teacher_name, room_id, room_name, is_interval)
VALUES
-- SEGUNDA-FEIRA
('b0000001-0000-0000-0000-000000000001'::uuid, 'cls-9a', '9º Ano A - Fundamental II', 'Segunda', '07:30 - 08:15', '07:30:00', '08:15:00', 's-port', 'Português & Literatura', 't-carlos', 'Carlos Eduardo', 'r-08', 'Sala 08', false),
('b0000001-0000-0000-0000-000000000002'::uuid, 'cls-9a', '9º Ano A - Fundamental II', 'Segunda', '08:15 - 09:00', '08:15:00', '09:00:00', 's-port', 'Português & Literatura', 't-carlos', 'Carlos Eduardo', 'r-08', 'Sala 08', false),

-- TERÇA-FEIRA
('b0000001-0000-0000-0000-000000000003'::uuid, 'cls-8b', '8º Ano B - Fundamental II', 'Terça', '07:30 - 08:15', '07:30:00', '08:15:00', 's-hist', 'História Contemporânea', 't-carlos', 'Carlos Eduardo', 'r-04', 'Sala Multimídia 04', false),
('b0000001-0000-0000-0000-000000000004'::uuid, 'cls-8b', '8º Ano B - Fundamental II', 'Terça', '08:15 - 09:00', '08:15:00', '09:00:00', 's-hist', 'História Contemporânea', 't-carlos', 'Carlos Eduardo', 'r-04', 'Sala Multimídia 04', false),

-- QUARTA-FEIRA
('b0000001-0000-0000-0000-000000000005'::uuid, 'cls-7a', '7º Ano A - Fundamental II', 'Quarta', '09:15 - 10:00', '09:15:00', '10:00:00', 's-port', 'História Geral', 't-carlos', 'Carlos Eduardo', 'r-12', 'Sala 12', false),
('b0000001-0000-0000-0000-000000000006'::uuid, 'cls-7a', '7º Ano A - Fundamental II', 'Quarta', '10:00 - 10:45', '10:00:00', '10:45:00', 's-port', 'História Geral', 't-carlos', 'Carlos Eduardo', 'r-12', 'Sala 12', false),

-- QUINTA-FEIRA
('b0000001-0000-0000-0000-000000000007'::uuid, 'cls-9a', '9º Ano A - Fundamental II', 'Quinta', '10:45 - 11:30', '10:45:00', '11:30:00', 's-rob', 'Robótica Educacional & IA', 't-carlos', 'Carlos Eduardo', 'r-02', 'Laboratório Maker 02', false),

-- SEXTA-FEIRA
('b0000001-0000-0000-0000-000000000008'::uuid, 'cls-8b', '8º Ano B - Fundamental II', 'Sexta', '08:15 - 09:00', '08:15:00', '09:00:00', 's-rob', 'Robótica Educacional & IA', 't-carlos', 'Carlos Eduardo', 'r-02', 'Laboratório Maker 02', false);

-- 5. RLS POLICIES FOR ALL MENU TABLES
ALTER TABLE public.educational_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_educational_partners_all ON public.educational_partners;
CREATE POLICY p_educational_partners_all ON public.educational_partners FOR ALL USING (true);

DROP POLICY IF EXISTS p_activity_generations_all ON public.activity_generations;
CREATE POLICY p_activity_generations_all ON public.activity_generations FOR ALL USING (true);

DROP POLICY IF EXISTS p_teacher_preferences_all ON public.teacher_preferences;
CREATE POLICY p_teacher_preferences_all ON public.teacher_preferences FOR ALL USING (true);

-- 6. REALTIME PUBLICATION REGISTRATION
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.educational_partners;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_generations;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.teacher_preferences;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.class_schedules;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.classrooms;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.classes;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.class_students;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.seat_assignments;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.lessons;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.occurrences;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_reports;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.pedagogical_reports;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.school_calendar;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.communications;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END
$$;
