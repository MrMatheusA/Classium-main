-- ==============================================================================
-- MIGRATION 0058: SCHOOL CALENDAR & ATTENDANCE SUMMARY (REALTIME)
-- ==============================================================================

-- 1. Create school_calendar table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.school_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    calendar_date DATE NOT NULL,
    is_school_day BOOLEAN DEFAULT TRUE,
    is_holiday BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (organization_id, calendar_date)
);

-- 2. Enable RLS on school_calendar
ALTER TABLE public.school_calendar ENABLE ROW LEVEL SECURITY;

-- Create policy for school_calendar
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'school_calendar' AND policyname = 'Teachers can view school calendar for their organization'
    ) THEN
        CREATE POLICY "Teachers can view school calendar for their organization" ON public.school_calendar
        FOR SELECT TO authenticated 
        USING (
            organization_id IN (
                SELECT organization_id FROM public.profiles WHERE id = auth.uid()
            )
        );
    END IF;
END $$;

-- 3. RPC: get_attendance_summary
CREATE OR REPLACE FUNCTION public.get_attendance_summary(p_class_id UUID, p_month INTEGER, p_year INTEGER)
RETURNS TABLE (
    total_school_days_month INTEGER,
    total_school_days_year INTEGER,
    completed_school_days_year INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH class_org AS (
        SELECT organization_id FROM public.classes WHERE id = p_class_id LIMIT 1
    )
    SELECT
        (SELECT COUNT(DISTINCT sc.calendar_date)::INTEGER 
         FROM public.school_calendar sc 
         WHERE sc.organization_id = (SELECT organization_id FROM class_org)
           AND EXTRACT(MONTH FROM sc.calendar_date) = p_month
           AND EXTRACT(YEAR FROM sc.calendar_date) = p_year
           AND sc.is_school_day = TRUE) AS total_school_days_month,
        
        (SELECT COUNT(DISTINCT sc_year.calendar_date)::INTEGER 
         FROM public.school_calendar sc_year 
         WHERE sc_year.organization_id = (SELECT organization_id FROM class_org)
           AND EXTRACT(YEAR FROM sc_year.calendar_date) = p_year 
           AND sc_year.is_school_day = TRUE) AS total_school_days_year,
        
        (SELECT COUNT(DISTINCT a.attendance_date)::INTEGER 
         FROM public.attendance a 
         WHERE a.class_id = p_class_id 
           AND EXTRACT(YEAR FROM a.attendance_date) = p_year 
           AND a.status IS NOT NULL) AS completed_school_days_year;
END;
$$;

-- 4. Enable Realtime on school_calendar
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.school_calendar;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
        WHEN OTHERS THEN NULL;
    END;
END $$;

-- 5. Insert mock calendar data for the current month/year for existing organizations (so the UI has data)
DO $$
DECLARE
    org_record RECORD;
    v_date DATE;
    v_start_date DATE;
    v_end_date DATE;
BEGIN
    -- Just for July 2026 (based on the UI)
    v_start_date := '2026-07-01'::DATE;
    v_end_date := '2026-07-31'::DATE;

    FOR org_record IN SELECT id FROM public.organizations LOOP
        v_date := v_start_date;
        WHILE v_date <= v_end_date LOOP
            -- Weekends are recess
            IF EXTRACT(DOW FROM v_date) IN (0, 6) THEN
                INSERT INTO public.school_calendar (organization_id, calendar_date, is_school_day, is_holiday)
                VALUES (org_record.id, v_date, FALSE, FALSE)
                ON CONFLICT (organization_id, calendar_date) DO NOTHING;
            ELSE
                INSERT INTO public.school_calendar (organization_id, calendar_date, is_school_day, is_holiday)
                VALUES (org_record.id, v_date, TRUE, FALSE)
                ON CONFLICT (organization_id, calendar_date) DO NOTHING;
            END IF;
            v_date := v_date + INTERVAL '1 day';
        END LOOP;
    END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.get_attendance_summary TO authenticated, anon;
