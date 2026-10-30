-- ==============================================================================
-- CLASSIUM GESTÃO EDUCACIONAL — ETAPA P2.325.13
-- CANDIDATO CORRETIVO DE AUTORIZAÇÃO V5 — REVISÃO ESTRITA E BLINDAGEM DE CATÁLOGO
-- ==============================================================================
-- Projeto Supabase Oficial Único: flfqjlrjnvkrstqsknxc
-- Host Oficial: flfqjlrjnvkrstqsknxc.supabase.co
-- Versão do Candidato: v5.0 (Revisão Estática Independente — 100% READ-ONLY)
--
-- Correções Estruturais em Relação à Versão v4 (P2.325.12):
--   1. Eliminação do erro de agregação em text[] (MAX(p.proconfig) substituído por consulta escalar tipada).
--   2. Validação da assinatura exata da função legada (pg_get_function_identity_arguments = 'uuid' ou 'p_user_id uuid').
--   3. Validação estrita das políticas RLS (tabela, schema, comando 'r', papel 'authenticated', permissividade e expressão).
--   4. Remoção da concessão de EXECUTE a service_role (princípio do menor privilégio; service_role possui BYPASSRLS).
--   5. Concessão de EXECUTE restrita exclusivamente ao papel authenticated para avaliação de RLS.
--   6. Preservação integral da função legada com UUID e de sua ACL {postgres=X/postgres}.
--   7. Registro explícito de que identificadores de ambiente no script não garantem conexão à instância oficial (responsabilidade do operador).
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- SEÇÃO 1: PRÉ-CONDIÇÕES E VALIDAÇÕES ESTRITAS DE BASELINE (FAIL-FAST)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_proc_rec                 RECORD;
    v_canonical_func_count     INTEGER;
    v_pm_rls                   BOOLEAN;
    v_al_rls                   BOOLEAN;
    v_pm_policy_count          INTEGER;
    v_al_policy_count          INTEGER;
    v_pm_pol_rec               RECORD;
    v_al_pol_rec               RECORD;
    v_roles_scope_col_exists   BOOLEAN;
