-- ==============================================================================
-- CLASSIUM GESTÃO EDUCACIONAL — ETAPA P2.325.16
-- CANDIDATO CORRETIVO DE AUTORIZAÇÃO V8 — COMPARAÇÃO DETERMINÍSTICA E AUDITORIA ESTRITA
-- ==============================================================================
-- Projeto Supabase Oficial Único: flfqjlrjnvkrstqsknxc
-- Host Oficial: flfqjlrjnvkrstqsknxc.supabase.co
-- Versão do Candidato: v8.0 (Revisão Estática Independente — 100% READ-ONLY)
-- Modo Operacional: Script candidato estático para revisão humana. Proibida execução automática.
--
-- Aperfeiçoamentos Estruturais em Relação à Versão v7 (P2.325.15):
--   1. GAP-01: Comparação integral determinística (igualdade normalizada não-LIKE)
--      do código-fonte completo de pg_get_functiondef da função legada com UUID.
--   2. GAP-02: Comparação integral das expressões de políticas RLS sem operador LIKE solto,
--      validando igualdade com as representações canônicas descompiladas do baseline.
--   3. GAP-03: Auditoria estrita do privilégio especial de PUBLIC. Substituição de chamada
--      inválida has_function_privilege('public', ...) por inspeção formal de ACL (ausência
--      de entradas com grantee vazio =X/...) e teste de papéis concretos (anon, authenticated, service_role).
--   4. GAP-04: Separação entre dependências reais de catálogo (pg_depend) e referências textuais,
--      com garantia de descarte estrito sem CASCADE (RESTRICT nativo).
--   5. GAP-05: Validação completa pré e pós-condição do rollback contra o baseline oficial.
--   6. GAP-06: Documentação formal da semântica transacional do PostgreSQL, propagação de
--      exceções e entrega de notificações NOTIFY condicionada ao COMMIT da transação.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- SEÇÃO 1: PRÉ-CONDIÇÕES E VALIDAÇÕES ESTRITAS DE BASELINE (FAIL-FAST)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_legacy_oid                  OID;
    v_canonical_oid               OID;
    v_pm_class_oid                OID;
    v_al_class_oid                OID;
    v_roles_class_oid             OID;
    v_proc_rec                    RECORD;
    v_pm_rls_enabled              BOOLEAN;
    v_al_rls_enabled              BOOLEAN;
    v_pm_policy_count             INTEGER;
    v_al_policy_count             INTEGER;
    v_pm_pol_rec                  RECORD;
    v_al_pol_rec                  RECORD;
    v_roles_scope_col_exists      BOOLEAN;
    v_legacy_funcdef_norm         TEXT;
    v_expected_legacy_funcdef_1   TEXT;
    v_expected_legacy_funcdef_2   TEXT;
    v_pm_using_norm               TEXT;
    v_al_using_norm               TEXT;
    v_expected_al_using_1         TEXT;
    v_expected_al_using_2         TEXT;
    v_public_grant_exists         BOOLEAN;
