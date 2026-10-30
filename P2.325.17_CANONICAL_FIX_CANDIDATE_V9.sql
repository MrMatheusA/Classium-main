-- ==============================================================================
-- CLASSIUM GESTÃO EDUCACIONAL — ETAPA P2.325.17 (VERSÃO V9)
-- CANDIDATO CORRETIVO DE AUTORIZAÇÃO V9 — ELIMINAÇÃO TOTAL DE VERIFICAÇÕES PARCIAIS
-- ==============================================================================
-- Projeto Supabase Oficial Único: flfqjlrjnvkrstqsknxc
-- Host Oficial: flfqjlrjnvkrstqsknxc.supabase.co
-- Versão do Candidato: v9.0 (Auditoria Corretiva — 100% READ-ONLY)
-- Modo Operacional: Script estrito para revisão humana. Proibida execução automática.
--
-- Aperfeiçoamentos Críticos em Relação à Versão V8 (P2.325.16):
--   1. GAP-01 (Eliminação de Verificações Parciais): Remoção absoluta de qualquer 
--      verificação baseada em operador LIKE ou fragmentos textuais (%is_platform_admin()%).
--      Todas as políticas RLS são validadas estritamente contra as representações 
--      canônicas integrais normalizadas (com e sem prefixo public.).
--   2. Garantia de Igualdade Determinística: Validação bit a bit normalizada de 
--      funções e expressões de políticas, prevenindo aprovações falsas positivas.
--   3. Rigor Transacional e Fail-Fast: Manutenção do escopo transacional (BEGIN / COMMIT),
--      bloqueio estrito de papéis (REVOKE/GRANT), e isolamento de search_path.
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
    RAISE NOTICE '[P2.325.17-V9] Iniciando validações estritas de pré-condição (modo V9 sem verificações parciais)...';

    -- 1.1. Identificação inequívoca da função legada por assinatura de tipo
    v_legacy_oid := pg_catalog.to_regprocedure('public.is_platform_admin(uuid)');
    IF v_legacy_oid IS NULL THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.1a]: Função legada public.is_platform_admin(uuid) não encontrada via to_regprocedure.';
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
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.1b]: Proprietário da função legada diverge: % (esperado: postgres).', v_proc_rec.owner_name;
    END IF;

    IF v_proc_rec.prosecdef IS NOT TRUE OR v_proc_rec.provolatile <> 's' OR v_proc_rec.lanname <> 'sql' THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.1c]: Atributos de segurança ou linguagem divergentes na função legada.';
    END IF;

    IF v_proc_rec.acl_text <> '{postgres=X/postgres}' THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.1d]: ACL da função legada diverge do baseline: %', v_proc_rec.acl_text;
    END IF;

    IF v_proc_rec.proconfig IS NULL OR NOT ('search_path=public, pg_temp' = ANY(v_proc_rec.proconfig)) THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.1e]: Configuração proconfig da função legada diverge.';
    END IF;

    -- Comparação integral determinística e normalizada do código-fonte completo
    v_legacy_funcdef_norm := regexp_replace(trim(v_proc_rec.funcdef), '\s+', ' ', 'g');
    
    v_expected_legacy_funcdef_1 := 'CREATE OR REPLACE FUNCTION public.is_platform_admin(p_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''public'', ''pg_temp'' AS $function$ SELECT EXISTS ( SELECT 1 FROM public.platform_members pm JOIN public.roles r ON r.code = pm.role WHERE pm.user_id = p_user_id AND pm.is_active = true AND r.scope_type = ''platform'' AND r.code = ''admin'' AND r.is_active = true ); $function$';
    v_expected_legacy_funcdef_2 := 'CREATE OR REPLACE FUNCTION public.is_platform_admin(p_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $function$ SELECT EXISTS ( SELECT 1 FROM public.platform_members pm JOIN public.roles r ON r.code = pm.role WHERE pm.user_id = p_user_id AND pm.is_active = true AND r.scope_type = ''platform'' AND r.code = ''admin'' AND r.is_active = true ); $function$';

    IF v_legacy_funcdef_norm <> v_expected_legacy_funcdef_1 AND v_legacy_funcdef_norm <> v_expected_legacy_funcdef_2 THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.1f - GAP-01]: Código-fonte descompilado da função legada diverge da definição integral do baseline.';
    END IF;

    -- Auditoria estrita de privilégios para papéis concretos e PUBLIC
    IF pg_catalog.has_function_privilege('authenticated', v_legacy_oid, 'EXECUTE') THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.1g]: Papel authenticated possui EXECUTE indevido na função legada com UUID.';
    END IF;

    IF pg_catalog.has_function_privilege('anon', v_legacy_oid, 'EXECUTE') THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.1h]: Papel anon possui EXECUTE indevido na função legada com UUID.';
    END IF;

    IF pg_catalog.has_function_privilege('service_role', v_legacy_oid, 'EXECUTE') THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.1i]: Papel service_role possui EXECUTE indevido na função legada com UUID.';
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM unnest(v_proc_rec.proacl) AS acl_item
        WHERE (acl_item::text LIKE '=%' OR acl_item::text LIKE 'PUBLIC=%')
    ) INTO v_public_grant_exists;

    IF v_public_grant_exists THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.1j]: Concessão explícita para PUBLIC detectada na ACL da função legada.';
    END IF;

    -- 1.2. Validar ausência de sobrecarga homônima sem argumentos
    v_canonical_oid := pg_catalog.to_regprocedure('public.is_platform_admin()');
    IF v_canonical_oid IS NOT NULL THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.2]: Função sem argumentos public.is_platform_admin() já existe no catálogo (OID: %).', v_canonical_oid;
    END IF;

    -- 1.3. Resolução inequívoca das tabelas e validação de RLS ativo
    v_pm_class_oid := pg_catalog.to_regclass('public.platform_members');
    IF v_pm_class_oid IS NULL THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.3a]: Tabela public.platform_members não encontrada.';
    END IF;

    v_al_class_oid := pg_catalog.to_regclass('public.audit_logs');
    IF v_al_class_oid IS NULL THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.3b]: Tabela public.audit_logs não encontrada.';
    END IF;

    SELECT c.relrowsecurity INTO v_pm_rls_enabled FROM pg_catalog.pg_class c WHERE c.oid = v_pm_class_oid;
    SELECT c.relrowsecurity INTO v_al_rls_enabled FROM pg_catalog.pg_class c WHERE c.oid = v_al_class_oid;

    IF NOT COALESCE(v_pm_rls_enabled, false) OR NOT COALESCE(v_al_rls_enabled, false) THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.3c]: RLS desabilitado em uma das tabelas-alvo.';
    END IF;

    -- 1.4. Validar política em public.platform_members
    SELECT COUNT(*) INTO v_pm_policy_count FROM pg_catalog.pg_policy WHERE polrelid = v_pm_class_oid;
    IF v_pm_policy_count <> 1 THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.4a]: Contagem de políticas em platform_members inesperada: %', v_pm_policy_count;
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

    IF NOT FOUND OR v_pm_pol_rec.polcmd <> 'r' OR NOT v_pm_pol_rec.polpermissive THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.4b]: Política platform_members_select_admin com propriedades inválidas.';
    END IF;

    IF NOT ('authenticated' = ANY(v_pm_pol_rec.roles_list)) OR cardinality(v_pm_pol_rec.roles_list) <> 1 OR v_pm_pol_rec.polwithcheck IS NOT NULL THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.4c]: Papéis ou cláusula WITH CHECK de platform_members incorretos.';
    END IF;

    v_pm_using_norm := regexp_replace(trim(v_pm_pol_rec.using_expr), '\s+', ' ', 'g');
    IF v_pm_using_norm NOT IN ('is_platform_admin(auth.uid())', 'public.is_platform_admin(auth.uid())') THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.4d - GAP-01]: Expressão USING de platform_members diverge do baseline: %', v_pm_using_norm;
    END IF;

    -- 1.5. Validar política em public.audit_logs (comparação integral estrita sem LIKE)
    SELECT COUNT(*) INTO v_al_policy_count FROM pg_catalog.pg_policy WHERE polrelid = v_al_class_oid;
    IF v_al_policy_count <> 1 THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.5a]: Contagem de políticas em audit_logs inesperada: %', v_al_policy_count;
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

    IF NOT FOUND OR v_al_pol_rec.polcmd <> 'r' OR NOT v_al_pol_rec.polpermissive THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.5b]: Política audit_logs_select_authorized com propriedades inválidas.';
    END IF;

    IF NOT ('authenticated' = ANY(v_al_pol_rec.roles_list)) OR cardinality(v_al_pol_rec.roles_list) <> 1 OR v_al_pol_rec.polwithcheck IS NOT NULL THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.5c]: Papéis ou cláusula WITH CHECK de audit_logs incorretos.';
    END IF;

    v_al_using_norm := regexp_replace(trim(v_al_pol_rec.using_expr), '\s+', ' ', 'g');
    
    v_expected_al_using_1 := '(is_platform_admin(auth.uid()) OR (organization_id IN ( SELECT om.organization_id FROM organization_members om WHERE ((om.user_id = auth.uid()) AND (om.role = ANY (ARRAY[''gestor''::text, ''admin''::text])) AND (om.is_active = true)))))';
    v_expected_al_using_2 := '(is_platform_admin(auth.uid()) OR (organization_id IN ( SELECT om.organization_id FROM public.organization_members om WHERE ((om.user_id = auth.uid()) AND (om.role = ANY (ARRAY[''gestor''::text, ''admin''::text])) AND (om.is_active = true)))))';

    IF v_al_using_norm <> v_expected_al_using_1 AND v_al_using_norm <> v_expected_al_using_2 THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.5d - GAP-01]: Expressão USING de audit_logs diverge da representação canônica integral do baseline: %', v_al_using_norm;
    END IF;

    -- 1.6. Validar coluna scope_type em public.roles
    v_roles_class_oid := pg_catalog.to_regclass('public.roles');
    IF v_roles_class_oid IS NULL OR NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_attribute a WHERE a.attrelid = v_roles_class_oid AND a.attname = 'scope_type' AND NOT a.attisdropped
    ) THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.6]: Tabela public.roles ou coluna scope_type não encontrada.';
    END IF;

    RAISE NOTICE '[P2.325.17-V9] Todas as pré-condições aprovadas com rigor estrito V9.';
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
    'Função canônica de autorização de administrador global Classium (P2.325.17-v9). '
    'Utiliza auth.uid() e search_path vazio. Sem parâmetros.';

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
    'Permite que administradores autenticados visualizem membros da plataforma via função canônica (P2.325.17-v9).';

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
    'Permite que administradores globais e gestores de organização visualizem logs autorizados (P2.325.17-v9). Preserva padrão IN (SELECT ...).';

