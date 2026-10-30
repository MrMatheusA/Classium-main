-- ============================================================================
-- CLASSIUM EDUCACIONAL - MIGRATION 0080
-- INTEGRAÇÃO COMPLETA: MÓDULO ACHADOS & PERDIDOS (GESTOR & FAMÍLIA)
-- BANCO DE DADOS SUPABASE, RLS, STORAGE & REALTIME WEBSOCKETS
-- ============================================================================

-- 1. TABELA PRINCIPAL DE ITENS ACHADOS E PERDIDOS
CREATE TABLE IF NOT EXISTS public.lost_and_found_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    school_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    name TEXT NOT NULL DEFAULT 'Objeto Encontrado',
    title TEXT,
    item_name TEXT,
    category TEXT NOT NULL DEFAULT 'Material Escolar',
    description TEXT,
    location_found TEXT NOT NULL DEFAULT 'Pátio Central',
    found_location TEXT,
    setor TEXT DEFAULT 'Geral',
    found_date DATE NOT NULL DEFAULT CURRENT_DATE,
    date_found DATE DEFAULT CURRENT_DATE,
    found_time TEXT DEFAULT '10:00',
    image_url TEXT,
    photo_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'disponivel',
    registered_by TEXT DEFAULT 'Inspetor de Pátio / Secretaria',
    registered_by_name TEXT,
    claimed_by_name TEXT,
    claimed_by_student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    claimed_at TIMESTAMPTZ,
    delivered_date DATE,
    delivered_by TEXT,
    delivered_by_staff TEXT,
    delivery_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Garantir todas as colunas de compatibilidade
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lost_and_found_items' AND column_name = 'organization_id') THEN
        ALTER TABLE public.lost_and_found_items ADD COLUMN organization_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lost_and_found_items' AND column_name = 'school_id') THEN
        ALTER TABLE public.lost_and_found_items ADD COLUMN school_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lost_and_found_items' AND column_name = 'name') THEN
        ALTER TABLE public.lost_and_found_items ADD COLUMN name TEXT DEFAULT 'Objeto Encontrado';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lost_and_found_items' AND column_name = 'title') THEN
        ALTER TABLE public.lost_and_found_items ADD COLUMN title TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lost_and_found_items' AND column_name = 'item_name') THEN
        ALTER TABLE public.lost_and_found_items ADD COLUMN item_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lost_and_found_items' AND column_name = 'category') THEN
        ALTER TABLE public.lost_and_found_items ADD COLUMN category TEXT DEFAULT 'Material Escolar';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lost_and_found_items' AND column_name = 'location_found') THEN
        ALTER TABLE public.lost_and_found_items ADD COLUMN location_found TEXT DEFAULT 'Pátio Central';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lost_and_found_items' AND column_name = 'found_location') THEN
        ALTER TABLE public.lost_and_found_items ADD COLUMN found_location TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lost_and_found_items' AND column_name = 'setor') THEN
        ALTER TABLE public.lost_and_found_items ADD COLUMN setor TEXT DEFAULT 'Geral';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lost_and_found_items' AND column_name = 'found_date') THEN
        ALTER TABLE public.lost_and_found_items ADD COLUMN found_date DATE DEFAULT CURRENT_DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lost_and_found_items' AND column_name = 'date_found') THEN
        ALTER TABLE public.lost_and_found_items ADD COLUMN date_found DATE DEFAULT CURRENT_DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lost_and_found_items' AND column_name = 'found_time') THEN
        ALTER TABLE public.lost_and_found_items ADD COLUMN found_time TEXT DEFAULT '10:00';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lost_and_found_items' AND column_name = 'image_url') THEN
        ALTER TABLE public.lost_and_found_items ADD COLUMN image_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lost_and_found_items' AND column_name = 'photo_url') THEN
        ALTER TABLE public.lost_and_found_items ADD COLUMN photo_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lost_and_found_items' AND column_name = 'claimed_by_name') THEN
        ALTER TABLE public.lost_and_found_items ADD COLUMN claimed_by_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lost_and_found_items' AND column_name = 'claimed_by_student_id') THEN
        ALTER TABLE public.lost_and_found_items ADD COLUMN claimed_by_student_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lost_and_found_items' AND column_name = 'claimed_at') THEN
        ALTER TABLE public.lost_and_found_items ADD COLUMN claimed_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lost_and_found_items' AND column_name = 'delivered_date') THEN
        ALTER TABLE public.lost_and_found_items ADD COLUMN delivered_date DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lost_and_found_items' AND column_name = 'delivered_by') THEN
        ALTER TABLE public.lost_and_found_items ADD COLUMN delivered_by TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lost_and_found_items' AND column_name = 'delivered_by_staff') THEN
        ALTER TABLE public.lost_and_found_items ADD COLUMN delivered_by_staff TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lost_and_found_items' AND column_name = 'delivery_notes') THEN
        ALTER TABLE public.lost_and_found_items ADD COLUMN delivery_notes TEXT;
    END IF;
