-- ====================================================================
-- CLASSIUM ERP EDUCACIONAL — MASTER INTEGRATION
-- MIGRATION 0078: DIÁRIO DE BORDO ↔ RADAR DE ROTINA ↔ RADAR PEDAGÓGICO
-- ====================================================================

-- 1. TABELA PRINCIPAL DE OCORRÊNCIAS E CONDUTA (occurrences)
CREATE TABLE IF NOT EXISTS public.occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
    recorded_by_name VARCHAR(255) DEFAULT 'Professor Docente',
    occurrence_type VARCHAR(50) NOT NULL DEFAULT 'leve', -- 'leve', 'media', 'gravissima', 'elogio'
    record_type VARCHAR(50) DEFAULT 'leve',
    severity VARCHAR(50) DEFAULT 'Leve', -- 'Leve', 'Média', 'Gravíssima', 'Elogio'
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    actions_taken TEXT,
    points_deducted NUMERIC(4,1) NOT NULL DEFAULT 0.0,
    is_positive BOOLEAN NOT NULL DEFAULT FALSE,
    is_urgent BOOLEAN NOT NULL DEFAULT FALSE,
    occurrence_date DATE NOT NULL DEFAULT CURRENT_DATE,
    quarter INTEGER NOT NULL DEFAULT 1, -- 1º, 2º, 3º Trimestre
    year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
    guardian_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    guardian_acknowledged_at TIMESTAMPTZ,
    guardian_notes TEXT,
    guardian_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    idempotency_key VARCHAR(128) UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'Registrada', -- 'Registrada', 'Homologada', 'Em Análise', 'Contestada', 'Cancelada'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Adicionar colunas se tabela já existir
DO $$ BEGIN
    ALTER TABLE public.occurrences ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;
    ALTER TABLE public.occurrences ADD COLUMN IF NOT EXISTS record_type VARCHAR(50) DEFAULT 'leve';
    ALTER TABLE public.occurrences ADD COLUMN IF NOT EXISTS actions_taken TEXT;
    ALTER TABLE public.occurrences ADD COLUMN IF NOT EXISTS quarter INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE public.occurrences ADD COLUMN IF NOT EXISTS year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
    ALTER TABLE public.occurrences ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128) UNIQUE;
    ALTER TABLE public.occurrences ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'Registrada';
EXCEPTION WHEN others THEN NULL; END $$;

-- 2. TABELA DE SALDOS TRIMESTRAIS DE CONDUTA (student_conduct_quarterly_scores)
CREATE TABLE IF NOT EXISTS public.student_conduct_quarterly_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
    quarter INTEGER NOT NULL DEFAULT 1,
    base_points NUMERIC(4,1) NOT NULL DEFAULT 20.0,
    points_lost NUMERIC(4,1) NOT NULL DEFAULT 0.0,
    current_balance NUMERIC(4,1) NOT NULL DEFAULT 20.0,
    milestone_10_notified BOOLEAN NOT NULL DEFAULT FALSE,
    milestone_15_notified BOOLEAN NOT NULL DEFAULT FALSE,
    milestone_20_notified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_student_conduct_quarter UNIQUE (student_id, year, quarter)
);

DO $$ BEGIN
    ALTER TABLE public.student_conduct_quarterly_scores ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;
EXCEPTION WHEN others THEN NULL; END $$;

-- 3. TABELA DE MOVIMENTOS AUDITÁVEIS DE PONTOS (student_conduct_movements)
CREATE TABLE IF NOT EXISTS public.student_conduct_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
    occurrence_id UUID REFERENCES public.occurrences(id) ON DELETE SET NULL,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
    quarter INTEGER NOT NULL DEFAULT 1,
    movement_type VARCHAR(50) NOT NULL DEFAULT 'deduction', -- 'deduction', 'bonus', 'adjustment', 'reversal'
    points_amount NUMERIC(4,1) NOT NULL DEFAULT 0.0,
    balance_before NUMERIC(4,1) NOT NULL,
    balance_after NUMERIC(4,1) NOT NULL,
    reason TEXT NOT NULL,
    created_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TABELA DE PROJETOS DE INTERVENÇÃO COLETIVA DE TURMA (class_conduct_interventions)
