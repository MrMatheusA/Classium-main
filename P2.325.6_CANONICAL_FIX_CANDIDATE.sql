-- ==============================================================================
-- SCRIPT CANDIDATO DE CORREÇÃO CANÔNICA DE AUTORIZAÇÃO — P2.325.6
-- ==============================================================================
-- Projeto: Classium Gestão Educacional
-- Supabase Oficial Protegido (Instância Única): flfqjlrjnvkrstqsknxc
-- Host Oficial: flfqjlrjnvkrstqsknxc.supabase.co
-- Etapa de Auditoria: P2.325.6
-- Modo Operacional: 100% READ-ONLY — ARTEFATO EXCLUSIVAMENTE CANDIDATO.
-- AVISO: NÃO EXECUTAR AUTOMATICAMENTE. REQUER JANELA CONTROLADA E APROVAÇÃO HUMANA.
--
-- Correções Incorporadas:
--   1. Utilização de r.scope_type (em vez de r.scope) em public.roles.
--   2. search_path = '' estritamente restrito com qualificações de schema explícitas.
--   3. Justificativa individualizada para cada papel: REVOKE de PUBLIC e anon;
--      GRANT restrito a authenticated (para RLS) e service_role (para backend).
--   4. Eliminação total de superfície de enumeração (zero argumentos / auth.uid() exclusivo).
--   5. Avaliação de exposição via RPC/PostgREST documentada.
--   6. Preservação integral do acesso de gestores escolares aos logs da própria organização.
--   7. Validação semântica e estrutural das políticas ativas antes de qualquer DROP.
--   8. Coexistência segura da função legada com UUID (OID 17812) sem EXECUTE público.
--   9. Script de Rollback determinístico com pré-condições incluído na seção final.
--  10. Detecção prévia de colisões de assinatura para public.is_platform_admin().
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- 1. VALIDAÇÃO DE PRÉ-CONDIÇÕES (FAIL-FAST DETERMINÍSTICO)
-- ==============================================================================
DO $$
DECLARE
    v_proc_record RECORD;
    v_policy_qual text;
    v_unexpected_policies integer;