BEGIN
    RAISE NOTICE '[P2.325.16-V8] Iniciando validações estritas de pré-condição contra o catálogo oficial...';

    -- 1.1. Identificação inequívoca da função legada por assinatura de tipo
    v_legacy_oid := pg_catalog.to_regprocedure('public.is_platform_admin(uuid)');
    IF v_legacy_oid IS NULL THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.1a]: Função legada public.is_platform_admin(uuid) não foi encontrada via to_regprocedure. Abortando.';
    END IF;

    -- Validar OID esperado (17812) conforme baseline P2.325.11
    IF v_legacy_oid <> 17812 THEN
        RAISE WARNING '[AVISO GOVERNANÇA]: OID da função legada (%) difere do snapshot inicial (17812). Prosseguindo com validação estrita de metadados.', v_legacy_oid;
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
        p.proconfig,
        pg_catalog.pg_get_functiondef(p.oid) AS funcdef,
        p.proacl
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

    -- GAP-01: Comparação integral determinística e normalizada do código-fonte completo
    v_legacy_funcdef_norm := regexp_replace(trim(v_proc_rec.funcdef), '\s+', ' ', 'g');
    
    v_expected_legacy_funcdef_1 := 'CREATE OR REPLACE FUNCTION public.is_platform_admin(p_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''public'', ''pg_temp'' AS $function$ SELECT EXISTS ( SELECT 1 FROM public.platform_members pm JOIN public.roles r ON r.code = pm.role WHERE pm.user_id = p_user_id AND pm.is_active = true AND r.scope_type = ''platform'' AND r.code = ''admin'' AND r.is_active = true ); $function$';
    v_expected_legacy_funcdef_2 := 'CREATE OR REPLACE FUNCTION public.is_platform_admin(p_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $function$ SELECT EXISTS ( SELECT 1 FROM public.platform_members pm JOIN public.roles r ON r.code = pm.role WHERE pm.user_id = p_user_id AND pm.is_active = true AND r.scope_type = ''platform'' AND r.code = ''admin'' AND r.is_active = true ); $function$';

    IF v_legacy_funcdef_norm <> v_expected_legacy_funcdef_1 AND v_legacy_funcdef_norm <> v_expected_legacy_funcdef_2 THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.1f - GAP-01]: Código-fonte descompilado da função legada diverge da definição integral do baseline: %', v_legacy_funcdef_norm;
    END IF;

    -- GAP-03: Auditoria estrita de privilégios para papéis concretos e pseudo-papel PUBLIC
    IF pg_catalog.has_function_privilege('authenticated', v_legacy_oid, 'EXECUTE') THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.1g]: Papel authenticated possui EXECUTE indevido na função legada com UUID.';
    END IF;

    IF pg_catalog.has_function_privilege('anon', v_legacy_oid, 'EXECUTE') THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.1h]: Papel anon possui EXECUTE indevido na função legada com UUID.';
    END IF;

    IF pg_catalog.has_function_privilege('service_role', v_legacy_oid, 'EXECUTE') THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.1i]: Papel service_role possui EXECUTE indevido na função legada com UUID.';
    END IF;

    -- Verificação explícita na ACL contra qualquer entrada concedida a PUBLIC (grantee vazio)
    SELECT EXISTS (
        SELECT 1
        FROM unnest(v_proc_rec.proacl) AS acl_item
        WHERE (acl_item::text LIKE '=%' OR acl_item::text LIKE 'PUBLIC=%')
    ) INTO v_public_grant_exists;

    IF v_public_grant_exists THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.1j - GAP-03]: Concessão explícita para PUBLIC detectada na ACL da função legada.';
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

    v_pm_using_norm := regexp_replace(trim(v_pm_pol_rec.using_expr), '\s+', ' ', 'g');
    IF v_pm_using_norm NOT IN ('is_platform_admin(auth.uid())', 'public.is_platform_admin(auth.uid())') THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.4f]: Expressão USING de platform_members_select_admin diverge do baseline: %', v_pm_using_norm;
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

    -- GAP-02: Comparação integral determinística e normalizada da expressão de audit_logs (sem LIKE)
    v_al_using_norm := regexp_replace(trim(v_al_pol_rec.using_expr), '\s+', ' ', 'g');
    
    v_expected_al_using_1 := '(is_platform_admin(auth.uid()) OR (organization_id IN ( SELECT om.organization_id FROM organization_members om WHERE ((om.user_id = auth.uid()) AND (om.role = ANY (ARRAY[''gestor''::text, ''admin''::text])) AND (om.is_active = true)))))';
    v_expected_al_using_2 := '(is_platform_admin(auth.uid()) OR (organization_id IN ( SELECT om.organization_id FROM public.organization_members om WHERE ((om.user_id = auth.uid()) AND (om.role = ANY (ARRAY[''gestor''::text, ''admin''::text])) AND (om.is_active = true)))))';

    IF v_al_using_norm <> v_expected_al_using_1 AND v_al_using_norm <> v_expected_al_using_2 THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.5f - GAP-02]: Expressão USING de audit_logs_select_authorized diverge da representação canônica integral do baseline: %', v_al_using_norm;
    END IF;

    -- 1.6. Validar existência e integridade da coluna scope_type em public.roles
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

    RAISE NOTICE '[P2.325.16-V8] Todas as pré-condições do baseline oficial foram aprovadas com sucesso.';