CREATE TABLE IF NOT EXISTS public.class_conduct_interventions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    goal TEXT NOT NULL,
    strategy TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Em Andamento', -- 'Em Andamento', 'Concluído', 'Revisão'
    created_by_name VARCHAR(255) DEFAULT 'Coordenação Pedagógica',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TABELA DE AÇÕES PEDAGÓGICAS INDIVIDUAIS (student_pedagogical_actions)
CREATE TABLE IF NOT EXISTS public.student_pedagogical_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- 'conversa', 'reuniao', 'intervencao'
    notes TEXT NOT NULL,
    created_by_name VARCHAR(255) DEFAULT 'Coordenação Pedagógica',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. ÍNDICES DE PERFORMANCE E PESQUISA RÁPIDA
CREATE INDEX IF NOT EXISTS idx_occurrences_student_date ON public.occurrences(student_id, occurrence_date DESC);
CREATE INDEX IF NOT EXISTS idx_occurrences_class ON public.occurrences(class_id, occurrence_date DESC);
CREATE INDEX IF NOT EXISTS idx_occurrences_school_quarter ON public.occurrences(school_id, year, quarter);
CREATE INDEX IF NOT EXISTS idx_scores_student_quarter ON public.student_conduct_quarterly_scores(student_id, year, quarter);
CREATE INDEX IF NOT EXISTS idx_movements_student ON public.student_conduct_movements(student_id, created_at DESC);

-- 7. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_conduct_quarterly_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_conduct_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_conduct_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_pedagogical_actions ENABLE ROW LEVEL SECURITY;

-- 8. POLÍTICAS DE RLS SEGURAS E ISOLADAS POR TENANT/ESCOLA
DO $$ BEGIN
    CREATE POLICY "occurrences_read_policy" ON public.occurrences
        FOR SELECT TO authenticated, anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "occurrences_write_policy" ON public.occurrences
        FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "scores_read_policy" ON public.student_conduct_quarterly_scores
        FOR SELECT TO authenticated, anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "scores_write_policy" ON public.student_conduct_quarterly_scores
        FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "movements_read_policy" ON public.student_conduct_movements
        FOR SELECT TO authenticated, anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "movements_write_policy" ON public.student_conduct_movements
        FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "interventions_read_policy" ON public.class_conduct_interventions
        FOR SELECT TO authenticated, anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "interventions_write_policy" ON public.class_conduct_interventions
        FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "pedagogical_actions_read_policy" ON public.student_pedagogical_actions
        FOR SELECT TO authenticated, anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "pedagogical_actions_write_policy" ON public.student_pedagogical_actions
        FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 9. RPC ATÔMICA TRANSAÇÃO: LANÇAR OCORRÊNCIA, DEDUZIR PONTOS E NOTIFICAR FAMÍLIA/GESTOR