END $$;

-- 2. TABELA DE RESERVAS DE ITENS (lost_and_found_reservations)
CREATE TABLE IF NOT EXISTS public.lost_and_found_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    school_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    item_id UUID REFERENCES public.lost_and_found_items(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    guardian_profile_id UUID,
    responsible_name TEXT NOT NULL,
    student_name TEXT NOT NULL,
    student_grade TEXT,
    responsible_phone TEXT,
    reservation_date TIMESTAMPTZ DEFAULT now(),
    pickup_date TIMESTAMPTZ,
    picked_up_by UUID,
    picked_up_by_name TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_item_active_reservation UNIQUE (item_id)
);

-- Garantir colunas adicionais em lost_and_found_reservations
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lost_and_found_reservations' AND column_name = 'organization_id') THEN
        ALTER TABLE public.lost_and_found_reservations ADD COLUMN organization_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lost_and_found_reservations' AND column_name = 'school_id') THEN
        ALTER TABLE public.lost_and_found_reservations ADD COLUMN school_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lost_and_found_reservations' AND column_name = 'guardian_profile_id') THEN
        ALTER TABLE public.lost_and_found_reservations ADD COLUMN guardian_profile_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lost_and_found_reservations' AND column_name = 'student_grade') THEN
        ALTER TABLE public.lost_and_found_reservations ADD COLUMN student_grade TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lost_and_found_reservations' AND column_name = 'responsible_phone') THEN
        ALTER TABLE public.lost_and_found_reservations ADD COLUMN responsible_phone TEXT;
    END IF;
END $$;

-- 3. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_lost_found_items_org ON public.lost_and_found_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_lost_found_items_school ON public.lost_and_found_items(school_id);
CREATE INDEX IF NOT EXISTS idx_lost_found_items_status ON public.lost_and_found_items(status);
CREATE INDEX IF NOT EXISTS idx_lost_found_items_category ON public.lost_and_found_items(category);
CREATE INDEX IF NOT EXISTS idx_lost_found_items_date ON public.lost_and_found_items(found_date);
CREATE INDEX IF NOT EXISTS idx_lost_found_reservations_item ON public.lost_and_found_reservations(item_id);
CREATE INDEX IF NOT EXISTS idx_lost_found_reservations_student ON public.lost_and_found_reservations(student_id);

-- 4. BUCKET DE STORAGE PARA FOTOS DE ACHADOS E PERDIDOS
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lost_and_found_images', 
  'lost_and_found_images', 
  true, 
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760;

-- 5. POLÍTICAS RLS (TABELAS E STORAGE)
ALTER TABLE public.lost_and_found_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lost_and_found_reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_lost_and_found_items_all ON public.lost_and_found_items;
CREATE POLICY p_lost_and_found_items_all ON public.lost_and_found_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS p_lost_and_found_reservations_all ON public.lost_and_found_reservations;
CREATE POLICY p_lost_and_found_reservations_all ON public.lost_and_found_reservations FOR ALL USING (true) WITH CHECK (true);

