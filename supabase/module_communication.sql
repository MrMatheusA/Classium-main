-- ====================================================================
-- EDUCA+ ERP EDUCACIONAL — MÓDULO DE COMUNICAÇÃO ESCOLAR
-- SCRIPT SQL PRODUCTION-READY COM MULTI-TENANT E REALTIME
-- ====================================================================

-- 1. TABELA DE MODELOS DE COMUNICAÇÃO (communication_templates)
CREATE TABLE IF NOT EXISTS public.communication_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL,
    template_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    html_content TEXT,
    preview_image TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 2. TABELA PRINCIPAL DE COMUNICADOS (communications)
CREATE TABLE IF NOT EXISTS public.communications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    document_type VARCHAR(50),
    content TEXT,
    template_id UUID REFERENCES public.communication_templates(id) ON DELETE SET NULL,
    header_image TEXT,
    footer_image TEXT,
    requires_signature BOOLEAN DEFAULT FALSE,
    requires_confirmation BOOLEAN DEFAULT FALSE,
    publish_date TIMESTAMPTZ,
    expiration_date TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'DRAFT',
    published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 3. TABELA DE DESTINATÁRIOS (communication_recipients)
CREATE TABLE IF NOT EXISTS public.communication_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    communication_id UUID NOT NULL REFERENCES public.communications(id) ON DELETE CASCADE,
    school_id UUID NOT NULL,
    target_type VARCHAR(50), -- 'ALL', 'CLASS', 'STUDENT', 'STAFF', 'TEACHER'
    class_id UUID, -- Referência à turma (lógico)
    student_id UUID, -- Referência ao aluno (lógico)
    profile_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Referência ao destinatário
    delivery_status VARCHAR(50) DEFAULT 'PENDING',
    read_status BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 4. TABELA DE ANEXOS (communication_attachments)
CREATE TABLE IF NOT EXISTS public.communication_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    communication_id UUID NOT NULL REFERENCES public.communications(id) ON DELETE CASCADE,
    school_id UUID NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 5. TABELA DE ASSINATURAS DIGITAIS (digital_signatures)
CREATE TABLE IF NOT EXISTS public.digital_signatures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    communication_id UUID NOT NULL REFERENCES public.communications(id) ON DELETE CASCADE,
    school_id UUID NOT NULL,
    profile_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    signature_type VARCHAR(50),
    signature_hash TEXT NOT NULL,
    signed_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address VARCHAR(45),
    device TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 6. TABELA DE NOTIFICAÇÕES (communication_notifications)
