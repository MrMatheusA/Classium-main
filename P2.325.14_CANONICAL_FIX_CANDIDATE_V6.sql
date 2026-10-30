-- ==============================================================================
-- CLASSIUM GESTÃO EDUCACIONAL — ETAPA P2.325.14
-- CANDIDATO CORRETIVO DE AUTORIZAÇÃO V6 — REVISÃO ESTRITA INDEPENDENTE
-- ==============================================================================
-- Projeto Supabase Oficial Único: flfqjlrjnvkrstqsknxc
-- Host Oficial: flfqjlrjnvkrstqsknxc.supabase.co
-- Versão do Candidato: v6.0 (Revisão Estática Independente — 100% READ-ONLY)
-- Modo Operacional: Script candidato estático para revisão humana. Proibida execução automática.
--
-- Aperfeiçoamentos Estruturais em Relação à Versão v5 (P2.325.13):
--   1. Identificação inequívoca de tipos via to_regprocedure('public.is_platform_admin(uuid)').
--   2. Verificação de inexistência prévia via to_regprocedure('public.is_platform_admin()').
--   3. Resolução estrita de tabelas via to_regclass('public.platform_members') e to_regclass('public.audit_logs').
--   4. Sintaxe explícita em unnest: unnest(pol.polroles) AS role_items(role_oid) com tipagem estrita para pg_get_userbyid.
--   5. Avaliação de privilégios efetivos via has_function_privilege (authenticated, anon, service_role, public).
--   6. Validação estrutural normalizada das expressões das políticas (USING e ausência de WITH CHECK).
--   7. Preservação estrita da função legada com UUID e de sua ACL {postgres=X/postgres}.
--   8. Ressalva de governança: declaração explícita de que strings de projeto no cabeçalho não
--      garantem identidade do ambiente no motor do PostgreSQL (verificação mandatória do operador).
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- SEÇÃO 1: PRÉ-CONDIÇÕES E VALIDAÇÕES ESTRITAS DE BASELINE (FAIL-FAST)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_legacy_oid               OID;
    v_canonical_oid            OID;
    v_pm_class_oid             OID;
    v_al_class_oid             OID;
    v_roles_class_oid          OID;
    v_proc_rec                 RECORD;
    v_pm_rls_enabled           BOOLEAN;
    v_al_rls_enabled           BOOLEAN;
    v_pm_policy_count          INTEGER;
    v_al_policy_count          INTEGER;
    v_pm_pol_rec               RECORD;
    v_al_pol_rec               RECORD;
    v_roles_scope_col_exists   BOOLEAN;
    v_norm_pm_using            TEXT;
    v_norm_al_using            TEXT;
