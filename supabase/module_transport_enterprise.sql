-- ====================================================================
-- EDUCA+ ERP EDUCACIONAL — MÓDULO DE TRANSPORTE ESCOLAR
-- SCRIPT SQL PRODUCTION-READY COM MULTI-TENANT E REALTIME
-- ====================================================================

BEGIN;

-- 1. VEÍCULOS (transport_vehicles)
CREATE TABLE IF NOT EXISTS public.transport_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    plate VARCHAR(20) NOT NULL,
    model VARCHAR(100),
    brand VARCHAR(100),
    year INTEGER,
    capacity INTEGER,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. MOTORISTAS (transport_drivers)
CREATE TABLE IF NOT EXISTS public.transport_drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    profile_id UUID,
    license_number VARCHAR(50),
    license_category VARCHAR(10),
    license_expiration DATE,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 3. MONITORES (transport_monitors)
CREATE TABLE IF NOT EXISTS public.transport_monitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    profile_id UUID,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 4. ROTAS (transport_routes)
CREATE TABLE IF NOT EXISTS public.transport_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    vehicle_id UUID,
    driver_id UUID,
    monitor_id UUID,
    shift VARCHAR(50),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 5. PONTOS DE PARADA (transport_route_stops)
CREATE TABLE IF NOT EXISTS public.transport_route_stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    route_id UUID NOT NULL,
    name VARCHAR(255),
    address TEXT,
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    order_index INTEGER,
    estimated_time TIME,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 6. ALUNOS POR ROTA (transport_students)
CREATE TABLE IF NOT EXISTS public.transport_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    student_id UUID NOT NULL,
    route_id UUID NOT NULL,
    stop_id UUID,
    boarding_type VARCHAR(50), -- PICKUP, DROPOFF, BOTH
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 7. EMBARQUE / DESEMBARQUE (transport_boarding_logs)
CREATE TABLE IF NOT EXISTS public.transport_boarding_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    student_id UUID NOT NULL,
    route_id UUID NOT NULL,
    action_type VARCHAR(20), -- BOARDING, DROPOFF
    action_time TIMESTAMPTZ DEFAULT NOW(),
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    logged_by UUID,
    status VARCHAR(50) DEFAULT 'COMPLETED',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 8. AUTORIZAÇÕES (transport_authorizations)
CREATE TABLE IF NOT EXISTS public.transport_authorizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    student_id UUID NOT NULL,
    guardian_id UUID NOT NULL,
    authorized_by UUID,
    valid_until DATE,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 9. RASTREAMENTO GPS (transport_gps_tracking)
CREATE TABLE IF NOT EXISTS public.transport_gps_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    vehicle_id UUID NOT NULL,
    route_id UUID,
    latitude NUMERIC(10, 8) NOT NULL,
    longitude NUMERIC(11, 8) NOT NULL,
    speed NUMERIC(5, 2),
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 10. MANUTENÇÕES (transport_maintenance)
CREATE TABLE IF NOT EXISTS public.transport_maintenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    vehicle_id UUID NOT NULL,
    maintenance_date DATE,
    description TEXT,
    cost NUMERIC(10, 2),
    provider TEXT,
    status VARCHAR(50) DEFAULT 'COMPLETED',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 11. ABASTECIMENTOS (transport_fuel_logs)
CREATE TABLE IF NOT EXISTS public.transport_fuel_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    vehicle_id UUID NOT NULL,
    fuel_date DATE,
    liters NUMERIC(10, 2),
    cost NUMERIC(10, 2),
    mileage INTEGER,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 12. SEGUROS (transport_insurance)
CREATE TABLE IF NOT EXISTS public.transport_insurance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    vehicle_id UUID NOT NULL,
    provider TEXT,
    policy_number VARCHAR(100),
    start_date DATE,
    end_date DATE,
    cost NUMERIC(10, 2),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 13. OCORRÊNCIAS DO TRANSPORTE (transport_occurrences)
CREATE TABLE IF NOT EXISTS public.transport_occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    vehicle_id UUID,
    route_id UUID,
    driver_id UUID,
    occurrence_date TIMESTAMPTZ,
    description TEXT,
    severity VARCHAR(50),
    status VARCHAR(50) DEFAULT 'OPEN',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 14. CHECKLISTS DO VEÍCULO (transport_checklists)
CREATE TABLE IF NOT EXISTS public.transport_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    vehicle_id UUID NOT NULL,
    driver_id UUID,
    checklist_date TIMESTAMPTZ DEFAULT NOW(),
    items JSONB,
    status VARCHAR(50) DEFAULT 'PASSED',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- ====================================================================
-- ÍNDICES DE ALTA PERFORMANCE
-- ====================================================================
DO $$
DECLARE
    t_name text;
