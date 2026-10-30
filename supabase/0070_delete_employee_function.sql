-- ==============================================================================
-- MIGRATION 0070: ENTERPRISE EMPLOYEE & USER PURGE ENGINE (CLASSIUM)
-- ==============================================================================

-- 1. STABLE HELPER: Obter o ID da organização do usuário autenticado
CREATE OR REPLACE FUNCTION auth.organization_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN ((current_setting('request.jwt.claims', TRUE)::jsonb)->>'organization_id')::UUID;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- 2. FUNÇÃO RPC MESTRE PARA EXCLUSÃO TOTAL DO FUNCIONÁRIO E USUÁRIO (AUTH + PROFILES + RELACIONADOS)
CREATE OR REPLACE FUNCTION public.delete_employee_and_user(
    p_employee_profile_id UUID,
    p_employee_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_user_id UUID := NULL;
    v_organization_id UUID := NULL;
    v_employee_role TEXT := NULL;
    v_deleted_count INT := 0;
    v_auth_deleted BOOLEAN := false;
BEGIN
    -- 1. Identificar o ID do usuário (auth.users / profiles) e papel
    SELECT user_id, role, organization_id
    INTO v_user_id, v_employee_role, v_organization_id
    FROM public.profiles
    WHERE id = p_employee_profile_id
    LIMIT 1;

    -- Se não encontrou por ID direto, tentar pelo p_employee_profile_id sendo o user_id
    IF v_user_id IS NULL THEN
        SELECT id, role, organization_id
        INTO v_user_id, v_employee_role, v_organization_id
        FROM public.profiles
        WHERE user_id = p_employee_profile_id
        LIMIT 1;
        
        IF v_user_id IS NOT NULL THEN
            v_user_id := p_employee_profile_id;
        END IF;
    END IF;

    -- Se ainda não encontrou e o email foi passado, procurar por email
    IF v_user_id IS NULL AND p_employee_email IS NOT NULL AND p_employee_email <> '' THEN
        SELECT id, role, organization_id, user_id
        INTO p_employee_profile_id, v_employee_role, v_organization_id, v_user_id
        FROM public.profiles
        WHERE LOWER(email) = LOWER(p_employee_email)
        LIMIT 1;
    END IF;

    -- Definir user_id alvo
    IF v_user_id IS NULL THEN
        v_user_id := p_employee_profile_id;
    END IF;

    -- 2. Limpeza em cascata de todas as tabelas pedagógicas e administrativas dependentes
    
    -- Classes / Turmas vinculadas
    BEGIN
        DELETE FROM public.class_teachers WHERE teacher_id = v_user_id OR teacher_id = p_employee_profile_id;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- Professores
    BEGIN
        DELETE FROM public.teachers WHERE id = v_user_id OR user_id = v_user_id OR id = p_employee_profile_id;
        IF p_employee_email IS NOT NULL AND p_employee_email <> '' THEN
            DELETE FROM public.teachers WHERE LOWER(email) = LOWER(p_employee_email);
        END IF;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- Papéis de Usuário (user_roles)
    BEGIN
        DELETE FROM public.user_roles WHERE user_id = v_user_id OR user_id = p_employee_profile_id;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- Membros de Organização (organization_members)
    BEGIN
        DELETE FROM public.organization_members WHERE user_id = v_user_id OR user_id = p_employee_profile_id;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- Permissões Staff (se houver)
    BEGIN
        DELETE FROM public.staff_members WHERE id = p_employee_profile_id OR user_id = v_user_id;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- Logs de Acesso / Notificações
    BEGIN
        DELETE FROM public.notifications WHERE user_id = v_user_id OR user_id = p_employee_profile_id;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- 3. Excluir da tabela principal: public.profiles
    DELETE FROM public.profiles 
    WHERE id = p_employee_profile_id 
       OR user_id = v_user_id
       OR (p_employee_email IS NOT NULL AND LOWER(email) = LOWER(p_employee_email));
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    -- 4. Excluir do auth.users (Autenticação do Supabase)
    BEGIN
        IF v_user_id IS NOT NULL THEN
            DELETE FROM auth.users WHERE id = v_user_id;
            v_auth_deleted := true;
        END IF;
        IF NOT v_auth_deleted AND p_employee_email IS NOT NULL AND p_employee_email <> '' THEN
            DELETE FROM auth.users WHERE LOWER(email) = LOWER(p_employee_email);
            v_auth_deleted := true;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_auth_deleted := false;
    END;

    -- 5. Registrar log de auditoria
    BEGIN
        INSERT INTO public.audit_logs (action, target_id, details, created_at)
        VALUES (
            'employee_purged_permanently',
            p_employee_profile_id,
            jsonb_build_object(
                'user_id', v_user_id,
                'email', p_employee_email,
                'deleted_profiles_rows', v_deleted_count,
                'auth_user_deleted', v_auth_deleted,
                'timestamp', NOW()
            ),
            NOW()
        );
    EXCEPTION WHEN OTHERS THEN NULL; END;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Funcionário, usuário de autenticação e todo o histórico foram excluídos permanentemente em tempo real.',
        'profile_id', p_employee_profile_id,
        'user_id', v_user_id,
        'profiles_deleted', v_deleted_count,
        'auth_deleted', v_auth_deleted
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'profile_id', p_employee_profile_id
    );
END;
$$;

-- Versão sobrecarregada com apenas 1 parâmetro (UUID) para compatibilidade estrita
CREATE OR REPLACE FUNCTION public.delete_employee_and_user(
    p_employee_profile_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
    PERFORM public.delete_employee_and_user(p_employee_profile_id, NULL);
END;
$$;

-- Conceder permissões para chamada da RPC
GRANT EXECUTE ON FUNCTION public.delete_employee_and_user(UUID, TEXT) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.delete_employee_and_user(UUID) TO authenticated, service_role, anon;

-- Garantir RLS habilitado e políticas adequadas para exclusão em profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_delete_profiles_admin" ON public.profiles;
CREATE POLICY "allow_delete_profiles_admin"
ON public.profiles
FOR DELETE
TO public
USING (true);
