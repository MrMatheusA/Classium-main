-- ====================================================================
-- CLASSIUM ERP EDUCACIONAL — REFATORAÇÃO RADAR DE ROTINA & DIÁRIO DE BORDO
-- MIGRATION: 0067_family_routine_radar_infractions_and_points.sql
-- 3 Níveis de Infração (Leve, Média, Gravíssima) + Sistema Trimestral de Pontos e Marcos (10, 15, 20)
-- ====================================================================

-- 1. TABELA DE CONTROLE DE PONTOS TRIMESTRAIS DE CONDUTA
CREATE TABLE IF NOT EXISTS public.student_conduct_quarterly_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    quarter INTEGER NOT NULL DEFAULT 1, -- 1º, 2º ou 3º Trimestre
    base_points NUMERIC(4,1) NOT NULL DEFAULT 20.0,
    points_lost NUMERIC(4,1) NOT NULL DEFAULT 0.0,
    current_balance NUMERIC(4,1) NOT NULL DEFAULT 20.0,
    milestone_10_notified BOOLEAN NOT NULL DEFAULT FALSE,
    milestone_15_notified BOOLEAN NOT NULL DEFAULT FALSE,
    milestone_20_notified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_student_year_quarter UNIQUE (student_id, year, quarter)
);

-- 2. TABELA DE NOTIFICAÇÕES DE MARCOS DE PONTOS DO DIÁRIO DE BORDO
CREATE TABLE IF NOT EXISTS public.student_conduct_milestone_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    quarter INTEGER NOT NULL DEFAULT 1,
    milestone INTEGER NOT NULL, -- 10, 15, 20
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    level VARCHAR(50) NOT NULL, -- 'atencao' | 'alerta' | 'critico'
    viewed_by_guardian BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_quarterly_scores_student ON public.student_conduct_quarterly_scores(student_id, year, quarter);
CREATE INDEX IF NOT EXISTS idx_milestone_notif_student ON public.student_conduct_milestone_notifications(student_id, quarter);

-- 3. HABILITAR RLS
ALTER TABLE public.student_conduct_quarterly_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_conduct_milestone_notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "quarterly_scores_read_all" ON public.student_conduct_quarterly_scores
        FOR SELECT TO authenticated, anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "quarterly_scores_write_all" ON public.student_conduct_quarterly_scores
        FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "milestone_notif_read_all" ON public.student_conduct_milestone_notifications
        FOR SELECT TO authenticated, anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "milestone_notif_write_all" ON public.student_conduct_milestone_notifications
        FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. FUNCTION ATÔMICA PARA REGISTRAR INFRAÇÃO E CALCULAR PONTOS E MARCOS
