-- ====================================================================
-- EDUCA+ ERP EDUCACIONAL — INTEGRATION ENGINE (EVENT-DRIVEN)
-- SCRIPT SQL PRODUCTION-READY PARA MENSAGERIA E WEBHOOKS
-- ====================================================================

-- 1) SYSTEM EVENTS (Catálogo de eventos suportados pelo sistema)
CREATE TABLE IF NOT EXISTS public.system_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    module VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed básico de eventos
INSERT INTO public.system_events (event_name, module, description) VALUES
('communication.announcement.created', 'communication', 'Novo comunicado criado'),
('communication.occurrence.created', 'communication', 'Nova ocorrência disciplinar'),
('food.menu.updated', 'food', 'Cardápio atualizado'),
('lost_found.item.registered', 'lost_found', 'Novo item registrado nos achados e perdidos'),
('portaria.qrcode.generated', 'portaria', 'Novo QR Code gerado para acesso'),
('marketplace.subscription.activated', 'marketplace', 'Assinatura ativada no Marketplace'),
('marketplace.subscription.expired', 'marketplace', 'Assinatura vencida no Marketplace'),
('marketplace.advertiser.created', 'marketplace', 'Novo anunciante cadastrado')
ON CONFLICT (event_name) DO NOTHING;

-- 2) INTEGRATION QUEUE (Fila principal de eventos - "Event Bus")
CREATE TABLE IF NOT EXISTS public.integration_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_name VARCHAR(255) NOT NULL, -- FK referenciando system_events.event_name (lógico)
    payload JSONB NOT NULL,
    school_id UUID,
    triggered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, PROCESSING, COMPLETED, FAILED
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    next_retry_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3) INTEGRATION LOGS (Histórico de processamento de eventos)
CREATE TABLE IF NOT EXISTS public.integration_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    queue_id UUID REFERENCES public.integration_queue(id) ON DELETE CASCADE,
    action VARCHAR(255),
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4) EVENT SUBSCRIPTIONS (Quem deve ser notificado sobre quais eventos internamente)
CREATE TABLE IF NOT EXISTS public.event_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_name VARCHAR(255) NOT NULL,
    subscriber_module VARCHAR(100) NOT NULL,
    action_to_take VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5) WEBHOOKS (Integrações externas)
CREATE TABLE IF NOT EXISTS public.webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID,
    url TEXT NOT NULL,
    secret TEXT,
    events TEXT[] NOT NULL, -- Ex: ['communication.*', 'marketplace.subscription.activated']
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6) SYNC HISTORY (Auditoria de sincronizações de dados entre tabelas/sistemas)
CREATE TABLE IF NOT EXISTS public.sync_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(100),
    entity_id UUID,
    source_module VARCHAR(100),
    target_module VARCHAR(100),
    status VARCHAR(50),
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7) INTEGRATION ERRORS (Dead Letter Queue lógica / Erros fatais)
CREATE TABLE IF NOT EXISTS public.integration_errors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    queue_id UUID REFERENCES public.integration_queue(id) ON DELETE SET NULL,
    error_message TEXT,
    stack_trace TEXT,
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- 8) NOTIFICATION QUEUE (Fila específica para envio de Push/Email/SMS a partir de eventos)
CREATE TABLE IF NOT EXISTS public.notification_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- EMAIL, SMS, PUSH, IN_APP
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    data JSONB,
    status VARCHAR(50) DEFAULT 'PENDING',
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9) BACKGROUND JOBS (Tarefas agendadas, limpeza, etc)
CREATE TABLE IF NOT EXISTS public.background_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_name VARCHAR(255) NOT NULL,
    schedule_cron VARCHAR(100),
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'IDLE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS (Em geral, filas são operadas por services ou Triggers/Edge Functions com Security Definer)
ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.background_jobs ENABLE ROW LEVEL SECURITY;

-- Função auxiliar para verificar permissões de role
CREATE OR REPLACE FUNCTION public.has_role(user_id UUID, role_name VARCHAR)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    has_access BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.profile_id = user_id AND r.name = role_name
    ) INTO has_access;
    RETURN has_access;
END;
$$;

-- Políticas Restritas (Somente backend/admin podem ver as filas. Inserções de eventos na queue são feitas por Triggers Security Definer)
DROP POLICY IF EXISTS p_system_events_select ON public.system_events;
CREATE POLICY p_system_events_select ON public.system_events FOR SELECT USING (true); -- Leitura pública p/ catálogo

DROP POLICY IF EXISTS p_int_queue_all ON public.integration_queue;
CREATE POLICY p_int_queue_all ON public.integration_queue FOR ALL USING (public.has_role(auth.uid(), 'Educa+Admin'));

DROP POLICY IF EXISTS p_notif_queue_select ON public.notification_queue;
CREATE POLICY p_notif_queue_select ON public.notification_queue FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'Educa+Admin'));

-- TRIGGER GENÉRICO PARA INSERIR EVENTOS NA FILA (Exemplo para tabela de comunicados, a ser adaptado para tabelas reais)
CREATE OR REPLACE FUNCTION public.trg_enqueue_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event_name VARCHAR;
    v_school_id UUID;
BEGIN
    -- O nome do evento e school_id devem ser passados como argumentos para a trigger ou extraídos do NEW
    -- Exemplo genérico:
    IF TG_TABLE_NAME = 'announcements' AND TG_OP = 'INSERT' THEN
        v_event_name := 'communication.announcement.created';
        v_school_id := NEW.school_id;
    END IF;

    IF v_event_name IS NOT NULL THEN
        INSERT INTO public.integration_queue (event_name, payload, school_id, triggered_by)
        VALUES (v_event_name, row_to_json(NEW)::jsonb, v_school_id, auth.uid());
    END IF;
    
    RETURN NEW;
END;
$$;