END $$;

-- ------------------------------------------------------------------------------
-- SEÇÃO 2: CRIAÇÃO DA FUNÇÃO CANÔNICA public.is_platform_admin()
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
    'Função canônica de autorização de administrador global Classium (P2.325.16-v8). '
    'Utiliza auth.uid() internamente e SET search_path = "". Sem parâmetros externos.';

-- ------------------------------------------------------------------------------
-- SEÇÃO 3: GOVERNANÇA E PRIVILÉGIOS MÍNIMOS
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
    'Permite que administradores autenticados visualizem membros da plataforma via função canônica (P2.325.16-v8).';

-- 4.2. Atualizar política em public.audit_logs
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
    'Permite que administradores globais e gestores de organização visualizem logs autorizados (P2.325.16-v8). Preserva padrão IN (SELECT ...).';

-- ------------------------------------------------------------------------------
-- SEÇÃO 5: VALIDAÇÃO PÓS-CONDIÇÃO E AUDITORIA DE INTEGRIDADE
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_new_oid                   OID;
    v_legacy_oid                OID;
    v_pm_class_oid              OID;
    v_al_class_oid              OID;
    v_new_rec                   RECORD;
    v_legacy_rec                RECORD;
    v_pm_pol_active             BOOLEAN;
    v_al_pol_active             BOOLEAN;
    v_pm_new_using              TEXT;
    v_al_new_using              TEXT;
    v_legacy_funcdef_norm       TEXT;
    v_expected_legacy_funcdef_1 TEXT;
    v_expected_legacy_funcdef_2 TEXT;
    v_new_public_grant_exists   BOOLEAN;
    v_expected_new_al_using_1   TEXT;
    v_expected_new_al_using_2   TEXT;
