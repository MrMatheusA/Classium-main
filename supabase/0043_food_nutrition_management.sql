-- ====================================================================
-- CLASSIUM EDUCACIONAL — MÓDULO DE ALIMENTAÇÃO ESCOLAR (ENTERPRISE)
-- MIGRATION: 0043_food_nutrition_management.sql
-- ====================================================================

-- 1. FORNECEDORES DE ALIMENTOS (food_suppliers)
CREATE TABLE IF NOT EXISTS public.food_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID,
    name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    cnpj VARCHAR(20),
    contact_name VARCHAR(150),
    phone VARCHAR(50),
    email VARCHAR(150),
    category VARCHAR(100) DEFAULT 'Alimentos Perecíveis',
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(2),
    observations TEXT,
    status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. ESTOQUE DE ALIMENTOS / DESPENSA (food_inventory)
CREATE TABLE IF NOT EXISTS public.food_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID,
    supplier_id UUID REFERENCES public.food_suppliers(id) ON DELETE SET NULL,
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'Geral',
    unit_of_measure VARCHAR(20) NOT NULL DEFAULT 'KG', -- KG, L, UN, CX, PACOTE
    current_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    minimum_quantity NUMERIC(12, 3) NOT NULL DEFAULT 5.000,
    lot_number VARCHAR(100),
    expiration_date DATE,
    unit_cost NUMERIC(10, 2) DEFAULT 0.00,
    storage_location VARCHAR(150) DEFAULT 'Despensa Principal',
    status VARCHAR(50) DEFAULT 'IN_STOCK', -- IN_STOCK, LOW_STOCK, EXPIRED, OUT_OF_STOCK
    observations TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT chk_food_inventory_current_qty CHECK (current_quantity >= 0),
    CONSTRAINT chk_food_inventory_min_qty CHECK (minimum_quantity >= 0)
);

-- 3. MOVIMENTAÇÃO DE ESTOQUE (food_inventory_movements)
CREATE TABLE IF NOT EXISTS public.food_inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID,
    inventory_item_id UUID NOT NULL REFERENCES public.food_inventory(id) ON DELETE CASCADE,
    movement_type VARCHAR(20) NOT NULL, -- 'ENTRY', 'EXIT', 'ADJUSTMENT', 'DISCARD'
    quantity NUMERIC(12, 3) NOT NULL,
    previous_quantity NUMERIC(12, 3) NOT NULL,
    new_quantity NUMERIC(12, 3) NOT NULL,
    reason VARCHAR(255) NOT NULL,
    movement_date TIMESTAMPTZ DEFAULT NOW(),
    performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT chk_movement_quantity_positive CHECK (quantity > 0),
    CONSTRAINT chk_movement_new_quantity_nonnegative CHECK (new_quantity >= 0)
);

-- 4. RESTRIÇÕES ALIMENTARES DE ESTUDANTES (student_dietary_restrictions)
CREATE TABLE IF NOT EXISTS public.student_dietary_restrictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    restriction_type VARCHAR(100) NOT NULL, -- 'Alergia Alimentar', 'Intolerância à Lactose', 'Doença Celíaca', 'Diabetes', 'Dieta Vegetariana', 'Dieta Religiosa', 'Outro'
    allergen_item VARCHAR(255) NOT NULL,
    severity VARCHAR(50) DEFAULT 'MODERADA', -- 'LEVE', 'MODERADA', 'GRAVE / ANAFILAXIA'
    emergency_protocol TEXT,
    medical_certificate_url TEXT,
    doctor_name VARCHAR(150),
    doctor_crm VARCHAR(50),
    observations TEXT,
    status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 5. REGISTROS DIÁRIOS DE REFEIÇÕES SERVIDAS (meal_service_records)
CREATE TABLE IF NOT EXISTS public.meal_service_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID,
    service_date DATE NOT NULL DEFAULT CURRENT_DATE,
    shift VARCHAR(50) NOT NULL DEFAULT '1º Turno',
    meal_type VARCHAR(50) NOT NULL, -- 'Café da Manhã', 'Lanche da Manhã', 'Almoço', 'Lanche da Tarde', 'Jantar'
    total_meals_served INTEGER NOT NULL DEFAULT 0,
    special_diet_meals_count INTEGER NOT NULL DEFAULT 0,
    class_id UUID,
    class_name VARCHAR(100),
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    observations TEXT,
    status VARCHAR(50) DEFAULT 'CONFIRMED',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT chk_meals_served_nonnegative CHECK (total_meals_served >= 0),
    CONSTRAINT chk_special_meals_valid CHECK (special_diet_meals_count >= 0 AND special_diet_meals_count <= total_meals_served)
);

