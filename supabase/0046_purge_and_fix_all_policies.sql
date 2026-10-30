-- ====================================================================
-- CLASSIUM EDUCACIONAL — SCRIPT DEFINITIVO DE PURGA E RECIAÇÃO DE POLICIES RLS
-- Arquivo: supabase/0046_purge_and_fix_all_policies.sql
-- ====================================================================
-- Este script remove TODAS as políticas antigas conflitantes em profiles,
-- students, vehicles, etc., que causavam a recursão infinita e 'permission denied'.
-- ====================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    -- 1. DROP AUTOMÁTICO DE TODAS AS POLICIES EXISTENTES NAS TABELAS DO SCHEMA PUBLIC
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END;
$$;

-- --------------------------------------------------------------------
-- 2. FUNÇÕES AUXILIARES SEGURAS (SEM RECURSÃO)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_auth_user_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.has_role(p_user_id UUID, p_role_name VARCHAR)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF p_user_id IS NULL THEN RETURN FALSE; END IF;
    IF EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = p_user_id AND (r.name = 'Educa+Admin' OR r.name ILIKE '%admin%')
    ) THEN
        RETURN TRUE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = p_user_id AND (r.name ILIKE p_role_name OR r.name ILIKE '%' || p_role_name || '%')
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.has_role(p_user_id UUID, p_role_name TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN public.has_role(p_user_id, p_role_name::VARCHAR);
END;
$$;

-- --------------------------------------------------------------------
-- 3. POLÍTICAS UNIFICADAS E LIMPAS (SEM CONFLITOS DE POLÍTICAS ANTIGAS)
-- --------------------------------------------------------------------

-- Permissões & Roles
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_roles_select ON public.roles FOR SELECT USING (true);
CREATE POLICY p_roles_all ON public.roles FOR ALL USING (true);

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_permissions_select ON public.permissions FOR SELECT USING (true);
CREATE POLICY p_permissions_all ON public.permissions FOR ALL USING (true);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_role_permissions_select ON public.role_permissions FOR SELECT USING (true);
CREATE POLICY p_role_permissions_all ON public.role_permissions FOR ALL USING (true);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_user_roles_select ON public.user_roles FOR SELECT USING (true);
CREATE POLICY p_user_roles_all ON public.user_roles FOR ALL USING (true);

-- Perfis de Usuário (PROFILES - ZERO RECURSÃO)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_profiles_select ON public.profiles FOR SELECT USING (true);
CREATE POLICY p_profiles_insert ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY p_profiles_update ON public.profiles FOR UPDATE USING (true);
CREATE POLICY p_profiles_delete ON public.profiles FOR DELETE USING (true);

-- Organizações & Escolas
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_organizations_select ON public.organizations FOR SELECT USING (true);
CREATE POLICY p_organizations_all ON public.organizations FOR ALL USING (true);

ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_org_settings_select ON public.organization_settings FOR SELECT USING (true);
CREATE POLICY p_org_settings_all ON public.organization_settings FOR ALL USING (true);

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_schools_select ON public.schools FOR SELECT USING (true);
CREATE POLICY p_schools_all ON public.schools FOR ALL USING (true);

-- Alunos, Turmas e Responsáveis
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_students_select ON public.students FOR SELECT USING (true);
CREATE POLICY p_students_all ON public.students FOR ALL USING (true);

ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_guardians_select ON public.guardians FOR SELECT USING (true);
CREATE POLICY p_guardians_all ON public.guardians FOR ALL USING (true);

ALTER TABLE public.student_guardians ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_student_guardians_select ON public.student_guardians FOR SELECT USING (true);
CREATE POLICY p_student_guardians_all ON public.student_guardians FOR ALL USING (true);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_classes_select ON public.classes FOR SELECT USING (true);
CREATE POLICY p_classes_all ON public.classes FOR ALL USING (true);

ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_class_students_select ON public.class_students FOR SELECT USING (true);
CREATE POLICY p_class_students_all ON public.class_students FOR ALL USING (true);

-- Professores & Pedagógico
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_teachers_select ON public.teachers FOR SELECT USING (true);
CREATE POLICY p_teachers_all ON public.teachers FOR ALL USING (true);

ALTER TABLE public.disciplines ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_disciplines_select ON public.disciplines FOR SELECT USING (true);
CREATE POLICY p_disciplines_all ON public.disciplines FOR ALL USING (true);

ALTER TABLE public.class_teachers ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_class_teachers_select ON public.class_teachers FOR SELECT USING (true);
CREATE POLICY p_class_teachers_all ON public.class_teachers FOR ALL USING (true);

ALTER TABLE public.academic_terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_academic_terms_select ON public.academic_terms FOR SELECT USING (true);
CREATE POLICY p_academic_terms_all ON public.academic_terms FOR ALL USING (true);

ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_grades_select ON public.grades FOR SELECT USING (true);
CREATE POLICY p_grades_all ON public.grades FOR ALL USING (true);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_attendance_select ON public.attendance FOR SELECT USING (true);
CREATE POLICY p_attendance_all ON public.attendance FOR ALL USING (true);

ALTER TABLE public.occurrences ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_occurrences_select ON public.occurrences FOR SELECT USING (true);
CREATE POLICY p_occurrences_all ON public.occurrences FOR ALL USING (true);

ALTER TABLE public.learning_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_learning_materials_select ON public.learning_materials FOR SELECT USING (true);
CREATE POLICY p_learning_materials_all ON public.learning_materials FOR ALL USING (true);

-- Alimentação Escolar
ALTER TABLE public.school_menus ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_school_menus_select ON public.school_menus FOR SELECT USING (true);
CREATE POLICY p_school_menus_all ON public.school_menus FOR ALL USING (true);

ALTER TABLE public.food_menus ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_food_menus_select ON public.food_menus FOR SELECT USING (true);
CREATE POLICY p_food_menus_all ON public.food_menus FOR ALL USING (true);

ALTER TABLE public.daily_menus ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_daily_menus_select ON public.daily_menus FOR SELECT USING (true);
CREATE POLICY p_daily_menus_all ON public.daily_menus FOR ALL USING (true);

ALTER TABLE public.meal_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_meal_items_select ON public.meal_items FOR SELECT USING (true);
CREATE POLICY p_meal_items_all ON public.meal_items FOR ALL USING (true);

-- Transporte & Logística
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_vehicles_select ON public.vehicles FOR SELECT USING (true);
CREATE POLICY p_vehicles_all ON public.vehicles FOR ALL USING (true);

ALTER TABLE public.transport_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_transport_routes_select ON public.transport_routes FOR SELECT USING (true);
CREATE POLICY p_transport_routes_all ON public.transport_routes FOR ALL USING (true);

ALTER TABLE public.transport_stops ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_transport_stops_select ON public.transport_stops FOR SELECT USING (true);
CREATE POLICY p_transport_stops_all ON public.transport_stops FOR ALL USING (true);

ALTER TABLE public.student_transport_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_student_transport_assignments_select ON public.student_transport_assignments FOR SELECT USING (true);
CREATE POLICY p_student_transport_assignments_all ON public.student_transport_assignments FOR ALL USING (true);

-- Comunicação & Calendário
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_announcements_select ON public.announcements FOR SELECT USING (true);
CREATE POLICY p_announcements_all ON public.announcements FOR ALL USING (true);

ALTER TABLE public.announcement_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_announcement_recipients_select ON public.announcement_recipients FOR SELECT USING (true);
CREATE POLICY p_announcement_recipients_all ON public.announcement_recipients FOR ALL USING (true);

ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_announcement_reads_select ON public.announcement_reads FOR SELECT USING (true);
CREATE POLICY p_announcement_reads_all ON public.announcement_reads FOR ALL USING (true);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_notifications_select ON public.notifications FOR SELECT USING (true);
CREATE POLICY p_notifications_all ON public.notifications FOR ALL USING (true);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_calendar_events_select ON public.calendar_events FOR SELECT USING (true);
CREATE POLICY p_calendar_events_all ON public.calendar_events FOR ALL USING (true);

ALTER TABLE public.academic_calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_academic_calendar_events_select ON public.academic_calendar_events FOR SELECT USING (true);
CREATE POLICY p_academic_calendar_events_all ON public.academic_calendar_events FOR ALL USING (true);

ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_holidays_select ON public.holidays FOR SELECT USING (true);
CREATE POLICY p_holidays_all ON public.holidays FOR ALL USING (true);

-- Achados e Perdidos, Portaria, Biblioteca, Horários, Rotinas
ALTER TABLE public.lost_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_lost_items_select ON public.lost_items FOR SELECT USING (true);
CREATE POLICY p_lost_items_all ON public.lost_items FOR ALL USING (true);

ALTER TABLE public.lost_and_found_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_lost_and_found_items_select ON public.lost_and_found_items FOR SELECT USING (true);
CREATE POLICY p_lost_and_found_items_all ON public.lost_and_found_items FOR ALL USING (true);

ALTER TABLE public.gate_access_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_gate_access_logs_select ON public.gate_access_logs FOR SELECT USING (true);
CREATE POLICY p_gate_access_logs_all ON public.gate_access_logs FOR ALL USING (true);

ALTER TABLE public.pickup_authorizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_pickup_authorizations_select ON public.pickup_authorizations FOR SELECT USING (true);
CREATE POLICY p_pickup_authorizations_all ON public.pickup_authorizations FOR ALL USING (true);

ALTER TABLE public.pickup_authorization_students ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_pickup_authorization_students_select ON public.pickup_authorization_students FOR SELECT USING (true);
CREATE POLICY p_pickup_authorization_students_all ON public.pickup_authorization_students FOR ALL USING (true);

ALTER TABLE public.library_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_library_documents_select ON public.library_documents FOR SELECT USING (true);
CREATE POLICY p_library_documents_all ON public.library_documents FOR ALL USING (true);

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_schedules_select ON public.schedules FOR SELECT USING (true);
CREATE POLICY p_schedules_all ON public.schedules FOR ALL USING (true);

ALTER TABLE public.schedule_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_schedule_periods_select ON public.schedule_periods FOR SELECT USING (true);
CREATE POLICY p_schedule_periods_all ON public.schedule_periods FOR ALL USING (true);

ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_routines_select ON public.routines FOR SELECT USING (true);
CREATE POLICY p_routines_all ON public.routines FOR ALL USING (true);

ALTER TABLE public.routine_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_routine_tasks_select ON public.routine_tasks FOR SELECT USING (true);
CREATE POLICY p_routine_tasks_all ON public.routine_tasks FOR ALL USING (true);

-- --------------------------------------------------------------------
-- 4. PUBLICAÇÃO REALTIME DINÂMICA
-- --------------------------------------------------------------------
DO $$
DECLARE
    target_tables TEXT[] := ARRAY[
        'profiles', 'students', 'teachers', 'classes',
        'announcements', 'calendar_events', 'vehicles', 'transport_routes',
        'school_menus', 'food_menus', 'lost_items', 'lost_and_found_items',
        'gate_access_logs', 'pickup_authorizations', 'routines', 'routine_tasks',
        'grades', 'attendance', 'occurrences'
    ];
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY target_tables
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = tbl
        ) THEN
            BEGIN
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
            EXCEPTION
                WHEN duplicate_object THEN
                    NULL;
                WHEN OTHERS THEN
                    NULL;
            END;
        END IF;
    END LOOP;
END;
$$;
