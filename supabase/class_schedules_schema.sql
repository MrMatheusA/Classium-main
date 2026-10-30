-- ====================================================================
-- ESQUEMA DE BANCO DE DADOS SUPABASE PARA "HORÁRIO DE AULA (SMART HORÁRIOS)"
-- Módulo: Portal da Família <-> Smart Horários da Gestão
-- ====================================================================

-- 1. TABELA DE TURNOS ESCOLARES (school_shifts)
CREATE TABLE IF NOT EXISTS public.school_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, -- Ex: 'Matutino', 'Vespertino', 'Integral'
    start_time TIME NOT NULL DEFAULT '07:00:00',
    end_time TIME NOT NULL DEFAULT '12:00:00',
    interval_start TIME DEFAULT '08:40:00',
    interval_end TIME DEFAULT '09:00:00',
    organization_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserção padrão de turnos
INSERT INTO public.school_shifts (name, start_time, end_time, interval_start, interval_end)
VALUES 
    ('Matutino (Manhã)', '07:00:00', '11:30:00', '08:40:00', '09:00:00'),
    ('Vespertino (Tarde)', '13:00:00', '17:30:00', '14:40:00', '15:00:00'),
    ('Integral', '07:00:00', '17:30:00', '12:00:00', '13:00:00')
ON CONFLICT DO NOTHING;

-- 2. TABELA DE CORPO DIRETIVO E PEDAGÓGICO (school_staff)
CREATE TABLE IF NOT EXISTS public.school_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL, -- 'Diretor(a)', 'Vice-Diretor(a)', 'Pedagogo(a)', 'Coordenador(a)'
    email TEXT,
    phone TEXT,
    shift_id UUID REFERENCES public.school_shifts(id) ON DELETE SET NULL,
    organization_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir coluna shift_id caso a tabela já exista
ALTER TABLE public.school_staff ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES public.school_shifts(id) ON DELETE SET NULL;

-- Inserção de dados demonstrativos do corpo diretivo
INSERT INTO public.school_staff (full_name, role, email, phone)
VALUES 
    ('Dra. Maria Helena Albuquerque', 'Diretora Geral', 'direcao@classium.edu.br', '(11) 98877-1122'),
    ('Prof. Roberto Mendes', 'Vice-Diretor Operacional', 'vicedirecao@classium.edu.br', '(11) 98877-1133'),
    ('Profa. Elaine Santos', 'Pedagoga do Ensino Fundamental II', 'pedagogia@classium.edu.br', '(11) 98877-1144'),
    ('Prof. Marcus Vinicius', 'Coordenador Pedagógico Ensino Médio', 'coordenacao@classium.edu.br', '(11) 98877-1155')
ON CONFLICT DO NOTHING;

-- 3. GARANTIR COLUNAS NA TABELA DE TURMAS (public.classes)
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES public.school_shifts(id) ON DELETE SET NULL;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS coordinator TEXT DEFAULT 'Elaine Santos';
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS room_label TEXT DEFAULT 'Sala 08';

-- 4. TABELA DE GRADE DE HORÁRIOS POR TURMA (class_schedules)
CREATE TABLE IF NOT EXISTS public.class_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id TEXT NOT NULL, -- Ex: 'c-5a', 'c-6a', 'c-7a' ou UUID de classes
    class_name TEXT NOT NULL DEFAULT '5º Ano A',
    day_of_week TEXT NOT NULL, -- 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'
    time_slot TEXT NOT NULL, -- Ex: '07:00 - 07:50'
    start_time TIME,
    end_time TIME,
    subject_id TEXT NOT NULL, -- Ex: 's-port', 's-mat'
    subject_name TEXT NOT NULL, -- Ex: 'Português'
    teacher_id TEXT NOT NULL, -- Ex: 't-carlos'
    teacher_name TEXT NOT NULL, -- Ex: 'Carlos Eduardo'
    room_id TEXT NOT NULL, -- Ex: 'r-08'
    room_name TEXT NOT NULL DEFAULT 'Sala 08',
    is_interval BOOLEAN DEFAULT false,
    organization_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ÍNDICES DE DESEMPENHO
CREATE INDEX IF NOT EXISTS idx_class_schedules_class_id ON public.class_schedules(class_id);
CREATE INDEX IF NOT EXISTS idx_class_schedules_day ON public.class_schedules(day_of_week);
CREATE INDEX IF NOT EXISTS idx_class_schedules_teacher ON public.class_schedules(teacher_id);

-- 6. POLÍTICAS DE SEGURANÇA ROW LEVEL SECURITY (RLS)
ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_staff ENABLE ROW LEVEL SECURITY;

-- POLICIES PARA class_schedules (Famílias somente LEITURA, Gestores LEITURA/ESCRITA)
DROP POLICY IF EXISTS p_class_schedules_select ON public.class_schedules;
CREATE POLICY p_class_schedules_select ON public.class_schedules
    FOR SELECT USING (true); -- Permitido a todas as famílias visualizar horários

DROP POLICY IF EXISTS p_class_schedules_all_staff ON public.class_schedules;
CREATE POLICY p_class_schedules_all_staff ON public.class_schedules
    FOR ALL USING (
      auth.jwt() ->> 'email' LIKE '%admin%' OR
      auth.jwt() ->> 'email' LIKE '%renatotcheka%' OR
      auth.jwt() ->> 'email' LIKE '%gatomestre%' OR
      auth.jwt() ->> 'email' LIKE '%escola%'
    );

-- 7. PUBLICAÇÃO SUPABASE REALTIME
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.class_schedules;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.school_shifts;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.school_staff;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END
$$;
