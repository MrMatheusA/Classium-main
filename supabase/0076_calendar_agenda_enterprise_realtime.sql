-- ====================================================================
-- EDUCA+ / CLASSIUM ERP — MÓDULO DE CALENDÁRIO / AGENDA (PRODUÇÃO)
-- MIGRATION: 0076_calendar_agenda_enterprise_realtime.sql
-- Isolamento Multi-Escola, Feriados Globais, RLS Estrito e Supabase Realtime
-- ====================================================================

-- FASE 2: FUNÇÃO BASE DE ISOLAMENTO POR ESCOLA DO USUÁRIO ATUAL
CREATE OR REPLACE FUNCTION public.get_current_user_school_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT school_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- FASE 3: ESTRUTURA DE DADOS DA TABELA REAL (calendar_events)
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Evento Escolar',
    description TEXT,
    category TEXT NOT NULL DEFAULT 'evento_escolar',
    color_hex TEXT NOT NULL DEFAULT '#3B82F6',
    color TEXT DEFAULT 'bg-emerald-500',
    is_letivo BOOLEAN NOT NULL DEFAULT TRUE,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    start_time TIME,
    end_time TIME,
    is_all_day BOOLEAN DEFAULT TRUE,
    location TEXT,
    room_id UUID,
    target_audience TEXT DEFAULT 'all',
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    academic_year SMALLINT NOT NULL DEFAULT 2026,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Garantir adição de colunas necessárias caso a tabela já existisse
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'school_id') THEN
        ALTER TABLE public.calendar_events ADD COLUMN school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'category') THEN
        ALTER TABLE public.calendar_events ADD COLUMN category TEXT NOT NULL DEFAULT 'evento_escolar';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'color_hex') THEN
        ALTER TABLE public.calendar_events ADD COLUMN color_hex TEXT NOT NULL DEFAULT '#3B82F6';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'is_letivo') THEN
        ALTER TABLE public.calendar_events ADD COLUMN is_letivo BOOLEAN NOT NULL DEFAULT TRUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'academic_year') THEN
        ALTER TABLE public.calendar_events ADD COLUMN academic_year SMALLINT NOT NULL DEFAULT 2026;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'updated_at') THEN
        ALTER TABLE public.calendar_events ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Atualizar constraint de categorias oficiais (permitindo as 14 categorias e aliases equivalentes)
DO $$
BEGIN
    ALTER TABLE public.calendar_events DROP CONSTRAINT IF EXISTS calendar_events_category_check;
    ALTER TABLE public.calendar_events ADD CONSTRAINT calendar_events_category_check
      CHECK (category IN (
        'periodo_nacional', 'feriado_nacional',
        'conselho_classe',
        'inicio_aulas', 'inicio_letivo',
        'antecipacao', 'avaliacoes', 'provas_internas',
        'evento_escolar',
        'formacao_continuada',
        'atividade_extraclasse', 'atividade_pratica', 'atividade_maker',
        'recuperacao',
        'reuniao_pais',
        'aniversario_escolar', 'fim_bimestre',
        'recesso_nacional', 'recesso_escolar',
        'recesso_fim_semana',
        'projeto_pedagogico',
        'planejamento_pedagogico'
      ));
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- FASE 7: ROW LEVEL SECURITY (RLS) MULTI-ESCOLA E EVENTOS NACIONAIS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Limpar policies anteriores de calendar_events
DROP POLICY IF EXISTS "gestor_ve_eventos_da_sua_escola_e_nacionais" ON public.calendar_events;
DROP POLICY IF EXISTS "gestor_edita_apenas_eventos_da_sua_escola" ON public.calendar_events;
DROP POLICY IF EXISTS "somente_admin_edita_eventos_nacionais" ON public.calendar_events;
DROP POLICY IF EXISTS "familia_ve_calendario_da_escola_do_filho" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_read_all" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_write_staff" ON public.calendar_events;

-- 1. GESTOR / DOCENTE: Vê eventos da própria escola + eventos nacionais globais (school_id IS NULL)
CREATE POLICY "gestor_ve_eventos_da_sua_escola_e_nacionais"
ON public.calendar_events FOR SELECT
USING (
  school_id = public.get_current_user_school_id()
  OR school_id IS NULL
  OR organization_id IS NULL
  OR organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
);

-- 2. GESTOR: Edita (INSERT, UPDATE, DELETE) APENAS eventos da sua própria escola
CREATE POLICY "gestor_edita_apenas_eventos_da_sua_escola"
ON public.calendar_events FOR ALL
USING (
  school_id = public.get_current_user_school_id()
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'gestor', 'diretor', 'coordenador', 'secretaria', 'admin_plataforma')
  )
)
WITH CHECK (
  school_id = public.get_current_user_school_id()
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'gestor', 'diretor', 'coordenador', 'secretaria', 'admin_plataforma')
  )
);

-- 3. ADMINISTRADOR DE PLATAFORMA: Pode criar/editar eventos nacionais globais (school_id IS NULL)
CREATE POLICY "somente_admin_edita_eventos_nacionais"
ON public.calendar_events FOR ALL
USING (
  school_id IS NULL AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin_plataforma'
  )
)
WITH CHECK (
  school_id IS NULL AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin_plataforma'
  )
);

-- 4. FAMÍLIA: Vê apenas o calendário da escola do(s) estudante(s) vinculado(s), mais eventos nacionais, sem permissão de edição
CREATE POLICY "familia_ve_calendario_da_escola_do_filho"
ON public.calendar_events FOR SELECT
USING (
  school_id IS NULL
  OR school_id IN (
    SELECT s.school_id
    FROM public.student_guardians sg
    JOIN public.students s ON s.id = sg.student_id
    WHERE sg.guardian_profile_id = auth.uid()
  )
  OR school_id IN (
    SELECT s.school_id
    FROM public.student_responsible_links srl
    JOIN public.students s ON s.id = srl.student_id
    WHERE srl.responsible_profile_id = auth.uid()
  )
);

-- FASE 6: HABILITAR SUPABASE REALTIME NA TABELA calendar_events
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND tablename = 'calendar_events'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;
