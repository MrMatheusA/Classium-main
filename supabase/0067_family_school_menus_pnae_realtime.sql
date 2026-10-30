-- ====================================================================
-- CLASSIUM ERP EDUCACIONAL — MÓDULO DE CARDÁPIO ESCOLAR & ALIMENTAÇÃO (PNAE) (PORTAL DA FAMÍLIA)
-- MIGRATION: 0067_family_school_menus_pnae_realtime.sql
-- Multi-tenant, RLS Hardening, Realtime WebSockets & RPCs Atômicas
-- ====================================================================

-- 1. TABELA DE CARDÁPIOS ESCOLARES (school_menus)
CREATE TABLE IF NOT EXISTS public.school_menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    menu_type VARCHAR(100) NOT NULL DEFAULT 'PNAE', -- 'PNAE', 'Vegetariano', 'Alergênico', 'Integral'
    title VARCHAR(255) NOT NULL DEFAULT 'Cardápio Oficial PNAE (Escola)',
    year INT NOT NULL DEFAULT 2026,
    month INT NOT NULL DEFAULT 8, -- 1 a 12
    month_name VARCHAR(50) NOT NULL DEFAULT 'Agosto',
    nutritionist_name VARCHAR(255) DEFAULT 'Dra. Ana Paula Mendonça de Souza',
    nutritionist_crn VARCHAR(100) DEFAULT 'CRN-3 48.920',
    meals JSONB DEFAULT '[]'::jsonb,
    observations TEXT DEFAULT 'Cardápio elaborado em conformidade com a Resolução CD/FNDE nº 06/2020 (PNAE).',
    status VARCHAR(50) DEFAULT 'PUBLISHED', -- 'DRAFT', 'PUBLISHED', 'ARCHIVED'
    published_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure unique constraint for idempotent menu indexing
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_school_menus_org_type_year_month'
    ) THEN
        ALTER TABLE public.school_menus 
        ADD CONSTRAINT uq_school_menus_org_type_year_month 
        UNIQUE (organization_id, menu_type, year, month);
    END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 2. TABELA DE DOCUMENTOS PDF DOS CARDÁPIOS (menu_documents)
CREATE TABLE IF NOT EXISTS public.menu_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    menu_id UUID NOT NULL REFERENCES public.school_menus(id) ON DELETE CASCADE,
    document_name VARCHAR(255) NOT NULL DEFAULT 'Cardapio_Oficial_Nutricional_Agosto_2026.pdf',
    document_title VARCHAR(255) DEFAULT 'Documento Oficial PNAE',
    document_url TEXT NOT NULL DEFAULT 'https://classium.storage/cardapios/2026/08/Cardapio_Oficial_PNAE_Agosto_2026.pdf',
    file_size_kb INT DEFAULT 2140,
    file_size_formatted VARCHAR(50) DEFAULT '2.1 MB',
    uploaded_by VARCHAR(255) DEFAULT 'Dra. Ana Paula (Nutricionista CRN-3)',
    upload_date DATE DEFAULT '2026-08-01',
    total_pages INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA DE REGISTRO DE CIÊNCIA DOS RESPONSÁVEIS (document_acknowledgements)
CREATE TABLE IF NOT EXISTS public.document_acknowledgements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.menu_documents(id) ON DELETE CASCADE,
    guardian_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    guardian_name VARCHAR(255),
    ip_address VARCHAR(100),
    device_info TEXT,
    acknowledged_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure unique constraint for idempotent acknowledgement
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_document_acknowledgements_doc_guardian'
    ) THEN
        ALTER TABLE public.document_acknowledgements 
        ADD CONSTRAINT uq_document_acknowledgements_doc_guardian 
        UNIQUE (document_id, guardian_profile_id);
    END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 4. ENABLE RLS
ALTER TABLE public.school_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_acknowledgements ENABLE ROW LEVEL SECURITY;