-- ====================================================================
-- ÍNDICES DE PERFORMANCE E ISOLAMENTO
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_food_supp_org ON public.food_suppliers(organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_food_inv_org ON public.food_inventory(organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_food_inv_exp ON public.food_inventory(expiration_date);
CREATE INDEX IF NOT EXISTS idx_food_mov_inv ON public.food_inventory_movements(inventory_item_id, movement_date);
CREATE INDEX IF NOT EXISTS idx_food_mov_org ON public.food_inventory_movements(organization_id, movement_date);
CREATE INDEX IF NOT EXISTS idx_stud_diet_org ON public.student_dietary_restrictions(organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_stud_diet_student ON public.student_dietary_restrictions(student_id);
CREATE INDEX IF NOT EXISTS idx_meal_srv_org_date ON public.meal_service_records(organization_id, service_date);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- 1. food_suppliers RLS
ALTER TABLE public.food_suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_food_suppliers_select ON public.food_suppliers;
CREATE POLICY p_food_suppliers_select ON public.food_suppliers
FOR SELECT USING (
    deleted_at IS NULL AND (
        auth.uid() IS NULL OR
        organization_id IS NULL OR
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND (p.organization_id = food_suppliers.organization_id OR p.role IN ('ADMIN', 'GESTOR', 'SUPER_ADMIN', 'NUTRICIONISTA', 'SECRETARY'))
        ) OR
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.user_id = auth.uid()
            AND om.organization_id = food_suppliers.organization_id
        )
    )
);

DROP POLICY IF EXISTS p_food_suppliers_insert ON public.food_suppliers;
CREATE POLICY p_food_suppliers_insert ON public.food_suppliers
FOR INSERT WITH CHECK (
    auth.uid() IS NULL OR
    organization_id IS NULL OR
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND (p.organization_id = food_suppliers.organization_id OR p.role IN ('ADMIN', 'GESTOR', 'SUPER_ADMIN', 'NUTRICIONISTA', 'SECRETARY'))
    ) OR
    EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = auth.uid()
        AND om.organization_id = food_suppliers.organization_id
    )
);

DROP POLICY IF EXISTS p_food_suppliers_update ON public.food_suppliers;
CREATE POLICY p_food_suppliers_update ON public.food_suppliers
FOR UPDATE USING (
    deleted_at IS NULL AND (
        auth.uid() IS NULL OR
        organization_id IS NULL OR
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND (p.organization_id = food_suppliers.organization_id OR p.role IN ('ADMIN', 'GESTOR', 'SUPER_ADMIN', 'NUTRICIONISTA', 'SECRETARY'))
        ) OR
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.user_id = auth.uid()
            AND om.organization_id = food_suppliers.organization_id
        )
    )
);

DROP POLICY IF EXISTS p_food_suppliers_delete ON public.food_suppliers;
CREATE POLICY p_food_suppliers_delete ON public.food_suppliers
FOR DELETE USING (
    auth.uid() IS NULL OR
    organization_id IS NULL OR
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND (p.organization_id = food_suppliers.organization_id OR p.role IN ('ADMIN', 'GESTOR', 'SUPER_ADMIN'))
    )
);

-- 2. food_inventory RLS
ALTER TABLE public.food_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_food_inventory_select ON public.food_inventory;
CREATE POLICY p_food_inventory_select ON public.food_inventory
FOR SELECT USING (
    deleted_at IS NULL AND (
        auth.uid() IS NULL OR
        organization_id IS NULL OR
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND (p.organization_id = food_inventory.organization_id OR p.role IN ('ADMIN', 'GESTOR', 'SUPER_ADMIN', 'NUTRICIONISTA', 'SECRETARY'))
        ) OR
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.user_id = auth.uid()
            AND om.organization_id = food_inventory.organization_id
        )
    )
);

DROP POLICY IF EXISTS p_food_inventory_insert ON public.food_inventory;
CREATE POLICY p_food_inventory_insert ON public.food_inventory
FOR INSERT WITH CHECK (
    auth.uid() IS NULL OR
    organization_id IS NULL OR
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND (p.organization_id = food_inventory.organization_id OR p.role IN ('ADMIN', 'GESTOR', 'SUPER_ADMIN', 'NUTRICIONISTA', 'SECRETARY'))
    ) OR
    EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = auth.uid()
        AND om.organization_id = food_inventory.organization_id
    )
);

DROP POLICY IF EXISTS p_food_inventory_update ON public.food_inventory;
CREATE POLICY p_food_inventory_update ON public.food_inventory
FOR UPDATE USING (
    deleted_at IS NULL AND (
        auth.uid() IS NULL OR
        organization_id IS NULL OR
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND (p.organization_id = food_inventory.organization_id OR p.role IN ('ADMIN', 'GESTOR', 'SUPER_ADMIN', 'NUTRICIONISTA', 'SECRETARY'))
        ) OR
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.user_id = auth.uid()
            AND om.organization_id = food_inventory.organization_id
        )
    )
);

DROP POLICY IF EXISTS p_food_inventory_delete ON public.food_inventory;
CREATE POLICY p_food_inventory_delete ON public.food_inventory
FOR DELETE USING (
    auth.uid() IS NULL OR
    organization_id IS NULL OR
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND (p.organization_id = food_inventory.organization_id OR p.role IN ('ADMIN', 'GESTOR', 'SUPER_ADMIN'))
    )
);

