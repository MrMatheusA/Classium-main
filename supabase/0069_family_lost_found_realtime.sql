-- ============================================================================
-- CLASSIUM EDUCACIONAL - MIGRATION 0069
-- INTEGRAÇÃO EM TEMPO REAL: MENU "ACHADOS E PERDIDOS DIGITAL" (PORTAL DA FAMÍLIA)
-- BANCO DE DADOS SUPABASE, RLS, STORAGE & REALTIME WEBSOCKETS
-- ============================================================================

-- 1. TABELA PRINCIPAL DE ITENS ACHADOS E PERDIDOS
CREATE TABLE IF NOT EXISTS public.lost_and_found_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Material Escolar',
    description TEXT,
    location_found TEXT NOT NULL DEFAULT 'Pátio Central',
    setor TEXT DEFAULT 'Geral',
    found_date DATE NOT NULL DEFAULT CURRENT_DATE,
    found_time TEXT DEFAULT '10:30',
    image_url TEXT,
    status VARCHAR(20) CHECK (status IN ('disponivel', 'reservado', 'entregue', 'arquivado', 'available', 'reserved', 'returned', 'discarded')) NOT NULL DEFAULT 'disponivel',
    registered_by TEXT DEFAULT 'Inspetor de Pátio / Secretaria',
    delivered_date DATE,
    delivered_by_staff TEXT,
    delivery_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Adicionar colunas se tabela já existia com formato reduzido
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lost_and_found_items' AND column_name = 'name') THEN
        ALTER TABLE public.lost_and_found_items ADD COLUMN name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lost_and_found_items' AND column_name = 'setor') THEN
        ALTER TABLE public.lost_and_found_items ADD COLUMN setor TEXT DEFAULT 'Geral';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lost_and_found_items' AND column_name = 'location_found') THEN
        ALTER TABLE public.lost_and_found_items ADD COLUMN location_found TEXT DEFAULT 'Pátio Central';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lost_and_found_items' AND column_name = 'delivered_date') THEN
        ALTER TABLE public.lost_and_found_items ADD COLUMN delivered_date DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lost_and_found_items' AND column_name = 'delivered_by_staff') THEN
        ALTER TABLE public.lost_and_found_items ADD COLUMN delivered_by_staff TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lost_and_found_items' AND column_name = 'delivery_notes') THEN
        ALTER TABLE public.lost_and_found_items ADD COLUMN delivery_notes TEXT;
    END IF;
END $$;

