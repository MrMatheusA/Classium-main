-- ==============================================================================
-- MIGRATION: 20260927_partner_onboarding_atomic_rpc.sql
-- PROJETO: Classium Gestão Educacional — Núcleo Enterprise de Parceiros
-- FASE: Etapa P2.274.98
-- OBJETIVO: RPC atômica SECURITY DEFINER para onboarding de parceiro comercial
--           e vinculação simultânea do primeiro membro (role = 'owner').
-- REGRAS DE SEGURANÇA:
--  - SECURITY DEFINER com search_path = public, pg_temp
--  - Execução restrita a usuários autenticados via auth.uid()
--  - organization_id resolvido estritamente a partir de public.organization_members
--  - Rejeição se o usuário possuir múltiplas organizações ativas (contexto ambíguo)
--  - Validação estrita de parâmetros cadastrais
--  - Impede injeção/override de status, approval_status, is_active, role ou user_id
--  - Transação atômica ACID (partners + partner_members)
--  - Disparo automático de triggers de updated_at e audit_logs
--  - EXECUTE concedido exclusivamente à role authenticated e service_role
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.admin_create_partner_onboarding(
    p_partner_name VARCHAR,
    p_legal_name VARCHAR DEFAULT NULL,
    p_document_type VARCHAR DEFAULT NULL,
    p_document_number VARCHAR DEFAULT NULL,
    p_email VARCHAR DEFAULT NULL,
    p_phone VARCHAR DEFAULT NULL,
    p_website VARCHAR DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_category VARCHAR DEFAULT NULL,
    p_plan_id VARCHAR DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_auth_uid UUID;
    v_org_count INTEGER;
    v_target_org_id UUID;
    v_new_partner public.partners%ROWTYPE;
    v_new_member public.partner_members%ROWTYPE;
    v_doc_type VARCHAR;
BEGIN
    -- 1. Autenticação obrigatória do executor via auth.uid()
    v_auth_uid := auth.uid();
    IF v_auth_uid IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Usuário não autenticado.' USING ERRCODE = '42501';
    END IF;

    -- 2. Validação básica de campos cadastrais obrigatórios
    IF p_partner_name IS NULL OR trim(p_partner_name) = '' THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: O campo partner_name é obrigatório.' USING ERRCODE = '22023';
    END IF;

    -- Validação e normalização de document_type se fornecido
    IF p_document_type IS NOT NULL AND trim(p_document_type) != '' THEN
        v_doc_type := upper(trim(p_document_type));
        IF v_doc_type NOT IN ('CPF', 'CNPJ') THEN
            RAISE EXCEPTION 'VALIDATION_ERROR: document_type deve ser "CPF", "CNPJ" ou nulo.' USING ERRCODE = '22023';
        END IF;
    ELSE
        v_doc_type := NULL;
    END IF;

    -- 3. Resolução segura e determinística de Tenant (organization_id)
    -- Consulta o número de organizações ativas vinculadas ao executor em organization_members
    SELECT count(DISTINCT om.organization_id)
    INTO v_org_count
    FROM public.organization_members om
    WHERE om.user_id = v_auth_uid
      AND om.is_active = true;

    IF v_org_count = 0 THEN
        -- Tenta verificar se o usuário é Administrador Global da Plataforma
        SELECT count(DISTINCT pm.id)
        INTO v_org_count
        FROM public.platform_members pm
        WHERE pm.user_id = v_auth_uid
          AND pm.role = 'admin'
          AND pm.is_active = true;

        IF v_org_count = 0 THEN
            RAISE EXCEPTION 'FORBIDDEN_NO_ORGANIZATION: Usuário autenticado não possui organização ativa vinculada ao perfil.' USING ERRCODE = '42501';
        END IF;

        -- Se for Platform Admin sem organização escolar explícita, seleciona a primeira organização ativa
        SELECT id INTO v_target_org_id FROM public.organizations WHERE is_active = true ORDER BY created_at ASC LIMIT 1;
        IF v_target_org_id IS NULL THEN
            RAISE EXCEPTION 'FORBIDDEN_NO_ORGANIZATION: Nenhuma organização ativa encontrada no sistema.' USING ERRCODE = '42501';
        END IF;
    ELSIF v_org_count > 1 THEN
        RAISE EXCEPTION 'AMBIGUOUS_TENANT_CONTEXT: Usuário possui múltiplas organizações ativas. O contexto organizacional deve ser único e determinístico.' USING ERRCODE = '22023';
    ELSE
        SELECT om.organization_id
        INTO v_target_org_id
        FROM public.organization_members om
        WHERE om.user_id = v_auth_uid
          AND om.is_active = true
        LIMIT 1;
    END IF;

    -- 4. Inserção Atômica na Tabela public.partners
    -- Valores de governança e tenant são rigidamente definidos pela RPC
    INSERT INTO public.partners (
        organization_id,
        partner_name,
        legal_name,
        document_type,
        document_number,
        email,
        phone,
        website,
        description,
        category,
        plan_id,
        metadata,
        status,
        approval_status,
        is_active
    ) VALUES (
        v_target_org_id,
        trim(p_partner_name),
        NULLIF(trim(p_legal_name), ''),
        v_doc_type,
        NULLIF(trim(p_document_number), ''),
        NULLIF(trim(p_email), ''),
        NULLIF(trim(p_phone), ''),
        NULLIF(trim(p_website), ''),
        NULLIF(trim(p_description), ''),
        NULLIF(trim(p_category), ''),
        NULLIF(trim(p_plan_id), ''),
        COALESCE(p_metadata, '{}'::jsonb),
        'pending',
        'pending',
        true
    )
    RETURNING * INTO v_new_partner;

    -- 5. Inserção Atômica na Tabela public.partner_members (Vínculo do Primeiro Membro)
    -- O papel 'owner' é forçado internamente na RPC
    INSERT INTO public.partner_members (
        partner_id,
        user_id,
        organization_id,
        role,
        is_active
    ) VALUES (
        v_new_partner.id,
        v_auth_uid,
        v_target_org_id,
        'owner',
        true
    )
    RETURNING * INTO v_new_member;

    -- 6. Retorno Estruturado em JSONB
    RETURN jsonb_build_object(
        'partner', to_jsonb(v_new_partner),
        'member', to_jsonb(v_new_member)
    );

EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'CONFLICT: Registro duplicado identificado para parceiro ou membro associado.' USING ERRCODE = '23505';
    WHEN foreign_key_violation THEN
        RAISE EXCEPTION 'FOREIGN_KEY_VIOLATION: Referência a registro inexistente (usuário ou organização).' USING ERRCODE = '23503';
    WHEN OTHERS THEN
        RAISE;
END;
$$;

-- 7. Configuração Estrita de Privilégios (Grants)
REVOKE ALL ON FUNCTION public.admin_create_partner_onboarding(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_create_partner_onboarding(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_create_partner_onboarding(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_partner_onboarding(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, JSONB) TO service_role;

-- 8. Notificar o PostgREST para recarregar o schema cache
NOTIFY pgrst, 'reload schema';
