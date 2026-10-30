-- ==============================================================================
-- CLASSIUM GESTÃO EDUCACIONAL — ETAPA P2.325.17 (VERSÃO V9)
-- SCRIPT DE RESTAURAÇÃO SEMÂNTICA (ROLLBACK) V9 — SEM VERIFICAÇÕES PARCIAIS
-- ==============================================================================
-- Projeto Supabase Oficial Único: flfqjlrjnvkrstqsknxc
-- Host Oficial: flfqjlrjnvkrstqsknxc.supabase.co
-- Versão do Rollback: v9.0 (Restauração Semântica — 100% READ-ONLY)
-- Modo Operacional: Script estrito para revisão humana. Proibida execução automática.
--
-- Aperfeiçoamentos Críticos em Relação à Versão V8:
--   1. Eliminação total de verificações parciais (LIKE / %is_platform_admin%):
--      Substituição por igualdade estrita normalizada nas pré e pós-condições do rollback.
--   2. Restauração determinística exata das políticas RLS ao baseline P2.325.11.
--   3. Descarte restrito sem CASCADE (RESTRICT nativo) e validação pg_depend.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- SEÇÃO 1: PRÉ-CONDIÇÕES E VALIDAÇÕES DO ROLLBACK (FAIL-FAST)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_canonical_oid             OID;
    v_legacy_oid                OID;
    v_pm_class_oid              OID;
    v_al_class_oid              OID;
    v_canonical_rec             RECORD;
    v_legacy_rec                RECORD;
    v_pm_policy_count           INTEGER;
    v_al_policy_count           INTEGER;
    v_legacy_funcdef_norm       TEXT;
    v_expected_legacy_funcdef_1 TEXT;
    v_expected_legacy_funcdef_2 TEXT;
    v_pm_curr_using             TEXT;
    v_al_curr_using             TEXT;
    v_pm_using_norm             TEXT;
    v_al_using_norm             TEXT;
