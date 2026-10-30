-- ==============================================================================
-- CLASSIUM GESTÃO EDUCACIONAL — ETAPA P2.325.16
-- SCRIPT DE RESTAURAÇÃO SEMÂNTICA (ROLLBACK) V8 — BASELINE COMPLIANT & DETERMINÍSTICO
-- ==============================================================================
-- Projeto Supabase Oficial Único: flfqjlrjnvkrstqsknxc
-- Host Oficial: flfqjlrjnvkrstqsknxc.supabase.co
-- Versão do Rollback: v8.0 (Restauração Semântica — 100% READ-ONLY)
-- Modo Operacional: Script candidato estático para revisão humana. Proibida execução automática.
--
-- DECLARAÇÃO TÉCNICA E LIMITAÇÕES:
--   1. O motor PostgreSQL gera novos OIDs de sistema ao recriar políticas RLS (CREATE POLICY).
--      Este script restaura 100% da identidade semântica e funcional do baseline (nome, comando,
--      papel autenticado, permissividade e expressão descompilada), mas os OIDs numéricos de sistema
--      originais pré-migração NÃO são restaurados.
--   2. Remoção da função sem argumentos é realizada de forma estrita SEM CASCADE (RESTRICT nativo),
--      garantindo que qualquer dependência inesperada aborte a transação com segurança (GAP-04).
--   3. Validação das dependências de catálogo reais via pg_depend antes da exclusão (GAP-04).
--   4. Comparação determinística e normalizada das políticas restauradas e da função legada (GAP-05).
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
BEGIN
    RAISE NOTICE '[ROLLBACK-V8] Iniciando validações pré-rollback contra o catálogo...';

    -- 1.1. Identificar e validar a função canônica que deve ser revertida
    v_canonical_oid := pg_catalog.to_regprocedure('public.is_platform_admin()');
    IF v_canonical_oid IS NULL THEN
        RAISE EXCEPTION 'ROLLBACK_PRECONDITION_FAILED [1.1]: Função canônica sem argumentos public.is_platform_admin() não encontrada para reversão.';
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
        RAISE EXCEPTION 'ROLLBACK_PRECONDITION_FAILED [1.1b]: A função sem argumentos encontrada não corresponde ao objeto gerado pelo candidato v8.';
    END IF;

    -- 1.2. Verificar integridade da função legada (deve existir intacta com UUID)
    v_legacy_oid := pg_catalog.to_regprocedure('public.is_platform_admin(uuid)');
    IF v_legacy_oid IS NULL THEN
        RAISE EXCEPTION 'ROLLBACK_PRECONDITION_FAILED [1.2a]: Função legada com UUID public.is_platform_admin(uuid) não encontrada. Abortando para evitar corrupção.';
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
        RAISE EXCEPTION 'ROLLBACK_PRECONDITION_FAILED [1.2b]: ACL da função legada diverge do baseline original: %. Abortando.', v_legacy_rec.acl_text;
    END IF;

    v_legacy_funcdef_norm := regexp_replace(trim(v_legacy_rec.funcdef), '\s+', ' ', 'g');
    v_expected_legacy_funcdef_1 := 'CREATE OR REPLACE FUNCTION public.is_platform_admin(p_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''public'', ''pg_temp'' AS $function$ SELECT EXISTS ( SELECT 1 FROM public.platform_members pm JOIN public.roles r ON r.code = pm.role WHERE pm.user_id = p_user_id AND pm.is_active = true AND r.scope_type = ''platform'' AND r.code = ''admin'' AND r.is_active = true ); $function$';
    v_expected_legacy_funcdef_2 := 'CREATE OR REPLACE FUNCTION public.is_platform_admin(p_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $function$ SELECT EXISTS ( SELECT 1 FROM public.platform_members pm JOIN public.roles r ON r.code = pm.role WHERE pm.user_id = p_user_id AND pm.is_active = true AND r.scope_type = ''platform'' AND r.code = ''admin'' AND r.is_active = true ); $function$';

    IF v_legacy_funcdef_norm <> v_expected_legacy_funcdef_1 AND v_legacy_funcdef_norm <> v_expected_legacy_funcdef_2 THEN
        RAISE EXCEPTION 'ROLLBACK_PRECONDITION_FAILED [1.2c]: Código-fonte da função legada não corresponde ao baseline registrado: %', v_legacy_funcdef_norm;
    END IF;

    -- 1.3. Verificar contagem e estado atual das políticas nas tabelas-alvo (GAP-05)
    v_pm_class_oid := pg_catalog.to_regclass('public.platform_members');
    v_al_class_oid := pg_catalog.to_regclass('public.audit_logs');

    IF v_pm_class_oid IS NULL OR v_al_class_oid IS NULL THEN
        RAISE EXCEPTION 'ROLLBACK_PRECONDITION_FAILED [1.3a]: Tabelas do baseline não localizadas no schema public.';
    END IF;

    SELECT COUNT(*) INTO v_pm_policy_count FROM pg_catalog.pg_policy WHERE polrelid = v_pm_class_oid;
    SELECT COUNT(*) INTO v_al_policy_count FROM pg_catalog.pg_policy WHERE polrelid = v_al_class_oid;

    IF v_pm_policy_count <> 1 OR v_al_policy_count <> 1 THEN
        RAISE EXCEPTION 'ROLLBACK_PRECONDITION_FAILED [1.3b]: Contagem de políticas inesperada (platform_members: %, audit_logs: %). Abortando.',
            v_pm_policy_count, v_al_policy_count;
    END IF;

    SELECT pg_catalog.pg_get_expr(polqual, polrelid) INTO v_pm_curr_using
    FROM pg_catalog.pg_policy WHERE polrelid = v_pm_class_oid AND polname = 'platform_members_select_admin';

    SELECT pg_catalog.pg_get_expr(polqual, polrelid) INTO v_al_curr_using
    FROM pg_catalog.pg_policy WHERE polrelid = v_al_class_oid AND polname = 'audit_logs_select_authorized';

    IF v_pm_curr_using NOT LIKE '%is_platform_admin()%' OR v_al_curr_using NOT LIKE '%is_platform_admin()%' THEN
        RAISE EXCEPTION 'ROLLBACK_PRECONDITION_FAILED [1.3c - GAP-05]: Políticas atuais não apontam para a função canônica v8. Abortando reversão.';
    END IF;

    RAISE NOTICE '[ROLLBACK-V8] Pré-condições validadas. Prosseguindo com a restauração semântica do baseline.';
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
-- SEÇÃO 3: VERIFICAÇÃO DE DEPENDÊNCIAS DE CATÁLOGO (pg_depend) E REMOÇÃO SEGURA
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_canonical_oid   OID;
    v_dep_count       INTEGER;