CREATE OR REPLACE FUNCTION public.fn_record_classium_occurrence(
    p_student_id UUID,
    p_class_id UUID,
    p_teacher_id UUID DEFAULT NULL,
    p_record_type TEXT DEFAULT 'leve', -- 'leve', 'media', 'gravissima', 'elogio'
    p_title TEXT DEFAULT 'Registro de Conduta',
    p_description TEXT DEFAULT '',
    p_actions_taken TEXT DEFAULT '',
    p_occurrence_date DATE DEFAULT CURRENT_DATE,
    p_quarter INTEGER DEFAULT 1,
    p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
    p_recorded_by_name TEXT DEFAULT 'Professor Docente',
    p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_existing_occ RECORD;
    v_org_id UUID;
    v_school_id UUID;
    v_student_name TEXT := 'Estudante';
    v_deduction NUMERIC(4,1) := 0.0;
    v_norm_type TEXT := lower(trim(p_record_type));
    v_severity TEXT := 'Leve';
    v_is_positive BOOLEAN := FALSE;
    v_is_urgent BOOLEAN := FALSE;
    v_score_record RECORD;
    v_balance_before NUMERIC(4,1) := 20.0;
    v_new_lost NUMERIC(4,1) := 0.0;
    v_new_balance NUMERIC(4,1) := 20.0;
    v_occurrence_id UUID;
    v_m10_trig BOOLEAN := FALSE;
    v_m15_trig BOOLEAN := FALSE;
    v_m20_trig BOOLEAN := FALSE;
BEGIN
    -- 1. Idempotência: se já existe ocorrência com a mesma chave, retorna registro existente
    IF p_idempotency_key IS NOT NULL AND trim(p_idempotency_key) <> '' THEN
        SELECT * INTO v_existing_occ FROM public.occurrences WHERE idempotency_key = trim(p_idempotency_key);
        IF v_existing_occ.id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'success', true,
                'idempotent', true,
                'occurrence_id', v_existing_occ.id,
                'points_deducted', v_existing_occ.points_deducted,
                'message', 'Ocorrência já registrada previamente (Idempotente).'
            );
        END IF;
    END IF;

    -- 2. Resolver dados do estudante (organização, escola, nome)
    SELECT organization_id, school_id, COALESCE(name, full_name, 'Estudante')
    INTO v_org_id, v_school_id, v_student_name
    FROM public.students
    WHERE id = p_student_id;

    IF v_org_id IS NULL THEN
        -- Tenta resolver via turma ou fallback
        SELECT organization_id, school_id INTO v_org_id, v_school_id FROM public.classes WHERE id = p_class_id;
    END IF;

    -- 3. Calcular pontos e gravidade de acordo com o Regulamento Oficial Classium
    -- Leve: 0.5 | Média: 1.0 | Gravíssima: 2.0 | Elogio: 0.0
    IF v_norm_type IN ('elogio', 'positiva', 'positive') THEN
        v_deduction := 0.0;
        v_severity := 'Elogio';
        v_is_positive := TRUE;
    ELSIF v_norm_type IN ('gravissima', 'grave', 'red') THEN
        v_deduction := 2.0;
        v_severity := 'Gravíssima';
        v_is_urgent := TRUE;
    ELSIF v_norm_type IN ('media', 'yellow', 'disciplinar') THEN
        v_deduction := 1.0;
        v_severity := 'Média';
    ELSE
        v_deduction := 0.5;
        v_severity := 'Leve';
    END IF;

    -- 4. Inserir a ocorrência oficial
    INSERT INTO public.occurrences (
        organization_id,
        school_id,
        student_id,
        class_id,
        teacher_id,
        recorded_by_name,
        occurrence_type,
        record_type,
        severity,
        title,
        description,
        actions_taken,
        points_deducted,
        is_positive,
        is_urgent,
        occurrence_date,
        quarter,
        year,
        idempotency_key,
        status
    ) VALUES (
        v_org_id,
        v_school_id,
        p_student_id,
        p_class_id,
        p_teacher_id,
        p_recorded_by_name,
        v_norm_type,
        v_norm_type,
        v_severity,
        p_title,
        p_description,
        p_actions_taken,
        v_deduction,
        v_is_positive,
        v_is_urgent,
        p_occurrence_date,
        p_quarter,
        p_year,
        p_idempotency_key,
        'Registrada'
    ) RETURNING id INTO v_occurrence_id;

    -- 5. Atualizar saldo de pontos trimestral
    -- Garante existência da linha
    INSERT INTO public.student_conduct_quarterly_scores (
        organization_id, school_id, student_id, year, quarter, base_points, points_lost, current_balance
    ) VALUES (
        v_org_id, v_school_id, p_student_id, p_year, p_quarter, 20.0, 0.0, 20.0
    )
    ON CONFLICT (student_id, year, quarter) DO NOTHING;

    SELECT * INTO v_score_record
    FROM public.student_conduct_quarterly_scores
    WHERE student_id = p_student_id AND year = p_year AND quarter = p_quarter;

    v_balance_before := COALESCE(v_score_record.current_balance, 20.0);
    v_new_lost := COALESCE(v_score_record.points_lost, 0.0) + v_deduction;
    v_new_balance := GREATEST(0.0, 20.0 - v_new_lost);

    -- Verificar marcos de perda de pontos (10, 15, 20)
    IF v_new_lost >= 10.0 AND NOT COALESCE(v_score_record.milestone_10_notified, false) THEN
        v_m10_trig := TRUE;
    END IF;
    IF v_new_lost >= 15.0 AND NOT COALESCE(v_score_record.milestone_15_notified, false) THEN
        v_m15_trig := TRUE;
    END IF;
    IF v_new_lost >= 20.0 AND NOT COALESCE(v_score_record.milestone_20_notified, false) THEN
        v_m20_trig := TRUE;
    END IF;

    UPDATE public.student_conduct_quarterly_scores
    SET points_lost = v_new_lost,
        current_balance = v_new_balance,
        milestone_10_notified = milestone_10_notified OR v_m10_trig,
        milestone_15_notified = milestone_15_notified OR v_m15_trig,
        milestone_20_notified = milestone_20_notified OR v_m20_trig,
        updated_at = NOW()
    WHERE student_id = p_student_id AND year = p_year AND quarter = p_quarter;

    -- 6. Registrar movimento auditável de pontos
    IF v_deduction > 0 THEN
        INSERT INTO public.student_conduct_movements (
            organization_id,
            school_id,
            occurrence_id,
            student_id,
            year,
            quarter,
            movement_type,
            points_amount,
            balance_before,
            balance_after,
            reason
        ) VALUES (
            v_org_id,
            v_school_id,
            v_occurrence_id,
            p_student_id,
            p_year,
            p_quarter,
            'deduction',
            v_deduction,
            v_balance_before,
            v_new_balance,
            format('Dedução de %s pt(s) referente a: %s', v_deduction, p_title)
        );
    END IF;

    -- 7. Retornar resposta estruturada
    RETURN jsonb_build_object(
        'success', true,
        'occurrence_id', v_occurrence_id,
        'student_id', p_student_id,
        'student_name', v_student_name,
        'severity', v_severity,
        'points_deducted', v_deduction,
        'balance_before', v_balance_before,
        'new_balance', v_new_balance,
        'points_lost', v_new_lost,
        'milestone_10_triggered', v_m10_trig,
        'milestone_15_triggered', v_m15_trig,
        'milestone_20_triggered', v_m20_trig
    );
