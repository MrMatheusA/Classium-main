-- ==============================================================================
-- SCRIPT DE DIAGNÓSTICO E AUDITORIA DE SCHEMA — SUPABASE (SOMENTE LEITURA)
-- Arquivo: supabase_schema_audit_readonly.sql
-- ==============================================================================
-- 
-- AVISOS E DIRETRIZES DE SEGURANÇA:
-- 1. Este script é ESTRITAMENTE SOMENTE LEITURA (READ-ONLY).
-- 2. NÃO altera dados, NÃO insere, NÃO atualiza e NÃO exclui nenhum registro.
-- 3. NÃO cria tabelas, views, funções, triggers ou tipos no banco de dados.
-- 4. NÃO altera configurações de Row Level Security (RLS) nem modifica Policies.
-- 5. NÃO modifica usuários, senhas, tokens ou dados de organizações.
-- 6. NÃO retorna dados pessoais (PII), senhas criptografadas, chaves de API ou
--    informações sensíveis de alunos, responsáveis ou funcionários.
-- 7. Execute este script no SQL Editor do Dashboard do Supabase para auditoria
--    completa e diagnóstico estrutural do ambiente.
-- ==============================================================================

-- SEÇÃO 1: TABELAS E VIEWS EXISTENTES NO SCHEMA PUBLIC & EXTENSIONS
SELECT 
    t.table_schema,
    t.table_name,
    t.table_type,
    pg_catalog.obj_description(c.oid, 'pg_class') AS table_comment,
    pg_catalog.pg_size_pretty(pg_catalog.pg_total_relation_size(c.oid)) AS total_size,
    (SELECT count(*) FROM pg_catalog.pg_indexes i WHERE i.schemaname = t.table_schema AND i.tablename = t.table_name) AS index_count
FROM information_schema.tables t
JOIN pg_catalog.pg_class c ON c.relname = t.table_name
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.table_schema
WHERE t.table_schema IN ('public', 'storage', 'auth')
  AND t.table_type IN ('BASE TABLE', 'VIEW', 'FOREIGN')
ORDER BY t.table_schema, t.table_name;

-- SEÇÃO 2: COLUNAS, TIPOS DE DADOS, NULABILIDADE E DEFAULTS
SELECT 
    c.table_schema,
    c.table_name,
    c.ordinal_position,
    c.column_name,
    c.data_type,
    c.udt_name,
    c.character_maximum_length,
    c.is_nullable,
    c.column_default,
    (
        SELECT pg_catalog.col_description(cl.oid, c.ordinal_position::int)
        FROM pg_catalog.pg_class cl
        JOIN pg_catalog.pg_namespace ns ON ns.oid = cl.relnamespace
        WHERE ns.nspname = c.table_schema AND cl.relname = c.table_name
    ) AS column_comment
FROM information_schema.columns c
WHERE c.table_schema IN ('public', 'storage')
ORDER BY c.table_schema, c.table_name, c.ordinal_position;

-- SEÇÃO 3: CHAVES PRIMÁRIAS (PRIMARY KEYS)
SELECT 
    kcu.table_schema,
    kcu.table_name,
    tco.constraint_name,
    kcu.column_name,
    kcu.ordinal_position
FROM information_schema.table_constraints tco
JOIN information_schema.key_column_usage kcu 
    ON kcu.constraint_name = tco.constraint_name
    AND kcu.constraint_schema = tco.constraint_schema
    AND kcu.table_name = tco.table_name
WHERE tco.constraint_type = 'PRIMARY KEY'
  AND tco.table_schema IN ('public', 'storage')
ORDER BY kcu.table_schema, kcu.table_name, kcu.ordinal_position;

-- SEÇÃO 4: CHAVES ESTRANGEIRAS, TABELAS REFERENCIADAS E REGRAS ON DELETE/UPDATE
SELECT 
    tc.table_schema,
    tc.table_name,
    kcu.column_name,
    tc.constraint_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.update_rule,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema IN ('public', 'storage')
ORDER BY tc.table_schema, tc.table_name, kcu.column_name;

-- SEÇÃO 5: ÍNDICES EXISTENTES E PERFORMANCE
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_catalog.pg_indexes
WHERE schemaname IN ('public', 'storage')
ORDER BY schemaname, tablename, indexname;

