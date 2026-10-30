-- ====================================================================
-- ESQUEMA COMPLETO PARA O RADAR DE ROTINA & LIVRO DIGITAL DE CONDUTA
-- Módulo de Frequência, Alertas de Retenção e Ocorrências com Triggers Automatizados
-- ====================================================================

-- 1. MODIFICAÇÕES NA TABELA PUBLIC.STUDENTS
ALTER TABLE IF EXISTS public.students 
  ADD COLUMN IF NOT EXISTS total_absences_year INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_conduct_occurrences_year INTEGER DEFAULT 0;

-- 2. TABELA DE FREQUÊNCIA ESCOLAR (student_attendance)
CREATE TABLE IF NOT EXISTS public.student_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    date DATE NOT NULL,
    status VARCHAR(50) CHECK (status IN ('present', 'absent', 'justified_absent')) NOT NULL,
    justification TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_attendance_per_day UNIQUE (student_id, date)
);

-- 3. TABELA LIVRO DIGITAL DE CONDUTA (student_conduct_records)
CREATE TABLE IF NOT EXISTS public.student_conduct_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    recorded_by_name VARCHAR(255) DEFAULT 'Professor / Equipe Pedagógica',
    record_type VARCHAR(20) CHECK (record_type IN ('red', 'yellow', 'green')) NOT NULL,
    title VARCHAR(255) DEFAULT 'Ocorrência Disciplinar',
    description TEXT NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA DE RASTREIO DE ALERTAS AUTOMÁTICOS DE CONDUTA (student_conduct_alerts)
CREATE TABLE IF NOT EXISTS public.student_conduct_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    occurrence_count_threshold INTEGER NOT NULL,
    alert_triggered_at TIMESTAMPTZ DEFAULT NOW(),
    communication_id UUID,
    CONSTRAINT unique_alert_per_threshold UNIQUE (student_id, occurrence_count_threshold)
);

-- 5. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_student_attendance_student_id ON public.student_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_student_attendance_date ON public.student_attendance(date);
CREATE INDEX IF NOT EXISTS idx_student_conduct_records_student_id ON public.student_conduct_records(student_id);
CREATE INDEX IF NOT EXISTS idx_student_conduct_records_type ON public.student_conduct_records(record_type);
CREATE INDEX IF NOT EXISTS idx_student_conduct_alerts_student_id ON public.student_conduct_alerts(student_id);

-- 6. TRIGGER DE ATUALIZAÇÃO DE FALTAS EM PUBLIC.STUDENTS
CREATE OR REPLACE FUNCTION public.fn_sync_student_absences()
RETURNS TRIGGER AS $$
DECLARE
    v_absences INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_absences 
    FROM public.student_attendance 
    WHERE student_id = COALESCE(NEW.student_id, OLD.student_id)
      AND status = 'absent';

    UPDATE public.students 
    SET total_absences_year = v_absences 
    WHERE id = COALESCE(NEW.student_id, OLD.student_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_student_absences ON public.student_attendance;
CREATE TRIGGER trg_sync_student_absences
AFTER INSERT OR UPDATE OR DELETE ON public.student_attendance
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_student_absences();

-- 7. TRIGGER E FUNCTION DE DISPARO DE COMUNICADOS AUTOMÁTICOS PARA OCORRÊNCIAS (10, 20, 30)
CREATE OR REPLACE FUNCTION public.fn_check_conduct_occurrences_and_alert()
RETURNS TRIGGER AS $$
DECLARE
    v_total_occurrences INTEGER;
    v_threshold INTEGER;
    v_comm_id UUID;
    v_student_name TEXT;
    v_thresholds INTEGER[] := ARRAY[10, 20, 30];
BEGIN
    -- Atualiza total de ocorrências
    SELECT COUNT(*) INTO v_total_occurrences
    FROM public.student_conduct_records
    WHERE student_id = NEW.student_id;

    UPDATE public.students
    SET total_conduct_occurrences_year = v_total_occurrences
    WHERE id = NEW.student_id;

    -- Busca nome do estudante
    SELECT name INTO v_student_name FROM public.students WHERE id = NEW.student_id;
    IF v_student_name IS NULL THEN
        v_student_name := 'Estudante';
    END IF;

    -- Verifica limites 10, 20, 30
    FOREACH v_threshold IN ARRAY v_thresholds
    LOOP
        IF v_total_occurrences >= v_threshold THEN
            -- Verifica se alerta já foi disparado para este limite
            IF NOT EXISTS (
                SELECT 1 FROM public.student_conduct_alerts 
                WHERE student_id = NEW.student_id 
                  AND occurrence_count_threshold = v_threshold
            ) THEN
                v_comm_id := gen_random_uuid();

                -- Inserir comunicado se a tabela public.communications existir
                IF EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = 'communications'
                ) THEN
                    INSERT INTO public.communications (
                        id, title, content, target_type, target_id, priority, created_at
                    ) VALUES (
                        v_comm_id,
                        'CONVOCAÇÃO PEDAGÓGICA AUTOMÁTICA - ' || v_threshold || ' OCORRÊNCIAS REGISTRADAS',
                        'Prezado Responsável Legal, informamos que o(a) estudante ' || v_student_name || ' atingiu o limite de ' || v_threshold || ' ocorrências registradas no Livro Digital de Conduta. Solicitamos o comparecimento urgente à unidade escolar para alinhamento com a equipe diretiva.',
                        'student',
                        NEW.student_id,
                        'URGENT',
                        NOW()
                    );
                END IF;

                -- Registrar alerta de limite disparado
                INSERT INTO public.student_conduct_alerts (
                    student_id, occurrence_count_threshold, communication_id, alert_triggered_at
                ) VALUES (
                    NEW.student_id, v_threshold, v_comm_id, NOW()
                );
            END IF;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_conduct_alerts ON public.student_conduct_records;
CREATE TRIGGER trg_check_conduct_alerts
AFTER INSERT ON public.student_conduct_records
FOR EACH ROW EXECUTE FUNCTION public.fn_check_conduct_occurrences_and_alert();

-- 8. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_conduct_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_conduct_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_student_attendance_select ON public.student_attendance;
CREATE POLICY p_student_attendance_select ON public.student_attendance FOR SELECT USING (true);

DROP POLICY IF EXISTS p_student_attendance_insert ON public.student_attendance;
CREATE POLICY p_student_attendance_insert ON public.student_attendance FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS p_student_conduct_records_select ON public.student_conduct_records;
CREATE POLICY p_student_conduct_records_select ON public.student_conduct_records FOR SELECT USING (true);

DROP POLICY IF EXISTS p_student_conduct_records_insert ON public.student_conduct_records;
CREATE POLICY p_student_conduct_records_insert ON public.student_conduct_records FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS p_student_conduct_alerts_select ON public.student_conduct_alerts;
CREATE POLICY p_student_conduct_alerts_select ON public.student_conduct_alerts FOR SELECT USING (true);

-- 9. SUPABASE REALTIME
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.student_attendance;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.student_conduct_records;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.student_conduct_alerts;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END
$$;