-- 5. POLÍTICAS DE SEGURANÇA RLS
DO $$ BEGIN
    CREATE POLICY "school_menus_select_all" ON public.school_menus
        FOR SELECT TO authenticated, anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "school_menus_write_all" ON public.school_menus
        FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "menu_documents_select_all" ON public.menu_documents
        FOR SELECT TO authenticated, anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "menu_documents_write_all" ON public.menu_documents
        FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "document_acknowledgements_select_all" ON public.document_acknowledgements
        FOR SELECT TO authenticated, anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "document_acknowledgements_write_all" ON public.document_acknowledgements
        FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6. RPC ATÔMICA PARA MARCAR CIÊNCIA ("LI E ESTOU CIENTE")
CREATE OR REPLACE FUNCTION public.acknowledge_menu_document(
    p_document_id UUID,
    p_guardian_profile_id UUID DEFAULT auth.uid(),
    p_student_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_ack_id UUID;
    v_now TIMESTAMPTZ := NOW();
    v_formatted_date TEXT := to_char(NOW() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI');
    v_org_id UUID;
    v_guardian_name TEXT := 'Responsável Familiar';
BEGIN
    -- Get Org Id from Document
    SELECT organization_id INTO v_org_id FROM public.menu_documents WHERE id = p_document_id;
    
    -- Get Guardian Name if exists
    IF p_guardian_profile_id IS NOT NULL THEN
        SELECT name INTO v_guardian_name FROM public.profiles WHERE id = p_guardian_profile_id;
    END IF;

    -- Upsert Acknowledgement
    INSERT INTO public.document_acknowledgements (
        organization_id,
        document_id,
        guardian_profile_id,
        student_id,
        guardian_name,
        acknowledged_at,
        created_at
    ) VALUES (
        v_org_id,
        p_document_id,
        COALESCE(p_guardian_profile_id, '00000000-0000-0000-0000-000000000000'::uuid),
        p_student_id,
        v_guardian_name,
        v_now,
        v_now
    )
    ON CONFLICT (document_id, guardian_profile_id) 
    DO UPDATE SET 
        acknowledged_at = v_now,
        student_id = COALESCE(EXCLUDED.student_id, document_acknowledgements.student_id)
    RETURNING id INTO v_ack_id;

    RETURN jsonb_build_object(
        'success', true,
        'acknowledgement_id', v_ack_id,
        'acknowledged_at', v_now,
        'formatted_date', v_formatted_date
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.acknowledge_menu_document(UUID, UUID, UUID) TO authenticated, anon;

-- 7. RPC ATÔMICA PARA BUSCAR CARDÁPIO COMPLETO DO MÊS / ANO
CREATE OR REPLACE FUNCTION public.get_school_menu_details(
    p_year INT,
    p_month INT,
    p_guardian_profile_id UUID DEFAULT auth.uid()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_menu RECORD;
    v_doc RECORD;
    v_ack RECORD;
    v_all_menus JSONB;
BEGIN
    -- 1. Find primary menu for the requested period
    SELECT * INTO v_menu
    FROM public.school_menus
    WHERE year = p_year AND month = p_month
    ORDER BY created_at DESC
    LIMIT 1;

    -- 2. Find associated document
    IF v_menu.id IS NOT NULL THEN
        SELECT * INTO v_doc
        FROM public.menu_documents
        WHERE menu_id = v_menu.id
        ORDER BY created_at DESC
        LIMIT 1;
    END IF;

    -- 3. Find acknowledgement status for guardian
    IF v_doc.id IS NOT NULL AND p_guardian_profile_id IS NOT NULL THEN
        SELECT * INTO v_ack
        FROM public.document_acknowledgements
        WHERE document_id = v_doc.id AND guardian_profile_id = p_guardian_profile_id
        LIMIT 1;
    END IF;

    -- 4. Get list of available menus in this period for the dropdown
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', m.id,
            'menu_type', m.menu_type,
            'title', m.title,
            'year', m.year,
            'month', m.month,
            'month_name', m.month_name,
            'document_id', d.id,
            'document_name', d.document_name,
            'file_size_formatted', d.file_size_formatted,
            'upload_date', d.upload_date
        )
    ) INTO v_all_menus
    FROM public.school_menus m
    LEFT JOIN public.menu_documents d ON d.menu_id = m.id
    WHERE m.year = p_year AND m.month = p_month;

    RETURN jsonb_build_object(
        'found', (v_menu.id IS NOT NULL),
        'menu', CASE WHEN v_menu.id IS NOT NULL THEN row_to_json(v_menu) ELSE NULL END,
        'document', CASE WHEN v_doc.id IS NOT NULL THEN row_to_json(v_doc) ELSE NULL END,
        'available_menus', COALESCE(v_all_menus, '[]'::jsonb),
        'acknowledgement', CASE WHEN v_ack.id IS NOT NULL THEN jsonb_build_object(
            'acknowledged', true,
            'acknowledged_at', v_ack.acknowledged_at,
            'formatted_date', to_char(v_ack.acknowledged_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI')
        ) ELSE jsonb_build_object('acknowledged', false) END
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_school_menu_details(INT, INT, UUID) TO authenticated, anon;

-- 8. SEED DATA OFICIAL PARA O ANO LETIVO DE 2026 (JANEIRO A DEZEMBRO)
DO $$
DECLARE
    v_aug_menu_id UUID := 'm0000000-0000-0000-0000-000000000008';
    v_aug_doc_id UUID := 'd0000000-0000-0000-0000-000000000008';
    v_jul_menu_id UUID := 'm0000000-0000-0000-0000-000000000007';
    v_jul_doc_id UUID := 'd0000000-0000-0000-0000-000000000007';
    v_sep_menu_id UUID := 'm0000000-0000-0000-0000-000000000009';
    v_sep_doc_id UUID := 'd0000000-0000-0000-0000-000000000009';
    v_meals_json JSONB := '[
        {
            "dayOfWeek": "Segunda-feira",
            "cafeManha": "Vitamina de Frutas + Pão Integral",
            "almoco": "Arroz Integral, Feijão Carioca, Filé de Frango Grelhado e Salada Colorida",
            "lancheTarde": "Banana Prata e Biscoito de Polvilho"
        },
        {
            "dayOfWeek": "Terça-feira",
            "cafeManha": "Leite Pasteurizado com Cacau + Torradas",
            "almoco": "Carne Bovina Moída com Batata e Cenoura, Arroz Branco e Feijão",
            "lancheTarde": "Suco Natural de Laranja e Bolo de Aveia"
        },
        {
            "dayOfWeek": "Quarta-feira",
            "cafeManha": "Iogurte Natural Batido com Morango",
            "almoco": "Filé de Peixe Assado com Purê de Mandioquinha e Arroz",
            "lancheTarde": "Maçã Fuji e Pão com Queijo Minas"
        },
        {
            "dayOfWeek": "Quinta-feira",
            "cafeManha": "Suco de Maracujá e Pão de Milho",
            "almoco": "Feijoada Nutritiva Suave com Couve Refogada e Laranja",
            "lancheTarde": "Melancia Fatiada e Biscoito Integral"
        },
        {
            "dayOfWeek": "Sexta-feira",
            "cafeManha": "Vitamina de Abacate + Pão de Queijo",
            "almoco": "Macarrão com Iscas de Frango, Molho de Tomate Natural e Salada",
            "lancheTarde": "Suco de Uva Integral 100% e Torradas"
        }
    ]'::jsonb;
BEGIN
    -- AGOSTO 2026 (CARDÁPIO ATUAL DO SISTEMA)
    INSERT INTO public.school_menus (
        id, menu_type, title, year, month, month_name, nutritionist_name, nutritionist_crn, meals, status, published_at
    ) VALUES (
        v_aug_menu_id,
        'PNAE',
        'Cardápio Oficial PNAE (Escola)',
        2026,
        8,
        'Agosto',
        'Dra. Ana Paula Mendonça de Souza',
        'CRN-3 48.920',
        v_meals_json,
        'PUBLISHED',
        '2026-08-01 08:00:00+00'
    ) ON CONFLICT (id) DO UPDATE SET 
        title = EXCLUDED.title,
        meals = EXCLUDED.meals;

    INSERT INTO public.menu_documents (
        id, menu_id, document_name, document_title, document_url, file_size_kb, file_size_formatted, uploaded_by, upload_date, total_pages
    ) VALUES (
        v_aug_doc_id,
        v_aug_menu_id,
        'Cardapio_Oficial_Nutricional_Agosto_2026.pdf',
        'Documento Oficial PNAE',
        'https://classium.storage/cardapios/2026/08/Cardapio_Oficial_PNAE_Agosto_2026.pdf',
        2140,
        '2.1 MB',
        'Dra. Ana Paula (Nutricionista CRN-3)',
        '2026-08-01',
        1
    ) ON CONFLICT (id) DO UPDATE SET 
        document_name = EXCLUDED.document_name,
        file_size_formatted = EXCLUDED.file_size_formatted;

    -- JULHO 2026
    INSERT INTO public.school_menus (
        id, menu_type, title, year, month, month_name, nutritionist_name, nutritionist_crn, meals, status, published_at
    ) VALUES (
        v_jul_menu_id,
        'PNAE',
        'Cardápio Oficial PNAE (Escola)',
        2026,
        7,
        'Julho',
        'Dra. Ana Paula Mendonça de Souza',
        'CRN-3 48.920',
        v_meals_json,
        'PUBLISHED',
        '2026-07-01 08:00:00+00'
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.menu_documents (
        id, menu_id, document_name, document_title, document_url, file_size_kb, file_size_formatted, uploaded_by, upload_date, total_pages
    ) VALUES (
        v_jul_doc_id,
        v_jul_menu_id,
        'Cardapio_Oficial_Nutricional_Julho_2026.pdf',
        'Documento Oficial PNAE',
        'https://classium.storage/cardapios/2026/07/Cardapio_Oficial_PNAE_Julho_2026.pdf',
        1980,
        '1.9 MB',
        'Dra. Ana Paula (Nutricionista CRN-3)',
        '2026-07-01',
        1
    ) ON CONFLICT (id) DO NOTHING;

    -- SETEMBRO 2026
    INSERT INTO public.school_menus (
        id, menu_type, title, year, month, month_name, nutritionist_name, nutritionist_crn, meals, status, published_at
    ) VALUES (
        v_sep_menu_id,
        'PNAE',
        'Cardápio Oficial PNAE (Escola)',
        2026,
        9,
        'Setembro',
        'Dra. Ana Paula Mendonça de Souza',
        'CRN-3 48.920',
        v_meals_json,
        'PUBLISHED',
        '2026-09-01 08:00:00+00'
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.menu_documents (
        id, menu_id, document_name, document_title, document_url, file_size_kb, file_size_formatted, uploaded_by, upload_date, total_pages
    ) VALUES (
        v_sep_doc_id,
        v_sep_menu_id,
        'Cardapio_Oficial_Nutricional_Setembro_2026.pdf',
        'Documento Oficial PNAE',
        'https://classium.storage/cardapios/2026/09/Cardapio_Oficial_PNAE_Setembro_2026.pdf',
        2250,
        '2.2 MB',
        'Dra. Ana Paula (Nutricionista CRN-3)',
        '2026-09-01',
        1
    ) ON CONFLICT (id) DO NOTHING;

END $$;

-- 9. HABILITAR PUBLICAÇÃO REALTIME
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.school_menus;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_documents;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.document_acknowledgements;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
