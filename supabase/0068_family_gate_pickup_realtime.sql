-- ============================================================================
-- CLASSIUM EDUCACIONAL - MIGRATION 0068
-- INTEGRAÇÃO EM TEMPO REAL: MENU "VISUALIZADOR INTELIGENTE / PARA RETIRADA DE ESTUDANTE DA ESCOLA"
-- PORTAL DA FAMÍLIA & CONTROLE DE PORTARIA
-- ============================================================================

-- 1. TABELAS CENTRAIS PARA AUTORIZAÇÕES DE RETIRADA E PORTARIA
CREATE TABLE IF NOT EXISTS public.pickup_authorizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    responsible_id UUID,
    guardian_profile_id UUID,
    retiree_name TEXT NOT NULL,
    retiree_cpf TEXT,
    retiree_phone TEXT,
    retiree_relationship TEXT DEFAULT 'Pai/Mãe',
    pickup_date DATE NOT NULL,
    scheduled_start_time TIME NOT NULL DEFAULT '16:30',
    scheduled_end_time TIME NOT NULL DEFAULT '17:30',
    reason_for_early_exit TEXT DEFAULT 'Fim do Expediente Escolar (Saída Convencional)',
    observations TEXT,
    qr_code_value TEXT UNIQUE NOT NULL,
    qr_code_generated_at TIMESTAMPTZ DEFAULT now(),
    qr_code_expires_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) CHECK (status IN ('pending', 'used', 'expired', 'cancelled')) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TABELA DE VINCULAÇÃO MULTI-ALUNO À AUTORIZAÇÃO DE RETIRADA
CREATE TABLE IF NOT EXISTS public.pickup_authorization_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    authorization_id UUID REFERENCES public.pickup_authorizations(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_auth_student UNIQUE (authorization_id, student_id)
);