BEGIN
    RAISE NOTICE '[P2.325.13-V5] Executando validações estritas de pré-condição contra o catálogo...';

    -- 1.1. Validar a assinatura exata, propriedade, configuração e ACL da função legada
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
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_catalog.pg_language l ON l.oid = p.prolang
    WHERE n.nspname = 'public'
      AND p.proname = 'is_platform_admin'
      AND p.pronargs = 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.1a]: Função legada public.is_platform_admin com 1 argumento não encontrada no catálogo.';
    END IF;

    IF v_proc_rec.identity_args NOT IN ('uuid', 'p_user_id uuid') THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.1b]: Assinatura da função legada inesperada: % (esperado: uuid ou p_user_id uuid).', v_proc_rec.identity_args;
    END IF;

    IF v_proc_rec.owner_name <> 'postgres' THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.1c]: Proprietário da função legada diverge do baseline: % (esperado: postgres).', v_proc_rec.owner_name;
    END IF;

    IF v_proc_rec.prosecdef IS NOT TRUE OR v_proc_rec.provolatile <> 's' OR v_proc_rec.lanname <> 'sql' THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.1d]: Propriedades de segurança ou linguagem divergentes (secdef: %, provolatile: %, lang: %).',
            v_proc_rec.prosecdef, v_proc_rec.provolatile, v_proc_rec.lanname;
    END IF;

    IF v_proc_rec.acl_text <> '{postgres=X/postgres}' THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.1e]: ACL da função legada diverge do baseline: % (esperado: {postgres=X/postgres}).', v_proc_rec.acl_text;
    END IF;

    IF v_proc_rec.proconfig IS NULL OR NOT ('search_path=public, pg_temp' = ANY(v_proc_rec.proconfig)) THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.1f]: Configuração proconfig da função legada diverge: %', v_proc_rec.proconfig;
    END IF;

    -- 1.2. Validar inexistência de qualquer sobrecarga homônima sem argumentos
    SELECT COUNT(*)
    INTO v_canonical_func_count
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'is_platform_admin'
      AND p.pronargs = 0;

    IF v_canonical_func_count > 0 THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.2]: Função sem argumentos public.is_platform_admin() já existe no catálogo. Abortando para evitar colisão.';
    END IF;

    -- 1.3. Validar estado de habilitação do RLS nas tabelas
    SELECT 
        COALESCE(BOOL_OR(CASE WHEN c.relname = 'platform_members' THEN c.relrowsecurity END), false),
        COALESCE(BOOL_OR(CASE WHEN c.relname = 'audit_logs' THEN c.relrowsecurity END), false)
    INTO 
        v_pm_rls,
        v_al_rls
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('platform_members', 'audit_logs');

    IF NOT v_pm_rls THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.3a]: RLS inativo na tabela public.platform_members. Abortando.';
    END IF;

    IF NOT v_al_rls THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.3b]: RLS inativo na tabela public.audit_logs. Abortando.';
    END IF;

    -- 1.4. Validar política em public.platform_members (propriedades completas)
    SELECT COUNT(*) INTO v_pm_policy_count
    FROM pg_catalog.pg_policy pol
    JOIN pg_catalog.pg_class c ON c.oid = pol.polrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'platform_members';

    IF v_pm_policy_count <> 1 THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.4a]: Contagem de políticas em platform_members inesperada: % (esperado exatamente 1).', v_pm_policy_count;
    END IF;

    SELECT 
        pol.polname,
        pol.polcmd,
        pol.polpermissive,
        ARRAY(
            SELECT pg_catalog.pg_get_userbyid(r_oid) 
            FROM unnest(pol.polroles) AS r_oid
        ) AS roles_list,
        pg_catalog.pg_get_expr(pol.polqual, pol.polrelid) AS using_expr
    INTO v_pm_pol_rec
    FROM pg_catalog.pg_policy pol
    JOIN pg_catalog.pg_class c ON c.oid = pol.polrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'platform_members' AND pol.polname = 'platform_members_select_admin';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.4b]: Política platform_members_select_admin ausente em public.platform_members.';
    END IF;

    IF v_pm_pol_rec.polcmd <> 'r' OR NOT v_pm_pol_rec.polpermissive OR NOT ('authenticated' = ANY(v_pm_pol_rec.roles_list)) THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.4c]: Propriedades da política platform_members_select_admin divergentes (cmd: %, permissive: %, roles: %).',
            v_pm_pol_rec.polcmd, v_pm_pol_rec.polpermissive, v_pm_pol_rec.roles_list;
    END IF;

    IF v_pm_pol_rec.using_expr NOT LIKE '%is_platform_admin(auth.uid())%' THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.4d]: Expressão USING da política platform_members_select_admin diverge do baseline: %', v_pm_pol_rec.using_expr;
    END IF;

    -- 1.5. Validar política em public.audit_logs (propriedades completas)
    SELECT COUNT(*) INTO v_al_policy_count
    FROM pg_catalog.pg_policy pol
    JOIN pg_catalog.pg_class c ON c.oid = pol.polrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'audit_logs';

    IF v_al_policy_count <> 1 THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.5a]: Contagem de políticas em audit_logs inesperada: % (esperado exatamente 1).', v_al_policy_count;
    END IF;

    SELECT 
        pol.polname,
        pol.polcmd,
        pol.polpermissive,
        ARRAY(
            SELECT pg_catalog.pg_get_userbyid(r_oid) 
            FROM unnest(pol.polroles) AS r_oid
        ) AS roles_list,
        pg_catalog.pg_get_expr(pol.polqual, pol.polrelid) AS using_expr
    INTO v_al_pol_rec
    FROM pg_catalog.pg_policy pol
    JOIN pg_catalog.pg_class c ON c.oid = pol.polrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'audit_logs' AND pol.polname = 'audit_logs_select_authorized';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.5b]: Política audit_logs_select_authorized ausente em public.audit_logs.';
    END IF;

    IF v_al_pol_rec.polcmd <> 'r' OR NOT v_al_pol_rec.polpermissive OR NOT ('authenticated' = ANY(v_al_pol_rec.roles_list)) THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.5c]: Propriedades da política audit_logs_select_authorized divergentes (cmd: %, permissive: %, roles: %).',
            v_al_pol_rec.polcmd, v_al_pol_rec.polpermissive, v_al_pol_rec.roles_list;
    END IF;

    IF v_al_pol_rec.using_expr NOT LIKE '%is_platform_admin(auth.uid())%'
       OR v_al_pol_rec.using_expr NOT LIKE '%organization_id%'
       OR v_al_pol_rec.using_expr NOT LIKE '%organization_members%' THEN
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.5d]: Expressão USING da política audit_logs_select_authorized diverge do baseline: %', v_al_pol_rec.using_expr;
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
        RAISE EXCEPTION 'PRECONDITION_FAILED [1.6]: Coluna scope_type não encontrada na tabela public.roles.';
    END IF;

    RAISE NOTICE '[P2.325.13-V5] Pré-condições do catálogo PostgreSQL validadas com sucesso.';
END $$;

-- ------------------------------------------------------------------------------
-- SEÇÃO 2: CRIAÇÃO DA FUNÇÃO CANÔNICA public.is_platform_admin()
-- ------------------------------------------------------------------------------
-- Justificativa da Definição:
--   - Retorna BOOLEAN e opera como SECURITY DEFINER para consultar platform_members e roles
--     com privilégios de proprietário, evitando recursão RLS ou dependência de permissão direta.
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
    'Função canônica de autorização de administrador global (P2.325.13-v5). '
    'Utiliza auth.uid() internamente e SET search_path = "". Sem parâmetros externos.';

