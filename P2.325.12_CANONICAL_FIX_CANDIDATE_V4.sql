-- ==============================================================================
-- CLASSIUM GESTÃO EDUCACIONAL — ETAPA P2.325.12
-- CANDIDATO CORRETIVO DE AUTORIZAÇÃO V4 — STRICT BASELINE COMPLIANT
-- ==============================================================================
-- Projeto Supabase Oficial Único: flfqjlrjnvkrstqsknxc
-- Host Oficial: flfqjlrjnvkrstqsknxc.supabase.co
-- Versão do Candidato: v4.0 (Canônica, Estática, Sem Execução)
-- Modo Operacional: 100% READ-ONLY. Proibida execução automática.
-- Baseline Base: P2.325.11 (Catálogo PostgreSQL Real Oficial)
-- 
-- Objeto Principal:
--   Criação de função canônica sem argumentos public.is_platform_admin()
--   com SET search_path = '', referências explicitamente qualificadas e uso interno de auth.uid().
--   Atualização atômica das 2 políticas RLS dependentes identificadas no baseline oficial:
--     1. public.platform_members -> platform_members_select_admin
--     2. public.audit_logs -> audit_logs_select_authorized (preservando IN (SELECT ...))
--
-- Restrições Mandatórias:
--   1. NÃO altera a função legada public.is_platform_admin(uuid) nem sua ACL ({postgres=X/postgres}).
--   2. NÃO concede privilégios à service_role na função legada.
--   3. NÃO tolera políticas adicionais ou permissivas não catalogadas.
--   4. NÃO substitui IN (SELECT ...) por EXISTS (...) em audit_logs_select_authorized.
--   5. Execução em transação única com fail-fast e verificações pré e pós-condição.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- SEÇÃO 1: PRÉ-CONDIÇÕES E VALIDAÇÕES ESTRITAS DE SEGURANÇA (FAIL-FAST)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_legacy_func_count        INTEGER;
    v_legacy_owner             TEXT;
    v_legacy_secdef            BOOLEAN;
    v_legacy_lang              TEXT;
    v_legacy_acl               TEXT;
    v_canonical_func_count     INTEGER;
    v_pm_rls_enabled           BOOLEAN;
    v_al_rls_enabled           BOOLEAN;
    v_pm_policy_count          INTEGER;
    v_al_policy_count          INTEGER;
    v_pm_pol_expr              TEXT;
    v_al_pol_expr              TEXT;
    v_roles_scope_col_exists   BOOLEAN;
