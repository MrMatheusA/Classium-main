-- ====================================================================
-- EDUCA+ ERP EDUCACIONAL — MÓDULO DE TRANSPORTE ESCOLAR (ETAPA 9)
-- MIGRATION: 0042_transport_fleet_enterprise.sql
-- Multi-tenant, RLS Hardening, Realtime & RPCs para Gestão de Frota e Rotas
-- ====================================================================

-- 1. TABELA PRINCIPAL DE VEÍCULOS DE TRANSPORTE (transport_vehicles)
CREATE TABLE IF NOT EXISTS public.transport_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID,
    prefix_number VARCHAR(50) NOT NULL,
    vehicle_type VARCHAR(50) DEFAULT 'Ônibus',
    plate VARCHAR(20) NOT NULL,
    model VARCHAR(100),
    brand VARCHAR(100),
    year INTEGER,
    capacity INTEGER NOT NULL DEFAULT 40,
    route_name VARCHAR(255),
    shift VARCHAR(50) DEFAULT '1º Turno',
    driver_name VARCHAR(255),
    driver_phone VARCHAR(50),
    driver_cnh VARCHAR(50),
    monitor_name VARCHAR(255),
    monitor_phone VARCHAR(50),
    observations TEXT,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Garantir todas as colunas necessárias em transport_vehicles caso já existisse
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transport_vehicles' AND column_name = 'organization_id') THEN
        ALTER TABLE public.transport_vehicles ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transport_vehicles' AND column_name = 'school_id') THEN
        ALTER TABLE public.transport_vehicles ADD COLUMN school_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transport_vehicles' AND column_name = 'prefix_number') THEN
        ALTER TABLE public.transport_vehicles ADD COLUMN prefix_number VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transport_vehicles' AND column_name = 'vehicle_type') THEN
        ALTER TABLE public.transport_vehicles ADD COLUMN vehicle_type VARCHAR(50) DEFAULT 'Ônibus';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transport_vehicles' AND column_name = 'route_name') THEN
        ALTER TABLE public.transport_vehicles ADD COLUMN route_name VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transport_vehicles' AND column_name = 'shift') THEN
        ALTER TABLE public.transport_vehicles ADD COLUMN shift VARCHAR(50) DEFAULT '1º Turno';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transport_vehicles' AND column_name = 'driver_name') THEN
        ALTER TABLE public.transport_vehicles ADD COLUMN driver_name VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transport_vehicles' AND column_name = 'driver_phone') THEN
        ALTER TABLE public.transport_vehicles ADD COLUMN driver_phone VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transport_vehicles' AND column_name = 'driver_cnh') THEN
        ALTER TABLE public.transport_vehicles ADD COLUMN driver_cnh VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transport_vehicles' AND column_name = 'monitor_name') THEN
        ALTER TABLE public.transport_vehicles ADD COLUMN monitor_name VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transport_vehicles' AND column_name = 'monitor_phone') THEN
        ALTER TABLE public.transport_vehicles ADD COLUMN monitor_phone VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transport_vehicles' AND column_name = 'observations') THEN
        ALTER TABLE public.transport_vehicles ADD COLUMN observations TEXT;
    END IF;
END;
$$;

-- 2. TABELA DE VÍNCULO DE ALUNOS AO TRANSPORTE (transport_students)
CREATE TABLE IF NOT EXISTS public.transport_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID,
    student_id UUID NOT NULL,
    vehicle_id UUID REFERENCES public.transport_vehicles(id) ON DELETE SET NULL,
    route_id UUID,
    stop_id UUID,
    boarding_type VARCHAR(50) DEFAULT 'BOTH', -- PICKUP, DROPOFF, BOTH
    status VARCHAR(50) DEFAULT 'Vinculado', -- 'Vinculado', 'Aguardando Vinculação', 'Inativo'
    boarding_status VARCHAR(50) DEFAULT 'Aguardando', -- 'Embarcado', 'Aguardando', 'Ausente', 'Desembarcado'
    last_boarding_at TIMESTAMPTZ,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT uq_transport_student_active UNIQUE (student_id, deleted_at)
);

