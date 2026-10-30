-- ==============================================================================
-- CLASSIUM GESTÃO EDUCACIONAL — ETAPA P2.325.12
-- SCRIPT DE ROLLBACK DO CANDIDATO CORRETIVO V4 — RESTAURAÇÃO EXATA DO BASELINE
-- ==============================================================================
-- Projeto Supabase Oficial Único: flfqjlrjnvkrstqsknxc
-- Host Oficial: flfqjlrjnvkrstqsknxc.supabase.co
-- Versão do Rollback: v4.0 (Restauração Semântica do Baseline P2.325.11)
-- Modo Operacional: 100% READ-ONLY. Proibida execução automática.
--
-- Finalidade:
--   Reverter com precisão cirúrgica as modificações aplicadas pelo script
--   P2.325.12_CANONICAL_FIX_CANDIDATE_V4.sql, restabelecendo as políticas RLS
--   anteriores com a chamada public.is_platform_admin(auth.uid()) e removendo a
--   função sem argumentos public.is_platform_admin().
--
-- Restrições Mandatórias:
--   1. Restaura a sintaxe e semântica exata das políticas do baseline P2.325.11.
--   2. Preserva integralmente a função legada com UUID e sua ACL original {postgres=X/postgres}.
--   3. Não assume a restauração de OIDs internos das políticas (impossível no PostgreSQL).
--   4. Contém blocos de pré e pós-condições atômicas em DO $$.
--   5. Executa dentro de transação única (BEGIN ... COMMIT).
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- SEÇÃO 1: PRÉ-CONDIÇÕES E VALIDAÇÕES DO ROLLBACK (FAIL-FAST)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_canonical_func_count    INTEGER;
    v_legacy_func_count       INTEGER;
    v_legacy_acl              TEXT;
    v_pm_policy_count         INTEGER;
    v_al_policy_count         INTEGER;
BEGIN
    RAISE NOTICE '[ROLLBACK-V4] Iniciando validações pré-rollback...';

    -- 1.1. Verificar existência da função canônica que deve ser revertida
    SELECT COUNT(*)
    INTO v_canonical_func_count
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'is_platform_admin'
      AND p.pronargs = 0;

    IF v_canonical_func_count <> 1 THEN
        RAISE EXCEPTION 'ROLLBACK_PRECONDITION_FAILED [1.1]: Função canônica sem argumentos public.is_platform_admin() não foi encontrada ou é ambígua (encontradas: %). Abortando.', v_canonical_func_count;
    END IF;

    -- 1.2. Verificar integridade da função legada (deve existir intacta)
    SELECT 
        COUNT(*),
        COALESCE(MAX(p.proacl::text), '')
    INTO 
        v_legacy_func_count,
        v_legacy_acl
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'is_platform_admin'
      AND p.pronargs = 1;

    IF v_legacy_func_count <> 1 THEN
        RAISE EXCEPTION 'ROLLBACK_PRECONDITION_FAILED [1.2]: Função legada com UUID public.is_platform_admin(uuid) ausente. Abortando para evitar corrupção de schema.';
    END IF;

    IF v_legacy_acl <> '{postgres=X/postgres}' THEN
        RAISE EXCEPTION 'ROLLBACK_PRECONDITION_FAILED [1.2b]: ACL da função legada diverge do baseline original: %. Abortando.', v_legacy_acl;
    END IF;

    -- 1.3. Verificar se as tabelas possuem as políticas atuais esperadas
    SELECT COUNT(*) INTO v_pm_policy_count
    FROM pg_catalog.pg_policy pol
    JOIN pg_catalog.pg_class c ON c.oid = pol.polrelid
    WHERE c.relname = 'platform_members';

    SELECT COUNT(*) INTO v_al_policy_count
    FROM pg_catalog.pg_policy pol
    JOIN pg_catalog.pg_class c ON c.oid = pol.polrelid
    WHERE c.relname = 'audit_logs';

    IF v_pm_policy_count <> 1 OR v_al_policy_count <> 1 THEN
        RAISE EXCEPTION 'ROLLBACK_PRECONDITION_FAILED [1.3]: Número inesperado de políticas antes do rollback (platform_members: %, audit_logs: %). Abortando.', v_pm_policy_count, v_al_policy_count;
    END IF;

    RAISE NOTICE '[ROLLBACK-V4] Pré-condições validadas. Prosseguindo com a restauração do baseline.';
END $$;

-- ------------------------------------------------------------------------------
-- SEÇÃO 2: RESTAURAÇÃO DAS POLÍTICAS RLS DO BASELINE ORIGINAL P2.325.11
-- ------------------------------------------------------------------------------

-- 2.1. Restaurar política em public.platform_members (com is_platform_admin(auth.uid()))
DROP POLICY IF EXISTS platform_members_select_admin ON public.platform_members;

