-- ====================================================================
-- CLASSIUM ERP EDUCACIONAL — REFORMULAÇÃO CONTROLE DE ACESSO & PORTARIA
-- MIGRATION 0052: TABELAS, RLS, REALTIME E FUNÇÕES RPC ENTERPRISE
-- ====================================================================

-- 1. TABELA PORTARIAS (PONTOS DE ACESSO DA INSTITUIÇÃO)
CREATE TABLE IF NOT EXISTS public.portarias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    school_id UUID,
    name TEXT NOT NULL,
    location TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir portarias padrão se não existirem
INSERT INTO public.portarias (name, location, is_active)
SELECT 'Portaria Principal - Sede', 'Entrada Principal / Recepção', true
WHERE NOT EXISTS (SELECT 1 FROM public.portarias WHERE name = 'Portaria Principal - Sede');

INSERT INTO public.portarias (name, location, is_active)
SELECT 'Portaria Infantil - Bloco B', 'Acesso Ed. Infantil', true
WHERE NOT EXISTS (SELECT 1 FROM public.portarias WHERE name = 'Portaria Infantil - Bloco B');

INSERT INTO public.portarias (name, location, is_active)
SELECT 'Acesso Estacionamento 1', 'Portão de Veículos / Embarque', true
WHERE NOT EXISTS (SELECT 1 FROM public.portarias WHERE name = 'Acesso Estacionamento 1');

INSERT INTO public.portarias (name, location, is_active)
SELECT 'Portaria de Transporte Escolar', 'Pátio de Vans e Ônibus', true
WHERE NOT EXISTS (SELECT 1 FROM public.portarias WHERE name = 'Portaria de Transporte Escolar');

