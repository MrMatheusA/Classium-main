-- ====================================================================
-- EDUCA+ ERP EDUCACIONAL — MISSING MODULES PART 2
-- FOOD MENUS AND LOST & FOUND
-- ====================================================================

-- ALIMENTAÇÃO ESCOLAR (Food Menus)
CREATE TABLE IF NOT EXISTS public.food_menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    menu_date DATE NOT NULL,
    meal_type VARCHAR(100), -- 'BREAKFAST', 'LUNCH', 'SNACK', 'DINNER'
    items JSONB DEFAULT '[]'::jsonb,
    nutritional_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_food_menus_school_id ON public.food_menus(school_id);
CREATE INDEX IF NOT EXISTS idx_food_menus_date ON public.food_menus(menu_date);

ALTER TABLE public.food_menus ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_food_menus_select ON public.food_menus;
CREATE POLICY p_food_menus_select ON public.food_menus
    FOR SELECT USING (
        school_id IN (
            SELECT school_id FROM public.user_roles WHERE user_id = auth.uid()
        ) OR public.has_role(auth.uid(), 'Educa+Admin')
    );

DROP POLICY IF EXISTS p_food_menus_all ON public.food_menus;
CREATE POLICY p_food_menus_all ON public.food_menus
    FOR ALL USING (
        public.has_role(auth.uid(), 'Educa+Admin') OR
        public.has_role(auth.uid(), 'Educa+Nutricionista') OR
        public.has_role(auth.uid(), 'Educa+Gestor')
    );


-- ACHADOS E PERDIDOS (Lost and Found)
CREATE TABLE IF NOT EXISTS public.lost_and_found (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- 'CLOTHING', 'ELECTRONICS', 'BOOKS', 'OTHER'
    location_found VARCHAR(255),
    date_found DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'LOST', -- 'LOST', 'CLAIMED', 'DONATED'
    claimed_by UUID REFERENCES public.system_profiles(id) ON DELETE SET NULL,
    claimed_at TIMESTAMP WITH TIME ZONE,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_lost_and_found_school_id ON public.lost_and_found(school_id);
CREATE INDEX IF NOT EXISTS idx_lost_and_found_status ON public.lost_and_found(status);

ALTER TABLE public.lost_and_found ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_lost_and_found_select ON public.lost_and_found;
CREATE POLICY p_lost_and_found_select ON public.lost_and_found
    FOR SELECT USING (
        school_id IN (
            SELECT school_id FROM public.user_roles WHERE user_id = auth.uid()
        ) OR public.has_role(auth.uid(), 'Educa+Admin')
    );

DROP POLICY IF EXISTS p_lost_and_found_all ON public.lost_and_found;
CREATE POLICY p_lost_and_found_all ON public.lost_and_found
    FOR ALL USING (
        public.has_role(auth.uid(), 'Educa+Admin') OR
        public.has_role(auth.uid(), 'Educa+Portaria') OR
        public.has_role(auth.uid(), 'Educa+Gestor')
    );

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trg_food_menus_updated_at ON public.food_menus;
CREATE TRIGGER trg_food_menus_updated_at BEFORE UPDATE ON public.food_menus FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_lost_and_found_updated_at ON public.lost_and_found;
CREATE TRIGGER trg_lost_and_found_updated_at BEFORE UPDATE ON public.lost_and_found FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