BEGIN
    RAISE NOTICE '[ROLLBACK-V9] Iniciando validações pré-rollback estritas (sem partial checks)...';

    -- 1.1. Identificar e validar a função canônica que deve ser revertida
    v_canonical_oid := pg_catalog.to_regprocedure('public.is_platform_admin()');
    IF v_canonical_oid IS NULL THEN
        RAISE EXCEPTION 'ROLLBACK_PRECONDITION_FAILED [1.1a]: Função canônica sem argumentos public.is_platform_admin() não encontrada.';
    END IF;

    SELECT 
        p.oid,
        pg_catalog.pg_get_userbyid(p.proowner) AS owner_name,
        p.prosecdef,
        p.proconfig,
        p.proacl::text AS acl_text
    INTO v_canonical_rec
    FROM pg_catalog.pg_proc p
    WHERE p.oid = v_canonical_oid;

    IF v_canonical_rec.owner_name <> 'postgres' OR v_canonical_rec.prosecdef IS NOT TRUE THEN
        RAISE EXCEPTION 'ROLLBACK_PRECONDITION_FAILED [1.1b]: A função sem argumentos encontrada não corresponde ao esperado.';
    END IF;

    -- 1.2. Verificar integridade da função legada (com UUID)
    v_legacy_oid := pg_catalog.to_regprocedure('public.is_platform_admin(uuid)');
    IF v_legacy_oid IS NULL THEN
        RAISE EXCEPTION 'ROLLBACK_PRECONDITION_FAILED [1.2a]: Função legada com UUID não encontrada.';
    END IF;

    SELECT 
        p.oid,
        pg_catalog.pg_get_function_identity_arguments(p.oid) AS identity_args,
        pg_catalog.pg_get_userbyid(p.proowner) AS owner_name,
        p.proacl::text AS acl_text,
        pg_catalog.pg_get_functiondef(p.oid) AS funcdef
    INTO v_legacy_rec
    FROM pg_catalog.pg_proc p
    WHERE p.oid = v_legacy_oid;

    IF v_legacy_rec.acl_text <> '{postgres=X/postgres}' THEN
        RAISE EXCEPTION 'ROLLBACK_PRECONDITION_FAILED [1.2b]: ACL da função legada diverge.';
    END IF;

    v_legacy_funcdef_norm := regexp_replace(trim(v_legacy_rec.funcdef), '\s+', ' ', 'g');
    v_expected_legacy_funcdef_1 := 'CREATE OR REPLACE FUNCTION public.is_platform_admin(p_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''public'', ''pg_temp'' AS $function$ SELECT EXISTS ( SELECT 1 FROM public.platform_members pm JOIN public.roles r ON r.code = pm.role WHERE pm.user_id = p_user_id AND pm.is_active = true AND r.scope_type = ''platform'' AND r.code = ''admin'' AND r.is_active = true ); $function$';
    v_expected_legacy_funcdef_2 := 'CREATE OR REPLACE FUNCTION public.is_platform_admin(p_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $function$ SELECT EXISTS ( SELECT 1 FROM public.platform_members pm JOIN public.roles r ON r.code = pm.role WHERE pm.user_id = p_user_id AND pm.is_active = true AND r.scope_type = ''platform'' AND r.code = ''admin'' AND r.is_active = true ); $function$';

    IF v_legacy_funcdef_norm <> v_expected_legacy_funcdef_1 AND v_legacy_funcdef_norm <> v_expected_legacy_funcdef_2 THEN
        RAISE EXCEPTION 'ROLLBACK_PRECONDITION_FAILED [1.2c]: Código-fonte da função legada difere do baseline.';
    END IF;

    -- 1.3. Verificar estado atual das políticas nas tabelas-alvo (sem LIKE)
    v_pm_class_oid := pg_catalog.to_regclass('public.platform_members');
    v_al_class_oid := pg_catalog.to_regclass('public.audit_logs');

    IF v_pm_class_oid IS NULL OR v_al_class_oid IS NULL THEN
        RAISE EXCEPTION 'ROLLBACK_PRECONDITION_FAILED [1.3a]: Tabelas do baseline não localizadas.';
    END IF;

    SELECT COUNT(*) INTO v_pm_policy_count FROM pg_catalog.pg_policy WHERE polrelid = v_pm_class_oid;
    SELECT COUNT(*) INTO v_al_policy_count FROM pg_catalog.pg_policy WHERE polrelid = v_al_class_oid;

    IF v_pm_policy_count <> 1 OR v_al_policy_count <> 1 THEN
        RAISE EXCEPTION 'ROLLBACK_PRECONDITION_FAILED [1.3b]: Contagem de políticas inesperada.';
    END IF;

    SELECT pg_catalog.pg_get_expr(polqual, polrelid) INTO v_pm_curr_using
    FROM pg_catalog.pg_policy WHERE polrelid = v_pm_class_oid AND polname = 'platform_members_select_admin';

    SELECT pg_catalog.pg_get_expr(polqual, polrelid) INTO v_al_curr_using
    FROM pg_catalog.pg_policy WHERE polrelid = v_al_class_oid AND polname = 'audit_logs_select_authorized';

    v_pm_using_norm := regexp_replace(trim(v_pm_curr_using), '\s+', ' ', 'g');
    IF v_pm_using_norm NOT IN ('is_platform_admin()', 'public.is_platform_admin()') THEN
        RAISE EXCEPTION 'ROLLBACK_PRECONDITION_FAILED [1.3c]: Expressão atual de platform_members não aponta para a função canônica.';
    END IF;

    v_al_using_norm := regexp_replace(trim(v_al_curr_using), '\s+', ' ', 'g');
    IF v_al_using_norm NOT IN (
        '((is_platform_admin() OR (organization_id IN ( SELECT om.organization_id FROM public.organization_members om WHERE ((om.user_id = auth.uid()) AND (om.role = ANY (ARRAY[''gestor''::text, ''admin''::text])) AND (om.is_active = true))))))',
        '((public.is_platform_admin() OR (organization_id IN ( SELECT om.organization_id FROM public.organization_members om WHERE ((om.user_id = auth.uid()) AND (om.role = ANY (ARRAY[''gestor''::text, ''admin''::text])) AND (om.is_active = true))))))',
        '((is_platform_admin() OR (organization_id IN ( SELECT om.organization_id FROM organization_members om WHERE ((om.user_id = auth.uid()) AND (om.role = ANY (ARRAY[''gestor''::text, ''admin''::text])) AND (om.is_active = true))))))',
        '((public.is_platform_admin() OR (organization_id IN ( SELECT om.organization_id FROM organization_members om WHERE ((om.user_id = auth.uid()) AND (om.role = ANY (ARRAY[''gestor''::text, ''admin''::text])) AND (om.is_active = true))))))'
    ) THEN
        RAISE EXCEPTION 'ROLLBACK_PRECONDITION_FAILED [1.3d]: Expressão atual de audit_logs não aponta para a função canônica esperada.';
    END IF;

    RAISE NOTICE '[ROLLBACK-V9] Pré-condições do rollback validadas estritamente.';
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
    'Baseline restaurado: Permite visualização via is_platform_admin(auth.uid()) (P2.325.17-v9).';

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
    'Baseline restaurado: Permite visualização de logs autorizados preservando IN (SELECT ...) (P2.325.17-v9).';

-- ------------------------------------------------------------------------------
-- SEÇÃO 3: VERIFICAÇÃO DE DEPENDÊNCIAS DE CATÁLOGO (pg_depend) E REMOÇÃO SEGURA
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_canonical_oid   OID;
    v_dep_count       INTEGER;
