-- ==============================================================================
-- CLASSIUM GESTÃO EDUCACIONAL — ETAPA P2.325.9
-- CONSULTA CANÔNICA READ-ONLY PARA RECUPERAÇÃO DO BASELINE OFICIAL
-- ==============================================================================
-- Projeto Supabase Oficial Único: flfqjlrjnvkrstqsknxc
-- Host Oficial: flfqjlrjnvkrstqsknxc.supabase.co
-- Finalidade: Coleta estática, atômica e não-mutante das evidências ausentes
--            identificadas na auditoria P2.325.8 para subsidiar o candidato v4.
-- Modo Operacional: 100% READ-ONLY. Proibida qualquer execução automática.
-- Restrições:
--   1. NÃO executa DDL (CREATE, ALTER, DROP).
--   2. NÃO executa DML (INSERT, UPDATE, DELETE, MERGE, TRUNCATE).
--   3. NÃO concede nem revoga privilégios (GRANT, REVOKE).
--   4. NÃO bloqueia tabelas (consultas exclusivas de metadados do catálogo).
--   5. Retorna um único registro estruturado em JSONB formatado (jsonb_pretty).
-- ==============================================================================

WITH meta_info AS (
    SELECT 
        'flfqjlrjnvkrstqsknxc'::text AS target_project_id,
        'flfqjlrjnvkrstqsknxc.supabase.co'::text AS target_host,
        CURRENT_DATABASE()::text AS database_name,
        CURRENT_USER::text AS connected_user,
        SESSION_USER::text AS session_user,
        NOW() AS captured_at,
        VERSION()::text AS postgres_version
),

function_evidence AS (
    SELECT 
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'oid', p.oid,
                    'schema', n.nspname,
                    'proname', p.proname,
                    'identity_arguments', pg_catalog.pg_get_function_identity_arguments(p.oid),
                    'argument_count', p.pronargs,
                    'return_type', pg_catalog.pg_get_function_result(p.oid),
                    'owner', pg_catalog.pg_get_userbyid(p.proowner),
                    'language', l.lanname,
                    'security_definer', p.prosecdef,
                    'volatility', CASE p.provolatile
                        WHEN 'i' THEN 'IMMUTABLE'
                        WHEN 's' THEN 'STABLE'
                        WHEN 'v' THEN 'VOLATILE'
                        ELSE p.provolatile::text
                    END,
                    'leakproof', p.proleakproof,
                    'is_strict', p.proisstrict,
                    'config_search_path', p.proconfig,
                    'raw_acl', p.proacl::text,
                    'decompiled_definition', pg_catalog.pg_get_functiondef(p.oid)
                ) ORDER BY p.oid
            ),
            '[]'::jsonb
        ) AS functions_found
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_catalog.pg_language l ON l.oid = p.prolang
    WHERE n.nspname = 'public'
      AND p.proname = 'is_platform_admin'
),

platform_members_policies AS (
    SELECT 
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'policy_oid', pol.oid,
                    'policy_name', pol.polname,
                    'command', CASE pol.polcmd
                        WHEN 'r' THEN 'SELECT'
                        WHEN 'a' THEN 'INSERT'
                        WHEN 'w' THEN 'UPDATE'
                        WHEN 'd' THEN 'DELETE'
                        WHEN '*' THEN 'ALL'
                        ELSE pol.polcmd::text
                    END,
                    'permissive', CASE pol.polpermissive
                        WHEN true THEN 'PERMISSIVE'
                        ELSE 'RESTRICTIVE'
                    END,
                    'roles', CASE 
                        WHEN pol.polroles = '{0}'::oid[] OR pol.polroles IS NULL THEN ARRAY['PUBLIC']::text[]
                        ELSE ARRAY(
                            SELECT CASE WHEN r_oid = 0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(r_oid) END
                            FROM unnest(pol.polroles) AS r_oid
                        )
                    END,
                    'using_clause_raw', pg_catalog.pg_get_expr(pol.polqual, pol.polrelid),
                    'with_check_clause_raw', pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid)
                ) ORDER BY pol.polname
            ),
            '[]'::jsonb
        ) AS policies
    FROM pg_catalog.pg_policy pol
    JOIN pg_catalog.pg_class c ON c.oid = pol.polrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'platform_members'
),

