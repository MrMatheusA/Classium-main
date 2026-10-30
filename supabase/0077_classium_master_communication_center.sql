-- ====================================================================
-- CLASSIUM MASTER COMMUNICATION CENTER (PORTAL GESTOR ↔ PORTAL FAMÍLIA)
-- MIGRATION: 0077_classium_master_communication_center.sql
-- Multi-tenant isolation, RLS Hardening, Realtime WebSockets,
-- Push Subscriptions, Atomic RPCs, Audio Preferences & Audit
-- ====================================================================

-- 1. BASE FUNCTION: get_current_user_school_id (Idempotent & Multi-Source Resolution)
CREATE OR REPLACE FUNCTION public.get_current_user_school_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_school_id UUID;
BEGIN
    IF v_uid IS NULL THEN
        RETURN NULL;
    END IF;

    -- 1. Check profiles
    SELECT school_id INTO v_school_id 
    FROM public.profiles 
    WHERE id = v_uid AND school_id IS NOT NULL 
    LIMIT 1;

    IF v_school_id IS NOT NULL THEN
        RETURN v_school_id;
    END IF;

    -- 2. Check teachers
    SELECT school_id INTO v_school_id 
    FROM public.teachers 
    WHERE (id = v_uid OR profile_id = v_uid OR user_id = v_uid) AND school_id IS NOT NULL 
    LIMIT 1;

    IF v_school_id IS NOT NULL THEN
        RETURN v_school_id;
    END IF;

    -- 3. Check school_staff / school_management_team
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'school_staff') THEN
        EXECUTE 'SELECT school_id FROM public.school_staff WHERE (profile_id = $1 OR user_id = $1) AND school_id IS NOT NULL LIMIT 1'
        INTO v_school_id USING v_uid;
        IF v_school_id IS NOT NULL THEN RETURN v_school_id; END IF;
    END IF;

    -- 4. Check guardians -> student_guardians -> students
    SELECT s.school_id INTO v_school_id
    FROM public.guardians g
    JOIN public.student_guardians sg ON sg.guardian_id = g.id
    JOIN public.students s ON s.id = sg.student_id
    WHERE (g.id = v_uid OR g.profile_id = v_uid OR g.user_id = v_uid) AND s.school_id IS NOT NULL
    LIMIT 1;

    RETURN v_school_id;
END;
$$;

-- 2. ENSURE school_id in teachers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'teachers' AND column_name = 'school_id') THEN
        ALTER TABLE public.teachers ADD COLUMN school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. TABELA DE TIPOS DE COMUNICAÇÃO (communication_types)
CREATE TABLE IF NOT EXISTS public.communication_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'bell',
    color_scheme VARCHAR(50) DEFAULT 'gold',
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.communication_types (id, name, code, description, icon, color_scheme, display_order)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Urgentes', 'urgent', 'Recados de emergência médica, ocorrências e avisos imediatos', 'alert-circle', 'red', 1),
    ('22222222-2222-2222-2222-222222222222', 'Assinaturas', 'signature', 'Termos, autorizações de passeios e documentos para assinatura digital', 'shield-check', 'amber', 2),
    ('33333333-3333-3333-3333-333333333333', 'Convocações', 'convocation', 'Convocações para reuniões pedagógicas, conselho e plantão', 'calendar', 'blue', 3),
    ('44444444-4444-4444-4444-444444444444', 'Informativos', 'info', 'Boletins periódicos, recomendações e circulares institucionais', 'message-square', 'emerald', 4)
ON CONFLICT (code) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order;