-- Garantir colunas em transport_students caso já existisse
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transport_students' AND column_name = 'organization_id') THEN
        ALTER TABLE public.transport_students ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transport_students' AND column_name = 'vehicle_id') THEN
        ALTER TABLE public.transport_students ADD COLUMN vehicle_id UUID REFERENCES public.transport_vehicles(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transport_students' AND column_name = 'boarding_status') THEN
        ALTER TABLE public.transport_students ADD COLUMN boarding_status VARCHAR(50) DEFAULT 'Aguardando';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transport_students' AND column_name = 'last_boarding_at') THEN
        ALTER TABLE public.transport_students ADD COLUMN last_boarding_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transport_students' AND column_name = 'notes') THEN
        ALTER TABLE public.transport_students ADD COLUMN notes TEXT;
    END IF;
END;
$$;

-- 3. TABELA DE HISTÓRICO DE EMBARQUE / DESEMBARQUE (transport_boarding_logs)
CREATE TABLE IF NOT EXISTS public.transport_boarding_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID,
    student_id UUID NOT NULL,
    vehicle_id UUID REFERENCES public.transport_vehicles(id) ON DELETE SET NULL,
    route_id UUID,
    action_type VARCHAR(50) NOT NULL, -- 'EMBARQUE', 'DESEMBARQUE', 'AUSENTE'
    action_time TIMESTAMPTZ DEFAULT NOW(),
    logged_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 4. TABELA DE ROTAS E LINHAS DE TRANSPORTE (transport_routes)
CREATE TABLE IF NOT EXISTS public.transport_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    description TEXT,
    vehicle_id UUID REFERENCES public.transport_vehicles(id) ON DELETE SET NULL,
    shift VARCHAR(50) DEFAULT '1º Turno',
    origin VARCHAR(255) DEFAULT 'Garagem Central',
    destination VARCHAR(255) DEFAULT 'Unidade Sede',
    distance_km NUMERIC(6, 2),
    estimated_duration_min INTEGER,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 5. PONTOS DE PARADA (transport_route_stops)
CREATE TABLE IF NOT EXISTS public.transport_route_stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID,
    route_id UUID REFERENCES public.transport_routes(id) ON DELETE CASCADE,
    stop_name VARCHAR(255) NOT NULL,
    address TEXT,
    neighborhood VARCHAR(100),
    sequence_order INTEGER DEFAULT 1,
    estimated_time TIME,
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- ====================================================================
-- ÍNDICES DE ALTA PERFORMANCE
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_transp_veh_org_status ON public.transport_vehicles(organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transp_veh_plate ON public.transport_vehicles(plate);
CREATE INDEX IF NOT EXISTS idx_transp_veh_shift ON public.transport_vehicles(shift);

CREATE INDEX IF NOT EXISTS idx_transp_stud_org ON public.transport_students(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transp_stud_veh ON public.transport_students(vehicle_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transp_stud_stud ON public.transport_students(student_id);
CREATE INDEX IF NOT EXISTS idx_transp_stud_status ON public.transport_students(status);

CREATE INDEX IF NOT EXISTS idx_transp_board_org_time ON public.transport_boarding_logs(organization_id, action_time);
CREATE INDEX IF NOT EXISTS idx_transp_board_stud ON public.transport_boarding_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_transp_board_veh ON public.transport_boarding_logs(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_transp_routes_org ON public.transport_routes(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transp_stops_route ON public.transport_route_stops(route_id, sequence_order) WHERE deleted_at IS NULL;

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE public.transport_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_boarding_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_route_stops ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    t_name text;
BEGIN
    FOR t_name IN SELECT unnest(ARRAY[
        'transport_vehicles', 'transport_students', 'transport_boarding_logs',
        'transport_routes', 'transport_route_stops'
    ])
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS p_%I_admin_all ON public.%I', t_name, t_name);
        EXECUTE format('DROP POLICY IF EXISTS p_%I_select ON public.%I', t_name, t_name);
        EXECUTE format('DROP POLICY IF EXISTS p_%I_insert ON public.%I', t_name, t_name);
        EXECUTE format('DROP POLICY IF EXISTS p_%I_update ON public.%I', t_name, t_name);
        EXECUTE format('DROP POLICY IF EXISTS p_%I_delete ON public.%I', t_name, t_name);
        
        -- Policy unificada com suporte a soft-delete
        EXECUTE format('
            CREATE POLICY p_%I_all ON public.%I 
            FOR ALL 
            USING (
                (deleted_at IS NULL) AND
                (
                    auth.uid() IS NULL OR
                    organization_id IS NULL OR
                    EXISTS (
                        SELECT 1 FROM public.profiles p 
                        WHERE p.id = auth.uid() 
                        AND (p.organization_id = %I.organization_id OR p.role IN (''ADMIN'', ''GESTOR'', ''SUPER_ADMIN'', ''SECRETARY''))
                    ) OR
                    EXISTS (
                        SELECT 1 FROM public.organization_members om
                        WHERE om.user_id = auth.uid()
                        AND om.organization_id = %I.organization_id
                    )
                )
            )
            WITH CHECK (
                auth.uid() IS NULL OR
                organization_id IS NULL OR
                EXISTS (
                    SELECT 1 FROM public.profiles p 
                    WHERE p.id = auth.uid() 
                    AND (p.organization_id = %I.organization_id OR p.role IN (''ADMIN'', ''GESTOR'', ''SUPER_ADMIN'', ''SECRETARY''))
                ) OR
                EXISTS (
                    SELECT 1 FROM public.organization_members om
                    WHERE om.user_id = auth.uid()
                    AND om.organization_id = %I.organization_id
                )
            );
        ', t_name, t_name, t_name, t_name, t_name, t_name);
    END LOOP;
END;
$$;

-- ====================================================================
-- TRIGGERS PARA UPDATED_AT
-- ====================================================================
CREATE OR REPLACE FUNCTION public.set_transport_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_transp_veh_upd ON public.transport_vehicles;
CREATE TRIGGER trg_transp_veh_upd BEFORE UPDATE ON public.transport_vehicles
FOR EACH ROW EXECUTE FUNCTION public.set_transport_updated_at();

DROP TRIGGER IF EXISTS trg_transp_stud_upd ON public.transport_students;
CREATE TRIGGER trg_transp_stud_upd BEFORE UPDATE ON public.transport_students
FOR EACH ROW EXECUTE FUNCTION public.set_transport_updated_at();

DROP TRIGGER IF EXISTS trg_transp_routes_upd ON public.transport_routes;
CREATE TRIGGER trg_transp_routes_upd BEFORE UPDATE ON public.transport_routes
FOR EACH ROW EXECUTE FUNCTION public.set_transport_updated_at();

-- ====================================================================
-- REALTIME PUBLICATION
-- ====================================================================
DO $$
DECLARE
    t_name text;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
    
    FOR t_name IN SELECT unnest(ARRAY[
        'transport_vehicles', 'transport_students', 'transport_boarding_logs', 'transport_routes'
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
-- RPCS ENTERPRISE DE TRANSPORTE ESCOLAR
-- ====================================================================

-- 1. RPC: Obter todos os dados do transporte com alunos e veículos
CREATE OR REPLACE FUNCTION public.get_my_organization_transport_data(
    p_organization_id UUID DEFAULT NULL,
    p_shift VARCHAR DEFAULT NULL,
    p_search VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
    v_result JSONB;
    v_vehicles JSONB;
    v_students JSONB;
    v_stats JSONB;
BEGIN
    -- Determinar organization_id
    IF p_organization_id IS NOT NULL THEN
        v_org_id := p_organization_id;
    ELSE
        SELECT organization_id INTO v_org_id
        FROM public.profiles
        WHERE id = auth.uid()
        LIMIT 1;
        
        IF v_org_id IS NULL THEN
            SELECT id INTO v_org_id FROM public.organizations LIMIT 1;
        END IF;
    END IF;

    -- 1. Carregar Veículos com contagem de passageiros
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', v.id,
            'numero', COALESCE(v.prefix_number, v.model, '01'),
            'tipo', COALESCE(v.vehicle_type, 'Ônibus'),
            'placa', v.plate,
            'capacidade', v.capacity,
            'rota', COALESCE(v.route_name, 'Rota Central'),
            'turno', COALESCE(v.shift, '1º Turno'),
            'driverName', COALESCE(v.driver_name, 'Motorista'),
            'driverPhone', COALESCE(v.driver_phone, ''),
            'driverCnh', COALESCE(v.driver_cnh, ''),
            'monitorName', COALESCE(v.monitor_name, ''),
            'monitorPhone', COALESCE(v.monitor_phone, ''),
            'observacoes', COALESCE(v.observations, ''),
            'status', v.status,
            'studentsIds', COALESCE((
                SELECT jsonb_agg(ts.student_id::text)
                FROM public.transport_students ts
                WHERE ts.vehicle_id = v.id
                AND ts.status = 'Vinculado'
                AND ts.deleted_at IS NULL
            ), '[]'::jsonb),
            'occupiedCount', (
                SELECT COUNT(*)
                FROM public.transport_students ts
                WHERE ts.vehicle_id = v.id
                AND ts.status = 'Vinculado'
                AND ts.deleted_at IS NULL
            )
        )
        ORDER BY v.prefix_number ASC, v.created_at ASC
    ), '[]'::jsonb)
    INTO v_vehicles
    FROM public.transport_vehicles v
    WHERE (v.organization_id = v_org_id OR v.organization_id IS NULL)
    AND v.deleted_at IS NULL
    AND (p_shift IS NULL OR p_shift = 'Todos' OR v.shift = p_shift)
    AND (
        p_search IS NULL OR p_search = '' OR
        v.prefix_number ILIKE '%' || p_search || '%' OR
        v.plate ILIKE '%' || p_search || '%' OR
        v.driver_name ILIKE '%' || p_search || '%' OR
        v.route_name ILIKE '%' || p_search || '%'
    );

    -- 2. Carregar Estudantes que utilizam ou solicitaram transporte
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', s.id::text,
            'name', COALESCE(s.name, s.full_name, 'Estudante'),
            'grade', COALESCE(s.grade, s.class_name, 'Ensino Fundamental'),
            'classId', COALESCE(s.class_name, s.class_id::text, 'Turma A'),
            'shift', COALESCE(ts_veh.shift, '1º Turno'),
            'schoolUnit', 'Unidade Sede',
            'matricula', COALESCE(s.registration_code, s.code, SUBSTRING(s.id::text, 1, 8)),
            'parentName', COALESCE(
                (SELECT g->>'name' FROM jsonb_array_elements(COALESCE(s.guardians, '[]'::jsonb)) g LIMIT 1),
                'Responsável Legal'
            ),
            'parentPhone', COALESCE(
                (SELECT g->>'phone' FROM jsonb_array_elements(COALESCE(s.guardians, '[]'::jsonb)) g LIMIT 1),
                '(31) 98888-0000'
            ),
            'address', COALESCE(
                NULLIF(TRIM(CONCAT_WS(' ', s.address_street, s.address_number, s.address_neighborhood, s.address_city)), ''),
                'Endereço não informado'
            ),
            'status', CASE 
                WHEN ts.vehicle_id IS NOT NULL AND ts.status = 'Vinculado' THEN 'Vinculado'
                ELSE 'Aguardando Vinculação'
            END,
            'vehicleId', ts.vehicle_id::text,
            'boardingStatus', COALESCE(ts.boarding_status, 'Aguardando'),
            'notes', ts.notes
        )
        ORDER BY s.name ASC
    ), '[]'::jsonb)
    INTO v_students
    FROM public.students s
    LEFT JOIN public.transport_students ts ON ts.student_id = s.id AND ts.deleted_at IS NULL
    LEFT JOIN public.transport_vehicles ts_veh ON ts_veh.id = ts.vehicle_id
    WHERE (s.organization_id = v_org_id OR s.organization_id IS NULL)
    AND s.deleted_at IS NULL
    AND (
        s.uses_transport = true 
        OR s.transport_required = true 
        OR ts.id IS NOT NULL
    );

    -- 3. Compilar Estatísticas
    SELECT jsonb_build_object(
        'totalVehicles', (SELECT COUNT(*) FROM public.transport_vehicles WHERE (organization_id = v_org_id OR organization_id IS NULL) AND deleted_at IS NULL),
        'totalCapacity', COALESCE((SELECT SUM(capacity) FROM public.transport_vehicles WHERE (organization_id = v_org_id OR organization_id IS NULL) AND deleted_at IS NULL), 0),
        'totalLinked', (SELECT COUNT(*) FROM public.transport_students ts WHERE (ts.organization_id = v_org_id OR ts.organization_id IS NULL) AND ts.status = 'Vinculado' AND ts.deleted_at IS NULL),
        'totalUnlinked', (SELECT COUNT(*) FROM public.students s LEFT JOIN public.transport_students ts ON ts.student_id = s.id AND ts.deleted_at IS NULL WHERE (s.organization_id = v_org_id OR s.organization_id IS NULL) AND s.deleted_at IS NULL AND (s.uses_transport = true OR s.transport_required = true OR ts.id IS NOT NULL) AND (ts.vehicle_id IS NULL OR ts.status != 'Vinculado'))
    ) INTO v_stats;

    v_result := jsonb_build_object(
        'vehicles', v_vehicles,
        'students', v_students,
        'stats', v_stats,
        'organization_id', v_org_id
    );

    RETURN v_result;
END;
$$;

-- 2. RPC: Salvar / Atualizar Veículo de Transporte
CREATE OR REPLACE FUNCTION public.save_transport_vehicle(
    p_organization_id UUID DEFAULT NULL,
    p_id UUID DEFAULT NULL,
    p_prefix_number VARCHAR DEFAULT '01',
    p_vehicle_type VARCHAR DEFAULT 'Ônibus',
    p_plate VARCHAR DEFAULT '',
    p_capacity INTEGER DEFAULT 40,
    p_route_name VARCHAR DEFAULT '',
    p_shift VARCHAR DEFAULT '1º Turno',
    p_driver_name VARCHAR DEFAULT '',
    p_driver_phone VARCHAR DEFAULT '',
    p_driver_cnh VARCHAR DEFAULT '',
    p_monitor_name VARCHAR DEFAULT '',
    p_monitor_phone VARCHAR DEFAULT '',
    p_observations TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
    v_vehicle_id UUID;
    v_vehicle RECORD;
BEGIN
    IF p_organization_id IS NOT NULL THEN
        v_org_id := p_organization_id;
    ELSE
        SELECT organization_id INTO v_org_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
        IF v_org_id IS NULL THEN
            SELECT id INTO v_org_id FROM public.organizations LIMIT 1;
        END IF;
    END IF;

    IF p_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.transport_vehicles WHERE id = p_id) THEN
        UPDATE public.transport_vehicles
        SET 
            prefix_number = p_prefix_number,
            vehicle_type = p_vehicle_type,
            plate = p_plate,
            capacity = p_capacity,
            route_name = p_route_name,
            shift = p_shift,
            driver_name = p_driver_name,
            driver_phone = p_driver_phone,
            driver_cnh = p_driver_cnh,
            monitor_name = p_monitor_name,
            monitor_phone = p_monitor_phone,
            observations = p_observations,
            updated_at = NOW(),
            updated_by = auth.uid()
        WHERE id = p_id
        RETURNING * INTO v_vehicle;
        
        v_vehicle_id := p_id;
    ELSE
        INSERT INTO public.transport_vehicles (
            organization_id,
            prefix_number,
            vehicle_type,
            plate,
            capacity,
            route_name,
            shift,
            driver_name,
            driver_phone,
            driver_cnh,
            monitor_name,
            monitor_phone,
            observations,
            status,
            created_by,
            updated_by
        ) VALUES (
            v_org_id,
            p_prefix_number,
            p_vehicle_type,
            p_plate,
            p_capacity,
            p_route_name,
            p_shift,
            p_driver_name,
            p_driver_phone,
            p_driver_cnh,
            p_monitor_name,
            p_monitor_phone,
            p_observations,
            'ACTIVE',
            auth.uid(),
            auth.uid()
        )
        RETURNING * INTO v_vehicle;
        
        v_vehicle_id := v_vehicle.id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'vehicle_id', v_vehicle_id,
        'vehicle', row_to_json(v_vehicle)
    );
END;
$$;

-- 3. RPC: Excluir Veículo de Transporte (com desvinculação automática de passageiros)
CREATE OR REPLACE FUNCTION public.delete_transport_vehicle(
    p_vehicle_id UUID,
    p_organization_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. Desvincular estudantes do veículo
    UPDATE public.transport_students
    SET 
        vehicle_id = NULL,
        status = 'Aguardando Vinculação',
        boarding_status = 'Aguardando',
        updated_at = NOW(),
        updated_by = auth.uid()
    WHERE vehicle_id = p_vehicle_id;

    -- 2. Soft-delete do veículo
    UPDATE public.transport_vehicles
    SET 
        deleted_at = NOW(),
        status = 'DELETED',
        updated_by = auth.uid()
    WHERE id = p_vehicle_id;

    RETURN jsonb_build_object('success', true, 'deleted_vehicle_id', p_vehicle_id);
END;
$$;

-- 4. RPC: Vincular Estudante ao Veículo de Transporte com Verificação de Capacidade
CREATE OR REPLACE FUNCTION public.link_student_transport(
    p_student_id UUID,
    p_vehicle_id UUID,
    p_organization_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
    v_capacity INTEGER;
    v_current_count INTEGER;
BEGIN
    IF p_organization_id IS NOT NULL THEN
        v_org_id := p_organization_id;
    ELSE
        SELECT organization_id INTO v_org_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
        IF v_org_id IS NULL THEN
            SELECT id INTO v_org_id FROM public.organizations LIMIT 1;
        END IF;
    END IF;

    -- 1. Verificar capacidade do veículo
    SELECT capacity INTO v_capacity
    FROM public.transport_vehicles
    WHERE id = p_vehicle_id AND deleted_at IS NULL;

    IF v_capacity IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Veículo não encontrado.');
    END IF;

    SELECT COUNT(*) INTO v_current_count
    FROM public.transport_students
    WHERE vehicle_id = p_vehicle_id
    AND student_id != p_student_id
    AND status = 'Vinculado'
    AND deleted_at IS NULL;

    IF v_current_count >= v_capacity THEN
        RETURN jsonb_build_object('success', false, 'error', 'Veículo lotado! A capacidade máxima já foi atingida.');
    END IF;

    -- 2. Atualizar ou Inserir registro em transport_students
    IF EXISTS (SELECT 1 FROM public.transport_students WHERE student_id = p_student_id AND deleted_at IS NULL) THEN
        UPDATE public.transport_students
        SET 
            vehicle_id = p_vehicle_id,
            status = 'Vinculado',
            boarding_status = 'Aguardando',
            updated_at = NOW(),
            updated_by = auth.uid()
        WHERE student_id = p_student_id AND deleted_at IS NULL;
    ELSE
        INSERT INTO public.transport_students (
            organization_id,
            student_id,
            vehicle_id,
            status,
            boarding_status,
            created_by,
            updated_by
        ) VALUES (
            v_org_id,
            p_student_id,
            p_vehicle_id,
            'Vinculado',
            'Aguardando',
            auth.uid(),
            auth.uid()
        );
    END IF;

    -- 3. Atualizar flags no cadastro do estudante
    UPDATE public.students
    SET 
        uses_transport = true,
        transport_required = true,
        updated_at = NOW()
    WHERE id = p_student_id;

    RETURN jsonb_build_object('success', true, 'student_id', p_student_id, 'vehicle_id', p_vehicle_id);
END;
$$;

-- 5. RPC: Desvincular Estudante do Veículo de Transporte
CREATE OR REPLACE FUNCTION public.unlink_student_transport(
    p_student_id UUID,
    p_organization_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.transport_students
    SET 
        vehicle_id = NULL,
        status = 'Aguardando Vinculação',
        boarding_status = 'Aguardando',
        updated_at = NOW(),
        updated_by = auth.uid()
    WHERE student_id = p_student_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'student_id', p_student_id);
END;
$$;

-- 6. RPC: Atualizar Status de Embarque com Log
CREATE OR REPLACE FUNCTION public.update_transport_boarding_status(
    p_student_id UUID,
    p_status VARCHAR, -- 'Embarcado', 'Aguardando', 'Ausente'
    p_organization_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
    v_veh_id UUID;
BEGIN
    IF p_organization_id IS NOT NULL THEN
        v_org_id := p_organization_id;
    ELSE
        SELECT organization_id INTO v_org_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
        IF v_org_id IS NULL THEN
            SELECT id INTO v_org_id FROM public.organizations LIMIT 1;
        END IF;
    END IF;

    SELECT vehicle_id INTO v_veh_id
    FROM public.transport_students
    WHERE student_id = p_student_id AND deleted_at IS NULL
    LIMIT 1;

    -- Atualizar status atual
    UPDATE public.transport_students
    SET 
        boarding_status = p_status,
        last_boarding_at = CASE WHEN p_status = 'Embarcado' THEN NOW() ELSE last_boarding_at END,
        updated_at = NOW(),
        updated_by = auth.uid()
    WHERE student_id = p_student_id AND deleted_at IS NULL;

    -- Inserir no histórico de logs
    INSERT INTO public.transport_boarding_logs (
        organization_id,
        student_id,
        vehicle_id,
        action_type,
        action_time,
        logged_by
    ) VALUES (
        v_org_id,
        p_student_id,
        v_veh_id,
        UPPER(p_status),
        NOW(),
        auth.uid()
    );

    RETURN jsonb_build_object('success', true, 'student_id', p_student_id, 'status', p_status);
END;
$$;

-- ====================================================================
-- SEED IDEMPOTENTE PARA TRANSPORTE CASO A TABELA ESTEJA VAZIA
-- ====================================================================
DO $$
DECLARE
    v_org_id UUID;
    v_veh1_id UUID;
    v_veh2_id UUID;
    v_veh3_id UUID;
    v_st1_id UUID;
    v_st2_id UUID;
    v_st3_id UUID;
    v_st4_id UUID;
    v_st5_id UUID;
BEGIN
    SELECT id INTO v_org_id FROM public.organizations LIMIT 1;
    IF v_org_id IS NULL THEN
        INSERT INTO public.organizations (name, code, status)
        VALUES ('Classium Educacional', 'CLASSIUM', 'ACTIVE')
        RETURNING id INTO v_org_id;
    END IF;

    -- Se não há veículos cadastrados, inserir frota inicial oficial
    IF NOT EXISTS (SELECT 1 FROM public.transport_vehicles WHERE deleted_at IS NULL LIMIT 1) THEN
        INSERT INTO public.transport_vehicles (
            organization_id, prefix_number, vehicle_type, plate, capacity, route_name, shift,
            driver_name, driver_phone, driver_cnh, monitor_name, monitor_phone, observations, status
        ) VALUES 
        (
            v_org_id, '05', 'Ônibus', 'ABC-2D45', 48, 'Zona Norte 03', '1º Turno',
            'José Carlos Silveira', '(31) 99876-5432', '12345678900', 'Maria Oliveira', '(31) 98765-4321',
            'Ônibus com acessibilidade para PWD e ar-condicionado.', 'ACTIVE'
        ) RETURNING id INTO v_veh1_id;

        INSERT INTO public.transport_vehicles (
            organization_id, prefix_number, vehicle_type, plate, capacity, route_name, shift,
            driver_name, driver_phone, driver_cnh, monitor_name, monitor_phone, observations, status
        ) VALUES 
        (
            v_org_id, '02', 'Van', 'XYZ-9876', 15, 'Zona Sul - Centro', '2º Turno',
            'Marcos Vinícius Silva', '(31) 99123-4567', '98765432100', 'Carla Dias', '(31) 99234-5678',
            'Atende região central e bairros vizinhos.', 'ACTIVE'
        ) RETURNING id INTO v_veh2_id;

        INSERT INTO public.transport_vehicles (
            organization_id, prefix_number, vehicle_type, plate, capacity, route_name, shift,
            driver_name, driver_phone, driver_cnh, monitor_name, monitor_phone, observations, status
        ) VALUES 
        (
            v_org_id, '08', 'Micro-ônibus', 'MNO-4E12', 28, 'Rota Rural - Distrito Industrial', 'Educação Infantil',
            'Raimundo Nonato', '(31) 98888-1111', '55544433322', 'Sônia Regina', '(31) 97777-2222',
            'Adaptado com cadeirinhas de elevação para alunos infantis.', 'ACTIVE'
        ) RETURNING id INTO v_veh3_id;

        -- Associar estudantes existentes ao transporte se houver
        SELECT id INTO v_st1_id FROM public.students WHERE deleted_at IS NULL ORDER BY created_at ASC OFFSET 0 LIMIT 1;
        SELECT id INTO v_st2_id FROM public.students WHERE deleted_at IS NULL ORDER BY created_at ASC OFFSET 1 LIMIT 1;
        SELECT id INTO v_st3_id FROM public.students WHERE deleted_at IS NULL ORDER BY created_at ASC OFFSET 2 LIMIT 1;
        SELECT id INTO v_st4_id FROM public.students WHERE deleted_at IS NULL ORDER BY created_at ASC OFFSET 3 LIMIT 1;
        SELECT id INTO v_st5_id FROM public.students WHERE deleted_at IS NULL ORDER BY created_at ASC OFFSET 4 LIMIT 1;

        IF v_st1_id IS NOT NULL AND v_veh1_id IS NOT NULL THEN
            INSERT INTO public.transport_students (organization_id, student_id, vehicle_id, status, boarding_status)
            VALUES (v_org_id, v_st1_id, v_veh1_id, 'Vinculado', 'Embarcado')
            ON CONFLICT DO NOTHING;
            UPDATE public.students SET uses_transport = true, transport_required = true WHERE id = v_st1_id;
        END IF;

        IF v_st2_id IS NOT NULL AND v_veh1_id IS NOT NULL THEN
            INSERT INTO public.transport_students (organization_id, student_id, vehicle_id, status, boarding_status)
            VALUES (v_org_id, v_st2_id, v_veh1_id, 'Vinculado', 'Aguardando')
            ON CONFLICT DO NOTHING;
            UPDATE public.students SET uses_transport = true, transport_required = true WHERE id = v_st2_id;
        END IF;

        IF v_st3_id IS NOT NULL AND v_veh2_id IS NOT NULL THEN
            INSERT INTO public.transport_students (organization_id, student_id, vehicle_id, status, boarding_status)
            VALUES (v_org_id, v_st3_id, v_veh2_id, 'Vinculado', 'Embarcado')
            ON CONFLICT DO NOTHING;
            UPDATE public.students SET uses_transport = true, transport_required = true WHERE id = v_st3_id;
        END IF;

        IF v_st4_id IS NOT NULL AND v_veh3_id IS NOT NULL THEN
            INSERT INTO public.transport_students (organization_id, student_id, vehicle_id, status, boarding_status)
            VALUES (v_org_id, v_st4_id, v_veh3_id, 'Vinculado', 'Embarcado')
            ON CONFLICT DO NOTHING;
            UPDATE public.students SET uses_transport = true, transport_required = true WHERE id = v_st4_id;
        END IF;

        IF v_st5_id IS NOT NULL THEN
            INSERT INTO public.transport_students (organization_id, student_id, vehicle_id, status, boarding_status)
            VALUES (v_org_id, v_st5_id, NULL, 'Aguardando Vinculação', 'Aguardando')
            ON CONFLICT DO NOTHING;
            UPDATE public.students SET uses_transport = true, transport_required = true WHERE id = v_st5_id;
        END IF;
    END IF;
END;
$$;
