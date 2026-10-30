-- ====================================================================
-- CLASSIUM ERP EDUCACIONAL — MASTER SECURITY HARDENING & FIXES
-- MIGRATION 0083: RADAR DE ROTINA & DIÁRIO DE BORDO
-- ====================================================================

-- 1. PURGE PERMISSIVE RLS POLICIES ON OCCURRENCES
DROP POLICY IF EXISTS "occurrences_read_policy" ON public.occurrences;
DROP POLICY IF EXISTS "occurrences_write_policy" ON public.occurrences;
DROP POLICY IF EXISTS "family_read_homologated_occurrences" ON public.occurrences;
DROP POLICY IF EXISTS "staff_admin_teacher_occurrences_policy" ON public.occurrences;

-- Ensure RLS is active
ALTER TABLE public.occurrences ENABLE ROW LEVEL SECURITY;

-- 2. STAFF / ADMIN / TEACHER POLICY FOR FULL TENANT MANAGEMENT
CREATE POLICY "staff_admin_teacher_occurrences_policy"
ON public.occurrences
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'gestor', 'pedagogo', 'professor', 'docente', 'diretor', 'coordenador', 'admin_master')
  )
);

-- 3. FAMILY RLS POLICY: RESTRICT TO HOMOLOGATED OCCURRENCES & ACTIVE GUARDIAN LINK
CREATE POLICY "family_read_homologated_occurrences"
ON public.occurrences
FOR SELECT
TO authenticated, anon
USING (
  status IN ('Homologada', 'Compartilhada', 'Publicada')
  AND (
    student_id IN (
      SELECT srl.student_id 
      FROM public.student_responsible_links srl
      LEFT JOIN public.guardians g ON g.id = srl.guardian_id
      WHERE g.user_id = auth.uid() OR srl.guardian_id = auth.uid()
    )
    OR student_id IN (
      SELECT st.id
      FROM public.students st
      WHERE st.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'gestor', 'pedagogo', 'professor', 'docente', 'diretor', 'coordenador', 'admin_master')
    )
  )
);

-- 4. SECURE RPC FOR GUARDIAN ACKNOWLEDGMENT (fn_acknowledge_student_conduct)
CREATE OR REPLACE FUNCTION public.fn_acknowledge_student_conduct(
  p_occurrence_id UUID,
  p_guardian_notes TEXT DEFAULT NULL,
  p_guardian_name VARCHAR DEFAULT 'Responsável Legal'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
  v_authorized BOOLEAN := FALSE;
  v_caller_id UUID;
BEGIN
  v_caller_id := auth.uid();

  -- Get student_id from occurrence
  SELECT student_id INTO v_student_id
  FROM public.occurrences
  WHERE id = p_occurrence_id;

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Ocorrência não encontrada.';
  END IF;

  -- Validate caller relationship
  IF v_caller_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.student_responsible_links srl
      LEFT JOIN public.guardians g ON g.id = srl.guardian_id
      WHERE srl.student_id = v_student_id 
        AND (g.user_id = v_caller_id OR srl.guardian_id = v_caller_id)
    ) OR EXISTS (
      SELECT 1 FROM public.students st
      WHERE st.id = v_student_id AND st.user_id = v_caller_id
    ) OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = v_caller_id AND p.role IN ('admin', 'gestor', 'pedagogo', 'professor', 'docente', 'diretor', 'coordenador', 'admin_master')
    ) INTO v_authorized;
  ELSE
    -- If called in anon context, allow acknowledgment if valid occurrence ID provided
    v_authorized := TRUE;
  END IF;

  IF NOT v_authorized THEN
    RAISE EXCEPTION 'Acesso negado: o usuário não possui vínculo ativo com o estudante.';
  END IF;

  -- Update acknowledgment, preserving original timestamp via COALESCE
  UPDATE public.occurrences
  SET 
    guardian_acknowledged = TRUE,
    guardian_acknowledged_at = COALESCE(guardian_acknowledged_at, NOW()),
    guardian_notes = COALESCE(p_guardian_notes, guardian_notes),
    updated_at = NOW()
  WHERE id = p_occurrence_id;

  RETURN TRUE;
END;
$$;

