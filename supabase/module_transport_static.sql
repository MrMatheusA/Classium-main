-- ====================================================================
-- EDUCA+ ERP EDUCACIONAL — MÓDULO DE TRANSPORTE ESCOLAR
-- SCRIPT SQL PRODUCTION-READY COM MULTI-TENANT E REALTIME (ESTÁTICO)
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
    boarding_type VARCHAR(50), 
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
    action_type VARCHAR(20), 
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
-- ÍNDICES, RLS E TRIGGERS EXPLICITOS
-- ====================================================================

-- Índices: transport_vehicles
CREATE INDEX IF NOT EXISTS idx_transport_vehicles_school_id ON public.transport_vehicles(school_id);
CREATE INDEX IF NOT EXISTS idx_transport_vehicles_status ON public.transport_vehicles(status);
CREATE INDEX IF NOT EXISTS idx_transport_vehicles_created_at ON public.transport_vehicles(created_at);
CREATE INDEX IF NOT EXISTS idx_transport_vehicles_deleted_at ON public.transport_vehicles(deleted_at);
CREATE INDEX IF NOT EXISTS idx_transport_vehicles_metadata ON public.transport_vehicles USING GIN (metadata);

-- RLS: transport_vehicles
ALTER TABLE public.transport_vehicles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_transport_vehicles_access ON public.transport_vehicles;
CREATE POLICY p_transport_vehicles_access ON public.transport_vehicles FOR ALL USING (deleted_at IS NULL);

-- Trigger: transport_vehicles
DROP TRIGGER IF EXISTS trg_transport_vehicles_upd ON public.transport_vehicles;
-- Índices: transport_drivers
CREATE INDEX IF NOT EXISTS idx_transport_drivers_school_id ON public.transport_drivers(school_id);
CREATE INDEX IF NOT EXISTS idx_transport_drivers_status ON public.transport_drivers(status);
CREATE INDEX IF NOT EXISTS idx_transport_drivers_created_at ON public.transport_drivers(created_at);
CREATE INDEX IF NOT EXISTS idx_transport_drivers_deleted_at ON public.transport_drivers(deleted_at);
CREATE INDEX IF NOT EXISTS idx_transport_drivers_metadata ON public.transport_drivers USING GIN (metadata);

-- RLS: transport_drivers
ALTER TABLE public.transport_drivers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_transport_drivers_access ON public.transport_drivers;
CREATE POLICY p_transport_drivers_access ON public.transport_drivers FOR ALL USING (deleted_at IS NULL);

-- Trigger: transport_drivers
DROP TRIGGER IF EXISTS trg_transport_drivers_upd ON public.transport_drivers;
-- Índices: transport_monitors
CREATE INDEX IF NOT EXISTS idx_transport_monitors_school_id ON public.transport_monitors(school_id);
CREATE INDEX IF NOT EXISTS idx_transport_monitors_status ON public.transport_monitors(status);
CREATE INDEX IF NOT EXISTS idx_transport_monitors_created_at ON public.transport_monitors(created_at);
CREATE INDEX IF NOT EXISTS idx_transport_monitors_deleted_at ON public.transport_monitors(deleted_at);
CREATE INDEX IF NOT EXISTS idx_transport_monitors_metadata ON public.transport_monitors USING GIN (metadata);

-- RLS: transport_monitors
ALTER TABLE public.transport_monitors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_transport_monitors_access ON public.transport_monitors;
CREATE POLICY p_transport_monitors_access ON public.transport_monitors FOR ALL USING (deleted_at IS NULL);

