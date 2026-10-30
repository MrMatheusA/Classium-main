-- ====================================================================
-- EDUCA+ ERP EDUCACIONAL — MÓDULO DE COMUNICAÇÃO (COMPLETO)
-- SCRIPT SQL PRODUCTION-READY COM MULTI-TENANT E REALTIME
-- ====================================================================

-- Função utilitária para updated_at (caso não exista)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ====================================================================
-- 1. TABELAS DE CONFIGURAÇÃO E CATEGORIAS
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.communication_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.communication_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    channel_name VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    config JSONB DEFAULT '{}'::jsonb,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.communication_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    default_channels TEXT[],
    allow_family_replies BOOLEAN DEFAULT TRUE,
    auto_publish_app BOOLEAN DEFAULT TRUE,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.communication_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    category_id UUID REFERENCES public.communication_categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    html_content TEXT,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ====================================================================
-- 2. TABELAS DE COMUNICADOS GERAIS (ANNOUNCEMENTS)
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    category_id UUID REFERENCES public.communication_categories(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    status VARCHAR(50) DEFAULT 'DRAFT',
    requires_confirmation BOOLEAN DEFAULT FALSE,
    publish_date TIMESTAMPTZ,
    expiration_date TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.announcement_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
    school_id UUID NOT NULL,
    profile_id UUID NOT NULL,
    student_id UUID,
    class_id UUID,
    delivery_status VARCHAR(50) DEFAULT 'PENDING',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.announcement_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
    school_id UUID NOT NULL,
    profile_id UUID NOT NULL,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    device_info TEXT,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.announcement_confirmations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
    school_id UUID NOT NULL,
    profile_id UUID NOT NULL,
    confirmed_at TIMESTAMPTZ DEFAULT NOW(),
    signature_hash TEXT,
    ip_address VARCHAR(45),
    device_info TEXT,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ====================================================================
-- 3. TABELAS DE MENSAGENS (CHAT / THREADS)
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.message_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    title VARCHAR(255),
    context_type VARCHAR(100),
    context_id UUID,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    thread_id UUID NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.message_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.communication_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    reference_type VARCHAR(50),
    reference_id UUID NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ====================================================================
-- 4. TABELAS DE NOTIFICAÇÕES
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.communication_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    profile_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.family_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    profile_id UUID NOT NULL,
    student_id UUID,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ====================================================================
-- 5. TABELAS DE FILAS E AGENDAMENTOS (QUEUES)
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.scheduled_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    message_payload JSONB NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) DEFAULT 'SCHEDULED',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.delivery_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    channel VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    attempts INTEGER DEFAULT 0,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.push_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    profile_id UUID NOT NULL,
    device_token TEXT NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    to_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body_html TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.whatsapp_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    message_text TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.communication_delivery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    channel VARCHAR(50) NOT NULL,
    reference_id UUID,
    status VARCHAR(50) NOT NULL,
    log_message TEXT,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ====================================================================
-- 6. ÍNDICES DE PERFORMANCE E INTEGRIDADE
-- ====================================================================

DO $$
DECLARE
    t_name text;
BEGIN
    FOR t_name IN 
        SELECT unnest(ARRAY[
            'communication_categories', 'communication_channels', 'communication_settings',
            'communication_templates', 'announcements', 'announcement_recipients',
            'announcement_reads', 'announcement_confirmations', 'message_threads',
            'messages', 'message_attachments', 'communication_attachments',
            'communication_notifications', 'family_notifications', 'scheduled_messages',
            'delivery_queue', 'push_notifications', 'email_queue', 'whatsapp_queue',
            'communication_delivery_logs'
        ])
    LOOP
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_school_id ON public.%I(school_id)', t_name, t_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_created_at ON public.%I(created_at)', t_name, t_name);
    END LOOP;
END;
$$;

-- Índices adicionais para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_announcements_status ON public.announcements(status);
CREATE INDEX IF NOT EXISTS idx_announcement_recipients_profile ON public.announcement_recipients(profile_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON public.messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_delivery_queue_status ON public.delivery_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON public.email_queue(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_status ON public.whatsapp_queue(status);

-- ====================================================================
-- 7. TRIGGERS (UPDATED_AT)
-- ====================================================================

DO $$
DECLARE
    t_name text;
BEGIN
    FOR t_name IN 
        SELECT unnest(ARRAY[
            'communication_categories', 'communication_channels', 'communication_settings',
            'communication_templates', 'announcements', 'announcement_recipients',
            'announcement_reads', 'announcement_confirmations', 'message_threads',
            'messages', 'message_attachments', 'communication_attachments',
            'communication_notifications', 'family_notifications', 'scheduled_messages',
            'delivery_queue', 'push_notifications', 'email_queue', 'whatsapp_queue',
            'communication_delivery_logs'
        ])
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_upd ON public.%I', t_name, t_name);
        EXECUTE format('CREATE TRIGGER trg_%I_upd BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t_name, t_name);
    END LOOP;
END;
$$;

-- ====================================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ====================================================================

DO $$
DECLARE
    t_name text;
BEGIN
    FOR t_name IN 
        SELECT unnest(ARRAY[
            'communication_categories', 'communication_channels', 'communication_settings',
            'communication_templates', 'announcements', 'announcement_recipients',
            'announcement_reads', 'announcement_confirmations', 'message_threads',
            'messages', 'message_attachments', 'communication_attachments',
            'communication_notifications', 'family_notifications', 'scheduled_messages',
            'delivery_queue', 'push_notifications', 'email_queue', 'whatsapp_queue',
            'communication_delivery_logs'
        ])
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t_name);
        EXECUTE format('DROP POLICY IF EXISTS p_%I_access ON public.%I', t_name, t_name);
        EXECUTE format('CREATE POLICY p_%I_access ON public.%I FOR ALL USING (public.can_access_school(auth.uid(), school_id) AND deleted_at IS NULL)', t_name, t_name);
    END LOOP;
END;
$$;

-- ====================================================================
-- 9. DASHBOARD E VIEWS ADMINISTRATIVAS
-- ====================================================================

CREATE OR REPLACE VIEW view_communication_stats AS
SELECT 
    school_id,
    COUNT(id) as total_announcements,
    SUM(CASE WHEN status = 'PUBLISHED' THEN 1 ELSE 0 END) as active_announcements
FROM public.announcements
WHERE deleted_at IS NULL
GROUP BY school_id;

CREATE OR REPLACE VIEW view_message_stats AS
SELECT 
    school_id,
    COUNT(id) as total_messages,
    SUM(CASE WHEN is_read = FALSE THEN 1 ELSE 0 END) as unread_messages
FROM public.messages
WHERE deleted_at IS NULL
GROUP BY school_id;

CREATE OR REPLACE VIEW view_queue_status AS
SELECT 
    school_id,
    channel,
    status,
    COUNT(id) as count
FROM public.delivery_queue
WHERE deleted_at IS NULL
GROUP BY school_id, channel, status;

-- ====================================================================
-- 10. PUBLICAÇÃO REALTIME (SUPABASE)
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
            'communication_categories', 'communication_channels', 'communication_settings',
            'communication_templates', 'announcements', 'announcement_recipients',
            'announcement_reads', 'announcement_confirmations', 'message_threads',
            'messages', 'message_attachments', 'communication_attachments',
            'communication_notifications', 'family_notifications', 'scheduled_messages',
            'delivery_queue', 'push_notifications', 'email_queue', 'whatsapp_queue',
            'communication_delivery_logs'
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