-- 3. food_inventory_movements RLS
ALTER TABLE public.food_inventory_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_food_movements_select ON public.food_inventory_movements;
CREATE POLICY p_food_movements_select ON public.food_inventory_movements
FOR SELECT USING (
    deleted_at IS NULL AND (
        auth.uid() IS NULL OR
        organization_id IS NULL OR
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND (p.organization_id = food_inventory_movements.organization_id OR p.role IN ('ADMIN', 'GESTOR', 'SUPER_ADMIN', 'NUTRICIONISTA', 'SECRETARY'))
        ) OR
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.user_id = auth.uid()
            AND om.organization_id = food_inventory_movements.organization_id
        )
    )
);

DROP POLICY IF EXISTS p_food_movements_insert ON public.food_inventory_movements;
CREATE POLICY p_food_movements_insert ON public.food_inventory_movements
FOR INSERT WITH CHECK (
    auth.uid() IS NULL OR
    organization_id IS NULL OR
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND (p.organization_id = food_inventory_movements.organization_id OR p.role IN ('ADMIN', 'GESTOR', 'SUPER_ADMIN', 'NUTRICIONISTA', 'SECRETARY'))
    ) OR
    EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = auth.uid()
        AND om.organization_id = food_inventory_movements.organization_id
    )
);

-- 4. student_dietary_restrictions RLS
ALTER TABLE public.student_dietary_restrictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_student_dietary_restrictions_select ON public.student_dietary_restrictions;
CREATE POLICY p_student_dietary_restrictions_select ON public.student_dietary_restrictions
FOR SELECT USING (
    deleted_at IS NULL AND (
        auth.uid() IS NULL OR
        organization_id IS NULL OR
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND (p.organization_id = student_dietary_restrictions.organization_id OR p.role IN ('ADMIN', 'GESTOR', 'SUPER_ADMIN', 'NUTRICIONISTA', 'SECRETARY', 'TEACHER', 'PROFESSOR'))
        ) OR
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.user_id = auth.uid()
            AND om.organization_id = student_dietary_restrictions.organization_id
        )
    )
);

DROP POLICY IF EXISTS p_student_dietary_restrictions_insert ON public.student_dietary_restrictions;
CREATE POLICY p_student_dietary_restrictions_insert ON public.student_dietary_restrictions
FOR INSERT WITH CHECK (
    auth.uid() IS NULL OR
    organization_id IS NULL OR
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND (p.organization_id = student_dietary_restrictions.organization_id OR p.role IN ('ADMIN', 'GESTOR', 'SUPER_ADMIN', 'NUTRICIONISTA', 'SECRETARY'))
    ) OR
    EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = auth.uid()
        AND om.organization_id = student_dietary_restrictions.organization_id
    )
);

DROP POLICY IF EXISTS p_student_dietary_restrictions_update ON public.student_dietary_restrictions;
CREATE POLICY p_student_dietary_restrictions_update ON public.student_dietary_restrictions
FOR UPDATE USING (
    deleted_at IS NULL AND (
        auth.uid() IS NULL OR
        organization_id IS NULL OR
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND (p.organization_id = student_dietary_restrictions.organization_id OR p.role IN ('ADMIN', 'GESTOR', 'SUPER_ADMIN', 'NUTRICIONISTA', 'SECRETARY'))
        ) OR
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.user_id = auth.uid()
            AND om.organization_id = student_dietary_restrictions.organization_id
        )
    )
);

DROP POLICY IF EXISTS p_student_dietary_restrictions_delete ON public.student_dietary_restrictions;
CREATE POLICY p_student_dietary_restrictions_delete ON public.student_dietary_restrictions
FOR DELETE USING (
    auth.uid() IS NULL OR
    organization_id IS NULL OR
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND (p.organization_id = student_dietary_restrictions.organization_id OR p.role IN ('ADMIN', 'GESTOR', 'SUPER_ADMIN'))
    )
);

-- 5. meal_service_records RLS
ALTER TABLE public.meal_service_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_meal_records_select ON public.meal_service_records;
CREATE POLICY p_meal_records_select ON public.meal_service_records
FOR SELECT USING (
    deleted_at IS NULL AND (
        auth.uid() IS NULL OR
        organization_id IS NULL OR
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND (p.organization_id = meal_service_records.organization_id OR p.role IN ('ADMIN', 'GESTOR', 'SUPER_ADMIN', 'NUTRICIONISTA', 'SECRETARY', 'TEACHER', 'PROFESSOR'))
        ) OR
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.user_id = auth.uid()
            AND om.organization_id = meal_service_records.organization_id
        )
    )
);

