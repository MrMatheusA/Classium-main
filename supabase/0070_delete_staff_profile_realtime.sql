-- ==============================================================================
-- MIGRATION 0070: PURGE STAFF & PROFILES REALTIME DELETION ENGINE
-- CLASSIUM — PLATAFORMA EDUCACIONAL UNIFICADA
-- ==============================================================================

-- 1. ATOMIC FUNCTION TO PURGE EMPLOYEE PROFILE AND ALL RELATED HISTORICAL DATA
CREATE OR REPLACE FUNCTION public.purge_staff_and_profile_atomic(
    target_user_id TEXT,
    target_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    deleted_count INT := 0;
    valid_uuid UUID := NULL;
BEGIN
    -- Validate UUID format safely
    BEGIN
        IF target_user_id IS NOT NULL AND target_user_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
            valid_uuid := target_user_id::UUID;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        valid_uuid := NULL;
    END;

    -- Clean up user roles
    IF valid_uuid IS NOT NULL THEN
        DELETE FROM public.user_roles WHERE user_id = valid_uuid;
    END IF;

    -- Clean up organization members
    IF valid_uuid IS NOT NULL THEN
        DELETE FROM public.organization_members WHERE user_id = valid_uuid;
    END IF;

    -- Clean up teachers table
    IF valid_uuid IS NOT NULL THEN
        DELETE FROM public.teachers WHERE id = valid_uuid OR user_id = valid_uuid;
    END IF;
    IF target_email IS NOT NULL AND target_email <> '' THEN
        DELETE FROM public.teachers WHERE LOWER(email) = LOWER(target_email);
    END IF;

    -- Clean up profiles table by UUID
    IF valid_uuid IS NOT NULL THEN
        DELETE FROM public.profiles WHERE id = valid_uuid;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
    END IF;

    -- Clean up profiles table by email if not deleted yet
    IF deleted_count = 0 AND target_email IS NOT NULL AND target_email <> '' THEN
        DELETE FROM public.profiles WHERE LOWER(email) = LOWER(target_email);
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
    END IF;

    -- Clean up system_profiles if table exists
    BEGIN
        IF valid_uuid IS NOT NULL THEN
            DELETE FROM public.system_profiles WHERE user_id = valid_uuid OR id = valid_uuid;
        END IF;
        IF target_email IS NOT NULL AND target_email <> '' THEN
            DELETE FROM public.system_profiles WHERE LOWER(email) = LOWER(target_email);
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Ignore if system_profiles doesn't exist
    END;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Histórico e perfil do funcionário removidos com sucesso em tempo real.',
        'target_id', target_user_id,
        'target_email', target_email,
        'deleted_from_profiles', deleted_count
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'target_id', target_user_id
    );
END;
$$;

-- Grant execution permission to public & authenticated roles
GRANT EXECUTE ON FUNCTION public.purge_staff_and_profile_atomic(TEXT, TEXT) TO anon, authenticated, service_role;

-- Ensure RLS on profiles allows delete operations for staff management
DO $$
BEGIN
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Drop existing delete policies on profiles to prevent conflicts
DROP POLICY IF EXISTS "Allow delete profiles authenticated" ON public.profiles;
DROP POLICY IF EXISTS "Allow delete profiles all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;

CREATE POLICY "profiles_delete_policy"
ON public.profiles
FOR DELETE
TO public
USING (true);

-- Ensure publication includes profiles for Realtime sync
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;
END $$;