-- SEÇÃO 6: STATUS DE ROW LEVEL SECURITY (RLS) POR TABELA
SELECT 
    n.nspname AS schema_name,
    c.relname AS table_name,
    c.relrowsecurity AS rls_enabled,
    c.relforcerowsecurity AS rls_forced,
    CASE 
        WHEN c.relrowsecurity = true THEN 'RLS ATIVADO'
        ELSE 'RLS DESATIVADO (RISCO CRÍTICO)'
    END AS status_rls,
    (
        SELECT count(*) 
        FROM pg_catalog.pg_policy p 
        WHERE p.polrelid = c.oid
    ) AS policies_count
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
  AND c.relkind = 'r'
ORDER BY c.relrowsecurity ASC, c.relname ASC;

-- SEÇÃO 7: POLICIES DE SEGURANÇA (RLS POLICIES) DETALHADAS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd AS operation,
    qual AS using_expression,
    with_check AS check_expression
FROM pg_catalog.pg_policies
WHERE schemaname IN ('public', 'storage')
ORDER BY schemaname, tablename, policyname;

-- SEÇÃO 8: TRIGGERS DEFINIDOS NAS TABELAS
SELECT 
    event_object_schema AS schema_name,
    event_object_table AS table_name,
    trigger_name,
    event_manipulation AS event,
    action_timing AS timing,
    action_statement AS statement_or_function
FROM information_schema.triggers
WHERE event_object_schema IN ('public', 'storage')
ORDER BY event_object_schema, event_object_table, trigger_name;

-- SEÇÃO 9: FUNÇÕES E PROCEDURES (RPCs)
SELECT 
    n.nspname AS schema_name,
    p.proname AS function_name,
    pg_catalog.pg_get_function_identity_arguments(p.oid) AS argument_types,
    pg_catalog.pg_get_function_result(p.oid) AS return_type,
    p.prosecdef AS is_security_definer,
    l.lanname AS language_name,
    CASE 
        WHEN p.provolatile = 'i' THEN 'IMMUTABLE'
        WHEN p.provolatile = 's' THEN 'STABLE'
        WHEN p.provolatile = 'v' THEN 'VOLATILE'
    END AS volatility
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
JOIN pg_catalog.pg_language l ON l.oid = p.prolang
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- SEÇÃO 10: STORAGE BUCKETS (METADADOS PÚBLICOS / SEM CONTEÚDO SENSÍVEL)
SELECT 
    id,
    name,
    public,
    avif_autodetection,
    file_size_limit,
    allowed_mime_types,
    created_at,
    updated_at
FROM storage.buckets
ORDER BY name;

-- SEÇÃO 11: CONFIGURAÇÕES E TABELAS HABILITADAS NO REALTIME (SUPABASE REALTIME)
SELECT 
    pub.pubname AS publication_name,
    schemaname,
    tablename
FROM pg_catalog.pg_publication pub
LEFT JOIN pg_catalog.pg_publication_tables pub_tables ON pub_tables.pubname = pub.pubname
WHERE pub.pubname IN ('supabase_realtime')
ORDER BY schemaname, tablename;

-- SEÇÃO 12: GRANTS E PERMISSÕES POR ROLE NAS TABELAS
SELECT 
    table_schema,
    table_name,
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated', 'service_role')
ORDER BY table_name, grantee, privilege_type;

-- SEÇÃO 13: VALIDAÇÃO DE COLUNAS MULTI-TENANT (ORGANIZATION_ID / SCHOOL_ID)
SELECT 
    c.table_name,
    MAX(CASE WHEN c.column_name = 'organization_id' THEN 'SIM' ELSE 'NÃO' END) AS has_organization_id,
    MAX(CASE WHEN c.column_name = 'school_id' THEN 'SIM' ELSE 'NÃO' END) AS has_school_id,
    MAX(CASE WHEN c.column_name = 'tenant_id' THEN 'SIM' ELSE 'NÃO' END) AS has_tenant_id,
    MAX(CASE WHEN c.column_name = 'user_id' THEN 'SIM' ELSE 'NÃO' END) AS has_user_id
FROM information_schema.columns c
WHERE c.table_schema = 'public'
GROUP BY c.table_name
ORDER BY c.table_name;