BEGIN
    RAISE NOTICE '[P2.325.6] Iniciando verificações de pré-condições fail-fast...';

    -- 1.1. Validar existência física e colunas essenciais de public.platform_members
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'platform_members' 
          AND column_name = 'user_id' AND udt_name = 'uuid'
    ) OR NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'platform_members' 
          AND column_name = 'role' AND udt_name IN ('text', 'varchar')
    ) OR NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'platform_members' 
          AND column_name = 'is_active' AND udt_name = 'bool'
    ) THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED: Estrutura da tabela public.platform_members diverge das evidências.';
    END IF;

    -- 1.2. Validar existência física e coluna scope_type em public.roles (Correção Item 1)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'roles' 
          AND column_name = 'code' AND udt_name IN ('text', 'varchar')
    ) OR NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'roles' 
          AND column_name = 'scope_type' AND udt_name IN ('text', 'varchar')
    ) OR NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'roles' 
          AND column_name = 'is_active' AND udt_name = 'bool'
    ) THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED: Tabela public.roles não possui colunas code, scope_type ou is_active requeridas.';
    END IF;

    -- 1.3. Validar função legada com UUID (OID 17812)
    IF NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_proc p
        JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' 
          AND p.proname = 'is_platform_admin'
          AND pg_catalog.pg_get_function_identity_arguments(p.oid) = 'p_user_id uuid'
    ) THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED: Função original public.is_platform_admin(p_user_id uuid) não localizada no catálogo.';
    END IF;

    -- 1.4. Detecção de colisão prévia de assinatura sem argumentos (Correção Item 10)
    SELECT p.oid, pg_catalog.pg_get_function_result(p.oid) AS ret_type
    INTO v_proc_record
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' 
      AND p.proname = 'is_platform_admin' 
      AND p.pronargs = 0;

    IF FOUND THEN
        IF v_proc_record.ret_type <> 'boolean' THEN
            RAISE EXCEPTION 'PRECONDITION_FAILED: Colisão de assinatura detectada. public.is_platform_admin() existe com tipo não-booleano (%).', v_proc_record.ret_type;
        END IF;
        RAISE NOTICE '[P2.325.6] Aviso: public.is_platform_admin() já existe como booleana; será atualizada de forma idempotente.';
    END IF;

    -- 1.5. Validação semântica das políticas RLS ativas antes de qualquer DROP (Correção Item 7)
    -- Política em platform_members
    SELECT pg_catalog.pg_get_expr(pol.polqual, pol.polrelid)
    INTO v_policy_qual
    FROM pg_catalog.pg_policy pol
    JOIN pg_catalog.pg_class c ON c.oid = pol.polrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
      AND c.relname = 'platform_members' 
      AND pol.polname = 'platform_members_select_admin';

    IF v_policy_qual IS NULL THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED: Política platform_members_select_admin não existe em public.platform_members.';
    END IF;

    IF v_policy_qual NOT ILIKE '%is_platform_admin%' THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED: Expressão ativa em platform_members_select_admin diverge do baseline (%)', v_policy_qual;
    END IF;

    -- Política em audit_logs (verificar se preserva o ramo de organization_members)
    SELECT pg_catalog.pg_get_expr(pol.polqual, pol.polrelid)
    INTO v_policy_qual
    FROM pg_catalog.pg_policy pol
    JOIN pg_catalog.pg_class c ON c.oid = pol.polrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
      AND c.relname = 'audit_logs' 
      AND pol.polname = 'audit_logs_select_authorized';

    IF v_policy_qual IS NULL THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED: Política audit_logs_select_authorized não existe em public.audit_logs.';
    END IF;

    IF v_policy_qual NOT ILIKE '%organization_members%' OR v_policy_qual NOT ILIKE '%is_platform_admin%' THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED: Expressão ativa em audit_logs_select_authorized diverge do baseline (Drift detectado: %)', v_policy_qual;
    END IF;

    -- 1.6. Detecção de políticas permissivas adicionais inesperadas em platform_members (ADV-01)
    SELECT count(*)
    INTO v_unexpected_policies
    FROM pg_catalog.pg_policy pol
    JOIN pg_catalog.pg_class c ON c.oid = pol.polrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
      AND c.relname = 'platform_members'
      AND pol.polname NOT IN ('platform_members_select_policy', 'platform_members_select_admin')
      AND pol.polpermissive = true;

    IF v_unexpected_policies > 0 THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED: Detectada(s) % política(s) permissiva(s) inesperada(s) em platform_members. Abortando deploy.', v_unexpected_policies;
    END IF;

    RAISE NOTICE '[P2.325.6] Pré-condições validadas com sucesso. Procedendo com a aplicação.';
END $$;


-- ==============================================================================
-- 2. CRIAÇÃO DA FUNÇÃO CANÔNICA PRIMÁRIA (SEM ARGUMENTOS / ZERO ENUMERAÇÃO)
-- ==============================================================================
-- search_path = '' estrito com referências explicitamente qualificadas (Correções Itens 1 e 2)
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.platform_members pm
        JOIN public.roles r ON r.code = pm.role
        WHERE pm.user_id = auth.uid()
          AND pm.role = 'admin'
          AND pm.is_active = true
          AND r.scope_type = 'platform'
          AND r.is_active = true
    );
$$;

-- Atribuição formal ao superusuário padrão
ALTER FUNCTION public.is_platform_admin() OWNER TO postgres;


-- ==============================================================================
-- 3. CONCESSÕES E REVOGAÇÕES ESTRITAS DE EXECUÇÃO (Correção Item 3)
-- ==============================================================================
-- 3.1. Revogar herança implícita de PUBLIC (Princípio do Menor Privilégio)
REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;

-- 3.2. Revogar explicitamente de anon (Anônimos não possuem JWT / auth.uid() é nulo)
REVOKE ALL ON FUNCTION public.is_platform_admin() FROM anon;

-- 3.3. Conceder a authenticated: Requisito técnico estrito para avaliação de RLS sem 42501
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

-- 3.4. Conceder a service_role: Requisito para rotinas internas de backend e automações
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO service_role;