BEGIN
    RAISE NOTICE '[P2.325.14-V6] Iniciando validações estritas de pré-condição contra o catálogo oficial...';

    -- 1.1. Identificação inequívoca da função legada por assinatura de tipo
    v_legacy_oid := pg_catalog.to_regprocedure('public.is_platform_admin(uuid)');
    IF v_legacy_oid IS NULL THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.1a]: Função legada public.is_platform_admin(uuid) não foi encontrada via to_regprocedure. Abortando.';
    END IF;

    SELECT 
        p.oid,
        p.proname,
        pg_catalog.pg_get_function_identity_arguments(p.oid) AS identity_args,
        pg_catalog.pg_get_userbyid(p.proowner) AS owner_name,
        p.prosecdef,
        p.provolatile,
        l.lanname,
        p.proacl::text AS acl_text,
        p.proconfig
    INTO v_proc_rec
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_language l ON l.oid = p.prolang
    WHERE p.oid = v_legacy_oid;

    IF v_proc_rec.owner_name <> 'postgres' THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.1b]: Proprietário da função legada diverge do baseline: % (esperado: postgres).', v_proc_rec.owner_name;
    END IF;

    IF v_proc_rec.prosecdef IS NOT TRUE OR v_proc_rec.provolatile <> 's' OR v_proc_rec.lanname <> 'sql' THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.1c]: Atributos de segurança ou linguagem divergentes na função legada (secdef: %, provolatile: %, lang: %).',
            v_proc_rec.prosecdef, v_proc_rec.provolatile, v_proc_rec.lanname;
    END IF;

    IF v_proc_rec.acl_text <> '{postgres=X/postgres}' THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.1d]: ACL da função legada diverge do baseline: % (esperado: {postgres=X/postgres}).', v_proc_rec.acl_text;
    END IF;

    IF v_proc_rec.proconfig IS NULL OR NOT ('search_path=public, pg_temp' = ANY(v_proc_rec.proconfig)) THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.1e]: Configuração proconfig da função legada diverge do baseline: %', v_proc_rec.proconfig;
    END IF;

    -- Validar privilégios efetivos na função legada: apenas postgres deve ter EXECUTE
    IF pg_catalog.has_function_privilege('authenticated', v_legacy_oid, 'EXECUTE') THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.1f]: Papel authenticated possui EXECUTE indevido na função legada com UUID.';
    END IF;

    IF pg_catalog.has_function_privilege('anon', v_legacy_oid, 'EXECUTE') THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.1g]: Papel anon possui EXECUTE indevido na função legada com UUID.';
    END IF;

    IF pg_catalog.has_function_privilege('service_role', v_legacy_oid, 'EXECUTE') THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.1h]: Papel service_role possui EXECUTE indevido na função legada com UUID.';
    END IF;

    -- 1.2. Validar ausência de qualquer sobrecarga homônima sem argumentos
    v_canonical_oid := pg_catalog.to_regprocedure('public.is_platform_admin()');
    IF v_canonical_oid IS NOT NULL THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.2]: Função sem argumentos public.is_platform_admin() já existe no catálogo (OID: %). Abortando para evitar colisão.', v_canonical_oid;
    END IF;

    -- 1.3. Resolução inequívoca das tabelas e validação de RLS ativo
    v_pm_class_oid := pg_catalog.to_regclass('public.platform_members');
    IF v_pm_class_oid IS NULL THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.3a]: Tabela public.platform_members não encontrada via to_regclass.';
    END IF;

    v_al_class_oid := pg_catalog.to_regclass('public.audit_logs');
    IF v_al_class_oid IS NULL THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.3b]: Tabela public.audit_logs não encontrada via to_regclass.';
    END IF;

    SELECT c.relrowsecurity INTO v_pm_rls_enabled FROM pg_catalog.pg_class c WHERE c.oid = v_pm_class_oid;
    SELECT c.relrowsecurity INTO v_al_rls_enabled FROM pg_catalog.pg_class c WHERE c.oid = v_al_class_oid;

    IF NOT COALESCE(v_pm_rls_enabled, false) THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.3c]: RLS desabilitado na tabela public.platform_members.';
    END IF;

    IF NOT COALESCE(v_al_rls_enabled, false) THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.3d]: RLS desabilitado na tabela public.audit_logs.';
    END IF;

    -- 1.4. Validar política em public.platform_members (propriedades completas e exatas)
    SELECT COUNT(*) INTO v_pm_policy_count
    FROM pg_catalog.pg_policy pol
    WHERE pol.polrelid = v_pm_class_oid;

    IF v_pm_policy_count <> 1 THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.4a]: Contagem de políticas em platform_members inesperada: % (esperado exatamente 1: platform_members_select_admin).', v_pm_policy_count;
    END IF;

    SELECT 
        pol.polname,
        pol.polcmd,
        pol.polpermissive,
        ARRAY(
            SELECT pg_catalog.pg_get_userbyid(role_items.role_oid)
            FROM unnest(pol.polroles) AS role_items(role_oid)
        ) AS roles_list,
        pg_catalog.pg_get_expr(pol.polqual, pol.polrelid) AS using_expr,
        pol.polwithcheck
    INTO v_pm_pol_rec
    FROM pg_catalog.pg_policy pol
    WHERE pol.polrelid = v_pm_class_oid AND pol.polname = 'platform_members_select_admin';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.4b]: Política platform_members_select_admin não localizada em public.platform_members.';
    END IF;

    IF v_pm_pol_rec.polcmd <> 'r' OR NOT v_pm_pol_rec.polpermissive THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.4c]: Propriedades da política platform_members_select_admin divergentes (cmd: %, permissive: %).',
            v_pm_pol_rec.polcmd, v_pm_pol_rec.polpermissive;
    END IF;

    IF NOT ('authenticated' = ANY(v_pm_pol_rec.roles_list)) OR cardinality(v_pm_pol_rec.roles_list) <> 1 THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.4d]: Papéis da política platform_members_select_admin divergentes: % (esperado exatamente [authenticated]).',
            v_pm_pol_rec.roles_list;
    END IF;

    IF v_pm_pol_rec.polwithcheck IS NOT NULL THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.4e]: Cláusula WITH CHECK inesperada em política SELECT de platform_members.';
    END IF;

    v_norm_pm_using := regexp_replace(trim(v_pm_pol_rec.using_expr), '\s+', ' ', 'g');
    IF v_norm_pm_using NOT IN ('is_platform_admin(auth.uid())', 'public.is_platform_admin(auth.uid())') THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.4f]: Expressão USING de platform_members_select_admin diverge do baseline: %', v_norm_pm_using;
    END IF;

    -- 1.5. Validar política em public.audit_logs (propriedades completas e exatas)
    SELECT COUNT(*) INTO v_al_policy_count
    FROM pg_catalog.pg_policy pol
    WHERE pol.polrelid = v_al_class_oid;

    IF v_al_policy_count <> 1 THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.5a]: Contagem de políticas em audit_logs inesperada: % (esperado exatamente 1: audit_logs_select_authorized).', v_al_policy_count;
    END IF;

    SELECT 
        pol.polname,
        pol.polcmd,
        pol.polpermissive,
        ARRAY(
            SELECT pg_catalog.pg_get_userbyid(role_items.role_oid)
            FROM unnest(pol.polroles) AS role_items(role_oid)
        ) AS roles_list,
        pg_catalog.pg_get_expr(pol.polqual, pol.polrelid) AS using_expr,
        pol.polwithcheck
    INTO v_al_pol_rec
    FROM pg_catalog.pg_policy pol
    WHERE pol.polrelid = v_al_class_oid AND pol.polname = 'audit_logs_select_authorized';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.5b]: Política audit_logs_select_authorized não localizada em public.audit_logs.';
    END IF;

    IF v_al_pol_rec.polcmd <> 'r' OR NOT v_al_pol_rec.polpermissive THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.5c]: Propriedades da política audit_logs_select_authorized divergentes (cmd: %, permissive: %).',
            v_al_pol_rec.polcmd, v_al_pol_rec.polpermissive;
    END IF;

    IF NOT ('authenticated' = ANY(v_al_pol_rec.roles_list)) OR cardinality(v_al_pol_rec.roles_list) <> 1 THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.5d]: Papéis da política audit_logs_select_authorized divergentes: % (esperado exatamente [authenticated]).',
            v_al_pol_rec.roles_list;
    END IF;

    IF v_al_pol_rec.polwithcheck IS NOT NULL THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.5e]: Cláusula WITH CHECK inesperada em política SELECT de audit_logs.';
    END IF;

    v_norm_al_using := regexp_replace(trim(v_al_pol_rec.using_expr), '\s+', ' ', 'g');
    IF v_norm_al_using NOT LIKE '%is_platform_admin(auth.uid())%' 
       OR v_norm_al_using NOT LIKE '%organization_id IN%' 
       OR v_norm_al_using NOT LIKE '%organization_members%' THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.5f]: Expressão USING de audit_logs_select_authorized diverge do baseline: %', v_norm_al_using;
    END IF;

    -- 1.6. Validar existência e tipo da coluna scope_type em public.roles
    v_roles_class_oid := pg_catalog.to_regclass('public.roles');
    IF v_roles_class_oid IS NULL THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.6a]: Tabela public.roles não encontrada via to_regclass.';
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = v_roles_class_oid
          AND a.attname = 'scope_type'
          AND NOT a.attisdropped
    ) INTO v_roles_scope_col_exists;

    IF NOT v_roles_scope_col_exists THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.6b]: Coluna scope_type não encontrada na tabela public.roles.';
    END IF;

    RAISE NOTICE '[P2.325.14-V6] Todas as pré-condições de catálogo foram aprovadas com sucesso.';
