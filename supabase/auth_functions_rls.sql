-- ====================================================================
-- EDUCA+ ERP EDUCACIONAL — AUTH & RLS POLICIES
-- ====================================================================

-- FUNÇÕES DE AUTORIZAÇÃO (SECURITY DEFINER)
-- 1) Verifica se o usuário tem uma Role específica
CREATE OR REPLACE FUNCTION public.has_role(p_user_id UUID, p_role_name VARCHAR)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = p_user_id AND r.name = 'Educa+Admin'
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = p_user_id AND r.name = p_role_name
    );
END;
$$;

-- 2) Verifica se o usuário tem acesso à Escola (Multi-Tenant)
CREATE OR REPLACE FUNCTION public.can_access_school(p_user_id UUID, p_school_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF public.has_role(p_user_id, 'Educa+Admin') THEN RETURN TRUE; END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = p_user_id AND ur.school_id = p_school_id
    );
END;
$$;

-- CUSTOM JWT CLAIM HOOK (Adiciona as roles e permissões ao Token JWT Supabase)
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
    v_claims jsonb;
    v_user_roles jsonb;
    v_user_schools jsonb;
BEGIN
    -- Pega as roles do usuário
    SELECT COALESCE(jsonb_agg(r.name), '[]'::jsonb) INTO v_user_roles
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = (event->>'user_id')::uuid;

    -- Pega as escolas (Tenant IDs)
    SELECT COALESCE(jsonb_agg(ur.school_id), '[]'::jsonb) INTO v_user_schools
    FROM public.user_roles ur
    WHERE ur.user_id = (event->>'user_id')::uuid AND ur.school_id IS NOT NULL;

    v_claims := event->'claims';
    v_claims := jsonb_set(v_claims, '{app_roles}', v_user_roles);
    v_claims := jsonb_set(v_claims, '{app_schools}', v_user_schools);
    event := jsonb_set(event, '{claims}', v_claims);
    RETURN event;
END;
$$;

-- Privilégio Supabase Auth
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- RLS BÁSICO (Exemplos p/ Roles e Permissões)
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_user_pref_select ON public.user_preferences;
CREATE POLICY p_user_pref_select ON public.user_preferences FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS p_roles_select ON public.roles;
CREATE POLICY p_roles_select ON public.roles FOR SELECT USING (true);
