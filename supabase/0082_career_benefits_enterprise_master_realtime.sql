-- ============================================================================
-- CLASSIUM EDUCACIONAL - MIGRATION 0082
-- CARREIRA & BENEFÍCIOS / MARKETPLACE EDUCACIONAL (GESTOR & DOCENTE)
-- BANCO DE DADOS SUPABASE, RLS, ATOMICIDADE, STORAGE & REALTIME WEBSOCKET
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA CANÔNICA: educational_partners
CREATE TABLE IF NOT EXISTS public.educational_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
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
    color_gradient TEXT,
    seal_text TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Garantir colunas adicionais caso a tabela já existisse com schema parcial
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'educational_partners' AND column_name = 'school_id') THEN
        ALTER TABLE public.educational_partners ADD COLUMN school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'educational_partners' AND column_name = 'color_gradient') THEN
        ALTER TABLE public.educational_partners ADD COLUMN color_gradient TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'educational_partners' AND column_name = 'seal_text') THEN
        ALTER TABLE public.educational_partners ADD COLUMN seal_text TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'educational_partners' AND column_name = 'leads_generated') THEN
        ALTER TABLE public.educational_partners ADD COLUMN leads_generated INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'educational_partners' AND column_name = 'tags') THEN
        ALTER TABLE public.educational_partners ADD COLUMN tags JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- 2. ÍNDICES DE ALTA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_educational_partners_org ON public.educational_partners(organization_id);
CREATE INDEX IF NOT EXISTS idx_educational_partners_school ON public.educational_partners(school_id);
CREATE INDEX IF NOT EXISTS idx_educational_partners_category ON public.educational_partners(category);
CREATE INDEX IF NOT EXISTS idx_educational_partners_status ON public.educational_partners(status);
CREATE INDEX IF NOT EXISTS idx_educational_partners_mentis ON public.educational_partners(is_mentis_therapy);

-- 3. PROJEÇÃO DE COMPATIBILIDADE: partner_ads (Sincronização Unidirecional)
CREATE TABLE IF NOT EXISTS public.partner_ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    partner_name VARCHAR(150) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    banner_url TEXT NOT NULL,
    target_link TEXT,
    category VARCHAR(50) DEFAULT 'general',
    is_active BOOLEAN DEFAULT true,
    views_count INT DEFAULT 0,
    clicks_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para sincronizar educational_partners com partner_ads automaticamente
CREATE OR REPLACE FUNCTION public.sync_educational_partner_to_ads()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        DELETE FROM public.partner_ads WHERE id = OLD.id;
        RETURN OLD;
    ELSIF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        INSERT INTO public.partner_ads (
            id, organization_id, partner_name, title, description, banner_url, target_link,
            category, is_active, views_count, clicks_count, updated_at
        ) VALUES (
            NEW.id,
            NEW.organization_id,
            NEW.name,
            COALESCE(NEW.plan_title, NEW.name),
            NEW.description,
            COALESCE(NEW.banner, NEW.logo),
            COALESCE(NEW.primary_button_link, NEW.website),
            NEW.category,
            (NEW.status = 'aprovado'),
            NEW.views,
            NEW.clicks,
            now()
        )
        ON CONFLICT (id) DO UPDATE SET
            partner_name = EXCLUDED.partner_name,
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            banner_url = EXCLUDED.banner_url,
            target_link = EXCLUDED.target_link,
            category = EXCLUDED.category,
            is_active = EXCLUDED.is_active,
            views_count = EXCLUDED.views_count,
            clicks_count = EXCLUDED.clicks_count,
            updated_at = now();
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_educational_partner_to_ads ON public.educational_partners;
CREATE TRIGGER trg_sync_educational_partner_to_ads
    AFTER INSERT OR UPDATE OR DELETE ON public.educational_partners
    FOR EACH ROW EXECUTE FUNCTION public.sync_educational_partner_to_ads();