-- 2. TABELA INSPECTORS (OPERADORES DE PORTARIA / INSPETORES)
CREATE TABLE IF NOT EXISTS public.inspectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    organization_id UUID,
    school_id UUID,
    name TEXT NOT NULL,
    portaria_id UUID REFERENCES public.portarias(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir inspetores padrão se não existirem
INSERT INTO public.inspectors (name, is_active)
SELECT 'Inspetor Carlos - Portaria Central', true
WHERE NOT EXISTS (SELECT 1 FROM public.inspectors WHERE name = 'Inspetor Carlos - Portaria Central');

INSERT INTO public.inspectors (name, is_active)
SELECT 'Porteira Marta - Portaria 2', true
WHERE NOT EXISTS (SELECT 1 FROM public.inspectors WHERE name = 'Porteira Marta - Portaria 2');

INSERT INTO public.inspectors (name, is_active)
SELECT 'Inspetor Marcos - Bloco Infantil', true
WHERE NOT EXISTS (SELECT 1 FROM public.inspectors WHERE name = 'Inspetor Marcos - Bloco Infantil');

-- 3. TABELA QR_CODES / ACCESS_TOKENS (TOKENS DE ACESSO E SAÍDA)
CREATE TABLE IF NOT EXISTS public.qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    school_id UUID,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    guardian_id UUID,
    token_code TEXT UNIQUE NOT NULL,
    token_type TEXT DEFAULT 'single_use', -- single_use, daily, permanent
    status TEXT NOT NULL DEFAULT 'active', -- active, used, expired, revoked, denied
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ NOT NULL,
    picker_name TEXT NOT NULL,
    picker_cpf TEXT,
    picker_phone TEXT,
    picker_relation TEXT DEFAULT 'Responsável',
    reason TEXT DEFAULT 'Saída Convencional',
    notes TEXT,
    students_payload JSONB DEFAULT '[]'::jsonb,
    generated_by UUID,
    validated_at TIMESTAMPTZ,
    validated_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA GATE_ACCESS_LOGS (LOGS DE ACESSO DA PORTARIA)
CREATE TABLE IF NOT EXISTS public.gate_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    school_id UUID,
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    guardian_id UUID,
    token_id UUID REFERENCES public.qr_codes(id) ON DELETE SET NULL,
    token_code TEXT,
    access_type TEXT DEFAULT 'exit', -- exit, entry, IN, OUT
    access_method TEXT DEFAULT 'qr_code', -- qr_code, manual_token, biometric
    access_time TIMESTAMPTZ DEFAULT NOW(),
    portaria_id UUID REFERENCES public.portarias(id) ON DELETE SET NULL,
    portaria_name TEXT DEFAULT 'Portaria Principal',
    inspector_id UUID REFERENCES public.inspectors(id) ON DELETE SET NULL,
    inspector_name TEXT DEFAULT 'Inspetor de Portaria',
    student_name TEXT NOT NULL,
    student_grade TEXT,
    student_photo_url TEXT,
    picker_name TEXT NOT NULL,
    picker_cpf TEXT,
    picker_relation TEXT,
    picker_phone TEXT,
    result TEXT NOT NULL DEFAULT 'LIBERADO', -- LIBERADO, RECUSADO
    is_granted BOOLEAN DEFAULT true,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_qr_codes_org ON public.qr_codes(organization_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_token ON public.qr_codes(token_code);
CREATE INDEX IF NOT EXISTS idx_qr_codes_student ON public.qr_codes(student_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_status ON public.qr_codes(status);
CREATE INDEX IF NOT EXISTS idx_qr_codes_valid ON public.qr_codes(valid_until);

CREATE INDEX IF NOT EXISTS idx_gate_logs_org ON public.gate_access_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_gate_logs_student ON public.gate_access_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_gate_logs_time ON public.gate_access_logs(access_time DESC);
CREATE INDEX IF NOT EXISTS idx_gate_logs_result ON public.gate_access_logs(result);

-- 6. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.portarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_access_logs ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas e multi-tenant
DROP POLICY IF EXISTS p_portarias_all ON public.portarias;
CREATE POLICY p_portarias_all ON public.portarias FOR ALL USING (true);

DROP POLICY IF EXISTS p_inspectors_all ON public.inspectors;
CREATE POLICY p_inspectors_all ON public.inspectors FOR ALL USING (true);

DROP POLICY IF EXISTS p_qr_codes_all ON public.qr_codes;
CREATE POLICY p_qr_codes_all ON public.qr_codes FOR ALL USING (true);

DROP POLICY IF EXISTS p_gate_access_logs_all ON public.gate_access_logs;
CREATE POLICY p_gate_access_logs_all ON public.gate_access_logs FOR ALL USING (true);

-- 7. FUNÇÃO RPC: VALIDAR TOKEN / QR CODE NA PORTARIA
CREATE OR REPLACE FUNCTION public.fn_validate_gate_token(
    p_token_code TEXT,
    p_validator_name TEXT DEFAULT 'Inspetor Portaria',
    p_is_approved BOOLEAN DEFAULT true,
    p_denial_reason TEXT DEFAULT NULL,
    p_portaria_name TEXT DEFAULT 'Portaria Principal',
    p_organization_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_token RECORD;
    v_log_id UUID;
    v_result TEXT;
    v_status_after TEXT;
BEGIN
    -- Busca o token
    SELECT * INTO v_token
    FROM public.qr_codes
    WHERE token_code ILIKE TRIM(p_token_code)
    LIMIT 1;

    IF v_token.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Token não encontrado no banco de dados da portaria.'
        );
    END IF;

    -- Se já foi utilizado
    IF v_token.status = 'used' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Este QR Code já foi utilizado e encontra-se expirado.'
        );
    END IF;

    -- Se foi revogado / cancelado
    IF v_token.status = 'revoked' OR v_token.status = 'cancelled' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Este QR Code foi revogado pelo responsável.'
        );
    END IF;

    -- Se expirou o prazo
    IF v_token.valid_until < NOW() THEN
        UPDATE public.qr_codes
        SET status = 'expired', updated_at = NOW()
        WHERE id = v_token.id;

        RETURN jsonb_build_object(
            'success', false,
            'message', 'Token expirado. A validade máxima do código foi ultrapassada.'
        );
    END IF;

    IF p_is_approved THEN
        v_result := 'LIBERADO';
        v_status_after := 'used';
    ELSE
        v_result := 'RECUSADO';
        v_status_after := 'denied';
    END IF;

    -- Atualiza o status do token
    UPDATE public.qr_codes
    SET status = v_status_after,
        validated_at = NOW(),
        validated_by = p_validator_name,
        updated_at = NOW()
    WHERE id = v_token.id;

    -- Cria o log em gate_access_logs
    INSERT INTO public.gate_access_logs (
        organization_id,
        school_id,
        student_id,
        guardian_id,
        token_id,
        token_code,
        access_type,
        access_method,
        access_time,
        portaria_name,
        inspector_name,
        student_name,
        student_grade,
        student_photo_url,
        picker_name,
        picker_cpf,
        picker_relation,
        picker_phone,
        result,
        is_granted,
        reason
    ) VALUES (
        COALESCE(p_organization_id, v_token.organization_id),
        v_token.school_id,
        v_token.student_id,
        v_token.guardian_id,
        v_token.id,
        v_token.token_code,
        'exit',
        'qr_code',
        NOW(),
        COALESCE(p_portaria_name, 'Portaria Principal'),
        COALESCE(p_validator_name, 'Inspetor de Portaria'),
        COALESCE(v_token.picker_name, 'Estudante'),
        'Regular',
        NULL,
        v_token.picker_name,
        v_token.picker_cpf,
        v_token.picker_relation,
        v_token.picker_phone,
        v_result,
        p_is_approved,
        p_denial_reason
    ) RETURNING id INTO v_log_id;

    RETURN jsonb_build_object(
        'success', true,
        'result', v_result,
        'message', CASE 
            WHEN p_is_approved THEN 'Liberação autorizada com sucesso na portaria!'
            ELSE 'Saída bloqueada e registrada na auditoria.'
        END,
        'log_id', v_log_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. FUNÇÃO RPC: EXPURGO DE AUDITORIA > 30 DIAS
CREATE OR REPLACE FUNCTION public.fn_purge_gate_logs_older_than_30_days(
    p_organization_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_deleted_count INT := 0;
BEGIN
    IF p_organization_id IS NOT NULL THEN
        DELETE FROM public.gate_access_logs
        WHERE access_time < (NOW() - INTERVAL '30 days')
          AND organization_id = p_organization_id;
    ELSE
        DELETE FROM public.gate_access_logs
        WHERE access_time < (NOW() - INTERVAL '30 days');
    END IF;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'purged_count', v_deleted_count,
        'message', 'Expurgo de logs com mais de 30 dias realizado com sucesso.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. HABILITAR REALTIME
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.portarias;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.inspectors;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.qr_codes;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.gate_access_logs;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.pickup_authorizations;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.student_exits;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;
