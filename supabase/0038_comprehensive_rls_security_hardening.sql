-- ====================================================================
-- EDUCA+ ERP EDUCACIONAL — COMPREHENSIVE RLS & SECURITY HARDENING
-- ====================================================================

-- 1. FIX SEARCH_PATH ON ALL SECURITY DEFINER FUNCTIONS (Prevents search path hijacking)

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

-- Overload to support TEXT arguments and prevent type resolution errors
CREATE OR REPLACE FUNCTION public.has_role(p_user_id UUID, p_role_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN public.has_role(p_user_id, p_role_name::VARCHAR);
END;
$$;

CREATE OR REPLACE FUNCTION public.can_access_school(p_user_id UUID, p_school_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_school_id IS NULL THEN
        RETURN TRUE;
    END IF;

    IF public.has_role(p_user_id, 'Educa+Admin') THEN
        RETURN TRUE;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = p_user_id 
          AND (ur.organization_id = p_school_id OR ur.organization_id IS NULL)
    );
END;
$$;

-- 2. DYNAMICALLY ENABLE RLS ON 100% OF TABLES IN PUBLIC SCHEMA
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
    END LOOP;
END;
$$;

-- 3. CORE SYSTEM & MULTI-TENANT POLICIES

-- profiles
DROP POLICY IF EXISTS p_profiles_select ON public.profiles;
CREATE POLICY p_profiles_select ON public.profiles
    FOR SELECT USING (
        id = auth.uid() OR public.has_role(auth.uid(), 'Educa+Admin') OR public.has_role(auth.uid(), 'Educa+Gestor')
    );

DROP POLICY IF EXISTS p_profiles_update ON public.profiles;
CREATE POLICY p_profiles_update ON public.profiles
    FOR UPDATE USING (
        id = auth.uid() OR public.has_role(auth.uid(), 'Educa+Admin')
    );

-- organizations
DROP POLICY IF EXISTS p_organizations_select ON public.organizations;
CREATE POLICY p_organizations_select ON public.organizations
    FOR SELECT USING (
        public.can_access_school(auth.uid(), id) OR public.has_role(auth.uid(), 'Educa+Admin')
    );

DROP POLICY IF EXISTS p_organizations_admin ON public.organizations;
CREATE POLICY p_organizations_admin ON public.organizations
    FOR ALL USING (public.has_role(auth.uid(), 'Educa+Admin'));

-- students
DROP POLICY IF EXISTS p_students_select ON public.students;
CREATE POLICY p_students_select ON public.students
    FOR SELECT USING (
        public.can_access_school(auth.uid(), organization_id) OR
        id IN (SELECT student_id FROM public.family_links fl JOIN public.guardians g ON fl.guardian_id = g.id WHERE g.profile_id = auth.uid())
    );

DROP POLICY IF EXISTS p_students_all ON public.students;
CREATE POLICY p_students_all ON public.students
    FOR ALL USING (
        public.has_role(auth.uid(), 'Educa+Admin') OR
        public.has_role(auth.uid(), 'Educa+Gestor') OR
        public.has_role(auth.uid(), 'Educa+Secretaria')
    );

-- guardians
DROP POLICY IF EXISTS p_guardians_select ON public.guardians;
CREATE POLICY p_guardians_select ON public.guardians
    FOR SELECT USING (
        profile_id = auth.uid() OR public.can_access_school(auth.uid(), organization_id)
    );

-- classes & class_students
DROP POLICY IF EXISTS p_classes_select ON public.classes;
CREATE POLICY p_classes_select ON public.classes
    FOR SELECT USING (public.can_access_school(auth.uid(), organization_id));

-- teachers & teacher_classes
DROP POLICY IF EXISTS p_teachers_select ON public.teachers;
CREATE POLICY p_teachers_select ON public.teachers
    FOR SELECT USING (public.can_access_school(auth.uid(), organization_id));

-- subjects & grades
DROP POLICY IF EXISTS p_subjects_select ON public.subjects;
CREATE POLICY p_subjects_select ON public.subjects
    FOR SELECT USING (public.can_access_school(auth.uid(), organization_id));

DROP POLICY IF EXISTS p_grades_select ON public.grades;
CREATE POLICY p_grades_select ON public.grades
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()) OR
        student_id IN (SELECT student_id FROM public.family_links fl JOIN public.guardians g ON fl.guardian_id = g.id WHERE g.profile_id = auth.uid()) OR
        public.has_role(auth.uid(), 'Educa+Admin')
    );

-- orders & payments
DROP POLICY IF EXISTS p_orders_select ON public.orders;
CREATE POLICY p_orders_select ON public.orders
    FOR SELECT USING (
        public.can_access_school(auth.uid(), organization_id) OR
        public.has_role(auth.uid(), 'Educa+Financeiro') OR
        public.has_role(auth.uid(), 'Educa+Admin')
    );

-- DEFAULT CATCH-ALL POLICIES FOR UNHANDLED TABLES (Authenticated users with admin/school access)
-- Ensures no table is left open or un-guarded while allowing authenticated operations
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename NOT IN (
            SELECT DISTINCT tablename FROM pg_policies 
            WHERE schemaname = 'public' 
              AND policyname NOT IN ('p_default_auth_select', 'p_default_admin_all', 'p_default_tenant_select', 'p_default_tenant_all')
          )
    ) LOOP
        -- Clean up default policies if they already exist
        EXECUTE format('DROP POLICY IF EXISTS p_default_auth_select ON public.%I;', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS p_default_admin_all ON public.%I;', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS p_default_tenant_select ON public.%I;', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS p_default_tenant_all ON public.%I;', r.tablename);

        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = r.tablename 
              AND column_name = 'organization_id'
        ) THEN
            -- Table has organization_id column: isolate by tenant!
            EXECUTE format('
                CREATE POLICY p_default_tenant_select ON public.%I 
                FOR SELECT USING (public.can_access_school(auth.uid(), organization_id));
                
                CREATE POLICY p_default_tenant_all ON public.%I 
                FOR ALL USING (
                    public.has_role(auth.uid(), ''Educa+Admin'') OR 
                    (public.has_role(auth.uid(), ''Educa+Gestor'') AND public.can_access_school(auth.uid(), organization_id))
                );
            ', r.tablename, r.tablename);
        ELSE
            -- Table does not have organization_id: use standard authenticated access
            EXECUTE format('
                CREATE POLICY p_default_auth_select ON public.%I 
                FOR SELECT USING (auth.role() = ''authenticated'');
                
                CREATE POLICY p_default_admin_all ON public.%I 
                FOR ALL USING (public.has_role(auth.uid(), ''Educa+Admin''));
            ', r.tablename, r.tablename);
        END IF;
    END LOOP;
END;
$$;