-- 4. FUNÇÃO ATÔMICA PARA INCREMENTO DE MÉTRICAS
CREATE OR REPLACE FUNCTION public.increment_partner_metric_atomic(
    p_partner_id UUID,
    p_metric_type TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_updated_views INT;
    v_updated_clicks INT;
    v_updated_leads INT;
BEGIN
    IF p_metric_type = 'view' THEN
        UPDATE public.educational_partners
        SET views = views + 1, updated_at = now()
        WHERE id = p_partner_id
        RETURNING views INTO v_updated_views;
        
        RETURN jsonb_build_object('success', true, 'metric', 'view', 'current_value', v_updated_views);
    ELSIF p_metric_type = 'click' THEN
        UPDATE public.educational_partners
        SET clicks = clicks + 1, updated_at = now()
        WHERE id = p_partner_id
        RETURNING clicks INTO v_updated_clicks;
        
        RETURN jsonb_build_object('success', true, 'metric', 'click', 'current_value', v_updated_clicks);
    ELSIF p_metric_type = 'lead' THEN
        UPDATE public.educational_partners
        SET leads_generated = leads_generated + 1, clicks = clicks + 1, updated_at = now()
        WHERE id = p_partner_id
        RETURNING leads_generated INTO v_updated_leads;
        
        RETURN jsonb_build_object('success', true, 'metric', 'lead', 'current_value', v_updated_leads);
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Invalid metric type');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RLS (ROW LEVEL SECURITY)
ALTER TABLE public.educational_partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_educational_partners_select ON public.educational_partners;
CREATE POLICY p_educational_partners_select ON public.educational_partners
    FOR SELECT
    USING (
        status = 'aprovado'
        OR auth.role() = 'service_role'
        OR auth.jwt() ->> 'role' IN ('admin', 'gestor', 'admin_master', 'ROLE_ADMIN_MASTER')
    );

DROP POLICY IF EXISTS p_educational_partners_insert ON public.educational_partners;
CREATE POLICY p_educational_partners_insert ON public.educational_partners
    FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS p_educational_partners_update ON public.educational_partners;
CREATE POLICY p_educational_partners_update ON public.educational_partners
    FOR UPDATE
    USING (true);

DROP POLICY IF EXISTS p_educational_partners_delete ON public.educational_partners;
CREATE POLICY p_educational_partners_delete ON public.educational_partners
    FOR DELETE
    USING (true);

-- 6. HABILITAR SUPABASE REALTIME
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'educational_partners'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.educational_partners;
    END IF;
END $$;

-- 7. SEED DOS PARCEIROS OFICIAIS CANÔNICOS
INSERT INTO public.educational_partners (
    id, name, logo, banner, rating, review_count, category, sub_category, 
    plan, highlights, duration, modality, price, original_price, discount_badge, 
    vip_exclusive, is_mentis_therapy, whatsapp, website, catalog_pdf_url, 
    description, official_partner_seal, status, views, clicks, leads_generated, location,
    tags, official_message, promo_text, plan_title, primary_button_text, color_gradient, seal_text
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
    true, 'aprovado', 18450, 4320, 1240, 'Atendimento em todo o Brasil',
    '["Saúde Mental do Professor", "Psicoterapia Online", "Combate ao Burnout", "Atendimento Sigiloso", "Convênio Educacional"]'::jsonb,
    'Cuidar de quem ensina é transformar o futuro da educação. Oferecemos suporte psicológico especializado com condições exclusivas para a rede de parceiros Classium.',
    'Mais de 1.400 professores atendidos e avaliado com nota máxima 5.0 estrelas.',
    'Plano Especial para Professores & Gestores',
    'VISITAR SITE OFICIAL MENTIS',
    'from-purple-950/80 via-[#100826] to-[#08142d]',
    'PARCEIRO OFICIAL CLASSIUM'
WHERE NOT EXISTS (SELECT 1 FROM public.educational_partners WHERE name = 'Mentis Therapy');

INSERT INTO public.educational_partners (
    id, name, logo, banner, rating, review_count, category, sub_category, 
    plan, highlights, duration, modality, price, original_price, discount_badge, 
    vip_exclusive, is_mentis_therapy, whatsapp, website, 
    description, official_partner_seal, status, views, clicks, leads_generated, location,
    tags, plan_title, primary_button_text
)
SELECT 
    'e0000001-0000-0000-0000-000000000002'::uuid,
    'UNIASSELVI',
    'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&auto=format&fit=crop&q=80',
    4.9, 980, 'formacao', 'Pós-graduação', 'diamante',
    '["Psicopedagogia Clínica e Institucional", "Educação Especial e Inclusiva", "Gestão Escolar e Coordenação Pedagógica"]'::jsonb,
    '12 meses', 'EAD Semipresencial ou 100% Online', 'R$ 149,90 /mês', 'R$ 299,00', 'Convênio Classium: 15% de desconto',
    true, false, '5547991234567', 'https://uniasselvi.com.br',
    'Mais de 100 cursos de Pós-Graduação reconhecidos pelo MEC. Tutoria exclusiva em cada disciplina para alavancar sua carreira docente.',
    true, 'aprovado', 12400, 2890, 850, 'Nacional (Mais de 1.000 Polos)',
    '["Pós-Graduação MEC", "Tutoria Exclusiva", "Bolsas de Estudo", "Educação Inclusiva"]'::jsonb,
    'Pós-Graduação Docente com Tutoria',
    'CONHECER CURSOS UNIASSELVI'
WHERE NOT EXISTS (SELECT 1 FROM public.educational_partners WHERE name = 'UNIASSELVI');

INSERT INTO public.educational_partners (
    id, name, logo, banner, rating, review_count, category, sub_category, 
    plan, highlights, duration, modality, price, discount_badge, 
    vip_exclusive, is_mentis_therapy, whatsapp, website, catalog_pdf_url, 
    description, official_partner_seal, status, views, clicks, leads_generated, location,
    tags, plan_title, primary_button_text
)
SELECT 
    'e0000001-0000-0000-0000-000000000003'::uuid,
    'FTD Educação',
    'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&auto=format&fit=crop&q=80',
    4.9, 1250, 'livros', 'Editoras & BNCC', 'diamante',
    '["Coleções Didáticas Alinhadas à BNCC", "Livros de Literatura e Leitura de Deleite", "Plataforma e Catálogos Digitais Interativos"]'::jsonb,
    'Catálogo Anual 2026', 'Impresso & Digital', 'Condições Especiais para Escolas', 'Amostras Grátis para Gestores',
    false, false, '5511988887777', 'https://ftd.com.br', 'https://ftd.com.br/catalogo-bncc-2026.pdf',
    'Soluções educacionais completas para Educação Infantil, Ensino Fundamental e Ensino Médio. Materiais didáticos inovadores e formação docente.',
    true, 'aprovado', 15300, 3410, 920, 'Atendimento Escolar em Todo o Brasil',
    '["Livros Didáticos", "BNCC", "Literatura Infantil", "Formação Pedagógica"]'::jsonb,
    'Soluções Didáticas para Redes de Ensino',
    'ACESSAR CATÁLOGO FTD'
WHERE NOT EXISTS (SELECT 1 FROM public.educational_partners WHERE name = 'FTD Educação');

INSERT INTO public.educational_partners (
    id, name, logo, rating, review_count, category, sub_category, 
    plan, highlights, duration, modality, price, original_price, discount_badge, 
    vip_exclusive, whatsapp, website, 
    description, official_partner_seal, status, views, clicks, leads_generated, location,
    tags, plan_title, primary_button_text
)
SELECT 
    'e0000001-0000-0000-0000-000000000004'::uuid,
    'UNINTER Centro Universitário',
    'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=150&auto=format&fit=crop&q=80',
    4.8, 840, 'universidades', 'Mestrado & Pós', 'ouro',
    '["Mestrado Profissional em Educação", "Especialização em Neuroeducação", "Licenciaturas e Segunda Licenciatura em 1 Ano"]'::jsonb,
    '12 a 24 meses', 'EAD de Alta Performance', 'R$ 199,00 /mês', 'R$ 380,00', 'Bolsa de 20% para Rede Pública',
    false, '5541999991111', 'https://uninter.com',
    'Líder em ensino superior a distância com nota máxima no MEC. Laboratórios virtuais e biblioteca digital com mais de 100 mil títulos.',
    true, 'aprovado', 8900, 1950, 490, 'Nacional',
    '["Mestrado", "Segunda Licenciatura", "Neuroeducação", "Nota 5 MEC"]'::jsonb,
    'Mestrado & Especializações em Educação',
    'VER PROGRAMAS UNINTER'
WHERE NOT EXISTS (SELECT 1 FROM public.educational_partners WHERE name = 'UNINTER Centro Universitário');

INSERT INTO public.educational_partners (
    id, name, logo, rating, review_count, category, sub_category, 
    plan, highlights, duration, modality, price, discount_badge, 
    vip_exclusive, whatsapp, website, catalog_pdf_url,
    description, official_partner_seal, status, views, clicks, leads_generated, location,
    tags, plan_title, primary_button_text
)
SELECT 
    'e0000001-0000-0000-0000-000000000005'::uuid,
    'Positivo Tecnologia Educacional',
    'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=150&auto=format&fit=crop&q=80',
    4.9, 610, 'tecnologia', 'Robótica & Projetores', 'ouro',
    '["Kits de Robótica LEGO® Education", "Lousas Digitais e Telas Interativas 4K", "Notebooks e Chromebooks de Alta Durabilidade"]'::jsonb,
    'Garantia de 3 Anos', 'Equipamentos + Treinamento Docente', 'Sob Consulta / Orçamento Escolar', 'Frete Grátis e Instalação Inclusa',
    false, '5541987654321', 'https://positivoteceducacional.com.br', 'https://positivoteceducacional.com.br/catalogo-robotica.pdf',
    'Transforme as salas de aula em espaços dinâmicos de aprendizagem maker com tecnologias interativas de ponta.',
    true, 'aprovado', 9400, 2100, 530, 'Atendimento Nacional',
    '["Robótica Escolar", "Lousa Digital", "Tecnologia Maker", "LEGO Education"]'::jsonb,
    'Kits Maker & Robótica Educacional',
    'SOLICITAR ORÇAMENTO ESCOLAR'
WHERE NOT EXISTS (SELECT 1 FROM public.educational_partners WHERE name = 'Positivo Tecnologia Educacional');

INSERT INTO public.educational_partners (
    id, name, logo, rating, review_count, category, sub_category, 
    plan, highlights, price, discount_badge, 
    vip_exclusive, whatsapp, website, 
    description, official_partner_seal, status, views, clicks, leads_generated, location,
    tags, plan_title, primary_button_text
)
SELECT 
    'e0000001-0000-0000-0000-000000000006'::uuid,
    'Sicoob CrediEduca',
    'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=150&auto=format&fit=crop&q=80',
    4.8, 520, 'financeira', 'Cooperativas de Crédito', 'ouro',
    '["Consignado com Taxas Reduzidas para Professores", "Consórcio Auto e Imóvel sem Taxa de Adesão", "Linha de Crédito para Financiamento de Cursos e Equipamentos"]'::jsonb,
    'Taxas a partir de 1,19% a.m.', 'Isenção de Anuidade no Cartão',
    false, '5561998765432', 'https://sicoob.com.br',
    'Cooperativa financeira feita por educadores e para educadores, garantindo rendimento, taxas justas e apoio ao projeto de vida do professor.',
    true, 'aprovado', 6700, 1420, 380, 'Nacional',
    '["Consignado Docente", "Crédito Educativo", "Cooperativismo", "Cartão sem Anuidade"]'::jsonb,
    'Soluções Financeiras para Professores',
    'SIMULAR CONVÊNIO SICOOB'
WHERE NOT EXISTS (SELECT 1 FROM public.educational_partners WHERE name = 'Sicoob CrediEduca');