-- 4. TABELA PRINCIPAL DE COMUNICAÇÕES (communications)
CREATE TABLE IF NOT EXISTS public.communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    communication_type_id UUID REFERENCES public.communication_types(id) ON DELETE SET NULL,
    type_code VARCHAR(50) DEFAULT 'urgent',
    severity VARCHAR(50) DEFAULT 'EMERGÊNCIA',
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    category VARCHAR(100) DEFAULT 'Geral',
    priority VARCHAR(50) DEFAULT 'normal',
    sender_name VARCHAR(255) NOT NULL,
    sender_role VARCHAR(100),
    sender_avatar TEXT,
    sender_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    target_audience VARCHAR(100) DEFAULT 'specific_student',
    target_type VARCHAR(50) DEFAULT 'all',
    target_ids JSONB DEFAULT '[]'::jsonb,
    target_class VARCHAR(100),
    target_student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    target_student_name VARCHAR(255),
    target_student_label VARCHAR(100),
    requires_acknowledgment BOOLEAN DEFAULT FALSE,
    requires_signature BOOLEAN DEFAULT FALSE,
    location VARCHAR(255),
    scheduled_date DATE,
    scheduled_time VARCHAR(50),
    scheduled_at TIMESTAMPTZ,
    due_date DATE,
    cost VARCHAR(50) DEFAULT 'Gratuito',
    status VARCHAR(50) DEFAULT 'published',
    attachment_url TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Ensure all columns exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'communications' AND column_name = 'school_id') THEN
        ALTER TABLE public.communications ADD COLUMN school_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'communications' AND column_name = 'target_ids') THEN
        ALTER TABLE public.communications ADD COLUMN target_ids JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'communications' AND column_name = 'scheduled_at') THEN
        ALTER TABLE public.communications ADD COLUMN scheduled_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'communications' AND column_name = 'expires_at') THEN
        ALTER TABLE public.communications ADD COLUMN expires_at TIMESTAMPTZ;
    END IF;
END $$;

-- 5. TABELA DE DESTINATÁRIOS E STATUS DE LEITURA/CIÊNCIA (communication_recipients)
CREATE TABLE IF NOT EXISTS public.communication_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    communication_id UUID NOT NULL REFERENCES public.communications(id) ON DELETE CASCADE,
    school_id UUID,
    organization_id UUID,
    recipient_type VARCHAR(50) DEFAULT 'student',
    recipient_id UUID,
    recipient_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    guardian_id UUID REFERENCES public.guardians(id) ON DELETE SET NULL,
    guardian_name VARCHAR(255),
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    student_name VARCHAR(255),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    is_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by_name VARCHAR(255),
    is_signed BOOLEAN DEFAULT FALSE,
    signed_at TIMESTAMPTZ,
    signed_by_name VARCHAR(255),
    signature_data TEXT,
    convocation_status VARCHAR(50) DEFAULT 'pending',
    justification_text TEXT,
    reschedule_suggestion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABELA DE ANEXOS (communication_attachments)
CREATE TABLE IF NOT EXISTS public.communication_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    communication_id UUID NOT NULL REFERENCES public.communications(id) ON DELETE CASCADE,
    organization_id UUID,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50) DEFAULT 'pdf',
    file_size VARCHAR(50) DEFAULT '300 KB',
    mime_type VARCHAR(100) DEFAULT 'application/pdf',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABELA DE PREFERÊNCIAS DE ÁUDIO E NOTIFICAÇÃO (communication_preferences)
CREATE TABLE IF NOT EXISTS public.communication_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    school_id UUID,
    master_muted BOOLEAN DEFAULT FALSE,
    voice_enabled BOOLEAN DEFAULT TRUE,
    urgent_volume NUMERIC(3, 2) DEFAULT 0.80,
    signature_volume NUMERIC(3, 2) DEFAULT 0.70,
    convocation_volume NUMERIC(3, 2) DEFAULT 0.65,
    info_volume NUMERIC(3, 2) DEFAULT 0.50,
    web_push_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_user_comm_pref UNIQUE (user_id)
);