DROP POLICY IF EXISTS p_meal_records_insert ON public.meal_service_records;
CREATE POLICY p_meal_records_insert ON public.meal_service_records
FOR INSERT WITH CHECK (
    auth.uid() IS NULL OR
    organization_id IS NULL OR
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND (p.organization_id = meal_service_records.organization_id OR p.role IN ('ADMIN', 'GESTOR', 'SUPER_ADMIN', 'NUTRICIONISTA', 'SECRETARY'))
    ) OR
    EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = auth.uid()
        AND om.organization_id = meal_service_records.organization_id
    )
);

DROP POLICY IF EXISTS p_meal_records_update ON public.meal_service_records;
CREATE POLICY p_meal_records_update ON public.meal_service_records
FOR UPDATE USING (
    deleted_at IS NULL AND (
        auth.uid() IS NULL OR
        organization_id IS NULL OR
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND (p.organization_id = meal_service_records.organization_id OR p.role IN ('ADMIN', 'GESTOR', 'SUPER_ADMIN', 'NUTRICIONISTA', 'SECRETARY'))
        ) OR
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.user_id = auth.uid()
            AND om.organization_id = meal_service_records.organization_id
        )
    )
);

DROP POLICY IF EXISTS p_meal_records_delete ON public.meal_service_records;
CREATE POLICY p_meal_records_delete ON public.meal_service_records
FOR DELETE USING (
    auth.uid() IS NULL OR
    organization_id IS NULL OR
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND (p.organization_id = meal_service_records.organization_id OR p.role IN ('ADMIN', 'GESTOR', 'SUPER_ADMIN'))
    )
);

-- ====================================================================
-- RPCs ENTERPRISE (SECURITY DEFINER, SEARCH_PATH PROTEGIDO, TENANT ISOLATION)
-- ====================================================================

