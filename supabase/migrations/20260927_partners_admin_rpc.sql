-- ==============================================================================
-- MIGRATION: 20260927_partners_admin_rpc.sql
-- PROJETO: Classium Gestão Educacional — Núcleo Enterprise de Parceiros
-- FASE: Etapa 1 — Passo 1.3-N (Revisão Canônica)
-- OBJETIVO: RPC administrativa SECURITY DEFINER para governança de parceiros
-- REGRAS:
--  - SECURITY DEFINER com search_path = public, pg_temp
--  - Autenticação obrigatória via auth.uid()
--  - Precedência Canônica de RBAC:
--      1. Administrador global da plataforma via public.platform_members (role = 'admin')
--      2. Gestor escolar via public.organization_members (role = 'gestor')
--  - Proteção Anti-IDOR para gestores escolares (filtro por p_partner_id AND organization_id)
--  - Validação transacional de coerência de estado final
--  - Disparo automático de triggers (trg_partners_updated_at e trg_partners_audit_log)
--  - EXECUTE restrito exclusivamente à role authenticated
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.admin_update_partner_status(
    p_partner_id UUID,
    p_approval_status VARCHAR DEFAULT NULL,
    p_status VARCHAR DEFAULT NULL,
    p_is_active BOOLEAN DEFAULT NULL
)
RETURNS public.partners
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_auth_uid UUID;
    v_is_platform_admin BOOLEAN := false;
    v_admin_org_id UUID;
    v_current_partner public.partners%ROWTYPE;
    v_final_approval VARCHAR;
    v_final_status VARCHAR;
    v_final_is_active BOOLEAN;
    v_updated_partner public.partners%ROWTYPE;
BEGIN
    -- 1. Autenticação obrigatória do executor
    v_auth_uid := auth.uid();
    IF v_auth_uid IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Usuário não autenticado.';
    END IF;

    -- 2. Precedência 1: Verificação de Administrador Global da Plataforma
    SELECT true
    INTO v_is_platform_admin
    FROM public.platform_members pm
    WHERE pm.user_id = v_auth_uid
      AND pm.role = 'admin'
      AND pm.is_active = true
    LIMIT 1;

    v_is_platform_admin := COALESCE(v_is_platform_admin, false);

    -- 3. Precedência 2: Verificação de Gestor Escolar (se não for admin global)
    IF NOT v_is_platform_admin THEN
        SELECT om.organization_id
        INTO v_admin_org_id
        FROM public.organization_members om
        WHERE om.user_id = v_auth_uid
          AND om.role = 'gestor'
          AND om.is_active = true
        LIMIT 1;

        IF v_admin_org_id IS NULL THEN
            RAISE EXCEPTION 'FORBIDDEN_PARTNER_APPROVAL: Permissão negada. Apenas administradores e gestores escolares podem alterar o status de parceiros.';
        END IF;
    END IF;

    -- 4. Validação de presença de parâmetros de alteração
    IF p_approval_status IS NULL AND p_status IS NULL AND p_is_active IS NULL THEN
        RAISE EXCEPTION 'EMPTY_APPROVAL_PAYLOAD: Nenhum campo de alteração administrativa foi fornecido.';
    END IF;

    -- 5. Validação de valores permitidos (Enums)
    IF p_approval_status IS NOT NULL AND p_approval_status NOT IN ('pending', 'approved', 'rejected', 'in_review') THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: approval_status inválido. Valores aceitos: pending, approved, rejected, in_review.';
    END IF;

    IF p_status IS NOT NULL AND p_status NOT IN ('draft', 'pending', 'active', 'suspended', 'cancelled', 'inactive') THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: status inválido. Valores aceitos: draft, pending, active, suspended, cancelled, inactive.';
    END IF;

    -- 6. Localização segura do registro alvo (Proteção Anti-IDOR)
    IF v_is_platform_admin THEN
        SELECT *
        INTO v_current_partner
        FROM public.partners
        WHERE id = p_partner_id;
    ELSE
        SELECT *
        INTO v_current_partner
        FROM public.partners
        WHERE id = p_partner_id
          AND organization_id = v_admin_org_id;
    END IF;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PARTNER_NOT_FOUND: Parceiro não encontrado.';
    END IF;

    -- 7. Cálculo do Estado Final Resultante
    v_final_approval := COALESCE(p_approval_status, v_current_partner.approval_status);
    v_final_status := COALESCE(p_status, v_current_partner.status);
    v_final_is_active := COALESCE(p_is_active, v_current_partner.is_active);

    -- 8. Validação Transacional de Coerência de Estados
    -- Regra A: Aprovação
    IF p_approval_status = 'approved' THEN
        v_final_status := 'active';
        v_final_is_active := true;
    ELSIF v_final_approval = 'approved' THEN
        IF v_final_status != 'active' OR v_final_is_active != true THEN
            RAISE EXCEPTION 'INVALID_APPROVAL_STATE: Incoerência de estado: parceiro aprovado deve possuir status active e is_active true.';
        END IF;
    END IF;

    -- Regra B: Rejeição
    IF p_approval_status = 'rejected' THEN
        IF v_final_status = 'active' THEN
            v_final_status := 'inactive';
        END IF;
        v_final_is_active := false;
    ELSIF v_final_approval = 'rejected' THEN
        IF v_final_status = 'active' OR v_final_is_active = true THEN
            RAISE EXCEPTION 'INVALID_APPROVAL_STATE: Incoerência de estado: parceiro rejeitado não pode ser ativo.';
        END IF;
    END IF;

    -- Regra C: Pendente
    IF v_final_approval = 'pending' AND v_final_status = 'active' THEN
        RAISE EXCEPTION 'INVALID_APPROVAL_STATE: Incoerência de estado: parceiro pendente não pode possuir status active.';
    END IF;

    -- Regra D: Status active exige aprovação e is_active = true
    IF v_final_status = 'active' THEN
        IF v_final_approval != 'approved' OR v_final_is_active != true THEN
            RAISE EXCEPTION 'INVALID_APPROVAL_STATE: Incoerência de estado: status active exige approval_status approved e is_active true.';
        END IF;
    END IF;

    -- Regra E: is_active = true exige aprovação e status active
    IF v_final_is_active = true THEN
        IF v_final_approval != 'approved' OR v_final_status != 'active' THEN
            RAISE EXCEPTION 'INVALID_APPROVAL_STATE: Incoerência de estado: is_active true exige status active e approval_status approved.';
        END IF;
    END IF;

    -- 9. Atualização Atômica no PostgreSQL (Dispara triggers trg_partners_updated_at e trg_partners_audit_log)
    IF v_is_platform_admin THEN
        UPDATE public.partners
        SET approval_status = v_final_approval,
            status = v_final_status,
            is_active = v_final_is_active
        WHERE id = p_partner_id
        RETURNING * INTO v_updated_partner;
    ELSE
        UPDATE public.partners
        SET approval_status = v_final_approval,
            status = v_final_status,
            is_active = v_final_is_active
        WHERE id = p_partner_id
          AND organization_id = v_admin_org_id
        RETURNING * INTO v_updated_partner;
    END IF;

    RETURN v_updated_partner;
END;
$$;

-- 10. Configuração Estrita de Privilégios de Execução (EXECUTE)
REVOKE ALL ON FUNCTION public.admin_update_partner_status(UUID, VARCHAR, VARCHAR, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_update_partner_status(UUID, VARCHAR, VARCHAR, BOOLEAN) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_update_partner_status(UUID, VARCHAR, VARCHAR, BOOLEAN) TO authenticated;

-- 11. Recarregar cache de schema do PostgREST
NOTIFY pgrst, 'reload schema';