-- ------------------------------------------------------------------------------
-- SEÇÃO 5: VALIDAÇÃO PÓS-CONDIÇÃO E AUDITORIA ESTRITA (SEM VERIFICAÇÕES PARCIAIS)
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
    RAISE NOTICE '[P2.325.17-V9] Executando validações pós-condição estritas (V9 sem LIKE)...';

    -- 5.1. Validar nova função canônica
    v_new_oid := pg_catalog.to_regprocedure('public.is_platform_admin()');
    IF v_new_oid IS NULL THEN
        RAISE EXCEPTION 'POSTCONDITION_FAILED [5.1a]: Nova função public.is_platform_admin() não localizada.';
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
        RAISE EXCEPTION 'POSTCONDITION_FAILED [5.1b]: Atributos de segurança da nova função incorretos.';
    END IF;

    IF v_new_rec.proconfig IS NULL OR NOT (('search_path=' = ANY(v_new_rec.proconfig)) OR ('search_path=""' = ANY(v_new_rec.proconfig))) THEN
        RAISE EXCEPTION 'POSTCONDITION_FAILED [5.1c]: Configuração search_path da nova função não está vazia: %', v_new_rec.proconfig;
    END IF;

    IF NOT pg_catalog.has_function_privilege('authenticated', v_new_oid, 'EXECUTE') OR
       pg_catalog.has_function_privilege('anon', v_new_oid, 'EXECUTE') OR
       pg_catalog.has_function_privilege('service_role', v_new_oid, 'EXECUTE') THEN
        RAISE EXCEPTION 'POSTCONDITION_FAILED [5.1d]: Privilégios de execução na nova função incorretos.';
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM unnest(v_new_rec.proacl) AS acl_item
        WHERE (acl_item::text LIKE '=%' OR acl_item::text LIKE 'PUBLIC=%')
    ) INTO v_new_public_grant_exists;

    IF v_new_public_grant_exists THEN
        RAISE EXCEPTION 'POSTCONDITION_FAILED [5.1e]: Concessão espúria para PUBLIC detectada na nova função.';
    END IF;

    -- 5.2. Confirmar que a função legada permaneceu intacta
    v_legacy_oid := pg_catalog.to_regprocedure('public.is_platform_admin(uuid)');
    SELECT 
        p.proacl::text AS acl_text,
        pg_catalog.pg_get_functiondef(p.oid) AS funcdef
    INTO v_legacy_rec
    FROM pg_catalog.pg_proc p 
    WHERE p.oid = v_legacy_oid;

    IF v_legacy_rec.acl_text <> '{postgres=X/postgres}' THEN
        RAISE EXCEPTION 'POSTCONDITION_FAILED [5.2a]: ACL da função legada foi alterada: %', v_legacy_rec.acl_text;
    END IF;

    v_legacy_funcdef_norm := regexp_replace(trim(v_legacy_rec.funcdef), '\s+', ' ', 'g');
    v_expected_legacy_funcdef_1 := 'CREATE OR REPLACE FUNCTION public.is_platform_admin(p_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''public'', ''pg_temp'' AS $function$ SELECT EXISTS ( SELECT 1 FROM public.platform_members pm JOIN public.roles r ON r.code = pm.role WHERE pm.user_id = p_user_id AND pm.is_active = true AND r.scope_type = ''platform'' AND r.code = ''admin'' AND r.is_active = true ); $function$';
    v_expected_legacy_funcdef_2 := 'CREATE OR REPLACE FUNCTION public.is_platform_admin(p_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $function$ SELECT EXISTS ( SELECT 1 FROM public.platform_members pm JOIN public.roles r ON r.code = pm.role WHERE pm.user_id = p_user_id AND pm.is_active = true AND r.scope_type = ''platform'' AND r.code = ''admin'' AND r.is_active = true ); $function$';

    IF v_legacy_funcdef_norm <> v_expected_legacy_funcdef_1 AND v_legacy_funcdef_norm <> v_expected_legacy_funcdef_2 THEN
        RAISE EXCEPTION 'POSTCONDITION_FAILED [5.2b]: Definição da função legada foi corrompida.';
    END IF;

    -- 5.3. Validação estrita pós-migração das políticas RLS (GAP-01: 100% sem LIKE ou parciais)
    v_pm_class_oid := pg_catalog.to_regclass('public.platform_members');
    v_al_class_oid := pg_catalog.to_regclass('public.audit_logs');

    SELECT 
        EXISTS(SELECT 1 FROM pg_catalog.pg_policy WHERE polrelid = v_pm_class_oid AND polname = 'platform_members_select_admin'),
        EXISTS(SELECT 1 FROM pg_catalog.pg_policy WHERE polrelid = v_al_class_oid AND polname = 'audit_logs_select_authorized')
    INTO 
        v_pm_pol_active,
        v_al_pol_active;

    IF NOT v_pm_pol_active OR NOT v_al_pol_active THEN
        RAISE EXCEPTION 'POSTCONDITION_FAILED [5.3a]: Uma ou ambas as políticas estão inativas.';
    END IF;

    SELECT pg_catalog.pg_get_expr(polqual, polrelid) INTO v_pm_new_using
    FROM pg_catalog.pg_policy WHERE polrelid = v_pm_class_oid AND polname = 'platform_members_select_admin';

    SELECT pg_catalog.pg_get_expr(polqual, polrelid) INTO v_al_new_using
    FROM pg_catalog.pg_policy WHERE polrelid = v_al_class_oid AND polname = 'audit_logs_select_authorized';

    IF regexp_replace(trim(v_pm_new_using), '\s+', ' ', 'g') NOT IN ('is_platform_admin()', 'public.is_platform_admin()') THEN
        RAISE EXCEPTION 'POSTCONDITION_FAILED [5.3b]: Expressão de platform_members_select_admin incorreta: %', v_pm_new_using;
    END IF;

    -- Comparação estrita integral sem LIKE para audit_logs
    v_al_new_using := regexp_replace(trim(v_al_new_using), '\s+', ' ', 'g');
    
    v_expected_new_al_using_1 := '((is_platform_admin() OR (organization_id IN ( SELECT om.organization_id FROM public.organization_members om WHERE ((om.user_id = auth.uid()) AND (om.role = ANY (ARRAY[''gestor''::text, ''admin''::text])) AND (om.is_active = true))))))';
    v_expected_new_al_using_2 := '((public.is_platform_admin() OR (organization_id IN ( SELECT om.organization_id FROM public.organization_members om WHERE ((om.user_id = auth.uid()) AND (om.role = ANY (ARRAY[''gestor''::text, ''admin''::text])) AND (om.is_active = true))))))';
    
    -- Variação sem prefixo public na subquery organization_members
    DECLARE
        v_expected_new_al_using_3 TEXT := '((is_platform_admin() OR (organization_id IN ( SELECT om.organization_id FROM organization_members om WHERE ((om.user_id = auth.uid()) AND (om.role = ANY (ARRAY[''gestor''::text, ''admin''::text])) AND (om.is_active = true))))))';
        v_expected_new_al_using_4 TEXT := '((public.is_platform_admin() OR (organization_id IN ( SELECT om.organization_id FROM organization_members om WHERE ((om.user_id = auth.uid()) AND (om.role = ANY (ARRAY[''gestor''::text, ''admin''::text])) AND (om.is_active = true))))))';
    BEGIN
        IF v_al_new_using NOT IN (v_expected_new_al_using_1, v_expected_new_al_using_2, v_expected_new_al_using_3, v_expected_new_al_using_4) THEN
            RAISE EXCEPTION 'POSTCONDITION_FAILED [5.3c - GAP-01]: Expressão de audit_logs_select_authorized diverge das formas canônicas integrais esperadas: %', v_al_new_using;
        END IF;
    END;

    RAISE NOTICE '[P2.325.17-V9] Pós-condições aprovadas com rigor determinístico integral V9.';
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;
