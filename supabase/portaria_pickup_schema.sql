-- ====================================================================
-- ESQUEMA DE BANCO DE DADOS SUPABASE PARA PORTARIA E RETIRADA DE ESTUDANTES
-- Título: Visualizador Inteligente / Para Retirada de Estudante da Escola
-- ====================================================================

-- 1. MODIFICAÇÃO NA TABELA PUBLIC.STUDENTS
ALTER TABLE IF EXISTS public.students
  ADD COLUMN IF NOT EXISTS school_shift_end_time TIME DEFAULT '17:30:00';

-- 2. ENUM OU CHECK TYPE PARA STATUS DE AUTORIZAÇÃO
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pickup_authorization_status') THEN
        CREATE TYPE pickup_authorization_status AS ENUM ('pending', 'used', 'expired', 'cancelled');
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 3. TABELA DE AUTORIZAÇÕES DE RETIRADA (pickup_authorizations)
CREATE TABLE IF NOT EXISTS public.pickup_authorizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    responsible_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    retiree_name TEXT NOT NULL,
    retiree_cpf TEXT,
    retiree_phone TEXT,
    retiree_relationship TEXT,
    pickup_date DATE NOT NULL,
    scheduled_start_time TIME NOT NULL,
    scheduled_end_time TIME NOT NULL,
    reason_for_early_exit TEXT,
    observations TEXT,
    qr_code_value TEXT UNIQUE NOT NULL,
    qr_code_generated_at TIMESTAMPTZ DEFAULT NOW(),
    qr_code_expires_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) CHECK (status IN ('pending', 'used', 'expired', 'cancelled')) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA DE ALUNOS VINCULADOS À AUTORIZAÇÃO (pickup_authorization_students)
CREATE TABLE IF NOT EXISTS public.pickup_authorization_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    authorization_id UUID REFERENCES public.pickup_authorizations(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    CONSTRAINT unique_auth_student UNIQUE (authorization_id, student_id)
);