BEGIN
    v_canonical_oid := pg_catalog.to_regprocedure('public.is_platform_admin()');

    SELECT COUNT(*) INTO v_dep_count
    FROM pg_catalog.pg_depend d
    WHERE d.refobjid = v_canonical_oid
      AND d.refclassid = 'pg_catalog.pg_proc'::regclass
      AND d.deptype = 'n';

    IF v_dep_count > 0 THEN
        RAISE EXCEPTION 'ROLLBACK_DEPENDENCY_FAILED [3.1]: Ainda existem dependências reais no catálogo. Descarte abortado.';
    END IF;
END $$;

DROP FUNCTION IF EXISTS public.is_platform_admin();

-- ------------------------------------------------------------------------------
-- SEÇÃO 4: VERIFICAÇÃO PÓS-ROLLBACK ESTRITA (SEM VERIFICAÇÕES PARCIAIS)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_canonical_oid       OID;
    v_legacy_oid          OID;
    v_pm_class_oid        OID;
    v_al_class_oid        OID;
    v_pm_expr             TEXT;
    v_al_expr             TEXT;
    v_legacy_acl          TEXT;
    v_expected_al_using_1 TEXT;
    v_expected_al_using_2 TEXT;
BEGIN
    RAISE NOTICE '[ROLLBACK-V9] Executando validações pós-rollback estritas...';

    v_canonical_oid := pg_catalog.to_regprocedure('public.is_platform_admin()');
    IF v_canonical_oid IS NOT NULL THEN
        RAISE EXCEPTION 'ROLLBACK_POSTCONDITION_FAILED [4.1]: Função sem argumentos ainda existe.';
    END IF;

    v_pm_class_oid := pg_catalog.to_regclass('public.platform_members');
    v_al_class_oid := pg_catalog.to_regclass('public.audit_logs');

    SELECT COALESCE(pg_catalog.pg_get_expr(polqual, polrelid), '')
    INTO v_pm_expr
    FROM pg_catalog.pg_policy
    WHERE polrelid = v_pm_class_oid AND polname = 'platform_members_select_admin';

    SELECT COALESCE(pg_catalog.pg_get_expr(polqual, polrelid), '')
    INTO v_al_expr
    FROM pg_catalog.pg_policy
    WHERE polrelid = v_al_class_oid AND polname = 'audit_logs_select_authorized';

    IF regexp_replace(trim(v_pm_expr), '\s+', ' ', 'g') NOT IN ('is_platform_admin(auth.uid())', 'public.is_platform_admin(auth.uid())') THEN
        RAISE EXCEPTION 'ROLLBACK_POSTCONDITION_FAILED [4.2a]: Expressão de platform_members não restaurada ao baseline: %', v_pm_expr;
    END IF;

    v_al_expr := regexp_replace(trim(v_al_expr), '\s+', ' ', 'g');
    v_expected_al_using_1 := '(is_platform_admin(auth.uid()) OR (organization_id IN ( SELECT om.organization_id FROM organization_members om WHERE ((om.user_id = auth.uid()) AND (om.role = ANY (ARRAY[''gestor''::text, ''admin''::text])) AND (om.is_active = true)))))';
    v_expected_al_using_2 := '(is_platform_admin(auth.uid()) OR (organization_id IN ( SELECT om.organization_id FROM public.organization_members om WHERE ((om.user_id = auth.uid()) AND (om.role = ANY (ARRAY[''gestor''::text, ''admin''::text])) AND (om.is_active = true)))))';

    IF v_al_expr <> v_expected_al_using_1 AND v_al_expr <> v_expected_al_using_2 THEN
        RAISE EXCEPTION 'ROLLBACK_POSTCONDITION_FAILED [4.2b]: Expressão de audit_logs não restaurada ao baseline integral: %', v_al_expr;
    END IF;

    v_legacy_oid := pg_catalog.to_regprocedure('public.is_platform_admin(uuid)');
    SELECT p.proacl::text INTO v_legacy_acl FROM pg_catalog.pg_proc p WHERE p.oid = v_legacy_oid;

    IF v_legacy_acl <> '{postgres=X/postgres}' THEN
        RAISE EXCEPTION 'ROLLBACK_POSTCONDITION_FAILED [4.3]: ACL da função legada alterada.';
    END IF;

    IF pg_catalog.has_function_privilege('authenticated', v_legacy_oid, 'EXECUTE') THEN
        RAISE EXCEPTION 'ROLLBACK_POSTCONDITION_FAILED [4.4]: Papel authenticated possui EXECUTE indevido na função legada.';
    END IF;

    RAISE NOTICE '[ROLLBACK-V9] Restauração semântica do baseline concluída e validada sem resíduos.';
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;
