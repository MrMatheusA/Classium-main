-- ==============================================================================
-- CLASSIUM GESTÃO EDUCACIONAL — ETAPA P2.325.15
-- SCRIPT DE RESTAURAÇÃO SEMÂNTICA (ROLLBACK) V7 — BASELINE RESTORATION
-- ==============================================================================
-- Projeto Supabase Oficial Único: flfqjlrjnvkrstqsknxc
-- Host Oficial: flfqjlrjnvkrstqsknxc.supabase.co
-- Versão do Rollback: v7.0 (Restauração Semântica — 100% READ-ONLY)
-- Modo Operacional: Script candidato estático para revisão humana. Proibida execução automática.
--
-- DECLARAÇÃO TÉCNICA E LIMITAÇÕES:
--   1. O motor PostgreSQL gera novos OIDs de sistema ao recriar políticas RLS (CREATE POLICY).
--      Este script restaura integralmente a semântica, o comando, os papéis e a expressão
--      decompilada do baseline, mas os OIDs numéricos pré-migração NÃO são preservados.
--   2. A remoção da função sem argumentos é realizada de forma estrita sem CASCADE (RESTRICT padrão),
--      garantindo que qualquer dependência inesperada aborte a transação com segurança.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- SEÇÃO 1: PRÉ-CONDIÇÕES E VALIDAÇÕES DO ROLLBACK (FAIL-FAST)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_canonical_oid          OID;
    v_legacy_oid             OID;
    v_pm_class_oid           OID;
    v_al_class_oid           OID;
    v_canonical_rec          RECORD;
    v_legacy_rec             RECORD;
    v_pm_policy_count        INTEGER;
    v_al_policy_count        INTEGER;
    v_legacy_funcdef_norm    TEXT;
BEGIN
    RAISE NOTICE '[ROLLBACK-V7] Iniciando validações pré-rollback contra o catálogo...';

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
        RAISE EXCEPTION 'ROLLBACK_PRECONDITION_FAILED [1.1b]: A função sem argumentos encontrada não corresponde ao objeto gerado pelo candidato v7.';
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
    IF v_legacy_funcdef_norm NOT LIKE '%SELECT EXISTS ( SELECT 1 FROM public.platform_members pm JOIN public.roles r ON r.code = pm.role WHERE pm.user_id = p_user_id AND pm.is_active = true AND r.scope_type = ''platform'' AND r.code = ''admin'' AND r.is_active = true )%' THEN
        RAISE EXCEPTION 'ROLLBACK_PRECONDITION_FAILED [1.2c]: Código-fonte da função legada não corresponde ao baseline registrado.';
    END IF;

    -- 1.3. Verificar contagem de políticas nas tabelas-alvo
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

    RAISE NOTICE '[ROLLBACK-V7] Pré-condições validadas. Prosseguindo com a restauração semântica do baseline.';
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
-- SEÇÃO 3: VERIFICAÇÃO DE DEPENDÊNCIAS RESIDUAIS E REMOÇÃO SEGURA DA FUNÇÃO
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_dependent_policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_dependent_policy_count
    FROM pg_catalog.pg_policy pol
    JOIN pg_catalog.pg_class c ON c.oid = pol.polrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND (
          pg_catalog.pg_get_expr(pol.polqual, pol.polrelid) LIKE '%is_platform_admin()%'
          OR pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid) LIKE '%is_platform_admin()%'
      );

    IF v_dependent_policy_count > 0 THEN
        RAISE EXCEPTION 'ROLLBACK_DEPENDENCY_FAILED [3.1]: Ainda existem % políticas dependentes de is_platform_admin() no schema public. Descarte abortado.',
            v_dependent_policy_count;
    END IF;
END $$;

-- Remoção estrita sem CASCADE para garantir que nenhuma dependência oculta seja apagada silenciosamente
DROP FUNCTION IF EXISTS public.is_platform_admin();

-- ------------------------------------------------------------------------------
-- SEÇÃO 4: VERIFICAÇÃO PÓS-ROLLBACK
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_canonical_oid      OID;
    v_legacy_oid         OID;
    v_pm_class_oid       OID;
    v_al_class_oid       OID;
    v_pm_expr            TEXT;
    v_al_expr            TEXT;
    v_legacy_acl         TEXT;
BEGIN
    RAISE NOTICE '[ROLLBACK-V7] Executando validações pós-rollback...';

    -- 4.1. Confirmar remoção da função sem argumentos
    v_canonical_oid := pg_catalog.to_regprocedure('public.is_platform_admin()');
    IF v_canonical_oid IS NOT NULL THEN
        RAISE EXCEPTION 'ROLLBACK_POSTCONDITION_FAILED [4.1]: Função sem argumentos ainda existe após DROP (OID: %).', v_canonical_oid;
    END IF;

    -- 4.2. Confirmar restauração semântica exata das expressões das políticas
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
        RAISE EXCEPTION 'ROLLBACK_POSTCONDITION_FAILED [4.2a]: Expressão de platform_members_select_admin não restaurada ao baseline: %', v_pm_expr;
    END IF;

    IF v_al_expr NOT LIKE '%is_platform_admin(auth.uid())%' OR v_al_expr NOT LIKE '%organization_id%' THEN
        RAISE EXCEPTION 'ROLLBACK_POSTCONDITION_FAILED [4.2b]: Expressão de audit_logs_select_authorized não restaurada ao baseline: %', v_al_expr;
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

    RAISE NOTICE '[ROLLBACK-V7] Restauração semântica do baseline concluída com sucesso.';
END $$;

-- ------------------------------------------------------------------------------
-- SEÇÃO 5: NOTIFICAÇÃO E RECARGA DE SCHEMA DO POSTGREST
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

COMMIT;