-- 3. TABELA DE REGISTROS DE SAÍDA EFETIVA VALIDADOS NA PORTARIA
CREATE TABLE IF NOT EXISTS public.student_exits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    authorization_id UUID REFERENCES public.pickup_authorizations(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    exit_time TIMESTAMPTZ DEFAULT now(),
    validator_id UUID,
    validator_name VARCHAR(255) DEFAULT 'Inspetor de Portaria',
    exit_portaria TEXT DEFAULT 'Portaria Principal',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. ÍNDICES DE PERFORMANCE E CONSULTA
CREATE INDEX IF NOT EXISTS idx_pickup_auth_guardian ON public.pickup_authorizations(guardian_profile_id);
CREATE INDEX IF NOT EXISTS idx_pickup_auth_qr_code ON public.pickup_authorizations(qr_code_value);
CREATE INDEX IF NOT EXISTS idx_pickup_auth_date ON public.pickup_authorizations(pickup_date);
CREATE INDEX IF NOT EXISTS idx_pickup_auth_status ON public.pickup_authorizations(status);
CREATE INDEX IF NOT EXISTS idx_pickup_auth_students_auth ON public.pickup_authorization_students(authorization_id);
CREATE INDEX IF NOT EXISTS idx_pickup_auth_students_student ON public.pickup_authorization_students(student_id);
CREATE INDEX IF NOT EXISTS idx_student_exits_student ON public.student_exits(student_id);
CREATE INDEX IF NOT EXISTS idx_student_exits_auth ON public.student_exits(authorization_id);

-- 5. TRIGGER PARA AUTO-EXPIRAÇÃO DE TOKENS
CREATE OR REPLACE FUNCTION public.fn_auto_check_pickup_expiry()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'pending' AND now() >= NEW.qr_code_expires_at THEN
        NEW.status := 'expired';
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_check_pickup_expiry ON public.pickup_authorizations;
CREATE TRIGGER trg_auto_check_pickup_expiry
BEFORE INSERT OR UPDATE ON public.pickup_authorizations
FOR EACH ROW EXECUTE FUNCTION public.fn_auto_check_pickup_expiry();

-- 6. RPC ATÔMICA: CRIAR AUTORIZAÇÃO COM CÁLCULO DE PRECEDÊNCIA
CREATE OR REPLACE FUNCTION public.create_pickup_authorization_atomic(
    p_organization_id UUID,
    p_guardian_profile_id UUID,
    p_retiree_name TEXT,
    p_retiree_cpf TEXT,
    p_retiree_phone TEXT,
    p_retiree_relationship TEXT,
    p_pickup_date DATE,
    p_scheduled_start_time TIME,
    p_scheduled_end_time TIME,
    p_reason TEXT,
    p_observations TEXT,
    p_student_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_qr_value TEXT;
    v_gen_at TIMESTAMPTZ := now();
    v_opt_24h TIMESTAMPTZ;
    v_opt_shift TIMESTAMPTZ;
    v_opt_sched TIMESTAMPTZ;
    v_expires_at TIMESTAMPTZ;
    v_new_auth_id UUID;
    v_st_id UUID;
    v_count INT := 0;
BEGIN
    -- Cálculo de Precedência da Expiração: menor entre (24h, fim do turno 17:30, horário previsto final)
    v_opt_24h := v_gen_at + INTERVAL '24 hours';
    v_opt_shift := (p_pickup_date || ' 17:30:00')::TIMESTAMPTZ;
    v_opt_sched := (p_pickup_date || ' ' || p_scheduled_end_time)::TIMESTAMPTZ;
    v_expires_at := LEAST(v_opt_24h, v_opt_shift, v_opt_sched);

    -- Gerar token de segurança único
    v_qr_value := 'AUTH-QR-' || (floor(10000 + random() * 90000))::TEXT || '-' || UPPER(SUBSTRING(COALESCE(p_retiree_name, 'ALU'), 1, 3));

    -- Inserir autorização
    INSERT INTO public.pickup_authorizations (
        organization_id,
        guardian_profile_id,
        responsible_id,
        retiree_name,
        retiree_cpf,
        retiree_phone,
        retiree_relationship,
        pickup_date,
        scheduled_start_time,
        scheduled_end_time,
        reason_for_early_exit,
        observations,
        qr_code_value,
        qr_code_generated_at,
        qr_code_expires_at,
        status
    ) VALUES (
        p_organization_id,
        p_guardian_profile_id,
        p_guardian_profile_id,
        p_retiree_name,
        p_retiree_cpf,
        p_retiree_phone,
        p_retiree_relationship,
        p_pickup_date,
        p_scheduled_start_time,
        p_scheduled_end_time,
        COALESCE(p_reason, 'Fim do Expediente Escolar (Saída Convencional)'),
        p_observations,
        v_qr_value,
        v_gen_at,
        v_expires_at,
        'pending'
    ) RETURNING id INTO v_new_auth_id;

    -- Vincular cada aluno selecionado
    IF p_student_ids IS NOT NULL AND array_length(p_student_ids, 1) > 0 THEN
        FOREACH v_st_id IN ARRAY p_student_ids
        LOOP
            INSERT INTO public.pickup_authorization_students (
                organization_id,
                authorization_id,
                student_id
            ) VALUES (
                p_organization_id,
                v_new_auth_id,
                v_st_id
            ) ON CONFLICT (authorization_id, student_id) DO NOTHING;
            v_count := v_count + 1;
        END LOOP;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'id', v_new_auth_id,
        'qr_code_value', v_qr_value,
        'qr_code_expires_at', v_expires_at,
        'students_linked', v_count
    );
END;
$$;

-- 7. RPC ATÔMICA: VALIDAR SAÍDA NA PORTARIA (LEITURA DO QR CODE)
CREATE OR REPLACE FUNCTION public.validate_pickup_exit_atomic(
    p_qr_code_value TEXT,
    p_validator_name TEXT,
    p_exit_portaria TEXT DEFAULT 'Portaria Principal'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_auth public.pickup_authorizations%ROWTYPE;
    v_student_rec RECORD;
    v_count INT := 0;
BEGIN
    SELECT * INTO v_auth
    FROM public.pickup_authorizations
    WHERE qr_code_value = p_qr_code_value;

    IF v_auth.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'QR Code de autorização não encontrado.');
    END IF;

    IF v_auth.status = 'used' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Este QR Code já foi UTILIZADO anteriormente para liberação.');
    END IF;

    IF v_auth.status = 'cancelled' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Este QR Code foi CANCELADO pelo responsável.');
    END IF;

    IF v_auth.status = 'expired' OR now() >= v_auth.qr_code_expires_at THEN
        UPDATE public.pickup_authorizations 
        SET status = 'expired', updated_at = now() 
        WHERE id = v_auth.id;

        RETURN jsonb_build_object('success', false, 'message', 'QR Code EXPIRADO. Validade estipulada atingida.');
    END IF;

    -- Registrar saída para os alunos
    FOR v_student_rec IN 
        SELECT student_id 
        FROM public.pickup_authorization_students 
        WHERE authorization_id = v_auth.id
    LOOP
        INSERT INTO public.student_exits (
            organization_id,
            authorization_id,
            student_id,
            exit_time,
            validator_name,
            exit_portaria
        ) VALUES (
            v_auth.organization_id,
            v_auth.id,
            v_student_rec.student_id,
            now(),
            COALESCE(p_validator_name, 'Inspetor da Portaria'),
            COALESCE(p_exit_portaria, 'Portaria Principal')
        );
        v_count := v_count + 1;
    END LOOP;

    -- Atualiza status para used
    UPDATE public.pickup_authorizations
    SET status = 'used', updated_at = now()
    WHERE id = v_auth.id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Saída confirmada com sucesso na portaria.',
        'authorization_id', v_auth.id,
        'retiree_name', v_auth.retiree_name,
        'students_count', v_count
    );
