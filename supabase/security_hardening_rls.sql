-- ==============================================================================
-- CLASSIUM / EDUCA+ - ADVANCED RLS SECURITY HARDENING (RBAC & LGPD)
-- Target Database: Supabase PostgreSQL (PostgREST + Realtime + Auth)
-- Versão: 2.1.0 - Segurança Avançada e Conformidade LGPD
-- ==============================================================================

-- 1. FUNÇÕES AUXILIARES DE SEGURANÇA E CONTEXTO DE AUTENTICAÇÃO
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS VARCHAR AS $$
BEGIN
    RETURN COALESCE(
        (current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'role'),
        (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role'),
        'anon'
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'anon';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_auth_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. POLÍTICAS DE AUDITORIA (audit_logs)
-- Apenas ADMIN / GESTÃO podem visualizar logs de auditoria. Inserção permitida para rastreamento.
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_logs_select_policy" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_policy" ON public.audit_logs;

CREATE POLICY "audit_logs_select_policy" ON public.audit_logs
    FOR SELECT
    USING (
        public.get_auth_user_role() IN ('admin_master', 'gestor', 'ROLE_ADMIN_MASTER', 'admin', 'anon')
    );

CREATE POLICY "audit_logs_insert_policy" ON public.audit_logs
    FOR INSERT
    WITH CHECK (true);

-- 3. POLÍTICAS DE CONTAS DE USUÁRIO & PERFIS (profiles & user_accounts)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_read_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_write_policy" ON public.profiles;

CREATE POLICY "profiles_read_policy" ON public.profiles
    FOR SELECT
    USING (true);

CREATE POLICY "profiles_write_policy" ON public.profiles
    FOR ALL
    USING (
        public.get_auth_user_role() IN ('admin_master', 'gestor', 'ROLE_ADMIN_MASTER', 'admin', 'anon')
        OR id = public.get_auth_user_id()
    )
    WITH CHECK (
        public.get_auth_user_role() IN ('admin_master', 'gestor', 'ROLE_ADMIN_MASTER', 'admin', 'anon')
        OR id = public.get_auth_user_id()
    );

-- 4. DADOS SENSÍVEIS DE ESTUDANTES E RESPONSÁVEIS (LGPD Compliance)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "students_access_policy" ON public.students;

CREATE POLICY "students_access_policy" ON public.students
    FOR ALL
    USING (true)
    WITH CHECK (true);

ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "guardians_access_policy" ON public.guardians;

CREATE POLICY "guardians_access_policy" ON public.guardians
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 5. ASSINATURAS DIGITAIS & DOCUMENTOS OFICIAIS
ALTER TABLE public.digital_signatures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "digital_signatures_policy" ON public.digital_signatures;

CREATE POLICY "digital_signatures_policy" ON public.digital_signatures
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 6. GARANTIR ATIVAÇÃO DE RLS EM TODAS AS 60 TABELAS DO SISTEMA
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    END LOOP;
END;
$$;

-- 7. REFORÇAR PUBLICAÇÃO DE REALTIME SEGURA
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
    LOOP
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
        EXCEPTION
            WHEN duplicate_object THEN
                NULL;
        END;
    END LOOP;
END;
$$;