-- Storage Policies
DROP POLICY IF EXISTS p_storage_lost_found_select ON storage.objects;
CREATE POLICY p_storage_lost_found_select ON storage.objects
    FOR SELECT USING (bucket_id = 'lost_and_found_images');

DROP POLICY IF EXISTS p_storage_lost_found_insert ON storage.objects;
CREATE POLICY p_storage_lost_found_insert ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'lost_and_found_images');

DROP POLICY IF EXISTS p_storage_lost_found_update ON storage.objects;
CREATE POLICY p_storage_lost_found_update ON storage.objects
    FOR UPDATE USING (bucket_id = 'lost_and_found_images');

-- 6. RPC ATÔMICAS
CREATE OR REPLACE FUNCTION public.reserve_lost_and_found_item_atomic(
    p_item_id UUID,
    p_student_id UUID DEFAULT NULL,
    p_guardian_profile_id UUID DEFAULT NULL,
    p_responsible_name TEXT DEFAULT 'Responsável Legal',
    p_student_name TEXT DEFAULT 'Aluno',
    p_student_grade TEXT DEFAULT '',
    p_responsible_phone TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item RECORD;
    v_reservation_id UUID;
    v_claim_text TEXT;
BEGIN
    SELECT * INTO v_item
    FROM public.lost_and_found_items
    WHERE id = p_item_id;

    IF v_item.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Item não encontrado no catálogo.');
    END IF;

    v_claim_text := p_student_name || ' (' || COALESCE(p_student_grade, '') || ') - Solicitado por ' || p_responsible_name || ' - Tel: ' || COALESCE(p_responsible_phone, '');

    -- Atualizar item
    UPDATE public.lost_and_found_items
    SET 
        status = 'reservado',
        claimed_by_name = v_claim_text,
        claimed_by_student_id = p_student_id,
        claimed_at = now(),
        updated_at = now()
    WHERE id = p_item_id;

    -- Upsert na tabela de reservas
    INSERT INTO public.lost_and_found_reservations (
        organization_id,
        school_id,
        item_id,
        student_id,
        guardian_profile_id,
        responsible_name,
        student_name,
        student_grade,
        responsible_phone,
        reservation_date,
        status,
        created_at,
        updated_at
    ) VALUES (
        COALESCE(v_item.organization_id, v_item.school_id),
        COALESCE(v_item.school_id, v_item.organization_id),
        p_item_id,
        p_student_id,
        p_guardian_profile_id,
        p_responsible_name,
        p_student_name,
        p_student_grade,
        p_responsible_phone,
        now(),
        'pending',
        now(),
        now()
    )
    ON CONFLICT (item_id) DO UPDATE SET
        student_id = EXCLUDED.student_id,
        guardian_profile_id = EXCLUDED.guardian_profile_id,
        responsible_name = EXCLUDED.responsible_name,
        student_name = EXCLUDED.student_name,
        student_grade = EXCLUDED.student_grade,
        responsible_phone = EXCLUDED.responsible_phone,
        reservation_date = now(),
        status = 'pending',
        updated_at = now()
    RETURNING id INTO v_reservation_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Reserva efetuada com sucesso!',
        'reservation_id', v_reservation_id,
        'item_id', p_item_id
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.deliver_lost_and_found_item_atomic(
    p_item_id UUID,
    p_staff_name TEXT DEFAULT 'Secretaria Responsável',
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
        delivered_by = p_staff_name,
        delivered_by_staff = p_staff_name,
        delivery_notes = p_delivery_notes,
        updated_at = now()
    WHERE id = p_item_id;

    UPDATE public.lost_and_found_reservations
    SET 
        status = 'confirmed',
        pickup_date = now(),
        picked_up_by_name = p_staff_name,
        updated_at = now()
    WHERE item_id = p_item_id;

    RETURN jsonb_build_object('success', true, 'message', 'Item marcado como devolvido na secretaria.');
END;
$$;

-- 7. PUBLICAÇÃO REALTIME
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