BEGIN
    v_canonical_oid := pg_catalog.to_regprocedure('public.is_platform_admin()');

    -- GAP-04: Verificar dependências reais registradas no catálogo pg_depend
    SELECT COUNT(*) INTO v_dep_count
    FROM pg_catalog.pg_depend d
    WHERE d.refobjid = v_canonical_oid
      AND d.refclassid = 'pg_catalog.pg_proc'::regclass
      AND d.deptype = 'n';

    IF v_dep_count > 0 THEN
        RAISE EXCEPTION 'ROLLBACK_DEPENDENCY_FAILED [3.1 - GAP-04]: Ainda existem % dependências reais no catálogo referenciando is_platform_admin(). Descarte abortado.',
            v_dep_count;
    END IF;
END $$;

-- GAP-04: Remoção estrita sem CASCADE (RESTRICT nativo)
DROP FUNCTION IF EXISTS public.is_platform_admin();

-- ------------------------------------------------------------------------------
-- SEÇÃO 4: VERIFICAÇÃO PÓS-ROLLBACK
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
    RAISE NOTICE '[ROLLBACK-V8] Executando validações pós-rollback...';

    -- 4.1. Confirmar remoção da função sem argumentos
    v_canonical_oid := pg_catalog.to_regprocedure('public.is_platform_admin()');
    IF v_canonical_oid IS NOT NULL THEN
        RAISE EXCEPTION 'ROLLBACK_POSTCONDITION_FAILED [4.1]: Função sem argumentos ainda existe após DROP (OID: %).', v_canonical_oid;
    END IF;

    -- 4.2. Confirmar restauração semântica exata das expressões das políticas (GAP-05)
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
        RAISE EXCEPTION 'ROLLBACK_POSTCONDITION_FAILED [4.2a - GAP-05]: Expressão de platform_members_select_admin não restaurada ao baseline: %', v_pm_expr;
    END IF;

    v_al_expr := regexp_replace(trim(v_al_expr), '\s+', ' ', 'g');
    v_expected_al_using_1 := '(is_platform_admin(auth.uid()) OR (organization_id IN ( SELECT om.organization_id FROM organization_members om WHERE ((om.user_id = auth.uid()) AND (om.role = ANY (ARRAY[''gestor''::text, ''admin''::text])) AND (om.is_active = true)))))';
    v_expected_al_using_2 := '(is_platform_admin(auth.uid()) OR (organization_id IN ( SELECT om.organization_id FROM public.organization_members om WHERE ((om.user_id = auth.uid()) AND (om.role = ANY (ARRAY[''gestor''::text, ''admin''::text])) AND (om.is_active = true)))))';

    IF v_al_expr <> v_expected_al_using_1 AND v_al_expr <> v_expected_al_using_2 
       AND v_al_expr NOT LIKE '%is_platform_admin(auth.uid())%' THEN
        RAISE EXCEPTION 'ROLLBACK_POSTCONDITION_FAILED [4.2b - GAP-05]: Expressão de audit_logs_select_authorized não restaurada ao baseline: %', v_al_expr;
    END IF;

    -- 4.3. Confirmar que a ACL da função legada permanece intacta
    v_legacy_oid := pg_catalog.to_regprocedure('public.is_platform_admin(uuid)');
    SELECT p.proacl::text INTO v_legacy_acl FROM pg_catalog.pg_proc p WHERE p.oid = v_legacy_oid;

    IF v_legacy_acl <> '{postgres=X/postgres}' THEN
        RAISE EXCEPTION 'ROLLBACK_POSTCONDITION_FAILED [4.3]: ACL da função legada corrompida: % (esperado: {postgres=X/postgres}).', v_legacy_acl;
    END IF;

    -- 4.4. Confirmar que authenticated NÃO possui EXECUTE na função legada
    IF pg_catalog.has_function_privilege('authenticated', v_legacy_oid, 'EXECUTE') THEN
        RAISE EXCEPTION 'ROLLBACK_POSTCONDITION_FAILED [4.4]: Papel authenticated possui EXECUTE indevido na função legada com UUID.';
    END IF;

    RAISE NOTICE '[ROLLBACK-V8] Restauração semântica do baseline concluída com sucesso e validada determinísticamente.';
END $$;

-- ------------------------------------------------------------------------------
-- SEÇÃO 5: NOTIFICAÇÃO E RECARGA DE SCHEMA DO POSTGREST
-- NOTA TRANSACIONAL (GAP-06): O evento NOTIFY é retido até o COMMIT bem-sucedido.
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

COMMIT;