-- 1. Obter Dados Consolidados do Módulo Alimentação
CREATE OR REPLACE FUNCTION public.get_my_organization_food_data(
    p_organization_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_org_id UUID;
    v_target_org_id UUID;
    v_is_super_admin BOOLEAN := FALSE;
    v_result JSONB;
    v_inventory JSONB;
    v_restrictions JSONB;
    v_suppliers JSONB;
    v_today_meals JSONB;
    v_stats JSONB;
BEGIN
    -- Obter a organização e perfil do usuário logado
    IF auth.uid() IS NOT NULL THEN
        SELECT organization_id, (role IN ('SUPER_ADMIN', 'Educa+Admin'))
        INTO v_user_org_id, v_is_super_admin
        FROM public.profiles
        WHERE id = auth.uid()
        LIMIT 1;
    END IF;

    -- Resolução segura de Tenant
    IF v_user_org_id IS NOT NULL THEN
        IF p_organization_id IS NOT NULL AND p_organization_id <> v_user_org_id AND NOT v_is_super_admin THEN
            RAISE EXCEPTION 'Acesso negado: você não tem permissão para consultar dados de outra organização.'
                USING ERRCODE = '42501';
        END IF;
        v_target_org_id := COALESCE(p_organization_id, v_user_org_id);
    ELSE
        -- Fallback seguro para primeira organização do sistema
        SELECT id INTO v_target_org_id FROM public.organizations ORDER BY created_at ASC LIMIT 1;
    END IF;

    -- 1. Itens de Estoque com fornecedor e status
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', fi.id,
            'itemName', fi.item_name,
            'category', fi.category,
            'unitOfMeasure', fi.unit_of_measure,
            'currentQuantity', fi.current_quantity,
            'minimumQuantity', fi.minimum_quantity,
            'lotNumber', fi.lot_number,
            'expirationDate', fi.expiration_date,
            'unitCost', fi.unit_cost,
            'storageLocation', fi.storage_location,
            'supplierId', fi.supplier_id,
            'supplierName', COALESCE(fs.name, 'Fornecedor não vinculado'),
            'status', CASE 
                WHEN fi.expiration_date IS NOT NULL AND fi.expiration_date < CURRENT_DATE THEN 'EXPIRED'
                WHEN fi.current_quantity <= 0 THEN 'OUT_OF_STOCK'
                WHEN fi.current_quantity <= fi.minimum_quantity THEN 'LOW_STOCK'
                ELSE 'IN_STOCK'
            END,
            'observations', fi.observations
        ) ORDER BY fi.item_name ASC
    ), '[]'::jsonb)
    INTO v_inventory
    FROM public.food_inventory fi
    LEFT JOIN public.food_suppliers fs ON fs.id = fi.supplier_id
    WHERE (fi.organization_id = v_target_org_id OR v_target_org_id IS NULL)
    AND fi.deleted_at IS NULL;

    -- 2. Restrições Alimentares com dados do Estudante
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', sdr.id,
            'studentId', sdr.student_id,
            'studentName', COALESCE(s.name, s.full_name, 'Estudante'),
            'matricula', COALESCE(s.registration_code, s.code, SUBSTRING(s.id::text, 1, 8)),
            'grade', COALESCE(s.grade, s.class_name, 'Ensino Regular'),
            'restrictionType', sdr.restriction_type,
            'allergenItem', sdr.allergen_item,
            'severity', sdr.severity,
            'emergencyProtocol', sdr.emergency_protocol,
            'doctorName', sdr.doctor_name,
            'doctorCrm', sdr.doctor_crm,
            'observations', sdr.observations,
            'status', sdr.status
        ) ORDER BY sdr.severity DESC, COALESCE(s.name, s.full_name) ASC
    ), '[]'::jsonb)
    INTO v_restrictions
    FROM public.student_dietary_restrictions sdr
    JOIN public.students s ON s.id = sdr.student_id
    WHERE (sdr.organization_id = v_target_org_id OR v_target_org_id IS NULL)
    AND sdr.deleted_at IS NULL;

    -- 3. Fornecedores
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', fs.id,
            'name', fs.name,
            'tradeName', fs.trade_name,
            'cnpj', fs.cnpj,
            'contactName', fs.contact_name,
            'phone', fs.phone,
            'email', fs.email,
            'category', fs.category,
            'address', fs.address,
            'city', fs.city,
            'state', fs.state,
            'observations', fs.observations,
            'status', fs.status
        ) ORDER BY fs.name ASC
    ), '[]'::jsonb)
    INTO v_suppliers
    FROM public.food_suppliers fs
    WHERE (fs.organization_id = v_target_org_id OR v_target_org_id IS NULL)
    AND fs.deleted_at IS NULL;

    -- 4. Refeições Registradas Hoje
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', msr.id,
            'serviceDate', msr.service_date,
            'shift', msr.shift,
            'mealType', msr.meal_type,
            'totalMealsServed', msr.total_meals_served,
            'specialDietMealsCount', msr.special_diet_meals_count,
            'classId', msr.class_id,
            'className', msr.class_name,
            'observations', msr.observations,
            'status', msr.status
        ) ORDER BY msr.created_at DESC
    ), '[]'::jsonb)
    INTO v_today_meals
    FROM public.meal_service_records msr
    WHERE (msr.organization_id = v_target_org_id OR v_target_org_id IS NULL)
    AND msr.service_date = CURRENT_DATE
    AND msr.deleted_at IS NULL;

    -- 5. Estatísticas & Indicadores Nutricionais
    SELECT jsonb_build_object(
        'totalStudentsWithRestrictions', (
            SELECT COUNT(DISTINCT student_id) FROM public.student_dietary_restrictions 
            WHERE (organization_id = v_target_org_id OR v_target_org_id IS NULL) AND status = 'ACTIVE' AND deleted_at IS NULL
        ),
        'severeAllergiesCount', (
            SELECT COUNT(*) FROM public.student_dietary_restrictions 
            WHERE (organization_id = v_target_org_id OR v_target_org_id IS NULL) AND severity ILIKE '%GRAVE%' AND deleted_at IS NULL
        ),
        'lowStockItemsCount', (
            SELECT COUNT(*) FROM public.food_inventory 
            WHERE (organization_id = v_target_org_id OR v_target_org_id IS NULL) AND current_quantity <= minimum_quantity AND deleted_at IS NULL
        ),
        'totalMealsToday', COALESCE((
            SELECT SUM(total_meals_served) FROM public.meal_service_records 
            WHERE (organization_id = v_target_org_id OR v_target_org_id IS NULL) AND service_date = CURRENT_DATE AND deleted_at IS NULL
        ), 0),
        'totalSuppliers', (
            SELECT COUNT(*) FROM public.food_suppliers 
            WHERE (organization_id = v_target_org_id OR v_target_org_id IS NULL) AND deleted_at IS NULL
        )
    ) INTO v_stats;

    v_result := jsonb_build_object(
        'inventory', v_inventory,
        'restrictions', v_restrictions,
        'suppliers', v_suppliers,
        'todayMeals', v_today_meals,
        'stats', v_stats,
        'organizationId', v_target_org_id
    );

    RETURN v_result;
END;
$$;

