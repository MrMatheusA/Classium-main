-- ==============================================================================
-- MIGRATION 0057: TEACHER ATTENDANCE & FREQUENCY SYSTEM (ENTERPRISE REALTIME)
-- ==============================================================================

-- 1. Ensure unique constraint on attendance table for idempotent daily records
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'attendance_student_class_date_unique'
    ) THEN
        BEGIN
            ALTER TABLE public.attendance 
            ADD CONSTRAINT attendance_student_class_date_unique 
            UNIQUE (student_id, class_id, attendance_date);
        EXCEPTION
            WHEN OTHERS THEN NULL;
        END;
    END IF;
END $$;

-- 2. Batch Attendance Recording RPC with security definer
CREATE OR REPLACE FUNCTION public.record_batch_attendance(
    p_class_id UUID,
    p_attendance_date DATE,
    p_records JSONB,
    p_created_by UUID DEFAULT auth.uid()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_record JSONB;
    v_student_id UUID;
    v_status TEXT;
    v_obs TEXT;
    v_count INT := 0;
BEGIN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_records)
    LOOP
        v_student_id := (v_record->>'student_id')::UUID;
        v_status := COALESCE(v_record->>'status', 'PRESENT');
        v_obs := v_record->>'observations';

        INSERT INTO public.attendance (
            student_id,
            class_id,
            attendance_date,
            status,
            observations,
            created_at
        ) VALUES (
            v_student_id,
            p_class_id,
            p_attendance_date,
            v_status,
            v_obs,
            NOW()
        )
        ON CONFLICT (student_id, class_id, attendance_date)
        DO UPDATE SET
            status = EXCLUDED.status,
            observations = EXCLUDED.observations,
            created_at = NOW();

        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'recorded_count', v_count,
        'attendance_date', p_attendance_date,
        'class_id', p_class_id
    );
END;
$$;

-- 3. Monthly Attendance Query RPC
CREATE OR REPLACE FUNCTION public.get_class_monthly_attendance(
    p_class_id UUID,
    p_year INT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INT,
    p_month INT DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
    v_data JSONB;
BEGIN
    v_start_date := MAKE_DATE(p_year, p_month, 1);
    v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

    SELECT jsonb_agg(
        jsonb_build_object(
            'id', a.id,
            'student_id', a.student_id,
            'attendance_date', a.attendance_date,
            'day', EXTRACT(DAY FROM a.attendance_date)::INT,
            'status', a.status,
            'observations', a.observations,
            'student_name', s.full_name
        )
    )
    INTO v_data
    FROM public.attendance a
    JOIN public.students s ON s.id = a.student_id
    WHERE a.class_id = p_class_id
      AND a.attendance_date BETWEEN v_start_date AND v_end_date;

    RETURN COALESCE(v_data, '[]'::jsonb);
END;
$$;

-- 4. Grant execution permissions
GRANT EXECUTE ON FUNCTION public.record_batch_attendance TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_class_monthly_attendance TO authenticated, anon;

-- 5. Enable Realtime publication on attendance table
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
        WHEN OTHERS THEN NULL;
    END;
END $$;