-- 5. TABELA DE REGISTROS DE SAÍDA EFETIVA (student_exits)
CREATE TABLE IF NOT EXISTS public.student_exits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    authorization_id UUID REFERENCES public.pickup_authorizations(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    exit_time TIMESTAMPTZ DEFAULT NOW(),
    validator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    validator_name VARCHAR(255) DEFAULT 'Inspetor da Portaria',
    exit_portaria TEXT DEFAULT 'Portaria Principal',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ÍNDICES DE DESEMPENHO E CONSULTA
CREATE INDEX IF NOT EXISTS idx_pickup_authorizations_responsible ON public.pickup_authorizations(responsible_id);
CREATE INDEX IF NOT EXISTS idx_pickup_authorizations_qr_code ON public.pickup_authorizations(qr_code_value);
CREATE INDEX IF NOT EXISTS idx_pickup_authorizations_date ON public.pickup_authorizations(pickup_date);
CREATE INDEX IF NOT EXISTS idx_pickup_authorizations_status ON public.pickup_authorizations(status);
CREATE INDEX IF NOT EXISTS idx_pickup_auth_students_auth ON public.pickup_authorization_students(authorization_id);
CREATE INDEX IF NOT EXISTS idx_pickup_auth_students_student ON public.pickup_authorization_students(student_id);
CREATE INDEX IF NOT EXISTS idx_student_exits_student ON public.student_exits(student_id);
CREATE INDEX IF NOT EXISTS idx_student_exits_auth ON public.student_exits(authorization_id);

-- 7. FUNÇÃO E TRIGGER PARA CÁLCULO INTELIGENTE DE EXPIRAÇÃO DE QR CODE (REGRA DE PRECEDÊNCIA)
-- Regra: qr_code_expires_at = LEAST(24h após geração, Fim do Turno do Estudante, Fim do Horário Previsto)
CREATE OR REPLACE FUNCTION public.fn_calculate_pickup_qr_expiration(
    p_generated_at TIMESTAMPTZ,
    p_pickup_date DATE,
    p_scheduled_end_time TIME,
    p_shift_end_time TIME DEFAULT '17:30:00'
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
    v_opt_24h TIMESTAMPTZ;
    v_opt_shift TIMESTAMPTZ;
    v_opt_scheduled TIMESTAMPTZ;
    v_final_expiry TIMESTAMPTZ;
BEGIN
    v_opt_24h := p_generated_at + INTERVAL '24 hours';
    v_opt_shift := (p_pickup_date || ' ' || COALESCE(p_shift_end_time, '17:30:00'))::TIMESTAMPTZ;
    v_opt_scheduled := (p_pickup_date || ' ' || p_scheduled_end_time)::TIMESTAMPTZ;

    -- Precedência: menor data/hora entre as três opções
    v_final_expiry := LEAST(v_opt_24h, v_opt_shift, v_opt_scheduled);

    RETURN v_final_expiry;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 8. TRIGGER AUTOMÁTICO DE ATUALIZAÇÃO DO STATUS DE EXPIRAÇÃO
CREATE OR REPLACE FUNCTION public.fn_auto_mark_expired_pickups()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'pending' AND NOW() >= NEW.qr_code_expires_at THEN
        NEW.status := 'expired';
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_mark_expired_pickups ON public.pickup_authorizations;
CREATE TRIGGER trg_auto_mark_expired_pickups
BEFORE INSERT OR UPDATE ON public.pickup_authorizations
FOR EACH ROW EXECUTE FUNCTION public.fn_auto_mark_expired_pickups();

-- 9. FUNÇÃO PARA REGISTRAR SAÍDA EFETIVA PELA PORTARIA E UTILIZAR O QR CODE
CREATE OR REPLACE FUNCTION public.fn_validate_pickup_exit(
    p_qr_code_value TEXT,
    p_validator_id UUID,
    p_validator_name TEXT,
    p_exit_portaria TEXT DEFAULT 'Portaria Principal'
)
RETURNS JSONB AS $$
DECLARE
    v_auth public.pickup_authorizations%ROWTYPE;
    v_student_rec RECORD;
    v_exits_count INT := 0;
BEGIN
    -- Busca a autorização pelo valor do QR Code
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

    IF v_auth.status = 'expired' OR NOW() >= v_auth.qr_code_expires_at THEN
        UPDATE public.pickup_authorizations 
        SET status = 'expired', updated_at = NOW() 
        WHERE id = v_auth.id;

        RETURN jsonb_build_object('success', false, 'message', 'QR Code EXPIRADO. A validade máxima da autorização foi atingida.');
    END IF;

    -- Registrar saída efetiva para todos os alunos vinculados
    FOR v_student_rec IN 
        SELECT student_id 
        FROM public.pickup_authorization_students 
        WHERE authorization_id = v_auth.id
    LOOP
        INSERT INTO public.student_exits (
            authorization_id,
            student_id,
            exit_time,
            validator_id,
            validator_name,
            exit_portaria
        ) VALUES (
            v_auth.id,
            v_student_rec.student_id,
            NOW(),
            p_validator_id,
            COALESCE(p_validator_name, 'Inspetor da Portaria'),
            COALESCE(p_exit_portaria, 'Portaria Principal')
        );
        v_exits_count := v_exits_count + 1;
    END LOOP;

    -- Atualizar o status da autorização para 'used'
    UPDATE public.pickup_authorizations
    SET status = 'used', updated_at = NOW()
    WHERE id = v_auth.id;

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Saída registrada com sucesso! Estudante(s) liberado(s) na portaria.',
        'authorizations_id', v_auth.id,
        'retiree_name', v_auth.retiree_name,
        'students_count', v_exits_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. LIMPEZA AUTOMÁTICA ANUAL DE REGISTROS ANTIGOS (INÍCIO DE ANO LETIVO)
CREATE OR REPLACE FUNCTION public.fn_annual_cleanup_pickup_data()
RETURNS VOID AS $$
DECLARE
    v_start_of_current_year DATE;
BEGIN
    -- Determina o dia 1 de janeiro do ano vigente
    v_start_of_current_year := DATE_TRUNC('year', CURRENT_DATE)::DATE;

    -- Remove autorizações e saídas do ano letivo anterior
    DELETE FROM public.student_exits
    WHERE created_at < v_start_of_current_year;

    DELETE FROM public.pickup_authorizations
    WHERE pickup_date < v_start_of_current_year;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.pickup_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_authorization_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_exits ENABLE ROW LEVEL SECURITY;

-- POLICIES FOR pickup_authorizations
DROP POLICY IF EXISTS p_pickup_authorizations_select ON public.pickup_authorizations;
CREATE POLICY p_pickup_authorizations_select ON public.pickup_authorizations
    FOR SELECT USING (true);

DROP POLICY IF EXISTS p_pickup_authorizations_insert ON public.pickup_authorizations;
CREATE POLICY p_pickup_authorizations_insert ON public.pickup_authorizations
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS p_pickup_authorizations_update ON public.pickup_authorizations;
CREATE POLICY p_pickup_authorizations_update ON public.pickup_authorizations
    FOR UPDATE USING (true);

-- POLICIES FOR pickup_authorization_students
DROP POLICY IF EXISTS p_pickup_auth_students_select ON public.pickup_authorization_students;
CREATE POLICY p_pickup_auth_students_select ON public.pickup_authorization_students
    FOR SELECT USING (true);

DROP POLICY IF EXISTS p_pickup_auth_students_insert ON public.pickup_authorization_students;
CREATE POLICY p_pickup_auth_students_insert ON public.pickup_authorization_students
    FOR INSERT WITH CHECK (true);

-- POLICIES FOR student_exits
DROP POLICY IF EXISTS p_student_exits_select ON public.student_exits;
CREATE POLICY p_student_exits_select ON public.student_exits
    FOR SELECT USING (true);

DROP POLICY IF EXISTS p_student_exits_insert ON public.student_exits;
CREATE POLICY p_student_exits_insert ON public.student_exits
    FOR INSERT WITH CHECK (true);

-- 12. SUPABASE REALTIME PUBLICATION SETUP
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