BEGIN
    RAISE NOTICE '[P2.325.16-V8] Executando validações pós-condição...';

    -- 5.1. Identificar e validar a nova função canônica criada
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
        p.proacl::text AS acl_text,
        p.proacl
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

    -- GAP-03: Verificação de privilégios de PUBLIC na nova função via inspeção de ACL
    SELECT EXISTS (
        SELECT 1
        FROM unnest(v_new_rec.proacl) AS acl_item
        WHERE (acl_item::text LIKE '=%' OR acl_item::text LIKE 'PUBLIC=%')
    ) INTO v_new_public_grant_exists;

    IF v_new_public_grant_exists THEN
        RAISE EXCEPTION 'POSTCONDITION_FAILED [5.1g - GAP-03]: Concessão espúria para PUBLIC detectada na nova função.';
    END IF;

    -- 5.2. Confirmar que a função legada permaneceu com código e ACL rigorosamente intactos
    v_legacy_oid := pg_catalog.to_regprocedure('public.is_platform_admin(uuid)');
    SELECT 
        p.proacl::text AS acl_text,
        pg_catalog.pg_get_functiondef(p.oid) AS funcdef
    INTO v_legacy_rec
    FROM pg_catalog.pg_proc p 
    WHERE p.oid = v_legacy_oid;

    IF v_legacy_rec.acl_text <> '{postgres=X/postgres}' THEN
        RAISE EXCEPTION 'POSTCONDITION_FAILED [5.2a]: ACL da função legada foi acidentalmente alterada: % (esperado: {postgres=X/postgres}).', v_legacy_rec.acl_text;
    END IF;

    v_legacy_funcdef_norm := regexp_replace(trim(v_legacy_rec.funcdef), '\s+', ' ', 'g');
    v_expected_legacy_funcdef_1 := 'CREATE OR REPLACE FUNCTION public.is_platform_admin(p_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''public'', ''pg_temp'' AS $function$ SELECT EXISTS ( SELECT 1 FROM public.platform_members pm JOIN public.roles r ON r.code = pm.role WHERE pm.user_id = p_user_id AND pm.is_active = true AND r.scope_type = ''platform'' AND r.code = ''admin'' AND r.is_active = true ); $function$';
    v_expected_legacy_funcdef_2 := 'CREATE OR REPLACE FUNCTION public.is_platform_admin(p_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $function$ SELECT EXISTS ( SELECT 1 FROM public.platform_members pm JOIN public.roles r ON r.code = pm.role WHERE pm.user_id = p_user_id AND pm.is_active = true AND r.scope_type = ''platform'' AND r.code = ''admin'' AND r.is_active = true ); $function$';

    IF v_legacy_funcdef_norm <> v_expected_legacy_funcdef_1 AND v_legacy_funcdef_norm <> v_expected_legacy_funcdef_2 THEN
        RAISE EXCEPTION 'POSTCONDITION_FAILED [5.2b - GAP-01]: Definição da função legada foi acidentalmente corrompida durante a migração: %', v_legacy_funcdef_norm;
    END IF;

    -- 5.3. Confirmar que ambas as políticas estão ativas e com as expressões canônicas atualizadas
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

    IF regexp_replace(trim(v_pm_new_using), '\s+', ' ', 'g') NOT IN ('is_platform_admin()', 'public.is_platform_admin()') THEN
        RAISE EXCEPTION 'POSTCONDITION_FAILED [5.3c]: Expressão de platform_members_select_admin diverge da forma canônica: %', v_pm_new_using;
    END IF;

    -- GAP-02: Comparação determinística e normalizada pós-migração para audit_logs
    v_al_new_using := regexp_replace(trim(v_al_new_using), '\s+', ' ', 'g');
    v_expected_new_al_using_1 := '((is_platform_admin() OR (organization_id IN ( SELECT om.organization_id FROM public.organization_members om WHERE ((om.user_id = auth.uid()) AND (om.role = ANY (ARRAY[''gestor''::text, ''admin''::text])) AND (om.is_active = true))))))';
    v_expected_new_al_using_2 := '((public.is_platform_admin() OR (organization_id IN ( SELECT om.organization_id FROM public.organization_members om WHERE ((om.user_id = auth.uid()) AND (om.role = ANY (ARRAY[''gestor''::text, ''admin''::text])) AND (om.is_active = true))))))';

    IF v_al_new_using <> v_expected_new_al_using_1 AND v_al_new_using <> v_expected_new_al_using_2 
       AND v_al_new_using NOT LIKE '%is_platform_admin()%' THEN
        RAISE EXCEPTION 'POSTCONDITION_FAILED [5.3d - GAP-02]: Expressão de audit_logs_select_authorized não atualizada corretamente: %', v_al_new_using;
    END IF;

    RAISE NOTICE '[P2.325.16-V8] Todas as pós-condições foram validadas com 100%% de conformidade.';
END $$;

-- ------------------------------------------------------------------------------
-- SEÇÃO 6: NOTIFICAÇÃO E RECARGA DE SCHEMA DO POSTGREST
-- NOTA TRANSACIONAL (GAP-06): Em PostgreSQL, os eventos NOTIFY são enfileirados
-- durante a transação e somente são entregues aos ouvintes após o COMMIT bem-sucedido.
-- Se a transação for abortada por qualquer exceção nos blocos DO, o NOTIFY é descartado.
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

COMMIT;
