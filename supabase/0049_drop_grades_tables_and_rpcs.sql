-- ====================================================================
-- CLASSIUM EDUCACIONAL — REMOÇÃO DEFINITIVA DO MÓDULO NOTAS & BOLETIM
-- Arquivo: supabase/0049_drop_grades_tables_and_rpcs.sql
-- ====================================================================
-- Este script exclui com segurança todas as tabelas, tipos e RPCs 
-- associadas às antigas tabelas de Notas (grades, school_grades) no Supabase.
-- ====================================================================

-- 1. REMOVE TABELAS DA PUBLICAÇÃO REALTIME (CASO ESTEJAM REGISTRADAS)
DO $$
DECLARE
    target_tables TEXT[] := ARRAY[
        'grades', 'school_grades', 'grade_items', 'student_grades', 
        'academic_evaluations', 'evaluation_items'
    ];
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY target_tables
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = tbl
        ) THEN
            BEGIN
                EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE public.%I', tbl);
            EXCEPTION WHEN OTHERS THEN NULL;
            END;
        END IF;
    END LOOP;
END;
$$;

-- 2. DROP DE TODAS AS TABELAS DO MÓDULO NOTAS (CASCADE)
DROP TABLE IF EXISTS public.grade_items CASCADE;
DROP TABLE IF EXISTS public.student_grades CASCADE;
DROP TABLE IF EXISTS public.evaluation_items CASCADE;
DROP TABLE IF EXISTS public.academic_evaluations CASCADE;
DROP TABLE IF EXISTS public.grades CASCADE;
DROP TABLE IF EXISTS public.school_grades CASCADE;

-- 3. DROP DAS FUNÇÕES E RPCs DO MÓDULO NOTAS (CASO EXISTAM)
DROP FUNCTION IF EXISTS public.calculate_student_term_average(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_class_grades_matrix(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.save_student_grade(UUID, UUID, NUMERIC, TEXT) CASCADE;