END $$;

-- ------------------------------------------------------------------------------
-- SEÇÃO 2: CRIAÇÃO DA FUNÇÃO CANÔNICA public.is_platform_admin()
-- ------------------------------------------------------------------------------
-- Justificativa da Definição:
--   - Retorna BOOLEAN e opera como SECURITY DEFINER para consultar platform_members e roles
--     com privilégios de proprietário (postgres), evitando recursão RLS ou dependência de SELECT direto.
--   - SET search_path = '' elimina riscos de sequestro de caminho de busca (CWE-426).
--   - Todos os objetos são explicitamente qualificados: public.platform_members, public.roles, auth.uid().
--   - Não aceita parâmetros externos: a identidade do solicitante é obtida exclusivamente via auth.uid().
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

ALTER FUNCTION public.is_platform_admin() OWNER TO postgres;
COMMENT ON FUNCTION public.is_platform_admin() IS 
    'Função canônica de autorização de administrador global (P2.325.14-v6). '
    'Utiliza auth.uid() internamente e SET search_path = "". Sem parâmetros externos.';

-- ------------------------------------------------------------------------------
-- SEÇÃO 3: GOVERNANÇA E PRIVILÉGIOS MÍNIMOS
-- ------------------------------------------------------------------------------
-- Justificativa das Permissões:
--   1. PUBLIC, anon e service_role: Revogação explícita de todos os privilégios.
--      A service_role opera com BYPASSRLS e não necessita avaliar funções de RLS.
--   2. authenticated: Concessão estrita de EXECUTE, indispensável para que o PostgreSQL
--      avalie as políticas RLS durante as requisições de clientes logados via PostgREST.
-- ------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