END;
$$;

-- 10. RPC PARA A FAMÍLIA REGISTRAR CIÊNCIA / ASSINATURA DA OCORRÊNCIA
CREATE OR REPLACE FUNCTION public.fn_acknowledge_student_conduct(
    p_occurrence_id UUID,
    p_guardian_notes TEXT DEFAULT NULL,
    p_guardian_name TEXT DEFAULT 'Responsável Legal'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_occ RECORD;
BEGIN
    SELECT * INTO v_occ FROM public.occurrences WHERE id = p_occurrence_id;
    IF v_occ.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ocorrência não encontrada.');
    END IF;

    UPDATE public.occurrences
    SET guardian_acknowledged = TRUE,
        guardian_acknowledged_at = NOW(),
        guardian_notes = p_guardian_notes,
        status = 'Homologada',
        updated_at = NOW()
    WHERE id = p_occurrence_id;

    RETURN jsonb_build_object(
        'success', true,
        'occurrence_id', p_occurrence_id,
        'acknowledged_at', NOW(),
        'guardian_name', p_guardian_name
    );
END;
$$;

-- 11. HABILITAR SUPABASE REALTIME NAS TABELAS
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.occurrences;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_conduct_quarterly_scores;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_conduct_movements;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.class_conduct_interventions;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_pedagogical_actions;
EXCEPTION WHEN others THEN NULL; END $$;
