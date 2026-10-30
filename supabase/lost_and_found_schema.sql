-- ====================================================================
-- ESQUEMA DE BANCO DE DADOS SUPABASE PARA ACHADOS E PERDIDOS DIGITAL
-- Título: Achados e Perdidos Digital - Classium Portal da Família & Gestão
-- ====================================================================

-- 1. TABELA DE ITENS ACHADOS E PERDIDOS (lost_and_found_items)
CREATE TABLE IF NOT EXISTS public.lost_and_found_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'MATERIAL ESCOLAR',
    image_url TEXT,
    found_location TEXT,
    found_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) CHECK (status IN ('available', 'reserved', 'returned', 'discarded', 'disponivel', 'reservado', 'entregue', 'arquivado')) NOT NULL DEFAULT 'available',
    registered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    registered_by_name TEXT DEFAULT 'Inspetor de Pátio / Secretaria',
    organization_id UUID DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE RESERVAS DE ITENS (lost_and_found_reservations)
CREATE TABLE IF NOT EXISTS public.lost_and_found_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES public.lost_and_found_items(id) ON DELETE CASCADE NOT NULL,
    reserved_by_responsible_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reserved_by_responsible_name TEXT NOT NULL,
    reserved_for_student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    reserved_for_student_name TEXT NOT NULL,
    responsible_phone TEXT,
    reservation_date TIMESTAMPTZ DEFAULT NOW(),
    pickup_date TIMESTAMPTZ,
    picked_up_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    picked_up_by_name TEXT,
    status VARCHAR(20) CHECK (status IN ('pending', 'picked_up', 'cancelled', 'reservado', 'entregue')) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_item_active_reservation UNIQUE (item_id)
);

-- 3. ÍNDICES DE BUSCA E PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_lost_found_status ON public.lost_and_found_items(status);
CREATE INDEX IF NOT EXISTS idx_lost_found_category ON public.lost_and_found_items(category);
CREATE INDEX IF NOT EXISTS idx_lost_found_date ON public.lost_and_found_items(found_date);
CREATE INDEX IF NOT EXISTS idx_lost_found_reservations_item ON public.lost_and_found_reservations(item_id);
CREATE INDEX IF NOT EXISTS idx_lost_found_reservations_responsible ON public.lost_and_found_reservations(reserved_by_responsible_id);

-- 4. STORAGE BUCKET DEDICADO "lost_and_found_images"
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lost_and_found_images', 
  'lost_and_found_images', 
  true, 
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880;

-- 5. POLÍTICAS DE SEGURANÇA (ROW LEVEL SECURITY - RLS)
ALTER TABLE public.lost_and_found_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lost_and_found_reservations ENABLE ROW LEVEL SECURITY;

-- POLICIES FOR lost_and_found_items
DROP POLICY IF EXISTS p_lost_found_items_select ON public.lost_and_found_items;
CREATE POLICY p_lost_found_items_select ON public.lost_and_found_items
    FOR SELECT USING (true);

DROP POLICY IF EXISTS p_lost_found_items_insert ON public.lost_and_found_items;
CREATE POLICY p_lost_found_items_insert ON public.lost_and_found_items
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS p_lost_found_items_update ON public.lost_and_found_items;
CREATE POLICY p_lost_found_items_update ON public.lost_and_found_items
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS p_lost_found_items_delete ON public.lost_and_found_items;
CREATE POLICY p_lost_found_items_delete ON public.lost_and_found_items
    FOR DELETE USING (true);

-- POLICIES FOR lost_and_found_reservations
DROP POLICY IF EXISTS p_lost_found_reservations_select ON public.lost_and_found_reservations;
CREATE POLICY p_lost_found_reservations_select ON public.lost_and_found_reservations
    FOR SELECT USING (true);

DROP POLICY IF EXISTS p_lost_found_reservations_insert ON public.lost_and_found_reservations;
CREATE POLICY p_lost_found_reservations_insert ON public.lost_and_found_reservations
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS p_lost_found_reservations_update ON public.lost_and_found_reservations;
CREATE POLICY p_lost_found_reservations_update ON public.lost_and_found_reservations
    FOR UPDATE USING (true);

-- STORAGE BUCKET POLICIES
DROP POLICY IF EXISTS p_storage_lost_found_select ON storage.objects;
CREATE POLICY p_storage_lost_found_select ON storage.objects
    FOR SELECT USING (bucket_id = 'lost_and_found_images');

DROP POLICY IF EXISTS p_storage_lost_found_insert ON storage.objects;
CREATE POLICY p_storage_lost_found_insert ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'lost_and_found_images');

-- 6. PUBLICAÇÃO SUPABASE REALTIME
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