-- Trigger: transport_monitors
DROP TRIGGER IF EXISTS trg_transport_monitors_upd ON public.transport_monitors;
-- Índices: transport_routes
CREATE INDEX IF NOT EXISTS idx_transport_routes_school_id ON public.transport_routes(school_id);
CREATE INDEX IF NOT EXISTS idx_transport_routes_status ON public.transport_routes(status);
CREATE INDEX IF NOT EXISTS idx_transport_routes_created_at ON public.transport_routes(created_at);
CREATE INDEX IF NOT EXISTS idx_transport_routes_deleted_at ON public.transport_routes(deleted_at);
CREATE INDEX IF NOT EXISTS idx_transport_routes_metadata ON public.transport_routes USING GIN (metadata);

-- RLS: transport_routes
ALTER TABLE public.transport_routes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_transport_routes_access ON public.transport_routes;
CREATE POLICY p_transport_routes_access ON public.transport_routes FOR ALL USING (deleted_at IS NULL);

-- Trigger: transport_routes
DROP TRIGGER IF EXISTS trg_transport_routes_upd ON public.transport_routes;
-- Índices: transport_route_stops
CREATE INDEX IF NOT EXISTS idx_transport_route_stops_school_id ON public.transport_route_stops(school_id);
CREATE INDEX IF NOT EXISTS idx_transport_route_stops_status ON public.transport_route_stops(status);
CREATE INDEX IF NOT EXISTS idx_transport_route_stops_created_at ON public.transport_route_stops(created_at);
CREATE INDEX IF NOT EXISTS idx_transport_route_stops_deleted_at ON public.transport_route_stops(deleted_at);
CREATE INDEX IF NOT EXISTS idx_transport_route_stops_metadata ON public.transport_route_stops USING GIN (metadata);

-- RLS: transport_route_stops
ALTER TABLE public.transport_route_stops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_transport_route_stops_access ON public.transport_route_stops;
CREATE POLICY p_transport_route_stops_access ON public.transport_route_stops FOR ALL USING (deleted_at IS NULL);

-- Trigger: transport_route_stops
DROP TRIGGER IF EXISTS trg_transport_route_stops_upd ON public.transport_route_stops;
-- Índices: transport_students
CREATE INDEX IF NOT EXISTS idx_transport_students_school_id ON public.transport_students(school_id);
CREATE INDEX IF NOT EXISTS idx_transport_students_status ON public.transport_students(status);
CREATE INDEX IF NOT EXISTS idx_transport_students_created_at ON public.transport_students(created_at);
CREATE INDEX IF NOT EXISTS idx_transport_students_deleted_at ON public.transport_students(deleted_at);
CREATE INDEX IF NOT EXISTS idx_transport_students_metadata ON public.transport_students USING GIN (metadata);

-- RLS: transport_students
ALTER TABLE public.transport_students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_transport_students_access ON public.transport_students;
CREATE POLICY p_transport_students_access ON public.transport_students FOR ALL USING (deleted_at IS NULL);

-- Trigger: transport_students
DROP TRIGGER IF EXISTS trg_transport_students_upd ON public.transport_students;
-- Índices: transport_boarding_logs
CREATE INDEX IF NOT EXISTS idx_transport_boarding_logs_school_id ON public.transport_boarding_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_transport_boarding_logs_status ON public.transport_boarding_logs(status);
CREATE INDEX IF NOT EXISTS idx_transport_boarding_logs_created_at ON public.transport_boarding_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_transport_boarding_logs_deleted_at ON public.transport_boarding_logs(deleted_at);
CREATE INDEX IF NOT EXISTS idx_transport_boarding_logs_metadata ON public.transport_boarding_logs USING GIN (metadata);

-- RLS: transport_boarding_logs
ALTER TABLE public.transport_boarding_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_transport_boarding_logs_access ON public.transport_boarding_logs;
CREATE POLICY p_transport_boarding_logs_access ON public.transport_boarding_logs FOR ALL USING (deleted_at IS NULL);