-- ------------------------------------------------------------------------------
-- SEÇÃO 4: ATUALIZAÇÃO ATÔMICA DAS POLÍTICAS RLS DO BASELINE
-- ------------------------------------------------------------------------------

-- 4.1. Atualizar política em public.platform_members
DROP POLICY IF EXISTS platform_members_select_admin ON public.platform_members;

CREATE POLICY platform_members_select_admin
    ON public.platform_members
    FOR SELECT
    TO authenticated
    USING (public.is_platform_admin());

COMMENT ON POLICY platform_members_select_admin ON public.platform_members IS
    'Permite que administradores autenticados visualizem membros da plataforma via função canônica (P2.325.14-v6).';

-- 4.2. Atualizar política em public.audit_logs
-- NOTA TÉCNICA: Preserva integralmente o padrão IN (SELECT ...) comprovado no baseline,
-- alterando exclusivamente a chamada global para public.is_platform_admin().
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
    'Permite que administradores globais e gestores de organização visualizem logs autorizados (P2.325.14-v6). Preserva padrão IN (SELECT ...).';

-- ------------------------------------------------------------------------------
-- SEÇÃO 5: VALIDAÇÃO PÓS-CONDIÇÃO E AUDITORIA DE INTEGRIDADE
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_new_oid             OID;
    v_legacy_oid          OID;
    v_pm_class_oid        OID;
    v_al_class_oid        OID;
    v_new_rec             RECORD;
    v_legacy_acl          TEXT;
    v_pm_pol_active       BOOLEAN;
    v_al_pol_active       BOOLEAN;
    v_pm_new_using        TEXT;
    v_al_new_using        TEXT;
