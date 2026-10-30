-- ====================================================================
-- EDUCA+ ERP EDUCACIONAL — MOTOR GLOBAL DE SINCRONIZAÇÃO (ENTERPRISE)
-- SCRIPT SQL PRODUCTION-READY PARA EVENT BUS E REALTIME
-- ====================================================================

-- 1. TABELA PRINCIPAL: GLOBAL EVENT BUS
CREATE TABLE IF NOT EXISTS public.global_event_bus (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(255) NOT NULL, -- Ex: INSERT, UPDATE, DELETE, CUSTOM_EVENT
    origin_module VARCHAR(100) NOT NULL,
    destination_module VARCHAR(100) DEFAULT '*',
    school_id UUID,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    payload_json JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'Pendente', -- Pendente, Em processamento, Sincronizado, Erro, Reprocessando
    retry_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE LOGS COMPLETOS DE SINCRONIZAÇÃO
CREATE TABLE IF NOT EXISTS public.global_sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES public.global_event_bus(event_id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ip_address VARCHAR(45),
    panel VARCHAR(100),
    module VARCHAR(100),
    table_name VARCHAR(100),
    record_id VARCHAR(255),
    execution_time_ms INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA DE ERROS DE INTEGRAÇÃO (DEAD LETTER QUEUE)
CREATE TABLE IF NOT EXISTS public.global_integration_errors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES public.global_event_bus(event_id) ON DELETE CASCADE,
    error_message TEXT,
    stack_trace TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved BOOLEAN DEFAULT false
);

-- 4. FUNÇÃO PARA ATUALIZAR O UPDATED_AT
CREATE OR REPLACE FUNCTION public.update_global_event_bus_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_global_event_bus_upd ON public.global_event_bus;
CREATE TRIGGER trg_global_event_bus_upd 
BEFORE UPDATE ON public.global_event_bus 
FOR EACH ROW EXECUTE FUNCTION public.update_global_event_bus_updated_at();

-- 5. HABILITANDO O REALTIME PARA O EVENT BUS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'global_event_bus'
    ) THEN
        -- Tenta adicionar. Se já estiver (race condition ou erro anterior), ignora o erro.
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.global_event_bus;
        EXCEPTION WHEN duplicate_object THEN
            NULL;
        END;
    END IF;
END
$$;

-- 6. RLS (Row Level Security) - MULTI-TENANT
ALTER TABLE public.global_event_bus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_integration_errors ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
-- Administradores veem tudo. Outros perfis veem apenas eventos da sua escola (tenant).
DROP POLICY IF EXISTS p_global_event_bus_select ON public.global_event_bus;
CREATE POLICY p_global_event_bus_select ON public.global_event_bus FOR SELECT 
USING (
    public.has_role(auth.uid(), 'Educa+Admin') OR 
    (school_id IS NOT NULL AND public.can_access_school(auth.uid(), school_id))
);

-- 7. TRIGGER GENÉRICO DE CAPTURA DE EVENTOS (CHANGE DATA CAPTURE LÓGICO)
-- Esta função pode ser acoplada a qualquer tabela do sistema para gerar eventos automaticamente no Event Bus
CREATE OR REPLACE FUNCTION public.trg_capture_global_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_school_id UUID;
    v_payload JSONB;
BEGIN
    -- Tenta extrair o school_id se a tabela possuir a coluna
    BEGIN
        IF TG_OP = 'DELETE' THEN
            EXECUTE 'SELECT $1.school_id' INTO v_school_id USING OLD;
        ELSE
            EXECUTE 'SELECT $1.school_id' INTO v_school_id USING NEW;
        END IF;
    EXCEPTION WHEN undefined_column THEN
        v_school_id := NULL;
    END;

    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        v_payload := row_to_json(NEW)::jsonb;
    ELSIF TG_OP = 'DELETE' THEN
        v_payload := row_to_json(OLD)::jsonb;
    END IF;

    -- Insere no Event Bus
    INSERT INTO public.global_event_bus (
        event_type, 
        origin_module, 
        school_id, 
        user_id, 
        payload_json
    ) VALUES (
        TG_OP, 
        TG_TABLE_NAME, 
        v_school_id, 
        auth.uid(), 
        v_payload
    );
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

-- Exemplo de acoplamento da trigger (Pode ser aplicado dinamicamente a todas as tabelas)
/*
CREATE TRIGGER trg_schools_events AFTER INSERT OR UPDATE OR DELETE ON public.schools FOR EACH ROW EXECUTE FUNCTION public.trg_capture_global_event();
CREATE TRIGGER trg_students_events AFTER INSERT OR UPDATE OR DELETE ON public.students FOR EACH ROW EXECUTE FUNCTION public.trg_capture_global_event();
*/
