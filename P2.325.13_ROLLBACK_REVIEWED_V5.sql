-- ==============================================================================
-- CLASSIUM GESTÃO EDUCACIONAL — ETAPA P2.325.13
-- SCRIPT DE ROLLBACK REVISADO V5 — RESTAURAÇÃO DETERMINÍSTICA DO BASELINE
-- ==============================================================================
-- Projeto Supabase Oficial Único: flfqjlrjnvkrstqsknxc
-- Host Oficial: flfqjlrjnvkrstqsknxc.supabase.co
-- Versão do Rollback: v5.0 (Revisão Estática Independente — 100% READ-ONLY)
--
-- Declaração de Limitação Técnica:
--   O PostgreSQL gera novos OIDs de sistema ao recriar políticas RLS (CREATE POLICY).
--   Este rollback restaura a identidade semântica integral (nome, comando, papéis e expressão),
--   mas declara explicitamente que os OIDs numéricos internos pré-migração NÃO são restaurados.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- SEÇÃO 1: PRÉ-CONDIÇÕES E VALIDAÇÕES DO ROLLBACK (FAIL-FAST)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_func_rec               RECORD;
    v_legacy_rec             RECORD;
    v_pm_policy_count        INTEGER;
    v_al_policy_count        INTEGER;
BEGIN
    RAISE NOTICE '[ROLLBACK-V5] Validando pré-condições de rollback contra o catálogo...';

    -- 1.1. Verificar se a função canônica criada pelo candidato v5 existe e corresponde ao objeto esperado
    SELECT 
        p.oid,
        pg_catalog.pg_get_userbyid(p.proowner) AS owner_name,
        p.prosecdef,
        p.proconfig,
        p.proacl::text AS acl_text
    INTO v_func_rec
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'is_platform_admin'
      AND p.pronargs = 0;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ROLLBACK_PRECONDITION_FAILED [1.1]: Função canônica sem argumentos public.is_platform_admin() não encontrada para reversão.';
    END IF;

    -- 1.2. Verificar integridade da função legada (deve existir intacta com UUID)
    SELECT 
        p.oid,
        pg_catalog.pg_get_function_identity_arguments(p.oid) AS identity_args,
        pg_catalog.pg_get_userbyid(p.proowner) AS owner_name,
        p.proacl::text AS acl_text
    INTO v_legacy_rec
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'is_platform_admin'
      AND p.pronargs = 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ROLLBACK_PRECONDITION_FAILED [1.2a]: Função legada com UUID public.is_platform_admin(uuid) não encontrada.';
    END IF;

    IF v_legacy_rec.identity_args NOT IN ('uuid', 'p_user_id uuid') OR v_legacy_rec.acl_text <> '{postgres=X/postgres}' THEN
        RAISE EXCEPTION 'ROLLBACK_PRECONDITION_FAILED [1.2b]: Função legada divergente do baseline original (args: %, acl: %). Abortando.',
            v_legacy_rec.identity_args, v_legacy_rec.acl_text;
    END IF;

    -- 1.3. Verificar contagem de políticas nas tabelas-alvo
    SELECT COUNT(*) INTO v_pm_policy_count
    FROM pg_catalog.pg_policy pol
    JOIN pg_catalog.pg_class c ON c.oid = pol.polrelid
    WHERE c.relname = 'platform_members';

    SELECT COUNT(*) INTO v_al_policy_count
    FROM pg_catalog.pg_policy pol
    JOIN pg_catalog.pg_class c ON c.oid = pol.polrelid
    WHERE c.relname = 'audit_logs';

    IF v_pm_policy_count <> 1 OR v_al_policy_count <> 1 THEN
        RAISE EXCEPTION 'ROLLBACK_PRECONDITION_FAILED [1.3]: Contagem de políticas inesperada (platform_members: %, audit_logs: %). Abortando.',
            v_pm_policy_count, v_al_policy_count;
    END IF;

    RAISE NOTICE '[ROLLBACK-V5] Pré-condições validadas. Prosseguindo com a reversão para o baseline.';
