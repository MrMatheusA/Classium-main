-- ====================================================================
-- EDUCA+ ERP EDUCACIONAL — SUPABASE REALTIME (ENTERPRISE)
-- SCRIPT SQL PRODUCTION-READY PARA ATIVAR O REALTIME (IDEMPOTENTE)
-- ====================================================================

-- 1) Crie a publicação caso ela tenha sido removida (o Supabase cria por padrão)
-- CREATE PUBLICATION supabase_realtime;

-- 2) Adiciona as tabelas com segurança, verificando se a tabela existe
--    no schema public e se já não está na publicação, evitando erros.
DO $$
DECLARE
    t_name text;
    tables_to_add text[] := ARRAY[
        -- Core
        'schools', 'profiles', 'employees', 'students', 'classes',
        'student_guardians', 'emergency_contacts', 'student_documents',
        'guardian_documents', 'student_history', 'student_health',
        'student_vaccination', 'student_permissions', 'student_transport',
        'person_history', 'photos',
        
        -- Marketplace
        'advertiser_categories', 'subscription_plans', 'advertisers',
        'advertiser_cards', 'subscriptions', 'invoices', 'advertiser_leads',
        'advertiser_messages', 'advertiser_statistics', 'promotions',
        'card_click_logs', 'plan_change_history', 'advertiser_documents',
        'advertiser_reviews', 'advertiser_favorites', 'advertiser_notifications',
        'marketplace_settings'
    ];
BEGIN
    FOREACH t_name IN ARRAY tables_to_add
    LOOP
        -- Verifica se a tabela já está na publication supabase_realtime
        IF NOT EXISTS (
            SELECT 1
            FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
              AND schemaname = 'public'
              AND tablename = t_name
        ) THEN
            -- Verifica se a tabela realmente existe no banco antes de adicionar
            IF EXISTS (
                SELECT 1 
                FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = t_name
            ) THEN
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', t_name);
                RAISE NOTICE 'Tabela % adicionada ao Supabase Realtime.', t_name;
            ELSE
                RAISE NOTICE 'A tabela % não existe no banco, ignorando.', t_name;
            END IF;
        ELSE
            RAISE NOTICE 'A tabela % já pertence ao Supabase Realtime, ignorando.', t_name;
        END IF;
    END LOOP;
END
$$;
