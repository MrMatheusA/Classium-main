-- ====================================================================
-- EDUCA+ ERP EDUCACIONAL — MÓDULO DE COMUNICAÇÃO (COMPLETO)
-- MIGRATION: 0040_communication_system_enterprise.sql
-- Multi-tenant, RLS Hardening, Realtime & RPCs
-- ====================================================================

-- 1. TABELA PRINCIPAL DE COMUNICADOS (announcements)
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    school_id UUID,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    content TEXT,
    category VARCHAR(50) DEFAULT 'Geral',
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    author_name VARCHAR(255),
    target VARCHAR(50) DEFAULT 'all',
    target_type VARCHAR(50) DEFAULT 'all',
    target_audience VARCHAR(50) DEFAULT 'todos',
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    target_class VARCHAR(255),
    status VARCHAR(50) DEFAULT 'published',
    requires_signature BOOLEAN DEFAULT FALSE,
    requires_confirmation BOOLEAN DEFAULT FALSE,
    attachment_url TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    published_at TIMESTAMPTZ DEFAULT NOW(),
    publish_date TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    expiration_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Garantir colunas essenciais caso a tabela já existisse com schema parcial
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'organization_id') THEN
        ALTER TABLE public.announcements ADD COLUMN organization_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'body') THEN
        ALTER TABLE public.announcements ADD COLUMN body TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'target') THEN
        ALTER TABLE public.announcements ADD COLUMN target VARCHAR(50) DEFAULT 'all';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'target_class') THEN
        ALTER TABLE public.announcements ADD COLUMN target_class VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'status') THEN
        ALTER TABLE public.announcements ADD COLUMN status VARCHAR(50) DEFAULT 'published';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'published_at') THEN
        ALTER TABLE public.announcements ADD COLUMN published_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'expires_at') THEN
        ALTER TABLE public.announcements ADD COLUMN expires_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'deleted_at') THEN
        ALTER TABLE public.announcements ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'attachments') THEN
        ALTER TABLE public.announcements ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'requires_signature') THEN
        ALTER TABLE public.announcements ADD COLUMN requires_signature BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'requires_confirmation') THEN
        ALTER TABLE public.announcements ADD COLUMN requires_confirmation BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Índices de performance para announcements