CREATE TABLE IF NOT EXISTS public.communication_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL,
    communication_id UUID REFERENCES public.communications(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 7. TABELA DE HISTÓRICO (communication_history)
CREATE TABLE IF NOT EXISTS public.communication_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL,
    communication_id UUID NOT NULL REFERENCES public.communications(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ====================================================================
-- TRIGGERS DE UPDATED_AT
-- ====================================================================

-- Função genérica já existe, mas garantindo a trigger em cada tabela
DROP TRIGGER IF EXISTS trg_communication_templates_upd ON public.communication_templates;
CREATE TRIGGER trg_communication_templates_upd BEFORE UPDATE ON public.communication_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_communications_upd ON public.communications;
CREATE TRIGGER trg_communications_upd BEFORE UPDATE ON public.communications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_communication_recipients_upd ON public.communication_recipients;
CREATE TRIGGER trg_communication_recipients_upd BEFORE UPDATE ON public.communication_recipients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_communication_attachments_upd ON public.communication_attachments;
CREATE TRIGGER trg_communication_attachments_upd BEFORE UPDATE ON public.communication_attachments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_digital_signatures_upd ON public.digital_signatures;
CREATE TRIGGER trg_digital_signatures_upd BEFORE UPDATE ON public.digital_signatures FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_communication_notifications_upd ON public.communication_notifications;
CREATE TRIGGER trg_communication_notifications_upd BEFORE UPDATE ON public.communication_notifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_communication_history_upd ON public.communication_history;
CREATE TRIGGER trg_communication_history_upd BEFORE UPDATE ON public.communication_history FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ====================================================================
-- ÍNDICES PARA ALTA PERFORMANCE
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_comm_templates_school ON public.communication_templates(school_id);

CREATE INDEX IF NOT EXISTS idx_communications_school ON public.communications(school_id);
CREATE INDEX IF NOT EXISTS idx_communications_status ON public.communications(status);
CREATE INDEX IF NOT EXISTS idx_communications_published ON public.communications(published);
CREATE INDEX IF NOT EXISTS idx_communications_created_at ON public.communications(created_at);

CREATE INDEX IF NOT EXISTS idx_comm_recipients_comm_id ON public.communication_recipients(communication_id);
CREATE INDEX IF NOT EXISTS idx_comm_recipients_school ON public.communication_recipients(school_id);
CREATE INDEX IF NOT EXISTS idx_comm_recipients_profile ON public.communication_recipients(profile_id);
CREATE INDEX IF NOT EXISTS idx_comm_recipients_student ON public.communication_recipients(student_id);

CREATE INDEX IF NOT EXISTS idx_comm_attachments_comm_id ON public.communication_attachments(communication_id);
CREATE INDEX IF NOT EXISTS idx_comm_attachments_school ON public.communication_attachments(school_id);

CREATE INDEX IF NOT EXISTS idx_digital_signatures_comm_id ON public.digital_signatures(communication_id);
CREATE INDEX IF NOT EXISTS idx_digital_signatures_school ON public.digital_signatures(school_id);
CREATE INDEX IF NOT EXISTS idx_digital_signatures_profile ON public.digital_signatures(profile_id);

CREATE INDEX IF NOT EXISTS idx_comm_notifications_school ON public.communication_notifications(school_id);
CREATE INDEX IF NOT EXISTS idx_comm_notifications_profile ON public.communication_notifications(profile_id);

CREATE INDEX IF NOT EXISTS idx_comm_history_comm_id ON public.communication_history(communication_id);
CREATE INDEX IF NOT EXISTS idx_comm_history_school ON public.communication_history(school_id);


-- ====================================================================
-- ROW LEVEL SECURITY (RLS) MULTI-TENANT
-- ====================================================================
ALTER TABLE public.communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_history ENABLE ROW LEVEL SECURITY;

-- Exemplo de Políticas (Permite admin ver tudo, gestores verem da escola, etc.)
-- Utilizando a função public.can_access_school(user_id, school_id) assumida

DROP POLICY IF EXISTS p_comm_templates_access ON public.communication_templates;
CREATE POLICY p_comm_templates_access ON public.communication_templates FOR ALL USING (public.can_access_school(auth.uid(), school_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS p_communications_access ON public.communications;
CREATE POLICY p_communications_access ON public.communications FOR ALL USING (public.can_access_school(auth.uid(), school_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS p_comm_recipients_access ON public.communication_recipients;
CREATE POLICY p_comm_recipients_access ON public.communication_recipients FOR ALL USING (public.can_access_school(auth.uid(), school_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS p_comm_attachments_access ON public.communication_attachments;
CREATE POLICY p_comm_attachments_access ON public.communication_attachments FOR ALL USING (public.can_access_school(auth.uid(), school_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS p_digital_signatures_access ON public.digital_signatures;
CREATE POLICY p_digital_signatures_access ON public.digital_signatures FOR ALL USING (public.can_access_school(auth.uid(), school_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS p_comm_notifications_access ON public.communication_notifications;
CREATE POLICY p_comm_notifications_access ON public.communication_notifications FOR ALL USING (
    (profile_id = auth.uid() OR public.has_role(auth.uid(), 'Educa+Admin')) 
    AND deleted_at IS NULL
);

DROP POLICY IF EXISTS p_comm_history_access ON public.communication_history;
CREATE POLICY p_comm_history_access ON public.communication_history FOR ALL USING (public.can_access_school(auth.uid(), school_id) AND deleted_at IS NULL);


-- ====================================================================
-- SUPABASE REALTIME PUBLICATION
-- ====================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.communication_templates;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.communications;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.communication_recipients;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.communication_attachments;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.digital_signatures;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.communication_notifications;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.communication_history;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END
$$;