CREATE POLICY platform_members_select_admin
    ON public.platform_members
    FOR SELECT
    TO authenticated
    USING (public.is_platform_admin(auth.uid()));

COMMENT ON POLICY platform_members_select_admin ON public.platform_members IS
    'Baseline restaurado: Permite que administradores autenticados visualizem membros via is_platform_admin(auth.uid()).';

-- 2.2. Restaurar política em public.audit_logs (com is_platform_admin(auth.uid()) e IN (SELECT ...))
DROP POLICY IF EXISTS audit_logs_select_authorized ON public.audit_logs;

CREATE POLICY audit_logs_select_authorized
    ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (
        (
            public.is_platform_admin(auth.uid()) 
            OR (
                organization_id IN (
                    SELECT om.organization_id
                    FROM public.organization_members om
                    WHERE om.user_id = auth.uid()
                      AND om.role = ANY (ARRAY['gestor'::text, 'admin'::text])
                      AND om.is_active = true
                )
            )
        )
    );

COMMENT ON POLICY audit_logs_select_authorized ON public.audit_logs IS
    'Baseline restaurado: Permite que administradores globais e gestores de organização visualizem logs autorizados.';

-- ------------------------------------------------------------------------------
-- SEÇÃO 3: REMOÇÃO SEGURA DA FUNÇÃO CANÔNICA CRIADA
-- ------------------------------------------------------------------------------
-- Observação Crítica: A função só pode ser descartada após as políticas dependentes
-- terem sido redirecionadas de volta para a função legada com UUID.
DROP FUNCTION IF EXISTS public.is_platform_admin();

-- ------------------------------------------------------------------------------
-- SEÇÃO 4: VERIFICAÇÃO PÓS-ROLLBACK
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_canonical_still_exists   BOOLEAN;
    v_pm_expr                  TEXT;
    v_al_expr                  TEXT;
    v_legacy_acl               TEXT;
BEGIN
    RAISE NOTICE '[ROLLBACK-V4] Validando integridade pós-rollback...';

    -- 4.1. Confirmar remoção da função sem argumentos
    SELECT EXISTS (
        SELECT 1 FROM pg_catalog.pg_proc p
        JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'is_platform_admin'
          AND p.pronargs = 0
    ) INTO v_canonical_still_exists;

    IF v_canonical_still_exists THEN
        RAISE EXCEPTION 'ROLLBACK_POSTCONDITION_FAILED [4.1]: Função sem argumentos ainda existe após DROP.';
    END IF;

    -- 4.2. Confirmar que as expressões de políticas voltaram a referenciar is_platform_admin(auth.uid())
    SELECT COALESCE(MAX(pg_catalog.pg_get_expr(pol.polqual, pol.polrelid)), '')
    INTO v_pm_expr
    FROM pg_catalog.pg_policy pol
    JOIN pg_catalog.pg_class c ON c.oid = pol.polrelid
    WHERE c.relname = 'platform_members' AND pol.polname = 'platform_members_select_admin';

    SELECT COALESCE(MAX(pg_catalog.pg_get_expr(pol.polqual, pol.polrelid)), '')
    INTO v_al_expr
    FROM pg_catalog.pg_policy pol
    JOIN pg_catalog.pg_class c ON c.oid = pol.polrelid
    WHERE c.relname = 'audit_logs' AND pol.polname = 'audit_logs_select_authorized';

    IF v_pm_expr NOT LIKE '%is_platform_admin(auth.uid())%' THEN
        RAISE EXCEPTION 'ROLLBACK_POSTCONDITION_FAILED [4.2a]: Expressão da política platform_members_select_admin não retornou ao baseline: %', v_pm_expr;
    END IF;

    IF v_al_expr NOT LIKE '%is_platform_admin(auth.uid())%' OR v_al_expr NOT LIKE '%organization_id%' THEN
        RAISE EXCEPTION 'ROLLBACK_POSTCONDITION_FAILED [4.2b]: Expressão da política audit_logs_select_authorized não retornou ao baseline: %', v_al_expr;
    END IF;

    -- 4.3. Confirmar que a ACL da função legada permanece intacta
    SELECT COALESCE(MAX(p.proacl::text), '')
    INTO v_legacy_acl
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'is_platform_admin'
      AND p.pronargs = 1;

    IF v_legacy_acl <> '{postgres=X/postgres}' THEN
        RAISE EXCEPTION 'ROLLBACK_POSTCONDITION_FAILED [4.3]: ACL da função legada foi corrompida: % (esperado: {postgres=X/postgres}).', v_legacy_acl;
    END IF;

    RAISE NOTICE '[ROLLBACK-V4] Baseline restaurado com 100% de integridade e conformidade semântica.';
END $$;

-- ------------------------------------------------------------------------------
-- SEÇÃO 5: NOTIFICAÇÃO E RECARGA DO SCHEMA POSTGREST
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

COMMIT;
