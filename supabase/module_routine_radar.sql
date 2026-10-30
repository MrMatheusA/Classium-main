-- ====================================================================
-- AUDITORIA DO ERRO 42703 (column "occurrence_id" does not exist)
-- ====================================================================
-- • Nome da Tabela: public.routine_occurrences (Tabela base)
-- • Nome da Coluna Utilizada Erroneamente: occurrence_id
-- • Onde Ocorreu: Nas estruturas de CREATE VIEW (ex: COUNT(occurrence_id))
-- 
-- Causa: A tabela routine_occurrences possui a Primary Key com o nome "id". 
-- O erro ocorreu pois as Views tentaram referenciar "occurrence_id" 
-- ao consultar diretamente a tabela base routine_occurrences, que não possui essa coluna.
--
-- Correção Aplicada: Em todas as Views, foi substituído 
-- COUNT(occurrence_id) por COUNT(id) nas consultas referenciando routine_occurrences.
-- ====================================================================

-- ====================================================================
-- MÓDULO RADAR DE ROTINA + LIVRO DIGITAL DE CONDUTA (ENTERPRISE)
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.routine_occurrences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL,
    student_id UUID NOT NULL,
    class_id UUID,
    employee_id UUID,
    occurrence_type VARCHAR(100),
    occurrence_category VARCHAR(100),
    severity VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    action_taken TEXT,
    requires_family_notification BOOLEAN DEFAULT FALSE,
    requires_signature BOOLEAN DEFAULT FALSE,
    requires_followup BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'PENDING',
    event_date TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.routine_followups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL,
    occurrence_id UUID NOT NULL REFERENCES public.routine_occurrences(id) ON DELETE CASCADE,
    employee_id UUID,
    followup_description TEXT,
    next_action TEXT,
    scheduled_date TIMESTAMPTZ,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.routine_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL,
    occurrence_id UUID REFERENCES public.routine_occurrences(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_title VARCHAR(255) NOT NULL,
    notification_message TEXT NOT NULL,
    notification_type VARCHAR(50),
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.disciplinary_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL,
    student_id UUID NOT NULL,
    occurrence_id UUID REFERENCES public.routine_occurrences(id) ON DELETE CASCADE,
    action_type VARCHAR(100),
    description TEXT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    responsible_employee UUID,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.behavior_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL,
    student_id UUID NOT NULL,
    occurrence_id UUID REFERENCES public.routine_occurrences(id) ON DELETE SET NULL,
    points INTEGER NOT NULL,
    reason TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.routine_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL,
    occurrence_id UUID NOT NULL REFERENCES public.routine_occurrences(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    file_type VARCHAR(100),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.student_behavior_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL,
    student_id UUID NOT NULL,
    occurrence_id UUID REFERENCES public.routine_occurrences(id) ON DELETE SET NULL,
    summary TEXT,
    severity VARCHAR(50),
    registered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.family_occurrence_confirmations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL,
    occurrence_id UUID NOT NULL REFERENCES public.routine_occurrences(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    confirmed BOOLEAN DEFAULT FALSE,
    confirmed_at TIMESTAMPTZ,
    signature_hash TEXT,
    device TEXT,
    ip_address VARCHAR(45),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ====================================================================
-- TRIGGERS DE UPDATED_AT
-- ====================================================================
DO $$
DECLARE
    t_name text;
BEGIN
    FOR t_name IN 
        SELECT unnest(ARRAY[
            'routine_occurrences', 'routine_followups', 'routine_notifications', 
            'disciplinary_actions', 'behavior_points', 'routine_attachments', 
            'student_behavior_history', 'family_occurrence_confirmations'
        ])
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_upd ON public.%I', t_name, t_name);
        EXECUTE format('CREATE TRIGGER trg_%I_upd BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t_name, t_name);
    END LOOP;
END;
$$;

-- ====================================================================
-- ÍNDICES PARA ALTA PERFORMANCE
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_rout_occ_school ON public.routine_occurrences(school_id);
CREATE INDEX IF NOT EXISTS idx_rout_occ_student ON public.routine_occurrences(student_id);
CREATE INDEX IF NOT EXISTS idx_rout_occ_employee ON public.routine_occurrences(employee_id);
CREATE INDEX IF NOT EXISTS idx_rout_occ_severity ON public.routine_occurrences(severity);
CREATE INDEX IF NOT EXISTS idx_rout_occ_status ON public.routine_occurrences(status);
CREATE INDEX IF NOT EXISTS idx_rout_occ_created ON public.routine_occurrences(created_at);

CREATE INDEX IF NOT EXISTS idx_rout_fup_school ON public.routine_followups(school_id);
CREATE INDEX IF NOT EXISTS idx_rout_fup_occ ON public.routine_followups(occurrence_id);
CREATE INDEX IF NOT EXISTS idx_rout_fup_emp ON public.routine_followups(employee_id);

CREATE INDEX IF NOT EXISTS idx_rout_notif_school ON public.routine_notifications(school_id);
CREATE INDEX IF NOT EXISTS idx_rout_notif_occ ON public.routine_notifications(occurrence_id);
CREATE INDEX IF NOT EXISTS idx_rout_notif_prof ON public.routine_notifications(profile_id);

CREATE INDEX IF NOT EXISTS idx_disc_act_school ON public.disciplinary_actions(school_id);
CREATE INDEX IF NOT EXISTS idx_disc_act_student ON public.disciplinary_actions(student_id);
CREATE INDEX IF NOT EXISTS idx_disc_act_occ ON public.disciplinary_actions(occurrence_id);
CREATE INDEX IF NOT EXISTS idx_disc_act_emp ON public.disciplinary_actions(responsible_employee);

CREATE INDEX IF NOT EXISTS idx_behav_pts_school ON public.behavior_points(school_id);
CREATE INDEX IF NOT EXISTS idx_behav_pts_student ON public.behavior_points(student_id);
CREATE INDEX IF NOT EXISTS idx_behav_pts_occ ON public.behavior_points(occurrence_id);

CREATE INDEX IF NOT EXISTS idx_rout_att_school ON public.routine_attachments(school_id);
CREATE INDEX IF NOT EXISTS idx_rout_att_occ ON public.routine_attachments(occurrence_id);

CREATE INDEX IF NOT EXISTS idx_stud_behav_hist_school ON public.student_behavior_history(school_id);
CREATE INDEX IF NOT EXISTS idx_stud_behav_hist_stud ON public.student_behavior_history(student_id);
CREATE INDEX IF NOT EXISTS idx_stud_behav_hist_occ ON public.student_behavior_history(occurrence_id);

CREATE INDEX IF NOT EXISTS idx_fam_occ_conf_school ON public.family_occurrence_confirmations(school_id);
CREATE INDEX IF NOT EXISTS idx_fam_occ_conf_occ ON public.family_occurrence_confirmations(occurrence_id);
CREATE INDEX IF NOT EXISTS idx_fam_occ_conf_prof ON public.family_occurrence_confirmations(profile_id);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) MULTI-TENANT
-- ====================================================================
ALTER TABLE public.routine_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disciplinary_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_behavior_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_occurrence_confirmations ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    t_name text;
BEGIN
    FOR t_name IN 
        SELECT unnest(ARRAY[
            'routine_occurrences', 'routine_followups', 'routine_notifications', 
            'disciplinary_actions', 'behavior_points', 'routine_attachments', 
            'student_behavior_history', 'family_occurrence_confirmations'
        ])
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS p_%I_access ON public.%I', t_name, t_name);
        EXECUTE format('CREATE POLICY p_%I_access ON public.%I FOR ALL USING (public.can_access_school(auth.uid(), school_id) AND deleted_at IS NULL)', t_name, t_name);
    END LOOP;
END;
$$;

-- ====================================================================
-- DASHBOARD VIEWS (CORRIGIDO: COUNT(id) AO INVÉS DE COUNT(occurrence_id))
-- ====================================================================
CREATE OR REPLACE VIEW view_occurrences_by_class AS
SELECT school_id, class_id, COUNT(id) as total_occurrences
FROM public.routine_occurrences
WHERE deleted_at IS NULL
GROUP BY school_id, class_id;

CREATE OR REPLACE VIEW view_occurrences_by_teacher AS
SELECT school_id, employee_id, COUNT(id) as total_occurrences
FROM public.routine_occurrences
WHERE deleted_at IS NULL
GROUP BY school_id, employee_id;

CREATE OR REPLACE VIEW view_occurrences_by_month AS
SELECT school_id, date_trunc('month', event_date) as month, COUNT(id) as total_occurrences
FROM public.routine_occurrences
WHERE deleted_at IS NULL
GROUP BY school_id, date_trunc('month', event_date);

CREATE OR REPLACE VIEW view_occurrences_by_category AS
SELECT school_id, occurrence_category, COUNT(id) as total_occurrences
FROM public.routine_occurrences
WHERE deleted_at IS NULL
GROUP BY school_id, occurrence_category;

CREATE OR REPLACE VIEW view_occurrences_by_severity AS
SELECT school_id, severity, COUNT(id) as total_occurrences
FROM public.routine_occurrences
WHERE deleted_at IS NULL
GROUP BY school_id, severity;

CREATE OR REPLACE VIEW view_occurrences_resolved AS
SELECT school_id, COUNT(id) as total_resolved
FROM public.routine_occurrences
WHERE status = 'RESOLVED' AND deleted_at IS NULL
GROUP BY school_id;

CREATE OR REPLACE VIEW view_occurrences_pending AS
SELECT school_id, COUNT(id) as total_pending
FROM public.routine_occurrences
WHERE status = 'PENDING' AND deleted_at IS NULL
GROUP BY school_id;

-- ====================================================================
-- SUPABASE REALTIME PUBLICATION
-- ====================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.routine_occurrences;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.routine_followups;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.routine_notifications;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.disciplinary_actions;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.behavior_points;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.routine_attachments;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.student_behavior_history;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.family_occurrence_confirmations;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END
$$;