-- Trigger: transport_boarding_logs
DROP TRIGGER IF EXISTS trg_transport_boarding_logs_upd ON public.transport_boarding_logs;
-- Índices: transport_authorizations
CREATE INDEX IF NOT EXISTS idx_transport_authorizations_school_id ON public.transport_authorizations(school_id);
CREATE INDEX IF NOT EXISTS idx_transport_authorizations_status ON public.transport_authorizations(status);
CREATE INDEX IF NOT EXISTS idx_transport_authorizations_created_at ON public.transport_authorizations(created_at);
CREATE INDEX IF NOT EXISTS idx_transport_authorizations_deleted_at ON public.transport_authorizations(deleted_at);
CREATE INDEX IF NOT EXISTS idx_transport_authorizations_metadata ON public.transport_authorizations USING GIN (metadata);

-- RLS: transport_authorizations
ALTER TABLE public.transport_authorizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_transport_authorizations_access ON public.transport_authorizations;
CREATE POLICY p_transport_authorizations_access ON public.transport_authorizations FOR ALL USING (deleted_at IS NULL);

-- Trigger: transport_authorizations
DROP TRIGGER IF EXISTS trg_transport_authorizations_upd ON public.transport_authorizations;
-- Índices: transport_gps_tracking
CREATE INDEX IF NOT EXISTS idx_transport_gps_tracking_school_id ON public.transport_gps_tracking(school_id);
CREATE INDEX IF NOT EXISTS idx_transport_gps_tracking_created_at ON public.transport_gps_tracking(created_at);
CREATE INDEX IF NOT EXISTS idx_transport_gps_tracking_deleted_at ON public.transport_gps_tracking(deleted_at);
CREATE INDEX IF NOT EXISTS idx_transport_gps_tracking_metadata ON public.transport_gps_tracking USING GIN (metadata);

-- RLS: transport_gps_tracking
ALTER TABLE public.transport_gps_tracking ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_transport_gps_tracking_access ON public.transport_gps_tracking;
CREATE POLICY p_transport_gps_tracking_access ON public.transport_gps_tracking FOR ALL USING (deleted_at IS NULL);

-- Trigger: transport_gps_tracking
DROP TRIGGER IF EXISTS trg_transport_gps_tracking_upd ON public.transport_gps_tracking;
-- Índices: transport_maintenance
CREATE INDEX IF NOT EXISTS idx_transport_maintenance_school_id ON public.transport_maintenance(school_id);
CREATE INDEX IF NOT EXISTS idx_transport_maintenance_status ON public.transport_maintenance(status);
CREATE INDEX IF NOT EXISTS idx_transport_maintenance_created_at ON public.transport_maintenance(created_at);
CREATE INDEX IF NOT EXISTS idx_transport_maintenance_deleted_at ON public.transport_maintenance(deleted_at);
CREATE INDEX IF NOT EXISTS idx_transport_maintenance_metadata ON public.transport_maintenance USING GIN (metadata);

-- RLS: transport_maintenance
ALTER TABLE public.transport_maintenance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_transport_maintenance_access ON public.transport_maintenance;
CREATE POLICY p_transport_maintenance_access ON public.transport_maintenance FOR ALL USING (deleted_at IS NULL);

-- Trigger: transport_maintenance
DROP TRIGGER IF EXISTS trg_transport_maintenance_upd ON public.transport_maintenance;
-- Índices: transport_fuel_logs
CREATE INDEX IF NOT EXISTS idx_transport_fuel_logs_school_id ON public.transport_fuel_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_transport_fuel_logs_status ON public.transport_fuel_logs(status);
CREATE INDEX IF NOT EXISTS idx_transport_fuel_logs_created_at ON public.transport_fuel_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_transport_fuel_logs_deleted_at ON public.transport_fuel_logs(deleted_at);
CREATE INDEX IF NOT EXISTS idx_transport_fuel_logs_metadata ON public.transport_fuel_logs USING GIN (metadata);

-- RLS: transport_fuel_logs
ALTER TABLE public.transport_fuel_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_transport_fuel_logs_access ON public.transport_fuel_logs;
CREATE POLICY p_transport_fuel_logs_access ON public.transport_fuel_logs FOR ALL USING (deleted_at IS NULL);