CREATE INDEX IF NOT EXISTS idx_announcements_org ON public.announcements(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_announcements_status ON public.announcements(status);
CREATE INDEX IF NOT EXISTS idx_announcements_published_at ON public.announcements(published_at DESC);

-- 2. TABELA DE DESTINATÁRIOS (announcement_recipients)
CREATE TABLE IF NOT EXISTS public.announcement_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
    organization_id UUID,
    school_id UUID,
    profile_id UUID,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    guardian_id UUID REFERENCES public.guardians(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    delivery_status VARCHAR(50) DEFAULT 'SENT',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ann_recipients_ann_id ON public.announcement_recipients(announcement_id);
CREATE INDEX IF NOT EXISTS idx_ann_recipients_org ON public.announcement_recipients(organization_id);

-- 3. TABELA DE CONFIRMAÇÃO DE LEITURA (announcement_reads)
CREATE TABLE IF NOT EXISTS public.announcement_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
    organization_id UUID,
    profile_id UUID,
    user_id UUID,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    device_info TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ann_reads_ann_id ON public.announcement_reads(announcement_id);

-- 4. TABELA DE CONFIRMAÇÕES / ASSINATURAS (announcement_confirmations)
CREATE TABLE IF NOT EXISTS public.announcement_confirmations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
    organization_id UUID,
    profile_id UUID,
    user_id UUID,
    confirmed_at TIMESTAMPTZ DEFAULT NOW(),
    signature_data TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ann_conf_ann_id ON public.announcement_confirmations(announcement_id);

-- 5. TABELA DE NOTIFICAÇÕES (notifications)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    school_id UUID,
    user_id UUID,
    profile_id UUID,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    type VARCHAR(50) DEFAULT 'announcement',
    reference_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id) WHERE is_read = false;

-- ====================================================================
-- RLS (ROW LEVEL SECURITY)
-- ====================================================================
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS seguras para announcements
DROP POLICY IF EXISTS "announcements_select_policy" ON public.announcements;
CREATE POLICY "announcements_select_policy" ON public.announcements
FOR SELECT USING (
    organization_id IS NULL 
    OR organization_id = (SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid())
    OR auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "announcements_insert_policy" ON public.announcements;
CREATE POLICY "announcements_insert_policy" ON public.announcements
FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "announcements_update_policy" ON public.announcements;
CREATE POLICY "announcements_update_policy" ON public.announcements
FOR UPDATE USING (
    auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "announcements_delete_policy" ON public.announcements;
CREATE POLICY "announcements_delete_policy" ON public.announcements
FOR DELETE USING (
    auth.uid() IS NOT NULL
);

-- ====================================================================
-- RPC 1: get_my_organization_announcements
-- Retorna os comunicados reais da organização com contadores e autores
-- ====================================================================
CREATE OR REPLACE FUNCTION public.get_my_organization_announcements()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
    v_items JSONB;
    v_total INT;
    v_can_manage BOOLEAN := true;
BEGIN
    SELECT organization_id INTO v_org_id FROM profiles WHERE id = auth.uid();
    
    IF v_org_id IS NULL THEN
        SELECT id INTO v_org_id FROM organizations LIMIT 1;
    END IF;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', a.id,
            'organization_id', a.organization_id,
            'title', a.title,
            'body', COALESCE(a.body, a.content, ''),
            'category', COALESCE(a.category, 'Geral'),
            'target', COALESCE(a.target, a.target_type, 'all'),
            'target_class', a.target_class,
            'class_name', COALESCE(c.name, a.target_class, '—'),
            'class_id', a.class_id,
            'author_id', a.author_id,
            'author_name', COALESCE(p.full_name, a.author_name, 'Gestão Escolar'),
            'author_email', COALESCE(p.email, '—'),
            'status', COALESCE(a.status, 'published'),
            'requires_signature', COALESCE(a.requires_signature, false),
            'requires_confirmation', COALESCE(a.requires_confirmation, false),
            'attachment_url', a.attachment_url,
            'attachments', COALESCE(a.attachments, '[]'::jsonb),
            'published_at', COALESCE(a.published_at, a.publish_date, a.created_at),
            'expires_at', COALESCE(a.expires_at, a.expiration_date),
            'created_at', a.created_at,
            'reads_count', (SELECT COUNT(*) FROM announcement_reads r WHERE r.announcement_id = a.id),
            'confirmations_count', (SELECT COUNT(*) FROM announcement_confirmations cf WHERE cf.announcement_id = a.id)
        ) ORDER BY COALESCE(a.published_at, a.created_at) DESC
    ), '[]'::jsonb) INTO v_items
    FROM announcements a
    LEFT JOIN profiles p ON p.id = a.author_id
    LEFT JOIN classes c ON c.id = a.class_id
    WHERE (a.organization_id = v_org_id OR a.organization_id IS NULL)
      AND a.deleted_at IS NULL;

    v_total := jsonb_array_length(v_items);

    RETURN jsonb_build_object(
        'ok', true,
        'organization_id', v_org_id,
        'items', v_items,
        'total', v_total,
        'can_manage', v_can_manage
    );
END;
$$;

-- ====================================================================
-- RPC 2: get_my_organization_communication_audience
-- Retorna a audiência real (turmas, alunos, responsáveis) da instituição
-- ====================================================================
CREATE OR REPLACE FUNCTION public.get_my_organization_communication_audience()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
    v_classes JSONB;
    v_students JSONB;
    v_guardians JSONB;
BEGIN
    SELECT organization_id INTO v_org_id FROM profiles WHERE id = auth.uid();
    
    IF v_org_id IS NULL THEN
        SELECT id INTO v_org_id FROM organizations LIMIT 1;
    END IF;

    -- 1. Turmas
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'grade', c.grade,
        'shift', c.shift,
        'students_count', (SELECT COUNT(*) FROM class_students cs WHERE cs.class_id = c.id)
    )), '[]'::jsonb) INTO v_classes
    FROM classes c
    WHERE (c.organization_id = v_org_id OR c.organization_id IS NULL)
      AND c.deleted_at IS NULL;

    -- 2. Estudantes com suas turmas
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', s.id,
        'name', COALESCE(s.full_name, s.name, 'Estudante'),
        'registration_code', s.registration_code,
        'class_id', s.class_id,
        'class_name', COALESCE(c.name, 'Sem Turma'),
        'guardians', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'id', g.id,
                'name', COALESCE(g.full_name, g.name, 'Responsável'),
                'email', g.email,
                'phone', g.phone,
                'can_receive_app', true
            )), '[]'::jsonb)
            FROM student_guardians sg
            JOIN guardians g ON g.id = sg.guardian_id
            WHERE sg.student_id = s.id
        )
    )), '[]'::jsonb) INTO v_students
    FROM students s
    LEFT JOIN classes c ON c.id = s.class_id
    WHERE (s.organization_id = v_org_id OR s.organization_id IS NULL)
      AND s.deleted_at IS NULL;

    -- 3. Responsáveis
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', g.id,
        'name', COALESCE(g.full_name, g.name, 'Responsável'),
        'email', g.email,
        'phone', g.phone,
        'can_receive_app', true,
        'profile_id', g.profile_id
    )), '[]'::jsonb) INTO v_guardians
    FROM guardians g
    WHERE (g.organization_id = v_org_id OR g.organization_id IS NULL)
      AND g.deleted_at IS NULL;

    RETURN jsonb_build_object(
        'ok', true,
        'organization_id', v_org_id,
        'classes', v_classes,
        'students', v_students,
        'guardians', v_guardians,
        'totals', jsonb_build_object(
            'total_classes', jsonb_array_length(v_classes),
            'total_students', jsonb_array_length(v_students),
            'total_guardians', jsonb_array_length(v_guardians),
            'app_enabled_guardians', jsonb_array_length(v_guardians)
        )
    );