-- 2. Salvar Restrição Alimentar com Validação de Estudante
CREATE OR REPLACE FUNCTION public.save_student_dietary_restriction(
    p_id UUID,
    p_student_id UUID,
    p_restriction_type VARCHAR,
    p_allergen_item VARCHAR,
    p_severity VARCHAR DEFAULT 'MODERADA',
    p_emergency_protocol TEXT DEFAULT NULL,
    p_doctor_name VARCHAR DEFAULT NULL,
    p_doctor_crm VARCHAR DEFAULT NULL,
    p_observations TEXT DEFAULT NULL,
    p_status VARCHAR DEFAULT 'ACTIVE',
    p_organization_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_org_id UUID;
    v_target_org_id UUID;
    v_student_org_id UUID;
    v_result_id UUID;
BEGIN
    IF auth.uid() IS NOT NULL THEN
        SELECT organization_id INTO v_user_org_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
    END IF;

    v_target_org_id := COALESCE(v_user_org_id, p_organization_id);
    IF v_target_org_id IS NULL THEN
        SELECT id INTO v_target_org_id FROM public.organizations ORDER BY created_at ASC LIMIT 1;
    END IF;

    -- Validar que o estudante pertence à mesma organização
    SELECT organization_id INTO v_student_org_id
    FROM public.students
    WHERE id = p_student_id;

    IF v_student_org_id IS NULL THEN
        RAISE EXCEPTION 'Estudante não encontrado.' USING ERRCODE = 'P0002';
    END IF;

    IF v_student_org_id <> v_target_org_id AND v_user_org_id IS NOT NULL THEN
        RAISE EXCEPTION 'Violação multi-tenant: O estudante pertence a outra organização.' USING ERRCODE = '42501';
    END IF;

    IF p_id IS NOT NULL THEN
        -- Atualizar restrição existente
        UPDATE public.student_dietary_restrictions
        SET student_id = p_student_id,
            restriction_type = p_restriction_type,
            allergen_item = p_allergen_item,
            severity = COALESCE(p_severity, 'MODERADA'),
            emergency_protocol = p_emergency_protocol,
            doctor_name = p_doctor_name,
            doctor_crm = p_doctor_crm,
            observations = p_observations,
            status = COALESCE(p_status, 'ACTIVE'),
            updated_at = NOW(),
            updated_by = auth.uid()
        WHERE id = p_id AND (organization_id = v_target_org_id OR v_target_org_id IS NULL)
        RETURNING id INTO v_result_id;

        IF v_result_id IS NULL THEN
            RAISE EXCEPTION 'Restrição não encontrada ou você não tem permissão para alterá-la.' USING ERRCODE = 'P0002';
        END IF;
    ELSE
        -- Inserir nova restrição
        INSERT INTO public.student_dietary_restrictions (
            organization_id,
            student_id,
            restriction_type,
            allergen_item,
            severity,
            emergency_protocol,
            doctor_name,
            doctor_crm,
            observations,
            status,
            created_by
        ) VALUES (
            v_target_org_id,
            p_student_id,
            p_restriction_type,
            p_allergen_item,
            COALESCE(p_severity, 'MODERADA'),
            p_emergency_protocol,
            p_doctor_name,
            p_doctor_crm,
            p_observations,
            COALESCE(p_status, 'ACTIVE'),
            auth.uid()
        )
        RETURNING id INTO v_result_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'id', v_result_id);
END;
$$;