END;
$$;

-- 8. RPC ATÔMICA: CANCELAR AUTORIZAÇÃO ATIVA
CREATE OR REPLACE FUNCTION public.cancel_pickup_authorization_atomic(
    p_authorization_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.pickup_authorizations
    SET status = 'cancelled', updated_at = now()
    WHERE id = p_authorization_id;

    RETURN jsonb_build_object('success', true, 'message', 'Autorização cancelada.');
END;
$$;

-- 9. RPC ATÔMICA: BUSCAR HISTÓRICO CONSOLIDADO DE RETIRADAS
CREATE OR REPLACE FUNCTION public.get_family_pickup_authorizations(
    p_guardian_profile_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_results JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(auth_obj ORDER BY auth_obj->>'created_at' DESC), '[]'::jsonb)
    INTO v_results
    FROM (
        SELECT jsonb_build_object(
            'id', pa.id,
            'organization_id', pa.organization_id,
            'responsible_id', pa.responsible_id,
            'guardian_profile_id', pa.guardian_profile_id,
            'retiree_name', pa.retiree_name,
            'retiree_cpf', pa.retiree_cpf,
            'retiree_phone', pa.retiree_phone,
            'retiree_relationship', pa.retiree_relationship,
            'pickup_date', pa.pickup_date,
            'scheduled_start_time', TO_CHAR(pa.scheduled_start_time, 'HH24:MI'),
            'scheduled_end_time', TO_CHAR(pa.scheduled_end_time, 'HH24:MI'),
            'reason_for_early_exit', pa.reason_for_early_exit,
            'observations', pa.observations,
            'qr_code_value', pa.qr_code_value,
            'qr_code_generated_at', pa.qr_code_generated_at,
            'qr_code_expires_at', pa.qr_code_expires_at,
            'status', pa.status,
            'created_at', pa.created_at,
            'students_list', COALESCE((
                SELECT jsonb_agg(jsonb_build_object(
                    'studentId', s.id,
                    'studentName', COALESCE(s.name, s.full_name, 'Estudante'),
                    'studentGrade', COALESCE(s.room, c.name, 'Turma Regular'),
                    'photoUrl', COALESCE(s.photo_url, s.avatar_url, '')
                ))
                FROM public.pickup_authorization_students pas
                JOIN public.students s ON s.id = pas.student_id
                LEFT JOIN public.classes c ON c.id = s.class_id
                WHERE pas.authorization_id = pa.id
            ), '[]'::jsonb)
        ) AS auth_obj
        FROM public.pickup_authorizations pa
        WHERE (p_guardian_profile_id IS NULL OR pa.guardian_profile_id = p_guardian_profile_id OR pa.responsible_id = p_guardian_profile_id)
    ) sub;

    RETURN v_results;
END;
$$;

-- 10. POLÍTICAS ROW LEVEL SECURITY (RLS)
ALTER TABLE public.pickup_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_authorization_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_exits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_pickup_authorizations_all ON public.pickup_authorizations;
CREATE POLICY p_pickup_authorizations_all ON public.pickup_authorizations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS p_pickup_authorization_students_all ON public.pickup_authorization_students;
CREATE POLICY p_pickup_authorization_students_all ON public.pickup_authorization_students FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS p_student_exits_all ON public.student_exits;
CREATE POLICY p_student_exits_all ON public.student_exits FOR ALL USING (true) WITH CHECK (true);

-- 11. REGISTRO NO SUPABASE REALTIME
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.pickup_authorizations;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.pickup_authorization_students;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.student_exits;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END
$$;