-- ==============================================================================
-- 4. ATUALIZAÇÃO ATÔMICA DAS POLÍTICAS RLS DEPENDENTES
-- ==============================================================================
-- 4.1. Substituir política em public.platform_members
DROP POLICY IF EXISTS platform_members_select_admin ON public.platform_members;
CREATE POLICY platform_members_select_admin
    ON public.platform_members
    FOR SELECT
    TO authenticated
    USING (public.is_platform_admin());

-- 4.2. Substituir política em public.audit_logs (Correção Item 6)
-- Preserva integralmente o acesso legítimo dos gestores escolares às auditorias da sua organização
DROP POLICY IF EXISTS audit_logs_select_authorized ON public.audit_logs;
CREATE POLICY audit_logs_select_authorized
    ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (
        -- Ramo 1: Administrador global da plataforma (via função canônica)
        public.is_platform_admin()
        OR
        -- Ramo 2: Gestor escolar e administrador local na sua respectiva instituição (PRESERVADO)
        (
            organization_id IS NOT NULL 
            AND EXISTS (
                SELECT 1
                FROM public.organization_members om
                WHERE om.organization_id = audit_logs.organization_id
                  AND om.user_id = auth.uid()
                  AND om.role IN ('gestor', 'admin')
                  AND om.is_active = true
            )
        )
    );


-- ==============================================================================
-- 5. BLINDAGEM DA FUNÇÃO LEGADA COM UUID (Correções Itens 4 e 8)
-- ==============================================================================
-- A função antiga public.is_platform_admin(uuid) é mantida no banco (preservando o OID 17812
-- e compatibilidade com eventuais chamadas diretas de backend), mas tem seu privilégio
-- revogado de authenticated, anon e PUBLIC para impedir qualquer enumeração externa.
REVOKE ALL ON FUNCTION public.is_platform_admin(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid) TO service_role;


-- ==============================================================================
-- 6. VALIDAÇÃO DE PÓS-CONDIÇÕES DENTRO DA TRANSAÇÃO (FAIL-FAST)
-- ==============================================================================
DO $$
DECLARE
    v_has_exec_auth boolean;
    v_has_exec_anon boolean;
    v_has_exec_uuid_auth boolean;
    v_new_pol_pm text;
    v_new_pol_al text;
BEGIN
    RAISE NOTICE '[P2.325.6] Iniciando verificações de pós-condições...';

    -- 6.1. Testar privilégios efetivos na função canônica sem argumentos
    SELECT has_function_privilege('authenticated', 'public.is_platform_admin()', 'EXECUTE') INTO v_has_exec_auth;
    SELECT has_function_privilege('anon', 'public.is_platform_admin()', 'EXECUTE') INTO v_has_exec_anon;
    SELECT has_function_privilege('authenticated', 'public.is_platform_admin(uuid)', 'EXECUTE') INTO v_has_exec_uuid_auth;

    IF NOT v_has_exec_auth THEN
        RAISE EXCEPTION 'POSTCONDITION_FAILED: authenticated não possui EXECUTE na função canônica.';
    END IF;

    IF v_has_exec_anon THEN
        RAISE EXCEPTION 'POSTCONDITION_FAILED: anon possui EXECUTE indevido na função canônica.';
    END IF;

    IF v_has_exec_uuid_auth THEN
        RAISE EXCEPTION 'POSTCONDITION_FAILED: authenticated ainda possui EXECUTE na função com UUID.';
    END IF;

    -- 6.2. Validar que as novas políticas foram recriadas com sucesso
    SELECT pg_catalog.pg_get_expr(pol.polqual, pol.polrelid)
    INTO v_new_pol_pm
    FROM pg_catalog.pg_policy pol
    JOIN pg_catalog.pg_class c ON c.oid = pol.polrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'platform_members' 
      AND pol.polname = 'platform_members_select_admin';

    IF v_new_pol_pm NOT ILIKE '%is_platform_admin()%' THEN
        RAISE EXCEPTION 'POSTCONDITION_FAILED: Política platform_members_select_admin não faz uso da função canônica.';
    END IF;

    SELECT pg_catalog.pg_get_expr(pol.polqual, pol.polrelid)
    INTO v_new_pol_al
    FROM pg_catalog.pg_policy pol
    JOIN pg_catalog.pg_class c ON c.oid = pol.polrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'audit_logs' 
      AND pol.polname = 'audit_logs_select_authorized';

    IF v_new_pol_al NOT ILIKE '%is_platform_admin()%' OR v_new_pol_al NOT ILIKE '%organization_members%' THEN
        RAISE EXCEPTION 'POSTCONDITION_FAILED: Política audit_logs_select_authorized não preservou as regras esperadas.';
    END IF;

    RAISE NOTICE '[P2.325.6] Pós-condições aprovadas com êxito integral.';
