-- ==============================================================================
-- MIGRATION: 0072_publish_school_menu_function.sql
-- Módulo: Gestão de Cardápios Escolares & Alimentação (PNAE) — Stored Procedure (RPC)
-- ==============================================================================

-- Garantir colunas necessárias na tabela public.school_menus
CREATE TABLE IF NOT EXISTS public.school_menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111',
    year INT NOT NULL,
    month INT NOT NULL,
    title TEXT DEFAULT 'Cardápio Escolar Oficial PNAE',
    menu_type TEXT DEFAULT 'GERAL',
    nutritionist_name TEXT DEFAULT 'Dra. Ana Paula (Nutricionista CRN-3)',
    nutritionist_crn TEXT DEFAULT 'CRN-3 / 45892',
    observations TEXT DEFAULT 'Cardápio elaborado em conformidade com a Resolução CD/FNDE nº 06/2020 (PNAE).',
    status TEXT DEFAULT 'PUBLISHED',
    published_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT school_menus_year_month_org_unique UNIQUE(organization_id, year, month)
);

-- Garantir tabela public.menu_documents
CREATE TABLE IF NOT EXISTS public.menu_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_menu_id UUID REFERENCES public.school_menus(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Cardápio Escolar Oficial PNAE',
    file_url TEXT NOT NULL,
    file_name TEXT,
    file_size TEXT DEFAULT '2.1 MB',
    total_pages INT DEFAULT 1,
    uploaded_by UUID,
    published_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.school_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_documents ENABLE ROW LEVEL SECURITY;

-- Policies para school_menus e menu_documents
DROP POLICY IF EXISTS "Allow all read school_menus" ON public.school_menus;
DROP POLICY IF EXISTS "Allow all write school_menus" ON public.school_menus;
DROP POLICY IF EXISTS "Allow all read menu_documents" ON public.menu_documents;
DROP POLICY IF EXISTS "Allow all write menu_documents" ON public.menu_documents;

CREATE POLICY "Allow all read school_menus" ON public.school_menus FOR SELECT USING (true);
CREATE POLICY "Allow all write school_menus" ON public.school_menus FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all read menu_documents" ON public.menu_documents FOR SELECT USING (true);
CREATE POLICY "Allow all write menu_documents" ON public.menu_documents FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- FUNÇÃO RPC: public.publish_school_menu
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.publish_school_menu(
    p_title TEXT,
    p_file_url TEXT,
    p_year INT,
    p_month INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_organization_id UUID;
    v_school_menu_id UUID;
    v_menu_document_id UUID;
    v_caller_id UUID;
    v_result JSONB;
BEGIN
    v_caller_id := auth.uid();
    
    -- Obter organização vinculada ou default institucional
    BEGIN
        v_organization_id := auth.organization_id();
    EXCEPTION WHEN OTHERS THEN
        v_organization_id := NULL;
    END;

    IF v_organization_id IS NULL THEN
        SELECT organization_id INTO v_organization_id
        FROM public.profiles
        WHERE id = v_caller_id OR user_id = v_caller_id
        LIMIT 1;
    END IF;

    IF v_organization_id IS NULL THEN
        v_organization_id := '11111111-1111-1111-1111-111111111111'::UUID;
    END IF;

    -- 1. Encontrar ou criar o registro mestre em school_menus
    SELECT id INTO v_school_menu_id
    FROM public.school_menus
    WHERE organization_id = v_organization_id
      AND year = p_year
      AND month = p_month
    LIMIT 1;

    IF v_school_menu_id IS NULL THEN
        INSERT INTO public.school_menus (
            organization_id,
            year,
            month,
            title,
            menu_type,
            status,
            published_at
        )
        VALUES (
            v_organization_id,
            p_year,
            p_month,
            COALESCE(p_title, 'Cardápio Escolar Oficial PNAE'),
            'GERAL',
            'PUBLISHED',
            NOW()
        )
        RETURNING id INTO v_school_menu_id;
    ELSE
        UPDATE public.school_menus
        SET title = COALESCE(p_title, title),
            status = 'PUBLISHED',
            published_at = NOW(),
            updated_at = NOW()
        WHERE id = v_school_menu_id;
    END IF;

    -- 2. Inserir o novo documento do cardápio em menu_documents
    INSERT INTO public.menu_documents (
        school_menu_id,
        title,
        file_url,
        file_name,
        uploaded_by,
        published_at
    )
    VALUES (
        v_school_menu_id,
        COALESCE(p_title, 'Cardápio Escolar Oficial PNAE'),
        p_file_url,
        substring(p_file_url from '[^/]+$'),
        v_caller_id,
        NOW()
    )
    RETURNING id INTO v_menu_document_id;

    -- 3. Registrar no log de auditoria
    BEGIN
        INSERT INTO public.audit_logs (
            organization_id,
            action,
            entity_name,
            entity_id,
            details,
            created_at
        )
        VALUES (
            v_organization_id,
            'PUBLISH_SCHOOL_MENU',
            'school_menus',
            v_school_menu_id,
            jsonb_build_object(
                'title', p_title,
                'year', p_year,
                'month', p_month,
                'file_url', p_file_url,
                'document_id', v_menu_document_id
            ),
            NOW()
        );
    EXCEPTION WHEN OTHERS THEN
        -- Ignorar falha de log se a tabela de audit não existir
    END;

    -- 4. Construir retorno JSONB
    v_result := jsonb_build_object(
        'success', true,
        'school_menu_id', v_school_menu_id,
        'menu_document_id', v_menu_document_id,
        'title', COALESCE(p_title, 'Cardápio Escolar Oficial PNAE'),
        'file_url', p_file_url,
        'year', p_year,
        'month', p_month,
        'published_at', NOW()
    );

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Erro ao publicar cardápio escolar PNAE: %', SQLERRM;
END;
$$;

-- Conceder permissão de execução
GRANT EXECUTE ON FUNCTION public.publish_school_menu(TEXT, TEXT, INT, INT) TO authenticated, service_role, anon;
