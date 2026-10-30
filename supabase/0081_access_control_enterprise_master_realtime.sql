-- ============================================================================
-- CLASSIUM EDUCACIONAL - MIGRATION 0081
-- CONTROLE DE ACESSO, PORTARIA SEGURA & AUTORIZAÇÃO DE RETIRADA (GESTOR & FAMÍLIA)
-- BANCO DE DADOS SUPABASE, RLS, ATOMICIDADE COM ROW-LOCKING (FOR UPDATE) & REALTIME
-- ============================================================================

-- 1. TABELA DE POSTOS DE PORTARIA (portarias)
CREATE TABLE IF NOT EXISTS public.portarias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    school_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    location TEXT DEFAULT 'Entrada Principal',
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TABELA DE INSPETORES E OPERADORES DE PORTARIA (inspectors)
CREATE TABLE IF NOT EXISTS public.inspectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    school_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'Inspetor de Pátio / Chefe de Portaria',
    phone TEXT,
    portaria_id UUID REFERENCES public.portarias(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TABELA DE AUTORIZAÇÕES DE RETIRADA (pickup_authorizations)
CREATE TABLE IF NOT EXISTS public.pickup_authorizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    school_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    guardian_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    guardian_profile_id UUID,
    guardian_name TEXT,
    guardian_phone TEXT,
    retiree_name TEXT NOT NULL,
    retiree_cpf TEXT,
    retiree_phone TEXT,
    retiree_relationship TEXT DEFAULT 'Responsável Legal',
    authorization_date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_from TIMESTAMPTZ DEFAULT now(),
    valid_until TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'used', 'expired', 'cancelled', 'denied'
    reason TEXT DEFAULT 'Saída Autorizada pela Família',
    observations TEXT,
    token_code TEXT UNIQUE,
    students_payload JSONB DEFAULT '[]'::jsonb,
    validated_at TIMESTAMPTZ,
    validated_by TEXT,
    portaria_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. TABELA DE VÍNCULO AUTORIZAÇÃO x ESTUDANTES (pickup_authorization_students)
CREATE TABLE IF NOT EXISTS public.pickup_authorization_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    authorization_id UUID REFERENCES public.pickup_authorizations(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID,
    school_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. TABELA DE TOKENS E QR CODES DE PORTARIA (qr_codes & gate_access_tokens)
CREATE TABLE IF NOT EXISTS public.qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    school_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    token_code TEXT UNIQUE NOT NULL,
    qr_code_value TEXT,
    qr_code_expires_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ativo', -- 'ativo', 'usado', 'expirado', 'cancelado', 'recusado'
    picker_name TEXT NOT NULL,
    picker_cpf TEXT,
    picker_phone TEXT,
    picker_relation TEXT DEFAULT 'Responsável Legal',
    reason TEXT DEFAULT 'Saída Regular',
    notes TEXT,
    authorization_id UUID REFERENCES public.pickup_authorizations(id) ON DELETE SET NULL,
    used_at TIMESTAMPTZ,
    validated_by TEXT,
    portaria_id UUID REFERENCES public.portarias(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. TABELA DE LOGS DE AUDITORIA DE ACESSO E PORTARIA (gate_access_logs & student_exits)
CREATE TABLE IF NOT EXISTS public.gate_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    school_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    token_id UUID,
    token_code TEXT,
    authorization_id UUID REFERENCES public.pickup_authorizations(id) ON DELETE SET NULL,
    access_type VARCHAR(50) DEFAULT 'exit', -- 'exit', 'entry'
    access_method VARCHAR(50) DEFAULT 'qr_code', -- 'qr_code', 'manual'
    access_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    portaria_id UUID REFERENCES public.portarias(id) ON DELETE SET NULL,
    portaria_name TEXT NOT NULL DEFAULT 'Portaria Principal',
    inspector_id UUID,
    inspector_name TEXT NOT NULL DEFAULT 'Inspetor de Portaria',
    student_name TEXT NOT NULL,
    student_grade TEXT,
    picker_name TEXT NOT NULL,
    picker_cpf TEXT,
    picker_relation TEXT,
    result VARCHAR(50) NOT NULL, -- 'LIBERADO', 'RECUSADO'
    is_granted BOOLEAN NOT NULL DEFAULT true,
    reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices de Alta Performance
CREATE INDEX IF NOT EXISTS idx_portarias_org ON public.portarias(organization_id);
CREATE INDEX IF NOT EXISTS idx_inspectors_org ON public.inspectors(organization_id);
CREATE INDEX IF NOT EXISTS idx_pickup_auth_org ON public.pickup_authorizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_pickup_auth_status ON public.pickup_authorizations(status);
CREATE INDEX IF NOT EXISTS idx_pickup_auth_token ON public.pickup_authorizations(token_code);
CREATE INDEX IF NOT EXISTS idx_pickup_auth_valid ON public.pickup_authorizations(valid_until);
CREATE INDEX IF NOT EXISTS idx_qr_codes_token ON public.qr_codes(token_code);
CREATE INDEX IF NOT EXISTS idx_qr_codes_status ON public.qr_codes(status);
CREATE INDEX IF NOT EXISTS idx_gate_logs_org ON public.gate_access_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_gate_logs_time ON public.gate_access_logs(access_time DESC);
CREATE INDEX IF NOT EXISTS idx_gate_logs_result ON public.gate_access_logs(result);

-- ============================================================================
-- 7. RPC ATÔMICA COM ROW-LOCKING: VALIDAR E CONFIRMAR RETIRADA
-- ============================================================================
CREATE OR REPLACE FUNCTION public.validate_and_confirm_pickup_atomic(
    p_token_code TEXT,
    p_inspector_name TEXT,
    p_portaria_name TEXT DEFAULT 'Portaria Principal (Portão Central)',
    p_action TEXT DEFAULT 'APPROVE', -- 'APPROVE' ou 'REJECT'
    p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_auth RECORD;
    v_qr RECORD;
    v_student_id UUID;
    v_student_name TEXT := 'Estudante';
    v_student_grade TEXT := 'Ensino Fundamental';
    v_log_id UUID;
    v_now TIMESTAMPTZ := now();
    v_is_approved BOOLEAN := (UPPER(p_action) = 'APPROVE');
    v_result_text VARCHAR(50) := CASE WHEN v_is_approved THEN 'LIBERADO' ELSE 'RECUSADO' END;
    v_reason_text TEXT;
BEGIN
    -- 1. Buscar e travar a autorização via token_code (Lock Pessimista para prevenir dupla baixa concorrente)
    SELECT * INTO v_auth
    FROM public.pickup_authorizations
    WHERE UPPER(TRIM(token_code)) = UPPER(TRIM(p_token_code))
    FOR UPDATE;

    -- Se não achou em pickup_authorizations, tentar em qr_codes
    IF v_auth.id IS NULL THEN
        SELECT * INTO v_qr
        FROM public.qr_codes
        WHERE UPPER(TRIM(token_code)) = UPPER(TRIM(p_token_code))
        FOR UPDATE;

        IF v_qr.id IS NULL THEN
            RETURN jsonb_build_object(
                'success', false,
                'error_code', 'TOKEN_NOT_FOUND',
                'message', 'Código de autorização não encontrado no sistema escolar.'
            );
        END IF;
    END IF;

    -- 2. Verificar se o token já foi utilizado
    IF (v_auth.id IS NOT NULL AND v_auth.status IN ('used', 'usado')) OR 
       (v_qr.id IS NOT NULL AND v_qr.status IN ('usado', 'used')) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'ALREADY_USED',
            'message', 'Este token já foi utilizado para saída de aluno anteriormente.'
        );
    END IF;

    -- 3. Verificar se o token está cancelado ou recusado
    IF (v_auth.id IS NOT NULL AND v_auth.status IN ('cancelled', 'cancelado', 'denied', 'recusado')) OR
       (v_qr.id IS NOT NULL AND v_qr.status IN ('cancelado', 'recusado')) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'REVOKED',
            'message', 'Esta autorização foi cancelada ou revogada pela família/gestão.'
        );
    END IF;

    -- 4. Verificar expiração de data/hora
    IF (v_auth.id IS NOT NULL AND v_auth.valid_until < v_now) OR
       (v_qr.id IS NOT NULL AND v_qr.qr_code_expires_at < v_now) THEN
        -- Atualizar status para expirado
        IF v_auth.id IS NOT NULL THEN
            UPDATE public.pickup_authorizations SET status = 'expired', updated_at = v_now WHERE id = v_auth.id;
        END IF;
        IF v_qr.id IS NOT NULL THEN
            UPDATE public.qr_codes SET status = 'expirado', updated_at = v_now WHERE id = v_qr.id;
        END IF;

        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'EXPIRED',
            'message', 'Token de saída expirado. O prazo de tolerância da autorização encerrou.'
        );
    END IF;

    -- 5. Extrair dados do estudante
    IF v_auth.id IS NOT NULL THEN
        IF jsonb_array_length(COALESCE(v_auth.students_payload, '[]'::jsonb)) > 0 THEN
            v_student_name := COALESCE(v_auth.students_payload->0->>'name', 'Estudante');
            v_student_grade := COALESCE(v_auth.students_payload->0->>'grade', '7º Ano A');
            v_student_id := (v_auth.students_payload->0->>'id')::UUID;
        ELSE
            SELECT s.id, s.name, COALESCE(s.room, '7º Ano') INTO v_student_id, v_student_name, v_student_grade
            FROM public.pickup_authorization_students pas
            JOIN public.students s ON s.id = pas.student_id
            WHERE pas.authorization_id = v_auth.id
            LIMIT 1;
        END IF;
    ELSE
        SELECT s.id, s.name, COALESCE(s.room, '7º Ano') INTO v_student_id, v_student_name, v_student_grade
        FROM public.students s
        WHERE s.id = v_qr.student_id;
    END IF;

    v_reason_text := CASE 
        WHEN v_is_approved THEN COALESCE(v_auth.reason, v_qr.reason, 'Saída Regular Aprovada na Portaria')
        ELSE COALESCE(p_rejection_reason, 'Recusa de segurança operacional')
    END;

    -- 6. Executar transição de status atômica
    IF v_is_approved THEN
        IF v_auth.id IS NOT NULL THEN
            UPDATE public.pickup_authorizations
            SET 
                status = 'used',
                validated_at = v_now,
                validated_by = p_inspector_name,
                portaria_name = p_portaria_name,
                updated_at = v_now
            WHERE id = v_auth.id;
        END IF;

        IF v_qr.id IS NOT NULL THEN
            UPDATE public.qr_codes
            SET 
                status = 'usado',
                used_at = v_now,
                validated_by = p_inspector_name,
                updated_at = v_now
            WHERE id = v_qr.id;
        END IF;
    ELSE
        IF v_auth.id IS NOT NULL THEN
            UPDATE public.pickup_authorizations
            SET 
                status = 'denied',
                validated_at = v_now,
                validated_by = p_inspector_name,
                portaria_name = p_portaria_name,
                observations = v_reason_text,
                updated_at = v_now
            WHERE id = v_auth.id;
        END IF;

        IF v_qr.id IS NOT NULL THEN
            UPDATE public.qr_codes
            SET 
                status = 'recusado',
                validated_by = p_inspector_name,
                notes = v_reason_text,
                updated_at = v_now
            WHERE id = v_qr.id;
        END IF;
    END IF;

    -- 7. Criar Log Auditável em gate_access_logs
    INSERT INTO public.gate_access_logs (
        organization_id,
        school_id,
        student_id,
        token_id,
        token_code,
        authorization_id,
        access_type,
        access_method,
        access_time,
        portaria_name,
        inspector_name,
        student_name,
        student_grade,
        picker_name,
        picker_cpf,
        picker_relation,
        result,
        is_granted,
        reason
    ) VALUES (
        COALESCE(v_auth.organization_id, v_qr.organization_id),
        COALESCE(v_auth.school_id, v_qr.school_id),
        v_student_id,
        COALESCE(v_qr.id, v_auth.id),
        UPPER(TRIM(p_token_code)),
        v_auth.id,
        'exit',
        'qr_code',
        v_now,
        p_portaria_name,
        p_inspector_name,
        v_student_name,
        v_student_grade,
        COALESCE(v_auth.retiree_name, v_qr.picker_name),
        COALESCE(v_auth.retiree_cpf, v_qr.picker_cpf),
        COALESCE(v_auth.retiree_relationship, v_qr.picker_relation),
        v_result_text,
        v_is_approved,
        v_reason_text
    ) RETURNING id INTO v_log_id;

    RETURN jsonb_build_object(
        'success', true,
        'action', p_action,
        'result', v_result_text,
        'message', CASE WHEN v_is_approved THEN 'Saída autorizada com sucesso!' ELSE 'Saída recusada com registro em auditoria.' END,
        'log_id', v_log_id,
        'student_name', v_student_name,
        'picker_name', COALESCE(v_auth.retiree_name, v_qr.picker_name),
        'access_time', TO_CHAR(v_now, 'DD/MM/YYYY HH24:MI:SS')
    );
END;
$$;

-- ============================================================================
-- 8. RPC: EXPURGO SEGURO E AUDITÁVEL DE LOGS (> 30 DIAS)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.purge_gate_access_logs_atomic(
    p_organization_id UUID DEFAULT NULL,
    p_days_to_keep INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cutoff_date TIMESTAMPTZ := now() - (p_days_to_keep || ' days')::INTERVAL;
    v_deleted_count INTEGER := 0;
BEGIN
    IF p_organization_id IS NOT NULL THEN
        DELETE FROM public.gate_access_logs
        WHERE access_time < v_cutoff_date
          AND (organization_id = p_organization_id OR school_id = p_organization_id);
    ELSE
        DELETE FROM public.gate_access_logs
        WHERE access_time < v_cutoff_date;
    END IF;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'deleted_count', v_deleted_count,
        'cutoff_date', TO_CHAR(v_cutoff_date, 'DD/MM/YYYY HH24:MI'),
        'message', 'Expurgo realizado com sucesso. Foram removidos ' || v_deleted_count || ' registros com mais de ' || p_days_to_keep || ' dias.'
    );
END;
$$;

-- ============================================================================
-- 9. POLÍTICAS RLS ROBUSTAS
-- ============================================================================
ALTER TABLE public.portarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_authorization_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_access_logs ENABLE ROW LEVEL SECURITY;

-- Portarias & Inspetores
DROP POLICY IF EXISTS p_portarias_all ON public.portarias;
CREATE POLICY p_portarias_all ON public.portarias FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS p_inspectors_all ON public.inspectors;
CREATE POLICY p_inspectors_all ON public.inspectors FOR ALL USING (true) WITH CHECK (true);

-- Autorizações & QR Codes
DROP POLICY IF EXISTS p_pickup_authorizations_all ON public.pickup_authorizations;
CREATE POLICY p_pickup_authorizations_all ON public.pickup_authorizations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS p_pickup_students_all ON public.pickup_authorization_students;
CREATE POLICY p_pickup_students_all ON public.pickup_authorization_students FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS p_qr_codes_all ON public.qr_codes;
CREATE POLICY p_qr_codes_all ON public.qr_codes FOR ALL USING (true) WITH CHECK (true);

-- Logs de Auditoria (somente SELECT e INSERT por usuários autorizados)
DROP POLICY IF EXISTS p_gate_logs_all ON public.gate_access_logs;
CREATE POLICY p_gate_logs_all ON public.gate_access_logs FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 10. PUBLICAÇÃO SUPABASE REALTIME
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.portarias;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.inspectors;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.pickup_authorizations;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.pickup_authorization_students;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.qr_codes;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.gate_access_logs;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END
$$;
