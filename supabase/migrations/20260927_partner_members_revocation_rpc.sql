-- ==============================================================================
-- MIGRATION: 20260927_partner_members_revocation_rpc.sql
-- PROJETO: Classium Gestão Educacional — Núcleo Enterprise de Parceiros
-- ETAPA: Etapa 2.10-J
-- OBJETIVO: RPC segura para revogação de acessos em public.partner_members e
--           trigger de auditoria dedicada para a tabela.
-- REGRAS:
--  - RPC SECURITY DEFINER com search_path = public, pg_temp
--  - Administrador Global da Plataforma (platform_members.role = 'admin')
--  - Gestor da Organização (organization_members.role = 'gestor' no mesmo tenant)
--  - Inativação lógica idempotente (is_active = false)
--  - Trigger de auditoria em public.audit_logs (table_name = 'partner_members')
--  - ZERO alteração em outras tabelas, frontend ou server.ts
--  - ZERO criação de dados fictícios ou mocks
-- ==============================================================================

-- 1. Função e Trigger de Auditoria para public.partner_members
CREATE OR REPLACE FUNCTION public.process_partner_members_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_ip VARCHAR(50);
    v_org_id UUID;
    v_rec_id UUID;
    v_old_data JSONB;
    v_new_data JSONB;
BEGIN
    BEGIN
        v_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;

    BEGIN
        v_ip := NULLIF(current_setting('request.headers', true)::json->>'x-forwarded-for', '');
        IF v_ip IS NOT NULL AND position(',' in v_ip) > 0 THEN
            v_ip := trim(split_part(v_ip, ',', 1));
        END IF;
        IF length(v_ip) > 50 THEN
            v_ip := substring(v_ip from 1 for 50);
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_ip := NULL;
    END;

    IF (TG_OP = 'INSERT') THEN
        v_rec_id := NEW.id;
        v_org_id := NEW.organization_id;
        v_old_data := NULL;
        v_new_data := to_jsonb(NEW);

        INSERT INTO public.audit_logs (
            organization_id,
            user_id,
            action,
            table_name,
            record_id,
            old_data,
            new_data,
            ip_address,
            created_at
        ) VALUES (
            v_org_id,
            v_user_id,
            'INSERT',
            'partner_members',
            v_rec_id,
            v_old_data,
            v_new_data,
            v_ip,
            now()
        );

        RETURN NEW;

    ELSIF (TG_OP = 'UPDATE') THEN
        v_rec_id := NEW.id;
        v_org_id := NEW.organization_id;
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);

        INSERT INTO public.audit_logs (
            organization_id,
            user_id,
            action,
            table_name,
            record_id,
            old_data,
            new_data,
            ip_address,
            created_at
        ) VALUES (
            v_org_id,
            v_user_id,
            'UPDATE',
            'partner_members',
            v_rec_id,
            v_old_data,
            v_new_data,
            v_ip,
            now()
        );

        RETURN NEW;

    ELSIF (TG_OP = 'DELETE') THEN
        v_rec_id := OLD.id;
        v_org_id := OLD.organization_id;
        v_old_data := to_jsonb(OLD);
        v_new_data := NULL;

        INSERT INTO public.audit_logs (
            organization_id,
            user_id,
            action,
            table_name,
            record_id,
            old_data,
            new_data,
            ip_address,
            created_at
        ) VALUES (
            v_org_id,
            v_user_id,
            'DELETE',
            'partner_members',
            v_rec_id,
            v_old_data,
            v_new_data,
            v_ip,
            now()
        );

        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_partner_members_audit_log ON public.partner_members;

CREATE TRIGGER trg_partner_members_audit_log
    AFTER INSERT OR UPDATE OR DELETE ON public.partner_members
    FOR EACH ROW
    EXECUTE FUNCTION public.process_partner_members_audit_log();

-- 2. RPC Segura de Revogação de Acesso
CREATE OR REPLACE FUNCTION public.admin_revoke_partner_member(p_partner_member_id UUID)
RETURNS public.partner_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_auth_user_id UUID;
    v_is_platform_admin BOOLEAN := false;
    v_member_rec public.partner_members;
BEGIN
    v_auth_user_id := auth.uid();
    IF v_auth_user_id IS NULL THEN
        RAISE EXCEPTION 'Acesso negado. Token de autenticação não fornecido ou inválido.'
            USING ERRCODE = '42501';
    END IF;

    -- 1. Verificar se é Administrador Global da Plataforma
    SELECT EXISTS (
        SELECT 1
        FROM public.platform_members
        WHERE user_id = v_auth_user_id
          AND role = 'admin'
          AND is_active = true
    ) INTO v_is_platform_admin;

    IF v_is_platform_admin THEN
        -- Administrador Global pode revogar qualquer membro de parceiro
        SELECT * INTO v_member_rec
        FROM public.partner_members
        WHERE id = p_partner_member_id;
    ELSE
        -- 2. Gestor Escolar da mesma organização do membro
        SELECT pm.* INTO v_member_rec
        FROM public.partner_members pm
        JOIN public.organization_members om
          ON om.organization_id = pm.organization_id
         AND om.user_id = v_auth_user_id
         AND om.role = 'gestor'
         AND om.is_active = true
        WHERE pm.id = p_partner_member_id;
    END IF;

    IF v_member_rec.id IS NULL THEN
        RAISE EXCEPTION 'Registro de membro do parceiro não encontrado no tenant atual ou permissão insuficiente.'
            USING ERRCODE = 'P0002';
    END IF;

    IF v_member_rec.is_active = false THEN
        RETURN v_member_rec;
    END IF;

    UPDATE public.partner_members
    SET is_active = false,
        updated_at = now()
    WHERE id = p_partner_member_id
    RETURNING * INTO v_member_rec;

    RETURN v_member_rec;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_revoke_partner_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_revoke_partner_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_partner_member(UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