END $$;

-- ------------------------------------------------------------------------------
-- SEÇÃO 2: RESTAURAÇÃO DAS POLÍTICAS RLS DO BASELINE ORIGINAL P2.325.11
-- ------------------------------------------------------------------------------

-- 2.1. Restaurar política em public.platform_members apontando para a função com UUID
DROP POLICY IF EXISTS platform_members_select_admin ON public.platform_members;

CREATE POLICY platform_members_select_admin
    ON public.platform_members
    FOR SELECT
    TO authenticated
    USING (public.is_platform_admin(auth.uid()));

COMMENT ON POLICY platform_members_select_admin ON public.platform_members IS
    'Baseline restaurado: Permite visualização via is_platform_admin(auth.uid()).';

-- 2.2. Restaurar política em public.audit_logs com a expressão literal do baseline
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
    'Baseline restaurado: Permite visualização de logs autorizados preservando IN (SELECT ...).';

-- ------------------------------------------------------------------------------
-- SEÇÃO 3: VERIFICAÇÃO DE DEPENDÊNCIAS RESIDUAIS E REMOÇÃO DA FUNÇÃO NOVA
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_dependent_policy_count INTEGER;
BEGIN
    -- Validar se restou alguma política apontando para a função sem argumentos
    SELECT COUNT(*) INTO v_dependent_policy_count
    FROM pg_catalog.pg_policy pol
    WHERE pg_catalog.pg_get_expr(pol.polqual, pol.polrelid) LIKE '%is_platform_admin()%'
       OR pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid) LIKE '%is_platform_admin()%';

    IF v_dependent_policy_count > 0 THEN
        RAISE EXCEPTION 'ROLLBACK_DEPENDENCY_FAILED [3.1]: Ainda existem % políticas dependentes de is_platform_admin(). Descarte abortado.', v_dependent_policy_count;
    END IF;
END $$;

DROP FUNCTION IF EXISTS public.is_platform_admin();

-- ------------------------------------------------------------------------------
-- SEÇÃO 4: VERIFICAÇÃO PÓS-ROLLBACK
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_canonical_exists   BOOLEAN;
    v_pm_expr            TEXT;
    v_al_expr            TEXT;
    v_legacy_acl         TEXT;
BEGIN
    RAISE NOTICE '[ROLLBACK-V5] Executando validações pós-rollback...';

    -- 4.1. Confirmar remoção da função sem argumentos
    SELECT EXISTS (
        SELECT 1 FROM pg_catalog.pg_proc p
        JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'is_platform_admin'
          AND p.pronargs = 0
    ) INTO v_canonical_exists;

    IF v_canonical_exists THEN
        RAISE EXCEPTION 'ROLLBACK_POSTCONDITION_FAILED [4.1]: Função sem argumentos ainda existe após DROP.';
    END IF;

    -- 4.2. Confirmar restauração semântica exata das expressões das políticas
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
        RAISE EXCEPTION 'ROLLBACK_POSTCONDITION_FAILED [4.2a]: Expressão da política platform_members_select_admin não restaurada: %', v_pm_expr;
    END IF;

    IF v_al_expr NOT LIKE '%is_platform_admin(auth.uid())%' OR v_al_expr NOT LIKE '%organization_id%' THEN
        RAISE EXCEPTION 'ROLLBACK_POSTCONDITION_FAILED [4.2b]: Expressão da política audit_logs_select_authorized não restaurada: %', v_al_expr;
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
        RAISE EXCEPTION 'ROLLBACK_POSTCONDITION_FAILED [4.3]: ACL da função legada corrompida: % (esperado: {postgres=X/postgres}).', v_legacy_acl;
    END IF;

    RAISE NOTICE '[ROLLBACK-V5] Reversão para o baseline concluída com 100% de integridade comprovada.';
END $$;

-- ------------------------------------------------------------------------------
-- SEÇÃO 5: NOTIFICAÇÃO E RECARGA DE SCHEMA DO POSTGREST
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

COMMIT;