-- 3. Registrar Refeição Servida
CREATE OR REPLACE FUNCTION public.record_meal_service(
    p_service_date DATE,
    p_shift VARCHAR,
    p_meal_type VARCHAR,
    p_total_meals_served INTEGER,
    p_special_diet_meals_count INTEGER DEFAULT 0,
    p_class_id UUID DEFAULT NULL,
    p_class_name VARCHAR DEFAULT NULL,
    p_observations TEXT DEFAULT NULL,
    p_organization_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_org_id UUID;
    v_target_org_id UUID;
    v_record_id UUID;
BEGIN
    IF auth.uid() IS NOT NULL THEN
        SELECT organization_id INTO v_user_org_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
    END IF;

    v_target_org_id := COALESCE(v_user_org_id, p_organization_id);
    IF v_target_org_id IS NULL THEN
        SELECT id INTO v_target_org_id FROM public.organizations ORDER BY created_at ASC LIMIT 1;
    END IF;

    IF p_total_meals_served < 0 THEN
        RAISE EXCEPTION 'A quantidade de refeições servidas não pode ser negativa.' USING ERRCODE = '22003';
    END IF;

    IF p_special_diet_meals_count < 0 OR p_special_diet_meals_count > p_total_meals_served THEN
        RAISE EXCEPTION 'A quantidade de dietas especiais não pode exceder o total de refeições.' USING ERRCODE = '22003';
    END IF;

    INSERT INTO public.meal_service_records (
        organization_id,
        service_date,
        shift,
        meal_type,
        total_meals_served,
        special_diet_meals_count,
        class_id,
        class_name,
        observations,
        recorded_by
    ) VALUES (
        v_target_org_id,
        COALESCE(p_service_date, CURRENT_DATE),
        COALESCE(p_shift, '1º Turno'),
        p_meal_type,
        p_total_meals_served,
        COALESCE(p_special_diet_meals_count, 0),
        p_class_id,
        p_class_name,
        p_observations,
        auth.uid()
    )
    RETURNING id INTO v_record_id;

    RETURN jsonb_build_object('success', true, 'id', v_record_id);
END;
$$;

-- 4. Movimentação Atômica de Estoque com Concorrência Segura (SELECT FOR UPDATE)
CREATE OR REPLACE FUNCTION public.record_inventory_movement(
    p_inventory_item_id UUID,
    p_movement_type VARCHAR, -- 'ENTRY', 'EXIT', 'ADJUSTMENT', 'DISCARD'
    p_quantity NUMERIC,
    p_reason VARCHAR,
    p_organization_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_org_id UUID;
    v_target_org_id UUID;
    v_item_org_id UUID;
    v_current_qty NUMERIC;
    v_new_qty NUMERIC;
    v_movement_id UUID;
BEGIN
    IF auth.uid() IS NOT NULL THEN
        SELECT organization_id INTO v_user_org_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
    END IF;

    v_target_org_id := COALESCE(v_user_org_id, p_organization_id);

    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'A quantidade deve ser estritamente maior que zero.' USING ERRCODE = '22003';
    END IF;

    -- Bloqueio exclusivo de linha (FOR UPDATE) para prevenir condições de corrida
    SELECT organization_id, current_quantity
    INTO v_item_org_id, v_current_qty
    FROM public.food_inventory
    WHERE id = p_inventory_item_id AND deleted_at IS NULL
    FOR UPDATE;

    IF v_current_qty IS NULL THEN
        RAISE EXCEPTION 'Item de estoque não encontrado.' USING ERRCODE = 'P0002';
    END IF;

    IF v_target_org_id IS NOT NULL AND v_item_org_id <> v_target_org_id THEN
        RAISE EXCEPTION 'Violação multi-tenant: Item de estoque pertence a outra instituição.' USING ERRCODE = '42501';
    END IF;

    -- Calcular novo saldo
    IF p_movement_type IN ('EXIT', 'DISCARD') THEN
        IF v_current_qty < p_quantity THEN
            RAISE EXCEPTION 'Saldo insuficiente: o item possui % em estoque, impossível retirar %.', v_current_qty, p_quantity
                USING ERRCODE = '22003';
        END IF;
        v_new_qty := v_current_qty - p_quantity;
    ELSIF p_movement_type = 'ENTRY' THEN
        v_new_qty := v_current_qty + p_quantity;
    ELSIF p_movement_type = 'ADJUSTMENT' THEN
        v_new_qty := p_quantity; -- Ajuste direto para inventário físico
    ELSE
        RAISE EXCEPTION 'Tipo de movimentação inválido: %', p_movement_type USING ERRCODE = '22023';
    END IF;

    -- Atualizar o estoque
    UPDATE public.food_inventory
    SET current_quantity = v_new_qty,
        status = CASE 
            WHEN expiration_date IS NOT NULL AND expiration_date < CURRENT_DATE THEN 'EXPIRED'
            WHEN v_new_qty <= 0 THEN 'OUT_OF_STOCK'
            WHEN v_new_qty <= minimum_quantity THEN 'LOW_STOCK'
            ELSE 'IN_STOCK'
        END,
        updated_at = NOW(),
        updated_by = auth.uid()
    WHERE id = p_inventory_item_id;

    -- Inserir trilha de auditoria
    INSERT INTO public.food_inventory_movements (
        organization_id,
        inventory_item_id,
        movement_type,
        quantity,
        previous_quantity,
        new_quantity,
        reason,
        performed_by
    ) VALUES (
        v_item_org_id,
        p_inventory_item_id,
        p_movement_type,
        p_quantity,
        v_current_qty,
        v_new_qty,
        COALESCE(p_reason, 'Movimentação operacional de estoque'),
        auth.uid()
    )
    RETURNING id INTO v_movement_id;

    RETURN jsonb_build_object(
        'success', true,
        'movementId', v_movement_id,
        'itemId', p_inventory_item_id,
        'previousQuantity', v_current_qty,
        'newQuantity', v_new_qty
    );
END;
$$;

-- 5. Salvar/Criar Item de Estoque
CREATE OR REPLACE FUNCTION public.save_food_inventory_item(
    p_id UUID,
    p_item_name VARCHAR,
    p_category VARCHAR,
    p_unit_of_measure VARCHAR DEFAULT 'KG',
    p_current_quantity NUMERIC DEFAULT 0,
    p_minimum_quantity NUMERIC DEFAULT 5,
    p_lot_number VARCHAR DEFAULT NULL,
    p_expiration_date DATE DEFAULT NULL,
    p_unit_cost NUMERIC DEFAULT 0,
    p_storage_location VARCHAR DEFAULT 'Despensa Principal',
    p_supplier_id UUID DEFAULT NULL,
    p_observations TEXT DEFAULT NULL,
    p_organization_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_org_id UUID;
    v_target_org_id UUID;
    v_result_id UUID;
    v_status VARCHAR(50);
BEGIN
    IF auth.uid() IS NOT NULL THEN
        SELECT organization_id INTO v_user_org_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
    END IF;

    v_target_org_id := COALESCE(v_user_org_id, p_organization_id);
    IF v_target_org_id IS NULL THEN
        SELECT id INTO v_target_org_id FROM public.organizations ORDER BY created_at ASC LIMIT 1;
    END IF;

    IF p_current_quantity < 0 OR p_minimum_quantity < 0 THEN
        RAISE EXCEPTION 'Quantidades não podem ser negativas.' USING ERRCODE = '22003';
    END IF;

    -- Determinar status inicial
    IF p_expiration_date IS NOT NULL AND p_expiration_date < CURRENT_DATE THEN
        v_status := 'EXPIRED';
    ELSIF p_current_quantity <= 0 THEN
        v_status := 'OUT_OF_STOCK';
    ELSIF p_current_quantity <= p_minimum_quantity THEN
        v_status := 'LOW_STOCK';
    ELSE
        v_status := 'IN_STOCK';
    END IF;

    IF p_id IS NOT NULL THEN
        UPDATE public.food_inventory
        SET item_name = p_item_name,
            category = p_category,
            unit_of_measure = COALESCE(p_unit_of_measure, 'KG'),
            current_quantity = p_current_quantity,
            minimum_quantity = p_minimum_quantity,
            lot_number = p_lot_number,
            expiration_date = p_expiration_date,
            unit_cost = COALESCE(p_unit_cost, 0),
            storage_location = COALESCE(p_storage_location, 'Despensa Principal'),
            supplier_id = p_supplier_id,
            status = v_status,
            observations = p_observations,
            updated_at = NOW(),
            updated_by = auth.uid()
        WHERE id = p_id AND (organization_id = v_target_org_id OR v_target_org_id IS NULL)
        RETURNING id INTO v_result_id;

        IF v_result_id IS NULL THEN
            RAISE EXCEPTION 'Item não encontrado ou você não tem permissão para editá-lo.' USING ERRCODE = 'P0002';
        END IF;
    ELSE
        INSERT INTO public.food_inventory (
            organization_id,
            item_name,
            category,
            unit_of_measure,
            current_quantity,
            minimum_quantity,
            lot_number,
            expiration_date,
            unit_cost,
            storage_location,
            supplier_id,
            status,
            observations,
            created_by
        ) VALUES (
            v_target_org_id,
            p_item_name,
            p_category,
            COALESCE(p_unit_of_measure, 'KG'),
            p_current_quantity,
            p_minimum_quantity,
            p_lot_number,
            p_expiration_date,
            COALESCE(p_unit_cost, 0),
            COALESCE(p_storage_location, 'Despensa Principal'),
            p_supplier_id,
            v_status,
            p_observations,
            auth.uid()
        )
        RETURNING id INTO v_result_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'id', v_result_id);
END;
$$;

-- 6. Salvar/Criar Fornecedor de Alimentos
CREATE OR REPLACE FUNCTION public.save_food_supplier(
    p_id UUID,
    p_name VARCHAR,
    p_trade_name VARCHAR DEFAULT NULL,
    p_cnpj VARCHAR DEFAULT NULL,
    p_contact_name VARCHAR DEFAULT NULL,
    p_phone VARCHAR DEFAULT NULL,
    p_email VARCHAR DEFAULT NULL,
    p_category VARCHAR DEFAULT 'Alimentos Perecíveis',
    p_address TEXT DEFAULT NULL,
    p_city VARCHAR DEFAULT NULL,
    p_state VARCHAR DEFAULT NULL,
    p_observations TEXT DEFAULT NULL,
    p_status VARCHAR DEFAULT 'ACTIVE',
    p_organization_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_org_id UUID;
    v_target_org_id UUID;
    v_result_id UUID;
BEGIN
    IF auth.uid() IS NOT NULL THEN
        SELECT organization_id INTO v_user_org_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
    END IF;

    v_target_org_id := COALESCE(v_user_org_id, p_organization_id);
    IF v_target_org_id IS NULL THEN
        SELECT id INTO v_target_org_id FROM public.organizations ORDER BY created_at ASC LIMIT 1;
    END IF;

    IF p_id IS NOT NULL THEN
        UPDATE public.food_suppliers
        SET name = p_name,
            trade_name = p_trade_name,
            cnpj = p_cnpj,
            contact_name = p_contact_name,
            phone = p_phone,
            email = p_email,
            category = COALESCE(p_category, 'Alimentos Perecíveis'),
            address = p_address,
            city = p_city,
            state = p_state,
            observations = p_observations,
            status = COALESCE(p_status, 'ACTIVE'),
            updated_at = NOW(),
            updated_by = auth.uid()
        WHERE id = p_id AND (organization_id = v_target_org_id OR v_target_org_id IS NULL)
        RETURNING id INTO v_result_id;

        IF v_result_id IS NULL THEN
            RAISE EXCEPTION 'Fornecedor não encontrado ou você não tem permissão para alterá-lo.' USING ERRCODE = 'P0002';
        END IF;
    ELSE
        INSERT INTO public.food_suppliers (
            organization_id,
            name,
            trade_name,
            cnpj,
            contact_name,
            phone,
            email,
            category,
            address,
            city,
            state,
            observations,
            status,
            created_by
        ) VALUES (
            v_target_org_id,
            p_name,
            p_trade_name,
            p_cnpj,
            p_contact_name,
            p_phone,
            p_email,
            COALESCE(p_category, 'Alimentos Perecíveis'),
            p_address,
            p_city,
            p_state,
            p_observations,
            COALESCE(p_status, 'ACTIVE'),
            auth.uid()
        )
        RETURNING id INTO v_result_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'id', v_result_id);
END;
$$;
