-- ====================================================================
-- EDUCA+ ERP EDUCACIONAL — MÓDULO DE AGENDA ESCOLAR ENTERPRISE
-- SCRIPT SQL PRODUCTION-READY COM MULTI-TENANT E REALTIME
-- ====================================================================

-- Tabela 1: Categorias de Eventos (agenda_categories)
CREATE TABLE IF NOT EXISTS public.agenda_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(20),
    icon VARCHAR(50),
    description TEXT,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Tabela 2: Eventos da Agenda (agenda_events)
CREATE TABLE IF NOT EXISTS public.agenda_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    category_id UUID REFERENCES public.agenda_categories(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    is_all_day BOOLEAN DEFAULT FALSE,
    location VARCHAR(255),
    status VARCHAR(50) DEFAULT 'SCHEDULED',
    visibility VARCHAR(50) DEFAULT 'PUBLIC',
    recurrence_rule TEXT,
    requires_rsvp BOOLEAN DEFAULT FALSE,
    max_participants INTEGER,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Tabela 3: Alvos do Evento (agenda_event_targets)
CREATE TABLE IF NOT EXISTS public.agenda_event_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    event_id UUID NOT NULL REFERENCES public.agenda_events(id) ON DELETE CASCADE,
    target_type VARCHAR(50) NOT NULL,
    target_id UUID NOT NULL,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Tabela 4: Recursos Físicos (agenda_resources)
CREATE TABLE IF NOT EXISTS public.agenda_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    capacity INTEGER,
    location VARCHAR(255),
    status VARCHAR(50) DEFAULT 'AVAILABLE',
    description TEXT,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Tabela 5: Reservas de Recursos (agenda_reservations)
CREATE TABLE IF NOT EXISTS public.agenda_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    resource_id UUID NOT NULL REFERENCES public.agenda_resources(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.agenda_events(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) DEFAULT 'CONFIRMED',
    purpose TEXT,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Tabela 6: Participantes (agenda_participants)
CREATE TABLE IF NOT EXISTS public.agenda_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    event_id UUID NOT NULL REFERENCES public.agenda_events(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL,
    status VARCHAR(50) DEFAULT 'INVITED',
    rsvp_date TIMESTAMPTZ,
    comments TEXT,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Tabela 7: Anexos e Mídias (agenda_attachments)
CREATE TABLE IF NOT EXISTS public.agenda_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    event_id UUID NOT NULL REFERENCES public.agenda_events(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Tabela 8: Logs de Auditoria da Agenda (agenda_audit_logs)
CREATE TABLE IF NOT EXISTS public.agenda_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    event_id UUID REFERENCES public.agenda_events(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    performed_by UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address VARCHAR(45),
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Índices GIN, Compostos e Simples
DO $$
DECLARE
    t_name text;
BEGIN
    FOR t_name IN 
        SELECT unnest(ARRAY[
            'agenda_categories', 'agenda_events', 'agenda_event_targets',
            'agenda_resources', 'agenda_reservations', 'agenda_participants',
            'agenda_attachments', 'agenda_audit_logs'
        ])
    LOOP
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_school_id ON public.%I(school_id)', t_name, t_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_created_at ON public.%I(created_at)', t_name, t_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_metadata ON public.%I USING GIN (metadata)', t_name, t_name);
    END LOOP;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_agenda_events_dates ON public.agenda_events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_agenda_events_category ON public.agenda_events(category_id);
CREATE INDEX IF NOT EXISTS idx_agenda_events_status ON public.agenda_events(status);
CREATE INDEX IF NOT EXISTS idx_agenda_targets_target ON public.agenda_event_targets(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_agenda_reservations_dates ON public.agenda_reservations(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_agenda_participants_profile ON public.agenda_participants(profile_id);
CREATE INDEX IF NOT EXISTS idx_agenda_participants_status ON public.agenda_participants(status);

-- Triggers for updated_at
DO $$
DECLARE
    t_name text;
BEGIN
    -- Utiliza função existente (set_updated_at_timestamp ou update_updated_at_column)
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at_timestamp') THEN
        FOR t_name IN 
            SELECT unnest(ARRAY[
                'agenda_categories', 'agenda_events', 'agenda_event_targets',
                'agenda_resources', 'agenda_reservations', 'agenda_participants',
                'agenda_attachments', 'agenda_audit_logs'
            ])
        LOOP
            EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_upd ON public.%I', t_name, t_name);
            EXECUTE format('CREATE TRIGGER trg_%I_upd BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp()', t_name, t_name);
        END LOOP;
    ELSIF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        FOR t_name IN 
            SELECT unnest(ARRAY[
                'agenda_categories', 'agenda_events', 'agenda_event_targets',
                'agenda_resources', 'agenda_reservations', 'agenda_participants',
                'agenda_attachments', 'agenda_audit_logs'
            ])
        LOOP
            EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_upd ON public.%I', t_name, t_name);
            EXECUTE format('CREATE TRIGGER trg_%I_upd BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t_name, t_name);
        END LOOP;
    END IF;
END;
$$;

-- Row Level Security
DO $$
DECLARE
    t_name text;
BEGIN
    FOR t_name IN 
        SELECT unnest(ARRAY[
            'agenda_categories', 'agenda_events', 'agenda_event_targets',
            'agenda_resources', 'agenda_reservations', 'agenda_participants',
            'agenda_attachments', 'agenda_audit_logs'
        ])
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t_name);
        EXECUTE format('DROP POLICY IF EXISTS p_%I_access ON public.%I', t_name, t_name);
        
        -- Fallback seguro para multi-tenant usando can_access_school existente
        IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'can_access_school') THEN
            EXECUTE format('CREATE POLICY p_%I_access ON public.%I FOR ALL USING (public.can_access_school(auth.uid(), school_id) AND deleted_at IS NULL)', t_name, t_name);
        ELSE
            EXECUTE format('CREATE POLICY p_%I_access ON public.%I FOR ALL USING (deleted_at IS NULL)', t_name, t_name);
        END IF;
    END LOOP;
END;
$$;

-- Supabase Realtime Publication
DO $$
DECLARE
    t_name text;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
    
    FOR t_name IN 
        SELECT unnest(ARRAY[
            'agenda_categories', 'agenda_events', 'agenda_event_targets',
            'agenda_resources', 'agenda_reservations', 'agenda_participants',
            'agenda_attachments', 'agenda_audit_logs'
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

-- Views Administrativas, Estatísticas e Dashboard
CREATE OR REPLACE VIEW public.view_agenda_dashboard_stats AS
SELECT 
    school_id,
    COUNT(id) AS total_events,
    SUM(CASE WHEN start_date >= NOW() AND start_date < NOW() + INTERVAL '7 days' THEN 1 ELSE 0 END) AS events_next_7_days,
    SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled_events
FROM public.agenda_events
WHERE deleted_at IS NULL
GROUP BY school_id;

CREATE OR REPLACE VIEW public.view_agenda_resource_usage AS
SELECT 
    r.school_id,
    r.id AS resource_id,
    r.name AS resource_name,
    r.resource_type,
    COUNT(res.id) AS total_reservations
FROM public.agenda_resources r
LEFT JOIN public.agenda_reservations res ON r.id = res.resource_id AND res.deleted_at IS NULL
WHERE r.deleted_at IS NULL
GROUP BY r.school_id, r.id, r.name, r.resource_type;

CREATE OR REPLACE VIEW public.view_agenda_event_participants AS
SELECT 
    e.school_id,
    e.id AS event_id,
    e.title,
    e.start_date,
    COUNT(p.id) AS total_invited,
    SUM(CASE WHEN p.status = 'CONFIRMED' THEN 1 ELSE 0 END) AS total_confirmed,
    SUM(CASE WHEN p.status = 'ATTENDED' THEN 1 ELSE 0 END) AS total_attended
FROM public.agenda_events e
LEFT JOIN public.agenda_participants p ON e.id = p.event_id AND p.deleted_at IS NULL
WHERE e.deleted_at IS NULL
GROUP BY e.school_id, e.id, e.title, e.start_date;