-- ------------------------------------------------------------------------------
-- SEÇÃO 3: GOVERNANÇA E PRIVILÉGIOS MÍNIMOS
-- ------------------------------------------------------------------------------
-- Justificativa das Permissões:
--   1. PUBLIC e anon: Revogação total para impedir herança e chamadas não autenticadas via RPC.
--   2. service_role: Revogação explícita. A service_role opera com BYPASSRLS e não necessita
--      invocar a função canônica para acessar platform_members ou audit_logs.
--   3. authenticated: Concessão estrita de EXECUTE, indispensável para que o PostgreSQL avalie
--      as políticas RLS ao processar requisições autenticadas da aplicação.
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
    'Permite que administradores autenticados visualizem membros da plataforma via função canônica (P2.325.13-v5).';

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
    'Permite que administradores globais e gestores de organização visualizem logs autorizados (P2.325.13-v5). Preserva padrão IN (SELECT ...).';

-- ------------------------------------------------------------------------------
-- SEÇÃO 5: VALIDAÇÃO PÓS-CONDIÇÃO E AUDITORIA DE INTEGRIDADE
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_new_func_rec        RECORD;
    v_legacy_acl          TEXT;
    v_pm_pol_active       BOOLEAN;
    v_al_pol_active       BOOLEAN;
BEGIN
    RAISE NOTICE '[P2.325.13-V5] Executando validações pós-condição...';

    -- 5.1. Verificar a nova função sem agregação em text[] (consulta escalar tipada)
    SELECT 
        p.oid,
        pg_catalog.pg_get_userbyid(p.proowner) AS owner_name,
        p.prosecdef,
        p.provolatile,
        p.proconfig,
        p.proacl::text AS acl_text
    INTO v_new_func_rec
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'is_platform_admin'
      AND p.pronargs = 0;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'POSTCONDITION_FAILED [5.1a]: Função public.is_platform_admin() não foi encontrada após criação.';
    END IF;

    IF v_new_func_rec.owner_name <> 'postgres' OR v_new_func_rec.prosecdef IS NOT TRUE OR v_new_func_rec.provolatile <> 's' THEN
        RAISE EXCEPTION 'POSTCONDITION_FAILED [5.1b]: Atributos de segurança da nova função incorretos (owner: %, secdef: %, provolatile: %).',
            v_new_func_rec.owner_name, v_new_func_rec.prosecdef, v_new_func_rec.provolatile;
    END IF;

    IF v_new_func_rec.proconfig IS NULL OR NOT (('search_path=' = ANY(v_new_func_rec.proconfig)) OR ('search_path=""' = ANY(v_new_func_rec.proconfig))) THEN
        RAISE EXCEPTION 'POSTCONDITION_FAILED [5.1c]: Configuração search_path da nova função não está vazia: %', v_new_func_rec.proconfig;
    END IF;

    IF v_new_func_rec.acl_text NOT LIKE '%authenticated=X/%' THEN
        RAISE EXCEPTION 'POSTCONDITION_FAILED [5.1d]: Privilégio EXECUTE não foi concedido a authenticated na nova função: %', v_new_func_rec.acl_text;
    END IF;

    IF v_new_func_rec.acl_text LIKE '%service_role=%' THEN
        RAISE EXCEPTION 'POSTCONDITION_FAILED [5.1e]: Concessão espúria detectada para service_role na nova função: %', v_new_func_rec.acl_text;
    END IF;

    -- 5.2. Confirmar que a função legada com UUID permaneceu rigorosamente intacta
    SELECT COALESCE(MAX(p.proacl::text), '')
    INTO v_legacy_acl
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'is_platform_admin'
      AND p.pronargs = 1;

    IF v_legacy_acl <> '{postgres=X/postgres}' THEN
        RAISE EXCEPTION 'POSTCONDITION_FAILED [5.2]: ACL da função legada foi acidentalmente modificada: % (esperado: {postgres=X/postgres}).', v_legacy_acl;
    END IF;

    -- 5.3. Confirmar que ambas as políticas estão ativas e com os nomes corretos
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
        RAISE EXCEPTION 'POSTCONDITION_FAILED [5.3a]: Política platform_members_select_admin inativa pós-migração.';
    END IF;

    IF NOT v_al_pol_active THEN
        RAISE EXCEPTION 'POSTCONDITION_FAILED [5.3b]: Política audit_logs_select_authorized inativa pós-migração.';
    END IF;

    RAISE NOTICE '[P2.325.13-V5] Todas as pós-condições foram validadas com sucesso.';
END $$;

-- ------------------------------------------------------------------------------
-- SEÇÃO 6: NOTIFICAÇÃO E RECARGA DE SCHEMA DO POSTGREST
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

COMMIT;