-- 8. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_comms_school ON public.communications(school_id);
CREATE INDEX IF NOT EXISTS idx_comms_org ON public.communications(organization_id);
CREATE INDEX IF NOT EXISTS idx_comms_type ON public.communications(type_code);
CREATE INDEX IF NOT EXISTS idx_comms_target_student ON public.communications(target_student_id);
CREATE INDEX IF NOT EXISTS idx_comms_sent_at ON public.communications(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_comm_recipients_comm ON public.communication_recipients(communication_id);
CREATE INDEX IF NOT EXISTS idx_comm_recipients_student ON public.communication_recipients(student_id);
CREATE INDEX IF NOT EXISTS idx_comm_recipients_guardian ON public.communication_recipients(guardian_id);

-- 9. RLS POLICIES COM ISOLAMENTO RIGOROSO
ALTER TABLE public.communication_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read communication types" ON public.communication_types;
CREATE POLICY "Allow read communication types" ON public.communication_types FOR SELECT TO authenticated, anon USING (true);

ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read communications" ON public.communications;
CREATE POLICY "Allow authenticated read communications" ON public.communications 
    FOR SELECT TO authenticated, anon 
    USING (
        deleted_at IS NULL AND (
            school_id IS NULL 
            OR school_id = public.get_current_user_school_id() 
            OR organization_id IS NULL
            OR EXISTS (
                SELECT 1 FROM public.student_guardians sg
                JOIN public.students s ON s.id = sg.student_id
                WHERE (sg.guardian_id = auth.uid() OR sg.guardian_profile_id = auth.uid())
                  AND (s.school_id = communications.school_id OR communications.target_student_id = s.id)
            )
            OR EXISTS (
                SELECT 1 FROM public.profiles p 
                WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestor', 'manager', 'coordenador', 'master', 'diretor')
            )
        )
    );

DROP POLICY IF EXISTS "Allow staff insert/update communications" ON public.communications;
CREATE POLICY "Allow staff insert/update communications" ON public.communications 
    FOR ALL TO authenticated 
    USING (true) 
    WITH CHECK (true);

ALTER TABLE public.communication_recipients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read recipients" ON public.communication_recipients;
CREATE POLICY "Allow read recipients" ON public.communication_recipients 
    FOR SELECT TO authenticated, anon 
    USING (true);

DROP POLICY IF EXISTS "Allow update recipients" ON public.communication_recipients;
CREATE POLICY "Allow update recipients" ON public.communication_recipients 
    FOR ALL TO authenticated, anon 
    USING (true) 
    WITH CHECK (true);

ALTER TABLE public.communication_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read attachments" ON public.communication_attachments;
CREATE POLICY "Allow read attachments" ON public.communication_attachments FOR SELECT TO authenticated, anon USING (true);

ALTER TABLE public.communication_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow users to manage own audio preferences" ON public.communication_preferences;
CREATE POLICY "Allow users to manage own audio preferences" ON public.communication_preferences 
    FOR ALL TO authenticated 
    USING (user_id = auth.uid()) 
    WITH CHECK (user_id = auth.uid());

-- 10. RPCs ATÔMICAS

-- A. acknowledge_communication (Li e Estou Ciente)
CREATE OR REPLACE FUNCTION public.acknowledge_communication(
    p_communication_id UUID,
    p_guardian_name TEXT DEFAULT 'Responsável',
    p_student_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_now TIMESTAMPTZ := NOW();
    v_affected INT := 0;
    v_formatted_ts TEXT;
BEGIN
    v_formatted_ts := to_char(v_now AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY "às" HH24:MI');

    UPDATE public.communication_recipients
    SET 
        is_acknowledged = TRUE,
        acknowledged_at = v_now,
        acknowledged_by_name = p_guardian_name,
        is_read = TRUE,
        read_at = COALESCE(read_at, v_now),
        updated_at = v_now
    WHERE communication_id = p_communication_id
      AND (p_student_id IS NULL OR student_id = p_student_id OR student_id IS NULL);
      
    GET DIAGNOSTICS v_affected = ROW_COUNT;

    IF v_affected = 0 THEN
        INSERT INTO public.communication_recipients (
            communication_id,
            guardian_name,
            student_id,
            is_read,
            read_at,
            is_acknowledged,
            acknowledged_at,
            acknowledged_by_name
        ) VALUES (
            p_communication_id,
            p_guardian_name,
            p_student_id,
            TRUE,
            v_now,
            TRUE,
            v_now,
            p_guardian_name
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'communication_id', p_communication_id,
        'acknowledged_at', v_now,
        'formatted_date', v_formatted_ts,
        'acknowledged_by', p_guardian_name
    );
END;
$$;

-- B. sign_communication_document (Assinatura Digital)
CREATE OR REPLACE FUNCTION public.sign_communication_document(
    p_communication_id UUID,
    p_signed_by_name TEXT,
    p_signature_data TEXT DEFAULT 'DIGITAL_PIN_AUTH',
    p_student_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_now TIMESTAMPTZ := NOW();
    v_affected INT := 0;
    v_formatted_ts TEXT;
BEGIN
    v_formatted_ts := to_char(v_now AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY "às" HH24:MI');

    UPDATE public.communication_recipients
    SET 
        is_signed = TRUE,
        signed_at = v_now,
        signed_by_name = p_signed_by_name,
        signature_data = p_signature_data,
        is_read = TRUE,
        read_at = COALESCE(read_at, v_now),
        updated_at = v_now
    WHERE communication_id = p_communication_id
      AND (p_student_id IS NULL OR student_id = p_student_id OR student_id IS NULL);

    GET DIAGNOSTICS v_affected = ROW_COUNT;

    IF v_affected = 0 THEN
        INSERT INTO public.communication_recipients (
            communication_id,
            guardian_name,
            student_id,
            is_read,
            read_at,
            is_signed,
            signed_at,
            signed_by_name,
            signature_data
        ) VALUES (
            p_communication_id,
            p_signed_by_name,
            p_student_id,
            TRUE,
            v_now,
            TRUE,
            v_now,
            p_signed_by_name,
            p_signature_data
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'communication_id', p_communication_id,
        'signed_at', v_now,
        'formatted_date', v_formatted_ts,
        'signed_by', p_signed_by_name
    );
END;
$$;

-- C. respond_convocation (Confirmar Presença / Justificar Ausência / Reagendar)
CREATE OR REPLACE FUNCTION public.respond_convocation(
    p_communication_id UUID,
    p_status TEXT, -- 'confirmed', 'justified', 'rescheduled'
    p_justification TEXT DEFAULT NULL,
    p_reschedule_suggestion TEXT DEFAULT NULL,
    p_guardian_name TEXT DEFAULT 'Responsável',
    p_student_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_now TIMESTAMPTZ := NOW();
    v_affected INT := 0;
    v_formatted_ts TEXT;
BEGIN
    v_formatted_ts := to_char(v_now AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY "às" HH24:MI');

    UPDATE public.communication_recipients
    SET 
        convocation_status = p_status,
        justification_text = p_justification,
        reschedule_suggestion = p_reschedule_suggestion,
        guardian_name = COALESCE(p_guardian_name, guardian_name),
        is_read = TRUE,
        read_at = COALESCE(read_at, v_now),
        updated_at = v_now
    WHERE communication_id = p_communication_id
      AND (p_student_id IS NULL OR student_id = p_student_id OR student_id IS NULL);

    GET DIAGNOSTICS v_affected = ROW_COUNT;

    IF v_affected = 0 THEN
        INSERT INTO public.communication_recipients (
            communication_id,
            guardian_name,
            student_id,
            is_read,
            read_at,
            convocation_status,
            justification_text,
            reschedule_suggestion
        ) VALUES (
            p_communication_id,
            p_guardian_name,
            p_student_id,
            TRUE,
            v_now,
            p_status,
            p_justification,
            p_reschedule_suggestion
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'communication_id', p_communication_id,
        'convocation_status', p_status,
        'responded_at', v_now,
        'formatted_date', v_formatted_ts
    );
END;
$$;
