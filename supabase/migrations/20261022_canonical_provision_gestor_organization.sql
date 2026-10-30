-- ==============================================================================
-- MIGRATION: 20261022_canonical_provision_gestor_organization.sql
-- PROJETO: Classium Gestão Educacional
-- SUPABASE OFICIAL: flfqjlrjnvkrstqsknxc (flfqjlrjnvkrstqsknxc.supabase.co)
-- FASE: Autoinscrição Institucional / Onboarding (P2.351)
-- OBJETIVO: RPC atômica SECURITY DEFINER para autoinscrição de nova organização,
--           criação de unidade escolar sede e atribuição do vínculo canônico de
--           'gestor' para o usuário autenticado solicitante.
--
-- REGRAS ARQUITETURAIS E DE SEGURANÇA:
--  1. Executável por qualquer usuário autenticado (auth.uid()).
--  2. Identidade estritamente resolvida no servidor via auth.uid() (anti-IDOR).
--  3. Rejeita chamadas não autenticadas ou com perfis inativos.
--  4. Serialização de concorrência com pg_advisory_xact_lock por usuário.
--  5. Rejeição de solicitantes que já possuem vínculo institucional ou de plataforma ativo.
--  6. Higienização e validação de unicidade de documento/CNPJ institucional.
--  7. Atomicidade ACID: inserção em organizations, schools e organization_members,
--     além de sincronização de public.profiles.
--  8. Blindagem search_path = '' com referências estritamente qualificadas por esquema.
--  9. Permissões estritas: EXECUTE concedido apenas a authenticated e service_role.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. GARANTIA IDEMPOTENTE DE COLUNAS E ÍNDICES DE INTEGRIDADE
-- ------------------------------------------------------------------------------

-- Garantir coluna is_active em public.organization_members
ALTER TABLE public.organization_members 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Garantir colunas em public.profiles caso o esquema de destino ainda não as possua
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Garantir coluna status e is_active em public.organizations
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';

ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Garantir coluna status em public.schools
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';

-- Índice único parcial para impedir que o mesmo usuário possua múltiplos vínculos ativos de gestor
CREATE UNIQUE INDEX IF NOT EXISTS idx_organization_members_user_active_gestor
ON public.organization_members (user_id)
WHERE role = 'gestor' AND is_active = true;