END $$;

-- 7. Notificar PostgREST para recarga atômica do cache de schema
NOTIFY pgrst, 'reload schema';

COMMIT;


-- ==============================================================================
-- 8. SCRIPT DE ROLLBACK DETERMINÍSTICO COM PRÉ-CONDIÇÕES (Correção Item 9)
-- ==============================================================================
/*
-- =============================================================================
-- PROCEDIMENTO DE ROLLBACK COMPLETO (EXECUTAR APENAS EM CASO DE REVERSÃO FORMAL)
-- =============================================================================
BEGIN;

DO $$
BEGIN
    RAISE NOTICE '[P2.325.6-ROLLBACK] Verificando pré-condições de rollback...';

    -- Validar existência da função original com UUID antes de tentar restaurá-la
    IF NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_proc p
        JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' 
          AND p.proname = 'is_platform_admin'
          AND pg_catalog.pg_get_function_identity_arguments(p.oid) = 'p_user_id uuid'
    ) THEN
        RAISE EXCEPTION 'ROLLBACK_ABORTED: Função original is_platform_admin(uuid) não encontrada.';
    END IF;

    -- Validar que a função sem argumentos existe para ser removida
    IF NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_proc p
        JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' 
          AND p.proname = 'is_platform_admin' 
          AND p.pronargs = 0
    ) THEN
        RAISE WARNING 'ROLLBACK_NOTICE: Função sem argumentos já não existe.';
    END IF;
END $$;

-- 1. Restaurar política original em platform_members
DROP POLICY IF EXISTS platform_members_select_admin ON public.platform_members;
CREATE POLICY platform_members_select_admin
    ON public.platform_members
    FOR SELECT
    TO authenticated
    USING (public.is_platform_admin(auth.uid()));

-- 2. Restaurar política original em audit_logs
DROP POLICY IF EXISTS audit_logs_select_authorized ON public.audit_logs;
CREATE POLICY audit_logs_select_authorized
    ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (
        public.is_platform_admin(auth.uid())
        OR (
            organization_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM public.organization_members om
                WHERE om.organization_id = audit_logs.organization_id
                  AND om.user_id = auth.uid()
                  AND om.role IN ('gestor', 'admin')
                  AND om.is_active = true
            )
        )
    );

-- 3. Remover a função canônica sem argumentos
DROP FUNCTION IF EXISTS public.is_platform_admin();

-- 4. Restaurar a ACL original estrita da função com UUID ({postgres=X/postgres})
REVOKE ALL ON FUNCTION public.is_platform_admin(uuid) FROM PUBLIC, anon, authenticated, service_role;

-- 5. Validar estado restaurado do rollback
DO $$
BEGIN
    IF has_function_privilege('authenticated', 'public.is_platform_admin(uuid)', 'EXECUTE') THEN
        RAISE EXCEPTION 'ROLLBACK_FAILED: authenticated ainda possui permissão na função com UUID.';
    END IF;
    IF EXISTS (
        SELECT 1 FROM pg_catalog.pg_proc p
        JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'is_platform_admin' AND p.pronargs = 0
    ) THEN
        RAISE EXCEPTION 'ROLLBACK_FAILED: Função sem argumentos ainda persiste no catálogo.';
    END IF;
    RAISE NOTICE '[P2.325.6-ROLLBACK] Rollback concluído com sucesso e verificado.';
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;
-- =============================================================================
*/