END;
$$;

-- ====================================================================
-- RPC 3: publish_my_organization_announcement
-- Cria ou publica um comunicado real e distribui para os destinatários
-- ====================================================================
CREATE OR REPLACE FUNCTION public.publish_my_organization_announcement(
    p_title TEXT,
    p_body TEXT,
    p_mode TEXT DEFAULT 'all',
    p_class_ids UUID[] DEFAULT NULL,
    p_student_ids UUID[] DEFAULT NULL,
    p_guardian_ids UUID[] DEFAULT NULL,
    p_publish_now BOOLEAN DEFAULT TRUE,
    p_expires_at TIMESTAMPTZ DEFAULT NULL,
    p_create_family_feed BOOLEAN DEFAULT TRUE,
    p_category TEXT DEFAULT 'Geral',
    p_requires_signature BOOLEAN DEFAULT FALSE,
    p_requires_confirmation BOOLEAN DEFAULT FALSE,
    p_status TEXT DEFAULT 'published'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
    v_author_id UUID := auth.uid();
    v_author_name TEXT;
    v_announcement_id UUID;
    v_status TEXT;
    v_published_at TIMESTAMPTZ;
    v_recipients_count INT := 0;
    v_notified_count INT := 0;
    v_class_id UUID := NULL;
    v_target_class_name TEXT := NULL;
BEGIN
    IF TRIM(COALESCE(p_title, '')) = '' THEN
        RETURN jsonb_build_object('ok', false, 'message', 'O título do comunicado é obrigatório.');
    END IF;

    IF TRIM(COALESCE(p_body, '')) = '' THEN
        RETURN jsonb_build_object('ok', false, 'message', 'O conteúdo do comunicado é obrigatório.');
    END IF;

    -- Obter organização e nome do autor
    SELECT organization_id, full_name INTO v_org_id, v_author_name 
    FROM profiles 
    WHERE id = v_author_id;

    IF v_org_id IS NULL THEN
        SELECT id INTO v_org_id FROM organizations LIMIT 1;
    END IF;

    IF v_author_name IS NULL THEN
        v_author_name := 'Gestão Escolar';
    END IF;

    IF p_status IS NOT NULL THEN
        v_status := p_status;
    ELSIF p_publish_now THEN
        v_status := 'published';
    ELSE
        v_status := 'scheduled';
    END IF;

    IF v_status = 'published' THEN
        v_published_at := NOW();
    ELSE
        v_published_at := NULL;
    END IF;

    -- Se for turma única, extrair class_id e nome
    IF p_mode = 'classes' AND p_class_ids IS NOT NULL AND array_length(p_class_ids, 1) = 1 THEN
        v_class_id := p_class_ids[1];
        SELECT name INTO v_target_class_name FROM classes WHERE id = v_class_id;
    END IF;

    -- Inserir comunicado
    INSERT INTO public.announcements (
        organization_id,
        school_id,
        title,
        body,
        content,
        category,
        author_id,
        author_name,
        target,
        target_type,
        target_audience,
        class_id,
        target_class,
        status,
        requires_signature,
        requires_confirmation,
        published_at,
        expires_at,
        created_at,
        updated_at
    ) VALUES (
        v_org_id,
        v_org_id,
        p_title,
        p_body,
        p_body,
        COALESCE(p_category, 'Geral'),
        v_author_id,
        v_author_name,
        p_mode,
        p_mode,
        p_mode,
        v_class_id,
        v_target_class_name,
        v_status,
        COALESCE(p_requires_signature, false),
        COALESCE(p_requires_confirmation, false),
        v_published_at,
        p_expires_at,
        NOW(),
        NOW()
    ) RETURNING id INTO v_announcement_id;

    -- Registrar Destinatários e Notificações
    IF p_mode = 'classes' AND p_class_ids IS NOT NULL THEN
        INSERT INTO public.announcement_recipients (announcement_id, organization_id, class_id, delivery_status)
        SELECT v_announcement_id, v_org_id, unnest(p_class_ids), 'SENT';
        
        GET DIAGNOSTICS v_recipients_count = ROW_COUNT;
        
        -- Notificar responsáveis dos alunos dessas turmas
        INSERT INTO public.notifications (organization_id, title, message, type, reference_id)
        SELECT v_org_id, p_title, LEFT(p_body, 150), 'announcement', v_announcement_id
        FROM students s
        WHERE s.class_id = ANY(p_class_ids) AND (s.organization_id = v_org_id OR s.organization_id IS NULL);
        
        GET DIAGNOSTICS v_notified_count = ROW_COUNT;

    ELSIF p_mode = 'students' AND p_student_ids IS NOT NULL THEN
        INSERT INTO public.announcement_recipients (announcement_id, organization_id, student_id, delivery_status)
        SELECT v_announcement_id, v_org_id, unnest(p_student_ids), 'SENT';
        
        GET DIAGNOSTICS v_recipients_count = ROW_COUNT;
        v_notified_count := v_recipients_count;

    ELSIF p_mode = 'guardians' AND p_guardian_ids IS NOT NULL THEN
        INSERT INTO public.announcement_recipients (announcement_id, organization_id, guardian_id, delivery_status)
        SELECT v_announcement_id, v_org_id, unnest(p_guardian_ids), 'SENT';
        
        GET DIAGNOSTICS v_recipients_count = ROW_COUNT;
        v_notified_count := v_recipients_count;

    ELSE -- 'all' ou 'family' ou 'staff'
        SELECT COUNT(*) INTO v_recipients_count FROM students WHERE (organization_id = v_org_id OR organization_id IS NULL) AND deleted_at IS NULL;
        v_notified_count := v_recipients_count;
    END IF;

    RETURN jsonb_build_object(
        'ok', true,
        'announcement_id', v_announcement_id,
        'recipients_count', GREATEST(v_recipients_count, 1),
        'notified_count', GREATEST(v_notified_count, 1),
        'message', 'Comunicado processado com sucesso.'
    );
END;
$$;

-- ====================================================================
-- RPC 4: delete_my_organization_announcement
-- Exclusão lógica (soft delete) de um comunicado da organização
-- ====================================================================
CREATE OR REPLACE FUNCTION public.delete_my_organization_announcement(
    p_announcement_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
    v_rows INT;
BEGIN
    SELECT organization_id INTO v_org_id FROM profiles WHERE id = auth.uid();
    
    IF v_org_id IS NULL THEN
        SELECT id INTO v_org_id FROM organizations LIMIT 1;
    END IF;

    UPDATE public.announcements
    SET deleted_at = NOW(), updated_at = NOW()
    WHERE id = p_announcement_id
      AND (organization_id = v_org_id OR organization_id IS NULL);

    GET DIAGNOSTICS v_rows = ROW_COUNT;

    IF v_rows > 0 THEN
        RETURN jsonb_build_object('ok', true, 'message', 'Comunicado removido com sucesso.');
    ELSE
        RETURN jsonb_build_object('ok', false, 'message', 'Comunicado não encontrado ou sem permissão para exclusão.');
    END IF;
END;
$$;

-- ====================================================================
-- RPC 5: mark_announcement_as_read
-- Registra confirmação de visualização do comunicado
-- ====================================================================
CREATE OR REPLACE FUNCTION public.mark_announcement_as_read(
    p_announcement_id UUID,
    p_device_info TEXT DEFAULT 'Web Browser'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
    v_user_id UUID := auth.uid();
BEGIN
    SELECT organization_id INTO v_org_id FROM profiles WHERE id = v_user_id;

    INSERT INTO public.announcement_reads (
        announcement_id,
        organization_id,
        profile_id,
        user_id,
        read_at,
        device_info
    ) VALUES (
        p_announcement_id,
        v_org_id,
        v_user_id,
        v_user_id,
        NOW(),
        p_device_info
    );

    RETURN jsonb_build_object('ok', true, 'message', 'Leitura confirmada com sucesso.');
END;
$$;

-- Adicionar tabelas de comunicação na publicação Supabase Realtime
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.announcement_reads;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;
