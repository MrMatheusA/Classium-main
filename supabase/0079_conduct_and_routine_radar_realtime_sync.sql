-- ======================================================================================
-- 0079_conduct_and_routine_radar_realtime_sync.sql
-- MIGRATION: Integração Atômica, Segura e em Tempo Real do Diário de Bordo e Radar de Rotina
-- ======================================================================================

-- 1. Garantir tabelas de suporte com RLS e índices
CREATE TABLE IF NOT EXISTS public.occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    school_id UUID,
    student_id UUID NOT NULL,
    class_id UUID,
    teacher_id UUID,
    recorded_by_name TEXT DEFAULT 'Professor Docente',
    occurrence_type TEXT NOT NULL,
    record_type TEXT,
    severity TEXT DEFAULT 'Leve',
    title TEXT NOT NULL,
    description TEXT,
    actions_taken TEXT,
    points_deducted NUMERIC(4,1) DEFAULT 0.0,
    is_positive BOOLEAN DEFAULT FALSE,
    is_urgent BOOLEAN DEFAULT FALSE,
    occurrence_date DATE DEFAULT CURRENT_DATE,
    quarter INTEGER DEFAULT 1,
    year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
    guardian_acknowledged BOOLEAN DEFAULT FALSE,
    guardian_acknowledged_at TIMESTAMPTZ,
    guardian_notes TEXT,
    idempotency_key TEXT,
    status TEXT DEFAULT 'Registrada',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.student_conduct_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    school_id UUID,
    student_id UUID NOT NULL,
    class_id UUID,
    teacher_id UUID,
    date DATE DEFAULT CURRENT_DATE,
    type TEXT,
    title TEXT NOT NULL,
    description TEXT,
    action_taken TEXT,
    parent_notified BOOLEAN DEFAULT TRUE,
    severity TEXT DEFAULT 'Leve',
    points_deducted NUMERIC(4,1) DEFAULT 0.0,
    is_positive BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'Registrada',
    academic_year_id UUID,
    term_number INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.student_conduct_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    school_id UUID,
    student_id UUID NOT NULL,
    class_id UUID,
    academic_year_id UUID,
    term_number INTEGER DEFAULT 1,
    base_score NUMERIC(4,1) DEFAULT 20.0,
    points_lost NUMERIC(4,1) DEFAULT 0.0,
    current_score NUMERIC(4,1) DEFAULT 20.0,
    total_leve INTEGER DEFAULT 0,
    total_media INTEGER DEFAULT 0,
    total_gravissima INTEGER DEFAULT 0,
    total_elogio INTEGER DEFAULT 0,
    milestone_10_notified BOOLEAN DEFAULT FALSE,
    milestone_15_notified BOOLEAN DEFAULT FALSE,
    milestone_20_notified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_student_conduct_score_term UNIQUE (student_id, term_number)
);

CREATE TABLE IF NOT EXISTS public.student_conduct_quarterly_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    school_id UUID,
    student_id UUID NOT NULL,
    year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
    quarter INTEGER NOT NULL DEFAULT 1,
    base_points NUMERIC(4,1) DEFAULT 20.0,
    points_lost NUMERIC(4,1) DEFAULT 0.0,
    current_balance NUMERIC(4,1) DEFAULT 20.0,
    milestone_10_notified BOOLEAN DEFAULT FALSE,
    milestone_15_notified BOOLEAN DEFAULT FALSE,
    milestone_20_notified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_student_quarter_score UNIQUE (student_id, year, quarter)
);

CREATE TABLE IF NOT EXISTS public.student_conduct_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    school_id UUID,
    student_id UUID NOT NULL,
    conduct_record_id UUID,
    occurrence_id UUID,
    score_id UUID,
    year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
    quarter INTEGER DEFAULT 1,
    movement_type TEXT DEFAULT 'deduction', -- 'deduction', 'adjustment', 'reset'
    severity TEXT,
    points_applied NUMERIC(4,1) DEFAULT 0.0,
    points_amount NUMERIC(4,1) DEFAULT 0.0,
    points_change NUMERIC(4,1) DEFAULT 0.0,
    previous_score NUMERIC(4,1) DEFAULT 20.0,
    new_score NUMERIC(4,1) DEFAULT 20.0,
    balance_before NUMERIC(4,1) DEFAULT 20.0,
    balance_after NUMERIC(4,1) DEFAULT 20.0,
    reason TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Índices de Otimização
