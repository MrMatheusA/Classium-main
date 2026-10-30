-- ====================================================================
-- CLASSIUM EDUCACIONAL — REMOÇÃO DEFINITIVA DO MÓDULO BIBLIOTECA
-- Arquivo: supabase/0048_drop_library_tables_and_rpcs.sql
-- ====================================================================
-- Este script exclui com segurança todas as tabelas, tipos e RPCs 
-- associadas à antiga Biblioteca Classium no Supabase.
-- ====================================================================

-- 1. REMOVE TABELAS DA PUBLICAÇÃO REALTIME (CASO ESTEJAM REGISTRADAS)
DO $$
DECLARE
    target_tables TEXT[] := ARRAY[
        'library_documents', 'library_document_categories', 
        'library_official_sources', 'library_document_reviews', 
        'library_document_relations', 'library_audit_logs',
        'library_sources', 'library_categories'
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

-- 2. DROP DE TODAS AS TABELAS DO MÓDULO BIBLIOTECA (CASCADE)
DROP TABLE IF EXISTS public.library_audit_logs CASCADE;
DROP TABLE IF EXISTS public.library_document_relations CASCADE;
DROP TABLE IF EXISTS public.library_document_reviews CASCADE;
DROP TABLE IF EXISTS public.library_documents CASCADE;
DROP TABLE IF EXISTS public.library_official_sources CASCADE;
DROP TABLE IF EXISTS public.library_document_categories CASCADE;
DROP TABLE IF EXISTS public.library_sources CASCADE;
DROP TABLE IF EXISTS public.library_categories CASCADE;

-- 3. DROP DAS FUNÇÕES E RPCs DO MÓDULO BIBLIOTECA
DROP FUNCTION IF EXISTS public.get_library_dashboard_summary() CASCADE;
DROP FUNCTION IF EXISTS public.get_library_panel_documents(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_library_categories() CASCADE;
DROP FUNCTION IF EXISTS public.get_library_official_sources() CASCADE;
DROP FUNCTION IF EXISTS public.get_library_review_queue() CASCADE;
DROP FUNCTION IF EXISTS public.get_library_document_details(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.review_library_document(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.link_library_document(UUID, UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.toggle_library_source_active(UUID, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS public.get_library_audit_trail(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.create_library_document(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.update_library_document(UUID, JSONB) CASCADE;