BEGIN
    RAISE NOTICE '[P2.325.14-V6] Executando validações pós-condição...';

    -- 5.1. Identificar e validar a nova função criada
    v_new_oid := pg_catalog.to_regprocedure('public.is_platform_admin()');
    IF v_new_oid IS NULL THEN
        RAISE EXCEPTION 'POSTCONDITION_FAILED [5.1a]: Nova função public.is_platform_admin() não foi localizada via to_regprocedure.';
    END IF;

    SELECT 
        p.oid,
        pg_catalog.pg_get_userbyid(p.proowner) AS owner_name,
        p.prosecdef,
        p.provolatile,
        p.proconfig,
        p.proacl::text AS acl_text
    INTO v_new_rec
    FROM pg_catalog.pg_proc p
    WHERE p.oid = v_new_oid;

    IF v_new_rec.owner_name <> 'postgres' OR v_new_rec.prosecdef IS NOT TRUE OR v_new_rec.provolatile <> 's' THEN
        RAISE EXCEPTION 'POSTCONDITION_FAILED [5.1b]: Atributos de segurança da nova função incorretos (owner: %, secdef: %, provolatile: %).',
            v_new_rec.owner_name, v_new_rec.prosecdef, v_new_rec.provolatile;
    END IF;

    IF v_new_rec.proconfig IS NULL OR NOT (('search_path=' = ANY(v_new_rec.proconfig)) OR ('search_path=""' = ANY(v_new_rec.proconfig))) THEN
        RAISE EXCEPTION 'POSTCONDITION_FAILED [5.1c]: Configuração search_path da nova função não está vazia: %', v_new_rec.proconfig;
    END IF;

    -- Validar privilégios efetivos na nova função
    IF NOT pg_catalog.has_function_privilege('authenticated', v_new_oid, 'EXECUTE') THEN
        RAISE EXCEPTION 'POSTCONDITION_FAILED [5.1d]: Privilégio EXECUTE não está efetivo para authenticated na nova função.';
    END IF;

    IF pg_catalog.has_function_privilege('anon', v_new_oid, 'EXECUTE') THEN
        RAISE EXCEPTION 'POSTCONDITION_FAILED [5.1e]: Papel anon possui privilégio EXECUTE indevido na nova função.';
    END IF;

    IF pg_catalog.has_function_privilege('service_role', v_new_oid, 'EXECUTE') THEN
        RAISE EXCEPTION 'POSTCONDITION_FAILED [5.1f]: Papel service_role possui privilégio EXECUTE indevido na nova função.';
    END IF;

    -- 5.2. Confirmar que a função legada permaneceu com ACL intacta
    v_legacy_oid := pg_catalog.to_regprocedure('public.is_platform_admin(uuid)');
    SELECT p.proacl::text INTO v_legacy_acl FROM pg_catalog.pg_proc p WHERE p.oid = v_legacy_oid;

    IF v_legacy_acl <> '{postgres=X/postgres}' THEN
        RAISE EXCEPTION 'POSTCONDITION_FAILED [5.2]: ACL da função legada foi acidentalmente alterada: % (esperado: {postgres=X/postgres}).', v_legacy_acl;
    END IF;

    -- 5.3. Confirmar que ambas as políticas estão ativas e com as expressões atualizadas
    v_pm_class_oid := pg_catalog.to_regclass('public.platform_members');
    v_al_class_oid := pg_catalog.to_regclass('public.audit_logs');

    SELECT 
        EXISTS(SELECT 1 FROM pg_catalog.pg_policy WHERE polrelid = v_pm_class_oid AND polname = 'platform_members_select_admin'),
        EXISTS(SELECT 1 FROM pg_catalog.pg_policy WHERE polrelid = v_al_class_oid AND polname = 'audit_logs_select_authorized')
    INTO 
        v_pm_pol_active,
        v_al_pol_active;

    IF NOT v_pm_pol_active THEN
        RAISE EXCEPTION 'POSTCONDITION_FAILED [5.3a]: Política platform_members_select_admin inativa pós-migração.';
    END IF;

    IF NOT v_al_pol_active THEN
        RAISE EXCEPTION 'POSTCONDITION_FAILED [5.3b]: Política audit_logs_select_authorized inativa pós-migração.';
    END IF;

    SELECT pg_catalog.pg_get_expr(polqual, polrelid) INTO v_pm_new_using
    FROM pg_catalog.pg_policy WHERE polrelid = v_pm_class_oid AND polname = 'platform_members_select_admin';

    SELECT pg_catalog.pg_get_expr(polqual, polrelid) INTO v_al_new_using
    FROM pg_catalog.pg_policy WHERE polrelid = v_al_class_oid AND polname = 'audit_logs_select_authorized';

    IF v_pm_new_using NOT LIKE '%is_platform_admin()%' THEN
        RAISE EXCEPTION 'POSTCONDITION_FAILED [5.3c]: Expressão de platform_members_select_admin não faz referência à função sem argumentos: %', v_pm_new_using;
    END IF;

    IF v_al_new_using NOT LIKE '%is_platform_admin()%' OR v_al_new_using NOT LIKE '%organization_id IN%' THEN
        RAISE EXCEPTION 'POSTCONDITION_FAILED [5.3d]: Expressão de audit_logs_select_authorized não atualizada corretamente: %', v_al_new_using;
    END IF;

    RAISE NOTICE '[P2.325.14-V6] Todas as pós-condições foram validadas com 100%% de sucesso.';
END $$;

-- ------------------------------------------------------------------------------
-- SEÇÃO 6: NOTIFICAÇÃO E RECARGA DE SCHEMA DO POSTGREST
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

COMMIT;