CREATE INDEX IF NOT EXISTS idx_occurrences_student ON public.occurrences(student_id, quarter, year);
CREATE INDEX IF NOT EXISTS idx_occurrences_idempotency ON public.occurrences(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conduct_records_student ON public.student_conduct_records(student_id, term_number);
CREATE INDEX IF NOT EXISTS idx_conduct_movements_student ON public.student_conduct_movements(student_id, quarter, year);

-- 3. Habilitar RLS
ALTER TABLE public.occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_conduct_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_conduct_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_conduct_quarterly_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_conduct_movements ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY p_occurrences_read ON public.occurrences FOR SELECT TO authenticated, anon USING (true);
    CREATE POLICY p_occurrences_all ON public.occurrences FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY p_conduct_records_read ON public.student_conduct_records FOR SELECT TO authenticated, anon USING (true);
    CREATE POLICY p_conduct_records_all ON public.student_conduct_records FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY p_conduct_scores_read ON public.student_conduct_scores FOR SELECT TO authenticated, anon USING (true);
    CREATE POLICY p_conduct_scores_all ON public.student_conduct_scores FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY p_quarterly_scores_read ON public.student_conduct_quarterly_scores FOR SELECT TO authenticated, anon USING (true);
    CREATE POLICY p_quarterly_scores_all ON public.student_conduct_quarterly_scores FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY p_movements_read ON public.student_conduct_movements FOR SELECT TO authenticated, anon USING (true);
    CREATE POLICY p_movements_all ON public.student_conduct_movements FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. Função Principal RPC: fn_record_classium_occurrence
CREATE OR REPLACE FUNCTION public.fn_record_classium_occurrence(
    p_student_id UUID,
    p_class_id UUID DEFAULT NULL,
    p_teacher_id UUID DEFAULT NULL,
    p_record_type TEXT DEFAULT 'leve',
    p_title TEXT DEFAULT 'Registro de Conduta',
    p_description TEXT DEFAULT '',
    p_actions_taken TEXT DEFAULT '',
    p_occurrence_date DATE DEFAULT CURRENT_DATE,
    p_quarter INTEGER DEFAULT 1,
    p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
    p_recorded_by_name TEXT DEFAULT 'Professor Docente',
    p_idempotency_key TEXT DEFAULT NULL,
    p_organization_id UUID DEFAULT NULL,
    p_school_id UUID DEFAULT NULL,
    p_academic_year_id UUID DEFAULT NULL,
    p_term_number INTEGER DEFAULT NULL,
    p_severity TEXT DEFAULT NULL,
    p_action_taken TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_existing_occ RECORD;
    v_org_id UUID := p_organization_id;
    v_school_id UUID := p_school_id;
    v_student_name TEXT := 'Estudante';
    v_deduction NUMERIC(4,1) := 0.0;
    v_norm_type TEXT := lower(trim(COALESCE(p_record_type, p_severity, 'leve')));
    v_severity TEXT := 'Leve';
    v_is_positive BOOLEAN := FALSE;
    v_is_urgent BOOLEAN := FALSE;
    v_quarter INTEGER := COALESCE(p_term_number, p_quarter, 1);
    v_year INTEGER := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);
    v_action_text TEXT := COALESCE(p_actions_taken, p_action_taken, '');
    v_score_record RECORD;
    v_balance_before NUMERIC(4,1) := 20.0;
    v_new_lost NUMERIC(4,1) := 0.0;
    v_new_balance NUMERIC(4,1) := 20.0;
    v_occurrence_id UUID;
    v_conduct_record_id UUID;
    v_comm_id UUID;
    v_m10_trig BOOLEAN := FALSE;
    v_m15_trig BOOLEAN := FALSE;
    v_m20_trig BOOLEAN := FALSE;
    v_guardian RECORD;
    v_teacher_label TEXT := COALESCE(p_recorded_by_name, 'Professor Docente');
BEGIN
    -- 1. Idempotência: Se já foi registrada com a mesma chave, retorna o resultado idêntico
    IF p_idempotency_key IS NOT NULL AND trim(p_idempotency_key) <> '' THEN
        SELECT * INTO v_existing_occ FROM public.occurrences WHERE idempotency_key = trim(p_idempotency_key) LIMIT 1;
        IF v_existing_occ.id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'success', true,
                'idempotent', true,
                'occurrence_id', v_existing_occ.id,
                'student_id', v_existing_occ.student_id,
                'severity', v_existing_occ.severity,
                'points_deducted', v_existing_occ.points_deducted,
                'message', 'Ocorrência recuperada via chave de idempotência.'
            );
        END IF;
    END IF;

    -- 2. Resolver dados do estudante (organização, escola, nome)
    SELECT organization_id, school_id, COALESCE(name, full_name, 'Estudante')
    INTO v_org_id, v_school_id, v_student_name
    FROM public.students
    WHERE id = p_student_id;

    IF v_org_id IS NULL AND p_class_id IS NOT NULL THEN
        SELECT organization_id, school_id INTO v_org_id, v_school_id FROM public.classes WHERE id = p_class_id;
    END IF;

    -- 3. Calcular pontos e gravidade de acordo com a Regra Oficial Classium
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

    -- 4. Inserir em public.occurrences
    INSERT INTO public.occurrences (
        organization_id, school_id, student_id, class_id, teacher_id,
        recorded_by_name, occurrence_type, record_type, severity,
        title, description, actions_taken, points_deducted,
        is_positive, is_urgent, occurrence_date, quarter, year,
        idempotency_key, status
    ) VALUES (
        v_org_id, v_school_id, p_student_id, p_class_id, p_teacher_id,
        v_teacher_label, v_norm_type, v_norm_type, v_severity,
        p_title, p_description, v_action_text, v_deduction,
        v_is_positive, v_is_urgent, COALESCE(p_occurrence_date, CURRENT_DATE), v_quarter, v_year,
        p_idempotency_key, 'Registrada'
    ) RETURNING id INTO v_occurrence_id;

    -- 5. Inserir espelho em public.student_conduct_records (para compatibilidade total)
    INSERT INTO public.student_conduct_records (
        organization_id, school_id, student_id, class_id, teacher_id,
        date, type, title, description, action_taken, parent_notified,
        severity, points_deducted, is_positive, status, academic_year_id, term_number
    ) VALUES (
        v_org_id, v_school_id, p_student_id, p_class_id, p_teacher_id,
        COALESCE(p_occurrence_date, CURRENT_DATE), v_norm_type, p_title, p_description, v_action_text, TRUE,
        v_severity, v_deduction, v_is_positive, 'Registrada', p_academic_year_id, v_quarter
    ) RETURNING id INTO v_conduct_record_id;

    -- 6. Atualizar ou Criar Registro de Pontuação Trimestral (student_conduct_quarterly_scores)
    INSERT INTO public.student_conduct_quarterly_scores (
        organization_id, school_id, student_id, year, quarter, base_points, points_lost, current_balance
    ) VALUES (
        v_org_id, v_school_id, p_student_id, v_year, v_quarter, 20.0, 0.0, 20.0
    )
    ON CONFLICT (student_id, year, quarter) DO NOTHING;

    SELECT * INTO v_score_record
    FROM public.student_conduct_quarterly_scores
    WHERE student_id = p_student_id AND year = v_year AND quarter = v_quarter;

    v_balance_before := COALESCE(v_score_record.current_balance, 20.0);
    v_new_lost := COALESCE(v_score_record.points_lost, 0.0) + v_deduction;
    v_new_balance := GREATEST(0.0, 20.0 - v_new_lost);

    -- Marcos de perda
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
    WHERE student_id = p_student_id AND year = v_year AND quarter = v_quarter;

    -- Atualizar espelho student_conduct_scores
    INSERT INTO public.student_conduct_scores (
        organization_id, school_id, student_id, class_id, academic_year_id, term_number,
        base_score, points_lost, current_score,
        total_leve, total_media, total_gravissima, total_elogio
    ) VALUES (
        v_org_id, v_school_id, p_student_id, p_class_id, p_academic_year_id, v_quarter,
        20.0, v_new_lost, v_new_balance,
        CASE WHEN v_severity = 'Leve' THEN 1 ELSE 0 END,
        CASE WHEN v_severity = 'Média' THEN 1 ELSE 0 END,
        CASE WHEN v_severity = 'Gravíssima' THEN 1 ELSE 0 END,
        CASE WHEN v_is_positive THEN 1 ELSE 0 END
    )
    ON CONFLICT (student_id, term_number) DO UPDATE
    SET points_lost = v_new_lost,
        current_score = v_new_balance,
        total_leve = student_conduct_scores.total_leve + (CASE WHEN v_severity = 'Leve' THEN 1 ELSE 0 END),
        total_media = student_conduct_scores.total_media + (CASE WHEN v_severity = 'Média' THEN 1 ELSE 0 END),
        total_gravissima = student_conduct_scores.total_gravissima + (CASE WHEN v_severity = 'Gravíssima' THEN 1 ELSE 0 END),
        total_elogio = student_conduct_scores.total_elogio + (CASE WHEN v_is_positive THEN 1 ELSE 0 END),
        milestone_10_notified = student_conduct_scores.milestone_10_notified OR v_m10_trig,
        milestone_15_notified = student_conduct_scores.milestone_15_notified OR v_m15_trig,
        milestone_20_notified = student_conduct_scores.milestone_20_notified OR v_m20_trig,
        updated_at = NOW();

    -- 7. Gravar movimento auditável
    IF v_deduction > 0 OR v_is_positive THEN
        INSERT INTO public.student_conduct_movements (
            organization_id, school_id, student_id,
            conduct_record_id, occurrence_id,
            year, quarter, movement_type, severity,
            points_applied, points_amount, points_change,
            previous_score, new_score, balance_before, balance_after,
            reason, created_by
        ) VALUES (
            v_org_id, v_school_id, p_student_id,
            v_conduct_record_id, v_occurrence_id,
            v_year, v_quarter,
            CASE WHEN v_is_positive THEN 'elogio' ELSE 'deduction' END,
            v_severity,
            v_deduction, v_deduction, -v_deduction,
            v_balance_before, v_new_balance, v_balance_before, v_new_balance,
            CASE WHEN v_is_positive THEN format('Elogio pedagógico: %s', p_title) ELSE format('Dedução de %s pt(s): %s', v_deduction, p_title) END,
            v_teacher_label
        );
    END IF;

    -- 8. Gerar comunicação automática para os responsáveis vinculados
    BEGIN
        INSERT INTO public.communications (
            organization_id, school_id, class_id,
            title, content, type, target_type, target_student_id,
            created_by_name, status, created_at
        ) VALUES (
            v_org_id, v_school_id, p_class_id,
            CASE 
                WHEN v_is_positive THEN format('⭐ Elogio Pedagógico Registrado — %s', v_student_name)
                ELSE format('⚠️ Registro de Conduta: %s (-%s pts) — %s', v_severity, v_deduction, v_student_name)
            END,
            format('Diário de Bordo Escolar:\n\n• Registro: %s\n• Detalhamento: %s\n• Ação Pedagógica: %s\n• Saldo Atual no Trimestre: %s / 20.0 pontos.',
                   p_title, p_description, v_action_text, v_new_balance),
            CASE WHEN v_is_urgent THEN 'urgent' WHEN v_is_positive THEN 'general' ELSE 'behavior' END,
            'student',
            p_student_id,
            v_teacher_label,
            'published',
            NOW()
        ) RETURNING id INTO v_comm_id;

        -- Adicionar destinatários vinculados em student_responsible_links e guardians
        IF v_comm_id IS NOT NULL THEN
            FOR v_guardian IN
                SELECT DISTINCT srl.guardian_id, COALESCE(g.user_id, srl.guardian_id) as recipient_user_id
                FROM public.student_responsible_links srl
                LEFT JOIN public.guardians g ON g.id = srl.guardian_id
                WHERE srl.student_id = p_student_id
            LOOP
                INSERT INTO public.communication_recipients (
                    communication_id, recipient_type, recipient_id, status, created_at
                ) VALUES (
                    v_comm_id, 'guardian', v_guardian.recipient_user_id, 'delivered', NOW()
                ) ON CONFLICT DO NOTHING;
            END LOOP;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Comunicação não deve interromper a transação da conduta
        NULL;
    END;

    RETURN jsonb_build_object(
        'success', true,
        'occurrence_id', v_occurrence_id,
        'conduct_record_id', v_conduct_record_id,
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

-- 5. Adicionar Tabelas na Publicação Realtime
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.occurrences;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_conduct_records;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_conduct_scores;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_conduct_quarterly_scores;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_conduct_movements;
EXCEPTION WHEN others THEN NULL; END $$;