BEGIN
    FOR t_name IN 
        SELECT unnest(ARRAY[
            'transport_vehicles', 'transport_drivers', 'transport_monitors',
            'transport_routes', 'transport_route_stops', 'transport_students',
            'transport_boarding_logs', 'transport_authorizations', 'transport_gps_tracking',
            'transport_maintenance', 'transport_fuel_logs', 'transport_insurance',
            'transport_occurrences', 'transport_checklists'
        ])
    LOOP
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_school_id ON public.%I(school_id)', t_name, t_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_status ON public.%I(status)', t_name, t_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_created_at ON public.%I(created_at)', t_name, t_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_deleted_at ON public.%I(deleted_at)', t_name, t_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_metadata ON public.%I USING GIN (metadata)', t_name, t_name);
    END LOOP;
END;
$$;

-- Índices específicos (compostos)
CREATE INDEX IF NOT EXISTS idx_transp_boarding_stud_time ON public.transport_boarding_logs(student_id, action_time);
CREATE INDEX IF NOT EXISTS idx_transp_gps_veh_time ON public.transport_gps_tracking(vehicle_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_transp_maint_veh_date ON public.transport_maintenance(vehicle_id, maintenance_date);
CREATE INDEX IF NOT EXISTS idx_transp_fuel_veh_date ON public.transport_fuel_logs(vehicle_id, fuel_date);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) E POLICIES
-- ====================================================================
DO $$
DECLARE
    t_name text;
    has_can_access BOOLEAN;
BEGIN
    has_can_access := EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'can_access_school');
    
    FOR t_name IN 
        SELECT unnest(ARRAY[
            'transport_vehicles', 'transport_drivers', 'transport_monitors',
            'transport_routes', 'transport_route_stops', 'transport_students',
            'transport_boarding_logs', 'transport_authorizations', 'transport_gps_tracking',
            'transport_maintenance', 'transport_fuel_logs', 'transport_insurance',
            'transport_occurrences', 'transport_checklists'
        ])
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t_name);
        EXECUTE format('DROP POLICY IF EXISTS p_%I_access ON public.%I', t_name, t_name);
        
        IF has_can_access THEN
            EXECUTE format('CREATE POLICY p_%I_access ON public.%I FOR ALL USING (public.can_access_school(auth.uid(), school_id) AND deleted_at IS NULL)', t_name, t_name);
        ELSE
            EXECUTE format('CREATE POLICY p_%I_access ON public.%I FOR ALL USING (deleted_at IS NULL)', t_name, t_name);
        END IF;
    END LOOP;
END;
$$;

-- ====================================================================
-- TRIGGERS PARA UPDATED_AT
-- ====================================================================
DO $$
DECLARE
    t_name text;
    fn_name text := '';
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at_timestamp') THEN
        fn_name := 'set_updated_at_timestamp';
    ELSIF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        fn_name := 'update_updated_at_column';
    END IF;

    IF fn_name != '' THEN
        FOR t_name IN 
            SELECT unnest(ARRAY[
                'transport_vehicles', 'transport_drivers', 'transport_monitors',
                'transport_routes', 'transport_route_stops', 'transport_students',
                'transport_boarding_logs', 'transport_authorizations', 'transport_gps_tracking',
                'transport_maintenance', 'transport_fuel_logs', 'transport_insurance',
                'transport_occurrences', 'transport_checklists'
            ])
        LOOP
            EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_upd ON public.%I', t_name, t_name);
            EXECUTE format('CREATE TRIGGER trg_%I_upd BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.%I()', t_name, t_name, fn_name);
        END LOOP;
    END IF;
END;
$$;

-- ====================================================================
-- SUPABASE REALTIME PUBLICATION
-- ====================================================================
DO $$
DECLARE
    t_name text;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
    
    FOR t_name IN 
        SELECT unnest(ARRAY[
            'transport_vehicles', 'transport_drivers', 'transport_monitors',
            'transport_routes', 'transport_route_stops', 'transport_students',
            'transport_boarding_logs', 'transport_authorizations', 'transport_gps_tracking',
            'transport_maintenance', 'transport_fuel_logs', 'transport_insurance',
            'transport_occurrences', 'transport_checklists'
        ])
    LOOP
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t_name);
        EXCEPTION WHEN duplicate_object THEN
            NULL;
        END;
    END LOOP;
END;
$$;

-- ====================================================================
-- DASHBOARDS (VIEWS)
-- ====================================================================
CREATE OR REPLACE VIEW public.view_transport_active_vehicles AS
SELECT school_id, id, plate, model, capacity, status
FROM public.transport_vehicles
WHERE status = 'ACTIVE' AND deleted_at IS NULL;

CREATE OR REPLACE VIEW public.view_transport_active_routes AS
SELECT school_id, id, name, vehicle_id, driver_id, status
FROM public.transport_routes
WHERE status = 'ACTIVE' AND deleted_at IS NULL;

CREATE OR REPLACE VIEW public.view_transport_student_boarding AS
SELECT school_id, student_id, route_id, action_type, action_time, status
FROM public.transport_boarding_logs
WHERE deleted_at IS NULL;

COMMIT;
