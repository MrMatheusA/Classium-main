-- ==============================================================================
-- MIGRATION 0059: LOGBOOK (LESSONS) & CONDUCT SCORE SYSTEM (REALTIME)
-- ==============================================================================

-- 1. Create lessons table for "Registro de Conteúdo Lecionado"
CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    discipline_name TEXT NOT NULL,
    lesson_date DATE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS for lessons
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Teachers can manage lessons for their classes" ON public.lessons
    FOR ALL TO authenticated USING (
        teacher_id IN (SELECT id FROM public.teachers WHERE profile_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END; $$;

DO $$ BEGIN
    CREATE POLICY "Students and Families can view lessons" ON public.lessons
    FOR SELECT TO authenticated USING (
        organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END; $$;


-- 2. Create occurrence_types table
CREATE TABLE IF NOT EXISTS public.occurrence_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    severity TEXT NOT NULL, -- 'leve', 'media', 'gravissima', 'positive'
    points_deduction NUMERIC(4,1) NOT NULL DEFAULT 0.0,
    requires_coord_alert BOOLEAN DEFAULT FALSE,
    requires_family_notification BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.occurrence_types ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "All authenticated can view occurrence types" ON public.occurrence_types
    FOR SELECT TO authenticated USING (
        organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END; $$;


-- 3. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL,
    recipient_type TEXT NOT NULL, -- 'coordinator', 'family', 'teacher'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    related_entity_type TEXT,
    related_entity_id UUID,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT TO authenticated USING (recipient_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END; $$;


-- 4. RPC for Record Occurrence and Update Conduct
CREATE OR REPLACE FUNCTION public.record_logbook_occurrence(
    p_student_id UUID,
    p_class_id UUID,
    p_teacher_id UUID,
    p_descriptions TEXT[],
    p_detailed_description TEXT,
    p_is_positive BOOLEAN,
    p_total_deduction NUMERIC,
    p_has_gravissima BOOLEAN,
    p_occurrence_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
    v_occurrence_id UUID;
    v_combined_title TEXT;
    v_coordinator_id UUID;
BEGIN
    -- Get Organization ID safely
    SELECT organization_id INTO v_org_id FROM public.students WHERE id = p_student_id;

    IF v_org_id IS NULL THEN
        -- fallback
        SELECT organization_id INTO v_org_id FROM public.classes WHERE id = p_class_id;
    END IF;

    -- Title Builder
    IF array_length(p_descriptions, 1) > 0 THEN
        IF p_is_positive THEN
            v_combined_title := 'Registro Positivo: ' || array_to_string(p_descriptions, ', ');
        ELSE
            v_combined_title := 'Registro Disciplinar: ' || array_to_string(p_descriptions, ', ');
        END IF;
    ELSE
        IF p_is_positive THEN
            v_combined_title := 'Registro Positivo no Diário de Bordo';
        ELSE
            v_combined_title := 'Registro Disciplinar no Diário de Bordo';
        END IF;
    END IF;

    -- Prevent null descriptions
    IF p_detailed_description IS NULL THEN
        p_detailed_description := '';
    END IF;

    -- Insert Occurrence
    INSERT INTO public.occurrences (
        organization_id,
        student_id,
        class_id,
        teacher_id,
        occurrence_type,
        title,
        description,
        points_deducted,
        is_positive,
        is_urgent,
        occurrence_date
    ) VALUES (
        v_org_id,
        p_student_id,
        p_class_id,
        p_teacher_id,
        CASE WHEN p_has_gravissima THEN 'gravissima' WHEN p_is_positive THEN 'elogio' ELSE 'disciplinar' END,
        v_combined_title,
        p_detailed_description,
        p_total_deduction,
        p_is_positive,
        p_has_gravissima,
        p_occurrence_date
    ) RETURNING id INTO v_occurrence_id;

    -- Update conduct points in students table natively
    UPDATE public.students
    SET conduct_points = GREATEST(0, conduct_points - p_total_deduction)
    WHERE id = p_student_id;

    -- Notification if Gravissima
    IF p_has_gravissima AND v_org_id IS NOT NULL THEN
        SELECT id INTO v_coordinator_id FROM public.profiles WHERE organization_id = v_org_id AND role = 'coordinator' LIMIT 1;
        
        IF v_coordinator_id IS NOT NULL THEN
            INSERT INTO public.notifications (organization_id, recipient_id, recipient_type, title, message, related_entity_type, related_entity_id)
            VALUES (v_org_id, v_coordinator_id, 'coordinator', 'Alerta Crítico: Ocorrência Gravíssima', 'Uma ocorrência gravíssima foi registrada. Verifique o dossiê detalhado.', 'occurrence', v_occurrence_id);
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'occurrence_id', v_occurrence_id
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.record_logbook_occurrence(UUID, UUID, UUID, TEXT[], TEXT, BOOLEAN, NUMERIC, BOOLEAN, DATE) TO authenticated, anon;


-- 5. RPC for Record Lesson Content
CREATE OR REPLACE FUNCTION public.record_lesson_content(
    p_class_id UUID,
    p_teacher_id UUID,
    p_discipline_name TEXT,
    p_lesson_date DATE,
    p_content TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
    v_lesson_id UUID;
BEGIN
    SELECT organization_id INTO v_org_id FROM public.classes WHERE id = p_class_id;

    INSERT INTO public.lessons (
        organization_id,
        class_id,
        teacher_id,
        discipline_name,
        lesson_date,
        content
    ) VALUES (
        v_org_id,
        p_class_id,
        p_teacher_id,
        p_discipline_name,
        p_lesson_date,
        p_content
    ) RETURNING id INTO v_lesson_id;

    RETURN jsonb_build_object(
        'success', true,
        'lesson_id', v_lesson_id
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.record_lesson_content(UUID, UUID, TEXT, DATE, TEXT) TO authenticated, anon;

-- 6. Realtime Registration
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.lessons;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END
$$;
