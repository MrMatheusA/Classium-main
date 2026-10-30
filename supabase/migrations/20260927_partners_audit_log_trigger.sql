-- ==============================================================================
-- MIGRATION: 20260927_partners_audit_log_trigger.sql
-- PROJETO: Classium Gestão Educacional — Núcleo Enterprise de Parceiros
-- FASE: Etapa 1 — Passo 1.1-C2-B
-- OBJETIVO: Função e trigger de auditoria enterprise para public.partners
-- REGRAS:
--  - Execução AFTER INSERT OR UPDATE OR DELETE FOR EACH ROW em public.partners
--  - Gravação estrita na tabela canônica public.audit_logs
--  - SECURITY DEFINER com search_path = public, pg_temp
--  - Tratamento resiliente de auth.uid() e IP
--  - Zero mutações estruturais em audit_logs
--  - Zero inserção de dados de teste ou mocks
-- ==============================================================================

-- 1. Função canônica de auditoria para public.partners
CREATE OR REPLACE FUNCTION public.process_partner_audit_log()
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
    -- Capturar user_id da sessão Supabase Auth com fallback seguro para NULL
    BEGIN
        v_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;

    -- Capturar IP da requisição com tratamento de exceção seguro
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

    -- Mapeamento condicional por operação
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
            'partners',
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
            'partners',
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
            'partners',
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

-- 2. Trigger AFTER INSERT OR UPDATE OR DELETE em public.partners
DROP TRIGGER IF EXISTS trg_partners_audit_log ON public.partners;

CREATE TRIGGER trg_partners_audit_log
    AFTER INSERT OR UPDATE OR DELETE ON public.partners
    FOR EACH ROW
    EXECUTE FUNCTION public.process_partner_audit_log();

-- 3. Notificar reload de schema no PostgREST
NOTIFY pgrst, 'reload schema';