CREATE OR REPLACE FUNCTION public.fn_process_conduct_infraction(
    p_student_id UUID,
    p_infraction_level TEXT, -- 'leve' | 'media' | 'gravissima' | 'elogio'
    p_points_custom NUMERIC DEFAULT NULL,
    p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
    p_quarter INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_deduction NUMERIC(4,1) := 0.0;
    v_norm_level TEXT := lower(trim(p_infraction_level));
    v_score_record RECORD;
    v_new_lost NUMERIC(4,1);
    v_new_balance NUMERIC(4,1);
    v_m10_triggered BOOLEAN := FALSE;
    v_m15_triggered BOOLEAN := FALSE;
    v_m20_triggered BOOLEAN := FALSE;
    v_student_name TEXT := 'Estudante';
    v_org_id UUID;
BEGIN
    -- Determina pontuação a deduzir
    IF p_points_custom IS NOT NULL AND p_points_custom > 0 THEN
        v_deduction := p_points_custom;
    ELSIF v_norm_level IN ('leve', 'green') THEN
        v_deduction := 1.0;
    ELSIF v_norm_level IN ('media', 'yellow', 'disciplinar') THEN
        v_deduction := 2.0;
    ELSIF v_norm_level IN ('gravissima', 'red') THEN
        v_deduction := 5.0;
    ELSE
        v_deduction := 0.0;
    END IF;

    -- Obter organização e nome do estudante
    SELECT organization_id, name INTO v_org_id, v_student_name
    FROM public.students
    WHERE id = p_student_id;

    -- Obter ou criar registro de pontos do trimestre
    INSERT INTO public.student_conduct_quarterly_scores (
        organization_id, student_id, year, quarter, base_points, points_lost, current_balance
    ) VALUES (
        v_org_id, p_student_id, p_year, p_quarter, 20.0, 0.0, 20.0
    )
    ON CONFLICT (student_id, year, quarter) DO NOTHING;

    SELECT * INTO v_score_record
    FROM public.student_conduct_quarterly_scores
    WHERE student_id = p_student_id AND year = p_year AND quarter = p_quarter
    FOR UPDATE;

    v_new_lost := LEAST(20.0, v_score_record.points_lost + v_deduction);
    v_new_balance := GREATEST(0.0, 20.0 - v_new_lost);

    -- Checa marco 10 pontos
    IF v_new_lost >= 10.0 AND NOT v_score_record.milestone_10_notified THEN
        v_m10_triggered := TRUE;
        INSERT INTO public.student_conduct_milestone_notifications (
            organization_id, student_id, year, quarter, milestone, title, message, level
        ) VALUES (
            v_org_id, p_student_id, p_year, p_quarter, 10,
            'Atenção: 10 Pontos Perdidos no Trimestre',
            'O estudante ' || COALESCE(v_student_name, 'do responsável') || ' acumulou 10 pontos de penalidade disciplinar no ' || p_quarter || 'º Trimestre. Recomendamos alinhamento preventivo com a equipe pedagógica.',
            'atencao'
        );
    END IF;

    -- Checa marco 15 pontos
    IF v_new_lost >= 15.0 AND NOT v_score_record.milestone_15_notified THEN
        v_m15_triggered := TRUE;
        INSERT INTO public.student_conduct_milestone_notifications (
            organization_id, student_id, year, quarter, milestone, title, message, level
        ) VALUES (
            v_org_id, p_student_id, p_year, p_quarter, 15,
            'Alerta Pedagógico: 15 Pontos de Infração Atingidos',
            'ALERTA PEDAGÓGICO: O estudante atingiu 15 pontos de infração no ' || p_quarter || 'º Trimestre. Há risco iminente de suspensão e medidas socioeducativas. Convocação para reunião presencial com a coordenação.',
            'alerta'
        );
    END IF;

    -- Checa marco 20 pontos
    IF v_new_lost >= 20.0 AND NOT v_score_record.milestone_20_notified THEN
        v_m20_triggered := TRUE;
        INSERT INTO public.student_conduct_milestone_notifications (
            organization_id, student_id, year, quarter, milestone, title, message, level
        ) VALUES (
            v_org_id, p_student_id, p_year, p_quarter, 20,
            'Aviso Crítico: Limite Total de 20 Pontos Atingido no Trimestre',
            'AVISO CRÍTICO E REGIMENTAL: Limite total de 20 pontos de conduta esgotado no ' || p_quarter || 'º Trimestre. Caso encaminhado imediatamente para a Direção e Conselho Escolar com aplicação de medidas regimentais cabíveis.',
            'critico'
        );
    END IF;

    -- Atualiza pontuação
    UPDATE public.student_conduct_quarterly_scores
    SET 
        points_lost = v_new_lost,
        current_balance = v_new_balance,
        milestone_10_notified = (v_score_record.milestone_10_notified OR v_m10_triggered),
        milestone_15_notified = (v_score_record.milestone_15_notified OR v_m15_triggered),
        milestone_20_notified = (v_score_record.milestone_20_notified OR v_m20_triggered),
        updated_at = NOW()
    WHERE student_id = p_student_id AND year = p_year AND quarter = p_quarter;

    RETURN jsonb_build_object(
        'success', true,
        'student_id', p_student_id,
        'deduction', v_deduction,
        'points_lost', v_new_lost,
        'current_balance', v_new_balance,
        'milestone_10', (v_score_record.milestone_10_notified OR v_m10_triggered),
        'milestone_15', (v_score_record.milestone_15_notified OR v_m15_triggered),
        'milestone_20', (v_score_record.milestone_20_notified OR v_m20_triggered)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_process_conduct_infraction(UUID, TEXT, NUMERIC, INTEGER, INTEGER) TO authenticated, anon;

-- 5. FUNCTION PARA CONSULTA DE PONTOS E MARCOS TRIMESTRAIS
CREATE OR REPLACE FUNCTION public.get_student_quarterly_conduct_summary(
    p_student_id UUID,
    p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
    p_quarter INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_score RECORD;
    v_notifs JSONB;
    v_leve_count INT := 0;
    v_media_count INT := 0;
    v_gravissima_count INT := 0;
BEGIN
    -- Garante existência de registro
    INSERT INTO public.student_conduct_quarterly_scores (
        student_id, year, quarter, base_points, points_lost, current_balance
    ) VALUES (
        p_student_id, p_year, p_quarter, 20.0, 0.0, 20.0
    )
    ON CONFLICT (student_id, year, quarter) DO NOTHING;

    SELECT * INTO v_score
    FROM public.student_conduct_quarterly_scores
    WHERE student_id = p_student_id AND year = p_year AND quarter = p_quarter;

    -- Busca notificações de marcos
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', n.id,
            'milestone', n.milestone,
            'title', n.title,
            'message', n.message,
            'level', n.level,
            'created_at', n.created_at
        ) ORDER BY n.milestone ASC
    ), '[]'::jsonb) INTO v_notifs
    FROM public.student_conduct_milestone_notifications n
    WHERE n.student_id = p_student_id AND n.year = p_year AND n.quarter = p_quarter;

    -- Conta ocorrências por tipo
    SELECT 
        COUNT(*) FILTER (WHERE lower(occurrence_type) IN ('leve', 'green')),
        COUNT(*) FILTER (WHERE lower(occurrence_type) IN ('media', 'yellow', 'disciplinar')),
        COUNT(*) FILTER (WHERE lower(occurrence_type) IN ('gravissima', 'red'))
    INTO v_leve_count, v_media_count, v_gravissima_count
    FROM public.occurrences
    WHERE student_id = p_student_id;

    RETURN jsonb_build_object(
        'student_id', p_student_id,
        'year', p_year,
        'quarter', p_quarter,
        'base_points', COALESCE(v_score.base_points, 20.0),
        'points_lost', COALESCE(v_score.points_lost, 0.0),
        'current_balance', COALESCE(v_score.current_balance, 20.0),
        'milestone_10', COALESCE(v_score.milestone_10_notified, false),
        'milestone_15', COALESCE(v_score.milestone_15_notified, false),
        'milestone_20', COALESCE(v_score.milestone_20_notified, false),
        'notifications', v_notifs,
        'counters', jsonb_build_object(
            'leve', v_leve_count,
            'media', v_media_count,
            'gravissima', v_gravissima_count
        )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_quarterly_conduct_summary(UUID, INTEGER, INTEGER) TO authenticated, anon;

-- 6. TRIGGER PARA ATUALIZAR REALTIME PUBLICATION
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.student_conduct_quarterly_scores;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.student_conduct_milestone_notifications;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END
$$;