BEGIN
    RAISE NOTICE '[P2.325.12-V4] Iniciando validações prévias contra o baseline oficial...';

    -- 1.1. Validar existência, propriedade e configuração da função legada (OID 17812)
    SELECT 
        COUNT(*),
        COALESCE(MAX(pg_catalog.pg_get_userbyid(p.proowner)), ''),
        COALESCE(BOOL_OR(p.prosecdef), false),
        COALESCE(MAX(l.lanname), ''),
        COALESCE(MAX(p.proacl::text), '')
    INTO 
        v_legacy_func_count,
        v_legacy_owner,
        v_legacy_secdef,
        v_legacy_lang,
        v_legacy_acl
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_catalog.pg_language l ON l.oid = p.prolang
    WHERE n.nspname = 'public'
      AND p.proname = 'is_platform_admin'
      AND p.pronargs = 1;

    IF v_legacy_func_count <> 1 THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.1]: Função legada public.is_platform_admin(uuid) ausente ou duplicada (encontradas: %). Abortando.', v_legacy_func_count;
    END IF;

    IF v_legacy_owner <> 'postgres' THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.1b]: Proprietário inesperado da função legada: % (esperado: postgres). Abortando.', v_legacy_owner;
    END IF;

    IF v_legacy_secdef IS NOT TRUE OR v_legacy_lang <> 'sql' THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.1c]: Atributos inesperados da função legada (secdef: %, lang: %). Abortando.', v_legacy_secdef, v_legacy_lang;
    END IF;

    IF v_legacy_acl <> '{postgres=X/postgres}' THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.1d]: ACL da função legada diverge do baseline: % (esperado: {postgres=X/postgres}). Abortando.', v_legacy_acl;
    END IF;

    -- 1.2. Validar ausência de função sem argumentos preexistente ou conflitante
    SELECT COUNT(*)
    INTO v_canonical_func_count
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'is_platform_admin'
      AND p.pronargs = 0;

    IF v_canonical_func_count > 0 THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.2]: Função public.is_platform_admin() sem argumentos já existe no catálogo. Abortando para evitar sobrescrita acidental.';
    END IF;

    -- 1.3. Validar estado de RLS das tabelas-alvo
    SELECT 
        COALESCE(BOOL_OR(CASE WHEN c.relname = 'platform_members' THEN c.relrowsecurity END), false),
        COALESCE(BOOL_OR(CASE WHEN c.relname = 'audit_logs' THEN c.relrowsecurity END), false)
    INTO 
        v_pm_rls_enabled,
        v_al_rls_enabled
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('platform_members', 'audit_logs');

    IF NOT v_pm_rls_enabled THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.3a]: RLS desabilitado na tabela public.platform_members. Abortando.';
    END IF;

    IF NOT v_al_rls_enabled THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.3b]: RLS desabilitado na tabela public.audit_logs. Abortando.';
    END IF;

    -- 1.4. Validar contagem estrita de políticas em public.platform_members
    SELECT 
        COUNT(*),
        COALESCE(MAX(CASE WHEN pol.polname = 'platform_members_select_admin' THEN pg_catalog.pg_get_expr(pol.polqual, pol.polrelid) END), '')
    INTO 
        v_pm_policy_count,
        v_pm_pol_expr
    FROM pg_catalog.pg_policy pol
    JOIN pg_catalog.pg_class c ON c.oid = pol.polrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'platform_members';

    IF v_pm_policy_count <> 1 THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.4a]: Contagem de políticas em platform_members inesperada (% encontradas, esperado exatamente 1: platform_members_select_admin). Abortando.', v_pm_policy_count;
    END IF;

    IF v_pm_pol_expr NOT LIKE '%is_platform_admin(auth.uid())%' THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.4b]: Expressão de platform_members_select_admin diverge do baseline: %. Abortando.', v_pm_pol_expr;
    END IF;

    -- 1.5. Validar contagem estrita e expressão IN (SELECT ...) de public.audit_logs
    SELECT 
        COUNT(*),
        COALESCE(MAX(CASE WHEN pol.polname = 'audit_logs_select_authorized' THEN pg_catalog.pg_get_expr(pol.polqual, pol.polrelid) END), '')
    INTO 
        v_al_policy_count,
        v_al_pol_expr
    FROM pg_catalog.pg_policy pol
    JOIN pg_catalog.pg_class c ON c.oid = pol.polrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'audit_logs';

    IF v_al_policy_count <> 1 THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.5a]: Contagem de políticas em audit_logs inesperada (% encontradas, esperado exatamente 1: audit_logs_select_authorized). Abortando.', v_al_policy_count;
    END IF;

    IF v_al_pol_expr NOT LIKE '%is_platform_admin(auth.uid())%' 
       OR v_al_pol_expr NOT LIKE '%organization_id%' 
       OR v_al_pol_expr NOT LIKE '%organization_members%' THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.5b]: Expressão de audit_logs_select_authorized diverge do baseline: %. Abortando.', v_al_pol_expr;
    END IF;

    -- 1.6. Validar existência da coluna scope_type em public.roles
    SELECT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_attribute a
        JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = 'roles'
          AND a.attname = 'scope_type'
          AND NOT a.attisdropped
    ) INTO v_roles_scope_col_exists;

    IF NOT v_roles_scope_col_exists THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.6]: Coluna scope_type ausente na tabela public.roles. Abortando.';
    END IF;

    RAISE NOTICE '[P2.325.12-V4] Todas as pré-condições do baseline foram verificadas e aprovadas com sucesso.';
END $$;

-- ------------------------------------------------------------------------------
-- SEÇÃO 2: CRIAÇÃO DA FUNÇÃO CANÔNICA public.is_platform_admin()
-- ------------------------------------------------------------------------------
-- Justificativa Técnica:
--   - Retorna BOOLEAN e opera como SECURITY DEFINER para consultar platform_members e roles
--     sem requerer privilégios diretos de SELECT para o usuário final nem disparar RLS recursivo.
--   - SET search_path = '' neutraliza riscos de CWE-426 (Hijacking de Esquema).
--   - Todos os objetos são explicitamente qualificados: public.platform_members, public.roles, auth.uid().
--   - Não aceita parâmetros externos: a identidade do solicitante é extraída do JWT via auth.uid().
-- ------------------------------------------------------------------------------
CREATE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.platform_members pm
        JOIN public.roles r
            ON r.code = pm.role
        WHERE pm.user_id = auth.uid()
          AND pm.is_active = true
          AND r.scope_type = 'platform'
          AND r.code = 'admin'
          AND r.is_active = true
    );
$function$;

-- Configuração de Governança e Privilégios Mínimos
ALTER FUNCTION public.is_platform_admin() OWNER TO postgres;
COMMENT ON FUNCTION public.is_platform_admin() IS 
    'Função canônica de autorização de administradores globais Classium (P2.325.12-v4). '
    'Utiliza auth.uid() internamente e SET search_path = "". Sem parâmetros externos.';

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- SEÇÃO 3: RECONFIGURAÇÃO ATÔMICA DAS POLÍTICAS RLS DO BASELINE
-- ------------------------------------------------------------------------------

-- 3.1. Atualizar política em public.platform_members
DROP POLICY IF EXISTS platform_members_select_admin ON public.platform_members;