-- Índice para performance e verificação de documento institucional em organizações (não-único)
CREATE INDEX IF NOT EXISTS idx_organizations_document_number
ON public.organizations (document_number)
WHERE document_number IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 2. DEFINIÇÃO DA RPC CANÔNICA DE AUTOINSCRIÇÃO INSTITUCIONAL
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.provision_gestor_organization(
    p_name VARCHAR,
    p_trade_name VARCHAR DEFAULT NULL,
    p_document_number VARCHAR DEFAULT NULL,
    p_inep_code VARCHAR DEFAULT NULL,
    p_email VARCHAR DEFAULT NULL,
    p_phone VARCHAR DEFAULT NULL,
    p_address VARCHAR DEFAULT NULL,
    p_city VARCHAR DEFAULT NULL,
    p_state VARCHAR DEFAULT NULL,
    p_postal_code VARCHAR DEFAULT NULL,
    p_website VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_auth_uid UUID;
    v_profile_inactive BOOLEAN;
    v_has_platform_link BOOLEAN;
    v_has_org_link BOOLEAN;
    v_clean_doc VARCHAR;
    v_clean_state VARCHAR(2);
    v_doc_exists BOOLEAN;
    v_org_id UUID;
    v_school_id UUID;
    v_member_id UUID;
    v_auth_email VARCHAR;
    v_auth_name VARCHAR;
BEGIN
    -- 1. Validação estrita de identidade autenticada
    v_auth_uid := auth.uid();
    IF v_auth_uid IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Usuário não autenticado.' USING ERRCODE = '42501';
    END IF;

    -- 2. Serialização transacional contra concorrência e double-click da mesma identidade
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('provision_gestor:' || CAST(v_auth_uid AS pg_catalog.text)));

    -- 3. Validação de perfil (rejeitar se explicitamente inativo ou desativado)
    SELECT EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE id = v_auth_uid 
          AND is_active = false
    ) INTO v_profile_inactive;

    IF v_profile_inactive THEN
        RAISE EXCEPTION 'FORBIDDEN: Perfil de usuário inativo ou suspenso.' USING ERRCODE = '42501';
    END IF;

    -- 4. Rejeição de solicitante que já possua vínculo ativo na plataforma
    SELECT EXISTS (
        SELECT 1 
        FROM public.platform_members 
        WHERE user_id = v_auth_uid 
          AND is_active = true
    ) INTO v_has_platform_link;

    IF v_has_platform_link THEN
        RAISE EXCEPTION 'CONFLICT: Este usuário já possui vínculo administrativo ativo na plataforma.' USING ERRCODE = '23505';
    END IF;

    -- 5. Rejeição de solicitante que já possua vínculo ativo em qualquer organização
    SELECT EXISTS (
        SELECT 1 
        FROM public.organization_members 
        WHERE user_id = v_auth_uid 
          AND is_active = true
    ) INTO v_has_org_link;

    IF v_has_org_link THEN
        RAISE EXCEPTION 'CONFLICT: Este usuário já possui uma organização ativa vinculada no sistema.' USING ERRCODE = '23505';
    END IF;

    -- 6. Validação dos campos obrigatórios
    IF p_name IS NULL OR pg_catalog.btrim(p_name) = '' THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: O nome da instituição é obrigatório.' USING ERRCODE = '22023';
    END IF;

    -- 7. Normalização e validação de documento / CNPJ com trava transacional por documento
    v_clean_doc := pg_catalog.regexp_replace(pg_catalog.coalesce(p_document_number, ''), '\D', '', 'g');
    IF v_clean_doc = '' THEN
        v_clean_doc := NULL;
    END IF;

    IF v_clean_doc IS NOT NULL THEN
        IF pg_catalog.length(v_clean_doc) NOT IN (11, 14) THEN
            RAISE EXCEPTION 'VALIDATION_ERROR: O documento institucional deve possuir 11 dígitos (CPF) ou 14 dígitos (CNPJ).' USING ERRCODE = '22023';
        END IF;

        -- Trava transacional por documento: serializa chamadas concorrentes com o mesmo documento institucional (entre usuários distintos)
        PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('provision_doc:' || v_clean_doc));

        -- Validação de unicidade do documento em organizações ativas
        SELECT EXISTS (
            SELECT 1 
            FROM public.organizations 
            WHERE pg_catalog.regexp_replace(pg_catalog.coalesce(document_number, ''), '\D', '', 'g') = v_clean_doc
              AND is_active = true
              AND (status IS NULL OR pg_catalog.upper(status) = 'ACTIVE')
        ) INTO v_doc_exists;

        IF v_doc_exists THEN
            RAISE EXCEPTION 'CONFLICT: Já existe uma organização ativa cadastrada com este documento/CNPJ.' USING ERRCODE = '23505';
        END IF;
    END IF;

    -- 7b. Normalização e validação de UF / Estado para public.schools.state (VARCHAR(2))
    v_clean_state := pg_catalog.upper(pg_catalog.btrim(pg_catalog.coalesce(p_state, '')));
    IF v_clean_state = '' THEN
        v_clean_state := NULL;
    ELSIF pg_catalog.length(v_clean_state) = 2 THEN
        IF v_clean_state NOT IN (
            'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
            'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
            'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
        ) THEN
            RAISE EXCEPTION 'VALIDATION_ERROR: A sigla de estado (UF) "%" não é reconhecida.', v_clean_state USING ERRCODE = '22023';
        END IF;
    ELSE
        -- Reconhecimento determinístico de nomes completos dos estados brasileiros
        v_clean_state := CASE v_clean_state
            WHEN 'ACRE' THEN 'AC'
            WHEN 'ALAGOAS' THEN 'AL'
            WHEN 'AMAPÁ' THEN 'AP'
            WHEN 'AMAPA' THEN 'AP'
            WHEN 'AMAZONAS' THEN 'AM'
            WHEN 'BAHIA' THEN 'BA'
            WHEN 'CEARÁ' THEN 'CE'
            WHEN 'CEARA' THEN 'CE'
            WHEN 'DISTRITO FEDERAL' THEN 'DF'
            WHEN 'ESPÍRITO SANTO' THEN 'ES'
            WHEN 'ESPIRITO SANTO' THEN 'ES'
            WHEN 'GOIÁS' THEN 'GO'
            WHEN 'GOIAS' THEN 'GO'
            WHEN 'MARANHÃO' THEN 'MA'
            WHEN 'MARANHAO' THEN 'MA'
            WHEN 'MATO GROSSO' THEN 'MT'
            WHEN 'MATO GROSSO DO SUL' THEN 'MS'
            WHEN 'MINAS GERAIS' THEN 'MG'
            WHEN 'PARÁ' THEN 'PA'
            WHEN 'PARA' THEN 'PA'
            WHEN 'PARAÍBA' THEN 'PB'
            WHEN 'PARAIBA' THEN 'PB'
            WHEN 'PARANÁ' THEN 'PR'
            WHEN 'PARANA' THEN 'PR'
            WHEN 'PERNAMBUCO' THEN 'PE'
            WHEN 'PIAUÍ' THEN 'PI'
            WHEN 'PIAUI' THEN 'PI'
            WHEN 'RIO DE JANEIRO' THEN 'RJ'
            WHEN 'RIO GRANDE DO NORTE' THEN 'RN'
            WHEN 'RIO GRANDE DO SUL' THEN 'RS'
            WHEN 'RONDÔNIA' THEN 'RO'
            WHEN 'RONDONIA' THEN 'RO'
            WHEN 'RORAIMA' THEN 'RR'
            WHEN 'SANTA CATARINA' THEN 'SC'
            WHEN 'SÃO PAULO' THEN 'SP'
            WHEN 'SAO PAULO' THEN 'SP'
            WHEN 'SERGIPE' THEN 'SE'
            WHEN 'TOCANTINS' THEN 'TO'
            ELSE NULL
        END;

        IF v_clean_state IS NULL THEN
            RAISE EXCEPTION 'VALIDATION_ERROR: O estado fornecido "%" não é uma UF válida.', p_state USING ERRCODE = '22023';
        END IF;
    END IF;

    -- 8. Inserção Atômica na entidade canônica de tenant: public.organizations
    INSERT INTO public.organizations (
        name,
        trade_name,
        document_number,
        email,
        phone,
        status,
        is_active
    ) VALUES (
        pg_catalog.btrim(p_name),
        pg_catalog.nullif(pg_catalog.btrim(p_trade_name), ''),
        v_clean_doc,
        pg_catalog.nullif(pg_catalog.btrim(p_email), ''),
        pg_catalog.nullif(pg_catalog.btrim(p_phone), ''),
        'ACTIVE',
        true
    )
    RETURNING id INTO v_org_id;

    -- 9. Inserção Atômica da unidade operacional inicial em public.schools
    INSERT INTO public.schools (
        organization_id,
        name,
        inep_code,
        address,
        city,
        state,
        phone,
        email,
        status
    ) VALUES (
        v_org_id,
        pg_catalog.coalesce(pg_catalog.nullif(pg_catalog.btrim(p_trade_name), ''), pg_catalog.btrim(p_name), 'Unidade Sede'),
        pg_catalog.nullif(pg_catalog.btrim(p_inep_code), ''),
        pg_catalog.nullif(pg_catalog.btrim(p_address), ''),
        pg_catalog.nullif(pg_catalog.btrim(p_city), ''),
        v_clean_state,
        pg_catalog.nullif(pg_catalog.btrim(p_phone), ''),
        pg_catalog.nullif(pg_catalog.btrim(p_email), ''),
        'ACTIVE'
    )
    RETURNING id INTO v_school_id;

    -- 10. Inserção Atômica do vínculo do usuário como gestor institucional
    INSERT INTO public.organization_members (
        organization_id,
        user_id,
        role,
        is_active
    ) VALUES (
        v_org_id,
        v_auth_uid,
        'gestor',
        true
    )
    RETURNING id INTO v_member_id;

    -- 11. Sincronização e garantia de integridade do perfil em public.profiles
    SELECT email, raw_user_meta_data->>'name'
    INTO v_auth_email, v_auth_name
    FROM auth.users
    WHERE id = v_auth_uid;

    INSERT INTO public.profiles (
        id,
        organization_id,
        school_id,
        full_name,
        email,
        role,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        v_auth_uid,
        v_org_id,
        v_school_id,
        pg_catalog.coalesce(v_auth_name, pg_catalog.btrim(p_name) || ' Gestor', 'Gestor Institucional'),
        v_auth_email,
        'gestor',
        true,
        pg_catalog.now(),
        pg_catalog.now()
    )
    ON CONFLICT (id) DO UPDATE
    SET organization_id = EXCLUDED.organization_id,
        school_id = EXCLUDED.school_id,
        role = 'gestor',
        is_active = true,
        updated_at = pg_catalog.now();

    -- 12. Retorno padronizado em JSONB compatível com o frontend
    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'ok', true,
        'id', v_org_id,
        'organization_id', v_org_id,
        'school_id', v_school_id,
        'member_id', v_member_id,
        'role', 'gestor',
        'message', 'Instituição provisionada com sucesso.'
    );

EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'CONFLICT: Registro duplicado detectado (organização ou vínculo ativo já existente).' USING ERRCODE = '23505';
    WHEN foreign_key_violation THEN
        RAISE EXCEPTION 'FOREIGN_KEY_VIOLATION: Referência a registro dependente inválida.' USING ERRCODE = '23503';
    WHEN OTHERS THEN
        RAISE;
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. PERMISSÕES E REVOGAÇÃO DE ACESSO NÃO AUTORIZADO (MENOR PRIVILÉGIO)
-- ------------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.provision_gestor_organization(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.provision_gestor_organization(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR) FROM anon;
REVOKE ALL ON FUNCTION public.provision_gestor_organization(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR) FROM service_role;
GRANT EXECUTE ON FUNCTION public.provision_gestor_organization(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO authenticated;

-- Notificar o PostgREST para recarregar o schema cache
NOTIFY pgrst, 'reload schema';