audit_logs_policies AS (
    SELECT 
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'policy_oid', pol.oid,
                    'policy_name', pol.polname,
                    'command', CASE pol.polcmd
                        WHEN 'r' THEN 'SELECT'
                        WHEN 'a' THEN 'INSERT'
                        WHEN 'w' THEN 'UPDATE'
                        WHEN 'd' THEN 'DELETE'
                        WHEN '*' THEN 'ALL'
                        ELSE pol.polcmd::text
                    END,
                    'permissive', CASE pol.polpermissive
                        WHEN true THEN 'PERMISSIVE'
                        ELSE 'RESTRICTIVE'
                    END,
                    'roles', CASE 
                        WHEN pol.polroles = '{0}'::oid[] OR pol.polroles IS NULL THEN ARRAY['PUBLIC']::text[]
                        ELSE ARRAY(
                            SELECT CASE WHEN r_oid = 0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(r_oid) END
                            FROM unnest(pol.polroles) AS r_oid
                        )
                    END,
                    'using_clause_raw', pg_catalog.pg_get_expr(pol.polqual, pol.polrelid),
                    'with_check_clause_raw', pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid)
                ) ORDER BY pol.polname
            ),
            '[]'::jsonb
        ) AS policies
    FROM pg_catalog.pg_policy pol
    JOIN pg_catalog.pg_class c ON c.oid = pol.polrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'audit_logs'
),

all_satellite_policies AS (
    SELECT 
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'table_name', c.relname,
                    'policy_name', pol.polname,
                    'command', pol.polcmd::text,
                    'using_clause_raw', pg_catalog.pg_get_expr(pol.polqual, pol.polrelid),
                    'with_check_clause_raw', pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid)
                ) ORDER BY c.relname, pol.polname
            ),
            '[]'::jsonb
        ) AS policies
    FROM pg_catalog.pg_policy pol
    JOIN pg_catalog.pg_class c ON c.oid = pol.polrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname NOT IN ('platform_members', 'audit_logs')
      AND (
          pg_catalog.pg_get_expr(pol.polqual, pol.polrelid) ILIKE '%is_platform_admin%'
          OR pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid) ILIKE '%is_platform_admin%'
      )
),

table_rls_security AS (
    SELECT 
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'table_name', c.relname,
                    'oid', c.oid,
                    'owner', pg_catalog.pg_get_userbyid(c.relowner),
                    'row_security_enabled', c.relrowsecurity,
                    'force_row_security', c.relforcerowsecurity
                ) ORDER BY c.relname
            ),
            '[]'::jsonb
        ) AS tables_status
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('platform_members', 'audit_logs', 'roles', 'organization_members')
),

roles_columns_schema AS (
    SELECT 
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'column_name', a.attname,
                    'ordinal_position', a.attnum,
                    'data_type', pg_catalog.format_type(a.atttypid, a.atttypmod),
                    'is_not_null', a.attnotnull
                ) ORDER BY a.attnum
            ),
            '[]'::jsonb
        ) AS columns
    FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'roles'
      AND a.attnum > 0
      AND NOT a.attisdropped
),

platform_members_columns_schema AS (
    SELECT 
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'column_name', a.attname,
                    'ordinal_position', a.attnum,
                    'data_type', pg_catalog.format_type(a.atttypid, a.atttypmod),
                    'is_not_null', a.attnotnull
                ) ORDER BY a.attnum
            ),
            '[]'::jsonb
        ) AS columns
    FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'platform_members'
      AND a.attnum > 0
      AND NOT a.attisdropped
),

table_constraints_catalog AS (
    SELECT 
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'table_name', c.relname,
                    'constraint_name', con.conname,
                    'constraint_type', CASE con.contype
                        WHEN 'p' THEN 'PRIMARY KEY'
                        WHEN 'u' THEN 'UNIQUE'
                        WHEN 'f' THEN 'FOREIGN KEY'
                        WHEN 'c' THEN 'CHECK'
                        ELSE con.contype::text
                    END,
                    'definition', pg_catalog.pg_get_constraintdef(con.oid)
                ) ORDER BY c.relname, con.conname
            ),
            '[]'::jsonb
        ) AS constraints
    FROM pg_catalog.pg_constraint con
    JOIN pg_catalog.pg_class c ON c.oid = con.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('platform_members', 'roles', 'audit_logs')
)

SELECT jsonb_pretty(
    jsonb_build_object(
        'baseline_extraction_meta', (SELECT row_to_json(m.*)::jsonb FROM meta_info m),
        'target_functions', (SELECT functions_found FROM function_evidence),
        'platform_members_rls_policies', (SELECT policies FROM platform_members_policies),
        'audit_logs_rls_policies', (SELECT policies FROM audit_logs_policies),
        'other_satellite_rls_policies', (SELECT policies FROM all_satellite_policies),
        'tables_security_state', (SELECT tables_status FROM table_rls_security),
        'roles_table_columns', (SELECT columns FROM roles_columns_schema),
        'platform_members_table_columns', (SELECT columns FROM platform_members_columns_schema),
        'table_constraints', (SELECT constraints FROM table_constraints_catalog)
    )
) AS baseline_catalog_evidence_json;