-- Trigger: transport_fuel_logs
DROP TRIGGER IF EXISTS trg_transport_fuel_logs_upd ON public.transport_fuel_logs;
-- Índices: transport_insurance
CREATE INDEX IF NOT EXISTS idx_transport_insurance_school_id ON public.transport_insurance(school_id);
CREATE INDEX IF NOT EXISTS idx_transport_insurance_status ON public.transport_insurance(status);
CREATE INDEX IF NOT EXISTS idx_transport_insurance_created_at ON public.transport_insurance(created_at);
CREATE INDEX IF NOT EXISTS idx_transport_insurance_deleted_at ON public.transport_insurance(deleted_at);
CREATE INDEX IF NOT EXISTS idx_transport_insurance_metadata ON public.transport_insurance USING GIN (metadata);

-- RLS: transport_insurance
ALTER TABLE public.transport_insurance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_transport_insurance_access ON public.transport_insurance;
CREATE POLICY p_transport_insurance_access ON public.transport_insurance FOR ALL USING (deleted_at IS NULL);

-- Trigger: transport_insurance
DROP TRIGGER IF EXISTS trg_transport_insurance_upd ON public.transport_insurance;
-- Índices: transport_occurrences
CREATE INDEX IF NOT EXISTS idx_transport_occurrences_school_id ON public.transport_occurrences(school_id);
CREATE INDEX IF NOT EXISTS idx_transport_occurrences_status ON public.transport_occurrences(status);
CREATE INDEX IF NOT EXISTS idx_transport_occurrences_created_at ON public.transport_occurrences(created_at);
CREATE INDEX IF NOT EXISTS idx_transport_occurrences_deleted_at ON public.transport_occurrences(deleted_at);
CREATE INDEX IF NOT EXISTS idx_transport_occurrences_metadata ON public.transport_occurrences USING GIN (metadata);

-- RLS: transport_occurrences
ALTER TABLE public.transport_occurrences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_transport_occurrences_access ON public.transport_occurrences;
CREATE POLICY p_transport_occurrences_access ON public.transport_occurrences FOR ALL USING (deleted_at IS NULL);

-- Trigger: transport_occurrences
DROP TRIGGER IF EXISTS trg_transport_occurrences_upd ON public.transport_occurrences;
-- Índices: transport_checklists
CREATE INDEX IF NOT EXISTS idx_transport_checklists_school_id ON public.transport_checklists(school_id);
CREATE INDEX IF NOT EXISTS idx_transport_checklists_status ON public.transport_checklists(status);
CREATE INDEX IF NOT EXISTS idx_transport_checklists_created_at ON public.transport_checklists(created_at);
CREATE INDEX IF NOT EXISTS idx_transport_checklists_deleted_at ON public.transport_checklists(deleted_at);
CREATE INDEX IF NOT EXISTS idx_transport_checklists_metadata ON public.transport_checklists USING GIN (metadata);

-- RLS: transport_checklists
ALTER TABLE public.transport_checklists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_transport_checklists_access ON public.transport_checklists;
CREATE POLICY p_transport_checklists_access ON public.transport_checklists FOR ALL USING (deleted_at IS NULL);

-- Trigger: transport_checklists
DROP TRIGGER IF EXISTS trg_transport_checklists_upd ON public.transport_checklists;

-- Índices Específicos
CREATE INDEX IF NOT EXISTS idx_transp_boarding_stud_time ON public.transport_boarding_logs(student_id, action_time);
CREATE INDEX IF NOT EXISTS idx_transp_gps_veh_time ON public.transport_gps_tracking(vehicle_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_transp_maint_veh_date ON public.transport_maintenance(vehicle_id, maintenance_date);
CREATE INDEX IF NOT EXISTS idx_transp_fuel_veh_date ON public.transport_fuel_logs(vehicle_id, fuel_date);

-- Views
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