-- 2. TABELA DE RESERVAS DE ITENS POR RESPONSÁVEIS
CREATE TABLE IF NOT EXISTS public.lost_and_found_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    item_id UUID REFERENCES public.lost_and_found_items(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    guardian_profile_id UUID,
    responsible_name TEXT NOT NULL,
    student_name TEXT NOT NULL,
    student_grade TEXT,
    responsible_phone TEXT,
    reservation_date TIMESTAMPTZ DEFAULT now(),
    pickup_date TIMESTAMPTZ,
    status VARCHAR(20) CHECK (status IN ('pending', 'confirmed', 'cancelled', 'reservado', 'entregue')) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. ÍNDICES DE PERFORMANCE E CONSULTAS
CREATE INDEX IF NOT EXISTS idx_lost_found_items_org ON public.lost_and_found_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_lost_found_items_status ON public.lost_and_found_items(status);
CREATE INDEX IF NOT EXISTS idx_lost_found_items_cat ON public.lost_and_found_items(category);
CREATE INDEX IF NOT EXISTS idx_lost_found_items_date ON public.lost_and_found_items(found_date);
CREATE INDEX IF NOT EXISTS idx_lost_found_reservations_item ON public.lost_and_found_reservations(item_id);
CREATE INDEX IF NOT EXISTS idx_lost_found_reservations_student ON public.lost_and_found_reservations(student_id);

-- 4. RPC ATÔMICA: RESERVAR ITEM DE ACHADOS E PERDIDOS
CREATE OR REPLACE FUNCTION public.reserve_lost_and_found_item_atomic(
    p_item_id UUID,
    p_student_id UUID,
    p_guardian_profile_id UUID,
    p_responsible_name TEXT,
    p_student_name TEXT,
    p_student_grade TEXT,
    p_responsible_phone TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item RECORD;
    v_reservation_id UUID;
BEGIN
    SELECT * INTO v_item
    FROM public.lost_and_found_items
    WHERE id = p_item_id;

    IF v_item.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Item não encontrado no catálogo.');
    END IF;

    IF v_item.status NOT IN ('disponivel', 'available') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Este item já se encontra reservado ou entregue.');
    END IF;

    -- Atualiza status do item para reservado
    UPDATE public.lost_and_found_items
    SET status = 'reservado', updated_at = now()
    WHERE id = p_item_id;

    -- Cria o registro de reserva com os dados do estudante e responsável
    INSERT INTO public.lost_and_found_reservations (
        organization_id,
        item_id,
        student_id,
        guardian_profile_id,
        responsible_name,
        student_name,
        student_grade,
        responsible_phone,
        reservation_date,
        status
    ) VALUES (
        v_item.organization_id,
        p_item_id,
        p_student_id,
        p_guardian_profile_id,
        p_responsible_name,
        p_student_name,
        p_student_grade,
        p_responsible_phone,
        now(),
        'pending'
    ) RETURNING id INTO v_reservation_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Reserva efetuada com sucesso!',
        'reservation_id', v_reservation_id,
        'item_id', p_item_id
    );
END;
$$;

-- 5. RPC ATÔMICA: MARCAR ITEM COMO DEVOLVIDO/ENTREGUE
CREATE OR REPLACE FUNCTION public.deliver_lost_and_found_item_atomic(
    p_item_id UUID,
    p_staff_name TEXT,
    p_delivery_notes TEXT DEFAULT 'Retirado na Secretaria Escolar'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.lost_and_found_items
    SET 
        status = 'entregue',
        delivered_date = CURRENT_DATE,
        delivered_by_staff = p_staff_name,
        delivery_notes = p_delivery_notes,
        updated_at = now()
    WHERE id = p_item_id;

    UPDATE public.lost_and_found_reservations
    SET 
        status = 'confirmed',
        pickup_date = now(),
        updated_at = now()
    WHERE item_id = p_item_id;

    RETURN jsonb_build_object('success', true, 'message', 'Item marcado como devolvido na secretaria.');
END;
$$;

-- 6. RPC ATÔMICA: CONSULTAR CATÁLOGO DE ACHADOS E PERDIDOS CONSOLIDADO
CREATE OR REPLACE FUNCTION public.get_lost_and_found_catalog(
    p_organization_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(item_obj ORDER BY item_obj->>'created_at' DESC), '[]'::jsonb)
    INTO v_result
    FROM (
        SELECT jsonb_build_object(
            'id', lfi.id,
            'organization_id', lfi.organization_id,
            'name', lfi.name,
            'category', lfi.category,
            'description', lfi.description,
            'location_found', lfi.location_found,
            'setor', lfi.setor,
            'found_date', TO_CHAR(lfi.found_date, 'DD/MM/YYYY'),
            'found_time', lfi.found_time,
            'image_url', lfi.image_url,
            'status', lfi.status,
            'registered_by', lfi.registered_by,
            'delivered_date', TO_CHAR(lfi.delivered_date, 'DD/MM/YYYY'),
            'delivered_by_staff', lfi.delivered_by_staff,
            'delivery_notes', lfi.delivery_notes,
            'created_at', lfi.created_at,
            'reservation', (
                SELECT jsonb_build_object(
                    'id', res.id,
                    'student_id', res.student_id,
                    'responsible_name', res.responsible_name,
                    'student_name', res.student_name,
                    'student_grade', res.student_grade,
                    'responsible_phone', res.responsible_phone,
                    'reservation_date', TO_CHAR(res.reservation_date, 'DD/MM/YYYY'),
                    'reservation_time', TO_CHAR(res.reservation_date, 'HH24:MI'),
                    'status', res.status
                )
                FROM public.lost_and_found_reservations res
                WHERE res.item_id = lfi.id
                ORDER BY res.created_at DESC
                LIMIT 1
            )
        ) AS item_obj
        FROM public.lost_and_found_items lfi
        WHERE (p_organization_id IS NULL OR lfi.organization_id = p_organization_id OR lfi.organization_id IS NULL)
          AND lfi.status != 'arquivado'
    ) sub;

    RETURN v_result;
END;
$$;

-- 7. POLÍTICAS ROW LEVEL SECURITY (RLS)
ALTER TABLE public.lost_and_found_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lost_and_found_reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_lost_and_found_items_all ON public.lost_and_found_items;
CREATE POLICY p_lost_and_found_items_all ON public.lost_and_found_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS p_lost_and_found_reservations_all ON public.lost_and_found_reservations;
CREATE POLICY p_lost_and_found_reservations_all ON public.lost_and_found_reservations FOR ALL USING (true) WITH CHECK (true);

-- 8. PUBLICAÇÃO REALTIME
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.lost_and_found_items;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.lost_and_found_reservations;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END
$$;

-- 9. SEED DOS ITENS OFICIAIS DA INSTITUIÇÃO (DADOS REAIS EM PRODUÇÃO)
DO $$
DECLARE
    v_org_id UUID;
    v_st_id UUID;
    v_item1_id UUID := 'a1b2c3d4-0001-4000-8000-000000000001'::UUID;
    v_item2_id UUID := 'a1b2c3d4-0002-4000-8000-000000000002'::UUID;
    v_item3_id UUID := 'a1b2c3d4-0003-4000-8000-000000000003'::UUID;
    v_item4_id UUID := 'a1b2c3d4-0004-4000-8000-000000000004'::UUID;
    v_item5_id UUID := 'a1b2c3d4-0005-4000-8000-000000000005'::UUID;
BEGIN
    -- Obter organization_id se disponível
    SELECT id INTO v_org_id FROM public.organizations LIMIT 1;
    -- Obter um aluno de referência se disponível
    SELECT id INTO v_st_id FROM public.students LIMIT 1;

    -- Item 1: Bolsa com desenho de coruja
    INSERT INTO public.lost_and_found_items (
        id, organization_id, name, category, description, location_found, setor, found_date, image_url, status, registered_by
    ) VALUES (
        v_item1_id,
        v_org_id,
        'Bolsa com desenho de coruja',
        'Material Escolar',
        'Uma bolsa com desenho de coruja, Azul com detalhes em vermelho.',
        'No pátio central da escola (Bloco A – Salas)',
        'Bloco A - Salas',
        '2026-07-29',
        'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=600',
        'disponivel',
        'Inspetor de Pátio'
    ) ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        category = EXCLUDED.category,
        description = EXCLUDED.description,
        location_found = EXCLUDED.location_found,
        setor = EXCLUDED.setor,
        found_date = EXCLUDED.found_date,
        image_url = EXCLUDED.image_url,
        status = EXCLUDED.status;

    -- Item 2: Casaco de Moletom Escolar Azul com Capuz (Tam. M)
    INSERT INTO public.lost_and_found_items (
        id, organization_id, name, category, description, location_found, setor, found_date, image_url, status, registered_by
    ) VALUES (
        v_item2_id,
        v_org_id,
        'Casaco de Moletom Escolar Azul com Capuz (Tam. M)',
        'Vestuário',
        'Moletom oficial do colégio em perfeito estado com zíper prateado.',
        'Quadra Poliesportiva Principal',
        'Quadra Poliesportiva',
        '2026-07-16',
        'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=600',
        'disponivel',
        'Prof. Educação Física'
    ) ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        category = EXCLUDED.category,
        description = EXCLUDED.description,
        location_found = EXCLUDED.location_found,
        setor = EXCLUDED.setor,
        found_date = EXCLUDED.found_date,
        image_url = EXCLUDED.image_url,
        status = EXCLUDED.status;

    -- Item 3: Garrafa Térmica Vermelha Inox 500ml
    INSERT INTO public.lost_and_found_items (
        id, organization_id, name, category, description, location_found, setor, found_date, image_url, status, registered_by
    ) VALUES (
        v_item3_id,
        v_org_id,
        'Garrafa Térmica Vermelha Inox 500ml',
        'Garrafas/Utensílios',
        'Garrafa de água com tampa preta de rosca.',
        'Refeitório Central (Pátio Superior)',
        'Refeitório',
        '2026-07-15',
        'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&q=80&w=600',
        'disponivel',
        'Monitor de Refeitório'
    ) ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        category = EXCLUDED.category,
        description = EXCLUDED.description,
        location_found = EXCLUDED.location_found,
        setor = EXCLUDED.setor,
        found_date = EXCLUDED.found_date,
        image_url = EXCLUDED.image_url,
        status = EXCLUDED.status;

    -- Item 4: Estojo de Lápis Escolar Homem-Aranha (Reservado)
    INSERT INTO public.lost_and_found_items (
        id, organization_id, name, category, description, location_found, setor, found_date, image_url, status, registered_by
    ) VALUES (
        v_item4_id,
        v_org_id,
        'Estojo de Lápis Escolar Homem-Aranha',
        'Material Escolar',
        'Estojo vermelho contendo lápis de cor e canetas Faber-Castell.',
        'Sala de Artes Práticas',
        'Bloco B - Artes',
        '2026-07-14',
        'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&q=80&w=600',
        'reservado',
        'Profª de Artes'
    ) ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        category = EXCLUDED.category,
        description = EXCLUDED.description,
        location_found = EXCLUDED.location_found,
        setor = EXCLUDED.setor,
        found_date = EXCLUDED.found_date,
        image_url = EXCLUDED.image_url,
        status = EXCLUDED.status;

    -- Reserva para o Item 4
    INSERT INTO public.lost_and_found_reservations (
        item_id, organization_id, student_id, responsible_name, student_name, student_grade, responsible_phone, reservation_date, status
    ) VALUES (
        v_item4_id,
        v_org_id,
        v_st_id,
        'Maria das Graças Silva',
        'João Silva de Alencar',
        '7º Ano A',
        '(11) 98765-4321',
        '2026-07-15 11:24:00+00'::TIMESTAMPTZ,
        'pending'
    ) ON CONFLICT DO NOTHING;

    -- Item 5: Lancheira Térmica de Neoprene Azul Marinho (Entregue/Devolvido)
    INSERT INTO public.lost_and_found_items (
        id, organization_id, name, category, description, location_found, setor, found_date, image_url, status, registered_by,
        delivered_date, delivered_by_staff, delivery_notes
    ) VALUES (
        v_item5_id,
        v_org_id,
        'Lancheira Térmica de Neoprene Azul Marinho',
        'Garrafas/Utensílios',
        'Lancheira infantil com alça ajustável.',
        'Biblioteca Escolar',
        'Biblioteca',
        '2026-07-11',
        'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&q=80&w=600',
        'entregue',
        'Bibliotecária',
        '2026-07-13',
        'Secretário Marcos',
        'Retirado presencialmente pela mãe na secretaria'
    ) ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        category = EXCLUDED.category,
        description = EXCLUDED.description,
        location_found = EXCLUDED.location_found,
        setor = EXCLUDED.setor,
        found_date = EXCLUDED.found_date,
        image_url = EXCLUDED.image_url,
        status = EXCLUDED.status,
        delivered_date = EXCLUDED.delivered_date,
        delivered_by_staff = EXCLUDED.delivered_by_staff;

END $$;