CREATE POLICY platform_members_select_admin
    ON public.platform_members
    FOR SELECT
    TO authenticated
    USING (public.is_platform_admin());

COMMENT ON POLICY platform_members_select_admin ON public.platform_members IS
    'Permite que administradores globais autenticados visualizem membros da plataforma via função canônica (P2.325.12-v4).';

-- 3.2. Atualizar política em public.audit_logs
-- NOTA DE AUDITORIA: Preserva rigorosamente o padrão IN (SELECT ...) comprovado no baseline,
-- alterando única e exclusivamente a chamada de autorização global para public.is_platform_admin().
DROP POLICY IF EXISTS audit_logs_select_authorized ON public.audit_logs;

CREATE POLICY audit_logs_select_authorized
    ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (
        (
            public.is_platform_admin() 
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
    'Permite que administradores globais e gestores de organização visualizem logs autorizados (P2.325.12-v4). Preserva padrão IN (SELECT ...).';

-- ------------------------------------------------------------------------------
-- SEÇÃO 4: VERIFICAÇÃO PÓS-CONDIÇÃO E AUDITORIA DE INTEGRIDADE
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_new_func_exists     BOOLEAN;
    v_new_func_secdef     BOOLEAN;
    v_new_func_path       TEXT[];
    v_new_func_owner      TEXT;
    v_legacy_acl          TEXT;
    v_pm_pol_active       BOOLEAN;
    v_al_pol_active       BOOLEAN;
BEGIN
    RAISE NOTICE '[P2.325.12-V4] Validando estado do banco de dados pós-migração...';

    -- 4.1. Verificar se a nova função existe e possui as características de segurança exigidas
    SELECT 
        EXISTS(SELECT 1 FROM pg_catalog.pg_proc p WHERE p.proname = 'is_platform_admin' AND p.pronargs = 0),
        BOOL_OR(p.prosecdef),
        COALESCE(MAX(p.proconfig), ARRAY[]::TEXT[]),
        COALESCE(MAX(pg_catalog.pg_get_userbyid(p.proowner)), '')
    INTO 
        v_new_func_exists,
        v_new_func_secdef,
        v_new_func_path,
        v_new_func_owner
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'is_platform_admin'
      AND p.pronargs = 0;

    IF NOT v_new_func_exists THEN
        RAISE EXCEPTION 'POSTCONDITION_FAILED: Nova função public.is_platform_admin() não foi criada.';
    END IF;

    IF NOT v_new_func_secdef OR v_new_func_owner <> 'postgres' THEN
        RAISE EXCEPTION 'POSTCONDITION_FAILED: Nova função com owner ou secdef inconsistente (owner: %, secdef: %).', v_new_func_owner, v_new_func_secdef;
    END IF;

    IF NOT ('search_path=' = ANY(v_new_func_path)) AND NOT ('search_path=""' = ANY(v_new_func_path)) THEN
        RAISE EXCEPTION 'POSTCONDITION_FAILED: search_path da nova função não está restrito a vazio: %', v_new_func_path;
    END IF;

    -- 4.2. Garantir que a função legada permaneceu com ACL intacta
    SELECT COALESCE(MAX(p.proacl::text), '')
    INTO v_legacy_acl
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'is_platform_admin'
      AND p.pronargs = 1;

    IF v_legacy_acl <> '{postgres=X/postgres}' THEN
        RAISE EXCEPTION 'POSTCONDITION_FAILED: ACL da função legada foi acidentalmente alterada: % (esperado: {postgres=X/postgres}).', v_legacy_acl;
    END IF;

    -- 4.3. Verificar se ambas as políticas estão ativas e com os nomes corretos
    SELECT 
        EXISTS(
            SELECT 1 FROM pg_catalog.pg_policy pol
            JOIN pg_catalog.pg_class c ON c.oid = pol.polrelid
            WHERE c.relname = 'platform_members' AND pol.polname = 'platform_members_select_admin'
        ),
        EXISTS(
            SELECT 1 FROM pg_catalog.pg_policy pol
            JOIN pg_catalog.pg_class c ON c.oid = pol.polrelid
            WHERE c.relname = 'audit_logs' AND pol.polname = 'audit_logs_select_authorized'
        )
    INTO 
        v_pm_pol_active,
        v_al_pol_active;

    IF NOT v_pm_pol_active THEN
        RAISE EXCEPTION 'POSTCONDITION_FAILED: Política platform_members_select_admin não está ativa.';
    END IF;

    IF NOT v_al_pol_active THEN
        RAISE EXCEPTION 'POSTCONDITION_FAILED: Política audit_logs_select_authorized não está ativa.';
    END IF;

    RAISE NOTICE '[P2.325.12-V4] Todas as pós-condições foram verificadas e validadas com sucesso.';
END $$;

-- ------------------------------------------------------------------------------
-- SEÇÃO 5: NOTIFICAÇÃO E RECARGA DE SCHEMA DO POSTGREST
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

COMMIT;