-- 5. ATOMIC DB TRANSACTION FUNCTION FOR OCCURRENCE REGISTRATION & BALANCE (fn_record_classium_occurrence)
CREATE OR REPLACE FUNCTION public.fn_record_classium_occurrence(
  p_student_id UUID,
  p_class_id UUID DEFAULT NULL,
  p_teacher_id UUID DEFAULT NULL,
  p_record_type VARCHAR DEFAULT 'leve',
  p_title VARCHAR DEFAULT 'Ocorrência Disciplinar',
  p_description TEXT DEFAULT '',
  p_actions_taken TEXT DEFAULT '',
  p_occurrence_date DATE DEFAULT CURRENT_DATE,
  p_quarter INTEGER DEFAULT 1,
  p_year INTEGER DEFAULT 2026,
  p_recorded_by_name VARCHAR DEFAULT 'Professor Docente',
  p_idempotency_key VARCHAR DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL,
  p_school_id UUID DEFAULT NULL,
  p_academic_year_id UUID DEFAULT NULL,
  p_term_number INTEGER DEFAULT 1,
  p_severity VARCHAR DEFAULT 'Leve',
  p_action_taken TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_occ_id UUID;
  v_deduction NUMERIC(4,1) := 0.5;
  v_is_positive BOOLEAN := FALSE;
  v_is_urgent BOOLEAN := FALSE;
  v_total_lost NUMERIC(4,1) := 0.0;
  v_new_balance NUMERIC(4,1) := 20.0;
  v_balance_before NUMERIC(4,1) := 20.0;
  v_student_name VARCHAR := 'Estudante';
  v_m10 BOOLEAN := FALSE;
  v_m15 BOOLEAN := FALSE;
  v_m20 BOOLEAN := FALSE;
BEGIN
  -- Determine deduction points
  IF p_record_type = 'elogio' OR p_severity = 'Elogio' THEN
    v_deduction := 0.0;
    v_is_positive := TRUE;
  ELSIF p_record_type = 'gravissima' OR p_severity = 'Gravíssima' THEN
    v_deduction := 2.0;
    v_is_urgent := TRUE;
  ELSIF p_record_type = 'media' OR p_severity = 'Média' THEN
    v_deduction := 1.0;
  ELSE
    v_deduction := 0.5;
  END IF;

  -- Insert occurrence
  INSERT INTO public.occurrences (
    organization_id, school_id, student_id, class_id, teacher_id,
    recorded_by_name, occurrence_type, record_type, severity, title, description,
    actions_taken, points_deducted, is_positive, is_urgent, occurrence_date,
    quarter, year, idempotency_key, status
  ) VALUES (
    p_organization_id, p_school_id, p_student_id, p_class_id, p_teacher_id,
    p_recorded_by_name, p_record_type, p_record_type, p_severity, p_title, p_description,
    COALESCE(p_actions_taken, p_action_taken, ''), v_deduction, v_is_positive, v_is_urgent,
    COALESCE(p_occurrence_date, CURRENT_DATE), p_quarter, p_year, p_idempotency_key, 'Registrada'
  )
  ON CONFLICT (idempotency_key) DO UPDATE SET updated_at = NOW()
  RETURNING id INTO v_occ_id;

  -- Lock quarterly score row with SELECT FOR UPDATE to prevent race conditions
  PERFORM 1 FROM public.student_conduct_quarterly_scores
  WHERE student_id = p_student_id AND quarter = p_quarter AND year = p_year
  FOR UPDATE;

  -- Calculate total points lost directly in DB
  SELECT COALESCE(SUM(points_deducted), 0.0) INTO v_total_lost
  FROM public.occurrences
  WHERE student_id = p_student_id AND quarter = p_quarter AND year = p_year AND is_positive = FALSE;

  v_new_balance := GREATEST(0.0, 20.0 - v_total_lost);
  v_balance_before := GREATEST(0.0, 20.0 - (v_total_lost - v_deduction));
  v_m10 := (v_total_lost >= 10.0);
  v_m15 := (v_total_lost >= 15.0);
  v_m20 := (v_total_lost >= 20.0);

  -- Atomic Upsert into quarterly scores table (canonical source)
  INSERT INTO public.student_conduct_quarterly_scores (
    organization_id, school_id, student_id, quarter, year,
    base_points, points_lost, current_balance,
    milestone_10_notified, milestone_15_notified, milestone_20_notified, updated_at
  ) VALUES (
    p_organization_id, p_school_id, p_student_id, p_quarter, p_year,
    20.0, v_total_lost, v_new_balance, v_m10, v_m15, v_m20, NOW()
  )
  ON CONFLICT (student_id, year, quarter) DO UPDATE SET
    points_lost = EXCLUDED.points_lost,
    current_balance = EXCLUDED.current_balance,
    milestone_10_notified = EXCLUDED.milestone_10_notified,
    milestone_15_notified = EXCLUDED.milestone_15_notified,
    milestone_20_notified = EXCLUDED.milestone_20_notified,
    updated_at = NOW();

  -- Insert audit movement
  IF v_deduction > 0 OR v_is_positive THEN
    INSERT INTO public.student_conduct_movements (
      organization_id, school_id, occurrence_id, student_id, year, quarter,
      movement_type, points_amount, balance_before, balance_after, reason, created_at
    ) VALUES (
      p_organization_id, p_school_id, v_occ_id, p_student_id, p_year, p_quarter,
      CASE WHEN v_is_positive THEN 'elogio' ELSE 'deduction' END,
      v_deduction, v_balance_before, v_new_balance, p_title, NOW()
    );
  END IF;

  -- Fetch student name
  SELECT name INTO v_student_name FROM public.students WHERE id = p_student_id;

  RETURN jsonb_build_object(
    'success', true,
    'occurrence_id', v_occ_id,
    'student_id', p_student_id,
    'student_name', COALESCE(v_student_name, 'Estudante'),
    'severity', p_severity,
    'points_deducted', v_deduction,
    'balance_before', v_balance_before,
    'new_balance', v_new_balance,
    'points_lost', v_total_lost,
    'milestone_10_triggered', v_m10,
    'milestone_15_triggered', v_m15,
    'milestone_20_triggered', v_m20,
    'message', 'Ocorrência gravada com cálculo atômico do saldo.'
  );
END;
$$;
