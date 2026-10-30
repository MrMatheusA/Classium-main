-- ====================================================================
-- EDUCA+ ERP EDUCACIONAL — COMPLEMENTARY CORE SQL (FASE 02)
-- ESTRUTURA ENTERPRISE DE ACESSOS, PERFIS, MENUS E RBAC AVANÇADO
-- PRONTO PARA SER EXECUTADO DIRETAMENTE NO SQL EDITOR DO SUPABASE.
-- ====================================================================

-- 1) SYSTEM PROFILES
CREATE TABLE IF NOT EXISTS public.system_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(100),
    color VARCHAR(50),
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID
);
COMMENT ON TABLE public.system_profiles IS 'Perfis mestres do sistema (Educa+Admin, Educa+Gestor, etc)';

-- Cadastrar os perfis padrão
INSERT INTO public.system_profiles (name, description, icon, color, sort_order) VALUES
('Educa+Admin', 'Administrador Master da Plataforma', 'shield', '#dc2626', 1),
('Educa+Gestor', 'Gestão Escolar e Direção', 'briefcase', '#2563eb', 2),
('Educa+Equipe', 'Colaboradores e Funcionários', 'users', '#16a34a', 3),
('Educa+Docente', 'Professores e Corpo Docente', 'book-open', '#ca8a04', 4),
('Educa+Família', 'Responsáveis e Estudantes', 'home', '#9333ea', 5)
ON CONFLICT (name) DO NOTHING;

-- 3) DEPARTMENTS (Departamentos)
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID
);
COMMENT ON TABLE public.departments IS 'Departamentos da instituição';

-- 2) JOB POSITIONS (Cargos)
CREATE TABLE IF NOT EXISTS public.job_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID
);
COMMENT ON TABLE public.job_positions IS 'Cargos e funções dos colaboradores';

-- 4) Complementar PROFILE
ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS system_profile_id UUID REFERENCES public.system_profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS job_position_id UUID REFERENCES public.job_positions(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS school_unit_id UUID REFERENCES public.school_units(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS admission_date DATE,
    ADD COLUMN IF NOT EXISTS termination_date DATE,
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ativo';

-- 12) MÚLTIPLOS PERFIS POR USUÁRIO & ENGINE MASTER
CREATE TABLE IF NOT EXISTS public.user_multiple_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    system_profile_id UUID NOT NULL REFERENCES public.system_profiles(id) ON DELETE CASCADE,
    job_position_id UUID REFERENCES public.job_positions(id) ON DELETE SET NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID,
    UNIQUE(user_id, school_id, system_profile_id)
);
COMMENT ON TABLE public.user_multiple_profiles IS 'Permite que um usuário assuma múltiplos perfis na mesma escola (ex: Professor e Coordenador)';

-- 5) MENUS
CREATE TABLE IF NOT EXISTS public.system_menus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    icon VARCHAR(100),
    route VARCHAR(255),
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID
);

-- Inserir menus base
INSERT INTO public.system_menus (name, sort_order) VALUES
('Instituição', 1), ('Funcionários', 2), ('Estudantes', 3), ('Professores', 4),
('Pedagógico', 5), ('Comunicação', 6), ('Agenda', 7), ('Transporte', 8),
('Alimentação', 9), ('Achados e Perdidos', 10), ('QR Code Portaria', 11),
('Educa+Smart', 12), ('Educa+Studio', 13), ('Carreira & Benefícios', 14),
('Financeiro', 15), ('Relatórios', 16), ('Radar de Rotina', 17),
('Configuração', 18), ('Marketplace', 19), ('Mentis Therapy', 20),
('Educa+Conecta', 21)
ON CONFLICT (name) DO NOTHING;

-- 6) SUBMENUS
CREATE TABLE IF NOT EXISTS public.system_submenus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_id UUID NOT NULL REFERENCES public.system_menus(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    route VARCHAR(255),
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID
);

-- 7) BOTÕES / ACTIONS
CREATE TABLE IF NOT EXISTS public.system_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    action_key VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID
);

INSERT INTO public.system_actions (name, action_key) VALUES
('Visualizar', 'view'), ('Criar', 'create'), ('Editar', 'edit'), ('Excluir', 'delete'),
('Exportar PDF', 'export_pdf'), ('Exportar Excel', 'export_excel'), ('Importar', 'import'),
('Imprimir', 'print'), ('Publicar', 'publish'), ('Arquivar', 'archive'), ('Aprovar', 'approve'),
('Cancelar', 'cancel'), ('Assinar', 'sign'), ('Enviar', 'send'), ('Duplicar', 'duplicate')
ON CONFLICT (name) DO NOTHING;

-- 8) MATRIZ DE PERMISSÕES
CREATE TABLE IF NOT EXISTS public.permission_matrix (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    system_profile_id UUID NOT NULL REFERENCES public.system_profiles(id) ON DELETE CASCADE,
    menu_id UUID REFERENCES public.system_menus(id) ON DELETE CASCADE,
    submenu_id UUID REFERENCES public.system_submenus(id) ON DELETE CASCADE,
    action_id UUID REFERENCES public.system_actions(id) ON DELETE CASCADE,
    is_allowed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID,
    UNIQUE NULLS NOT DISTINCT (system_profile_id, menu_id, submenu_id, action_id)
);

-- 9) PERMISSÕES INDIVIDUAIS
CREATE TABLE IF NOT EXISTS public.user_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    menu_id UUID REFERENCES public.system_menus(id) ON DELETE CASCADE,
    submenu_id UUID REFERENCES public.system_submenus(id) ON DELETE CASCADE,
    action_id UUID REFERENCES public.system_actions(id) ON DELETE CASCADE,
    is_allowed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID,
    UNIQUE NULLS NOT DISTINCT (user_id, school_id, menu_id, submenu_id, action_id)
);

-- 10) HISTÓRICO DE PERMISSÕES (AUDITORIA)
CREATE TABLE IF NOT EXISTS public.permission_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    target_profile_id UUID REFERENCES public.system_profiles(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL, -- 'matrix' ou 'individual'
    entity_id UUID NOT NULL,
    old_value BOOLEAN,
    new_value BOOLEAN,
    change_type VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14) ÍNDICES
CREATE INDEX IF NOT EXISTS idx_departments_school ON public.departments(school_id);
CREATE INDEX IF NOT EXISTS idx_job_positions_school ON public.job_positions(school_id);
CREATE INDEX IF NOT EXISTS idx_job_positions_dept ON public.job_positions(department_id);
CREATE INDEX IF NOT EXISTS idx_user_multiprof_user ON public.user_multiple_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_multiprof_school ON public.user_multiple_profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_system_submenus_menu ON public.system_submenus(menu_id);
CREATE INDEX IF NOT EXISTS idx_permission_matrix_profile ON public.permission_matrix(system_profile_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON public.user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_permission_history_school ON public.permission_history(school_id);
CREATE INDEX IF NOT EXISTS idx_profiles_sys_profile ON public.profiles(system_profile_id);
CREATE INDEX IF NOT EXISTS idx_profiles_job_pos ON public.profiles(job_position_id);

-- 16) TRIGGERS
-- Trigger function for updated_at (assumes public.set_updated_at_timestamp exists from previous setup)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at_timestamp') THEN
    CREATE FUNCTION public.set_updated_at_timestamp() RETURNS TRIGGER AS $F$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $F$ LANGUAGE plpgsql;
  END IF;
END $$;

CREATE TRIGGER trg_system_profiles_updated_at BEFORE UPDATE ON public.system_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();
CREATE TRIGGER trg_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();
CREATE TRIGGER trg_job_positions_updated_at BEFORE UPDATE ON public.job_positions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();
CREATE TRIGGER trg_user_multiple_profiles_updated_at BEFORE UPDATE ON public.user_multiple_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();
CREATE TRIGGER trg_system_menus_updated_at BEFORE UPDATE ON public.system_menus FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();
CREATE TRIGGER trg_system_submenus_updated_at BEFORE UPDATE ON public.system_submenus FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();
CREATE TRIGGER trg_system_actions_updated_at BEFORE UPDATE ON public.system_actions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();
CREATE TRIGGER trg_permission_matrix_updated_at BEFORE UPDATE ON public.permission_matrix FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();
CREATE TRIGGER trg_user_permissions_updated_at BEFORE UPDATE ON public.user_permissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- Universal Audit Logger (assumes public.universal_audit_logger exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'universal_audit_logger') THEN
    CREATE TRIGGER trg_audit_departments AFTER INSERT OR UPDATE OR DELETE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.universal_audit_logger();
    CREATE TRIGGER trg_audit_job_positions AFTER INSERT OR UPDATE OR DELETE ON public.job_positions FOR EACH ROW EXECUTE FUNCTION public.universal_audit_logger();
    CREATE TRIGGER trg_audit_permission_matrix AFTER INSERT OR UPDATE OR DELETE ON public.permission_matrix FOR EACH ROW EXECUTE FUNCTION public.universal_audit_logger();
    CREATE TRIGGER trg_audit_user_permissions AFTER INSERT OR UPDATE OR DELETE ON public.user_permissions FOR EACH ROW EXECUTE FUNCTION public.universal_audit_logger();
  END IF;
END $$;

-- Trigger Permission History Automático
CREATE OR REPLACE FUNCTION public.log_permission_change()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.permission_history (
        school_id, changed_by, target_profile_id, target_user_id, entity_type, entity_id, old_value, new_value, change_type
    ) VALUES (
        public.get_auth_school_id(), auth.uid(),
        CASE WHEN TG_TABLE_NAME = 'permission_matrix' THEN NEW.system_profile_id ELSE NULL END,
        CASE WHEN TG_TABLE_NAME = 'user_permissions' THEN NEW.user_id ELSE NULL END,
        TG_TABLE_NAME, COALESCE(NEW.id, OLD.id),
        OLD.is_allowed, NEW.is_allowed, TG_OP
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_log_permission_matrix AFTER UPDATE ON public.permission_matrix FOR EACH ROW WHEN (OLD.is_allowed IS DISTINCT FROM NEW.is_allowed) EXECUTE FUNCTION public.log_permission_change();
CREATE TRIGGER trg_log_user_permissions AFTER UPDATE ON public.user_permissions FOR EACH ROW WHEN (OLD.is_allowed IS DISTINCT FROM NEW.is_allowed) EXECUTE FUNCTION public.log_permission_change();

-- 13) RLS POLICIES
ALTER TABLE public.system_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_multiple_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_submenus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_history ENABLE ROW LEVEL SECURITY;

-- Engine Master Access Function
CREATE OR REPLACE FUNCTION public.is_engine_master()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (role = 'admin' OR (SELECT name FROM public.system_profiles WHERE id = system_profile_id) = 'Educa+Admin')
  );
$$;

-- Global Read for basic structural tables
DROP POLICY IF EXISTS "RLS_SystemProfiles_Select" ON public.system_profiles;
CREATE POLICY "RLS_SystemProfiles_Select" ON public.system_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "RLS_SystemMenus_Select" ON public.system_menus;
CREATE POLICY "RLS_SystemMenus_Select" ON public.system_menus FOR SELECT USING (true);
DROP POLICY IF EXISTS "RLS_SystemSubmenus_Select" ON public.system_submenus;
CREATE POLICY "RLS_SystemSubmenus_Select" ON public.system_submenus FOR SELECT USING (true);
DROP POLICY IF EXISTS "RLS_SystemActions_Select" ON public.system_actions;
CREATE POLICY "RLS_SystemActions_Select" ON public.system_actions FOR SELECT USING (true);

-- Department & Job Positions
DROP POLICY IF EXISTS "RLS_Departments_Select" ON public.departments;
CREATE POLICY "RLS_Departments_Select" ON public.departments FOR SELECT USING (school_id = public.get_auth_school_id() OR public.is_engine_master());
DROP POLICY IF EXISTS "RLS_Departments_Write" ON public.departments;
CREATE POLICY "RLS_Departments_Write" ON public.departments FOR ALL USING (school_id = public.get_auth_school_id() AND public.get_auth_user_role() IN ('admin', 'gestor'));

DROP POLICY IF EXISTS "RLS_JobPositions_Select" ON public.job_positions;
CREATE POLICY "RLS_JobPositions_Select" ON public.job_positions FOR SELECT USING (school_id = public.get_auth_school_id() OR public.is_engine_master());
DROP POLICY IF EXISTS "RLS_JobPositions_Write" ON public.job_positions;
CREATE POLICY "RLS_JobPositions_Write" ON public.job_positions FOR ALL USING (school_id = public.get_auth_school_id() AND public.get_auth_user_role() IN ('admin', 'gestor'));

-- Multiple Profiles
DROP POLICY IF EXISTS "RLS_MultipleProfiles_Select" ON public.user_multiple_profiles;
CREATE POLICY "RLS_MultipleProfiles_Select" ON public.user_multiple_profiles FOR SELECT USING (user_id = auth.uid() OR (school_id = public.get_auth_school_id() AND public.get_auth_user_role() IN ('admin', 'gestor')));
DROP POLICY IF EXISTS "RLS_MultipleProfiles_Write" ON public.user_multiple_profiles;
CREATE POLICY "RLS_MultipleProfiles_Write" ON public.user_multiple_profiles FOR ALL USING (school_id = public.get_auth_school_id() AND public.get_auth_user_role() IN ('admin', 'gestor'));

-- Permissions Read/Write
DROP POLICY IF EXISTS "RLS_PermissionMatrix_Select" ON public.permission_matrix;
CREATE POLICY "RLS_PermissionMatrix_Select" ON public.permission_matrix FOR SELECT USING (true);
DROP POLICY IF EXISTS "RLS_PermissionMatrix_Write" ON public.permission_matrix;
CREATE POLICY "RLS_PermissionMatrix_Write" ON public.permission_matrix FOR ALL USING (public.is_engine_master());

DROP POLICY IF EXISTS "RLS_UserPermissions_Select" ON public.user_permissions;
CREATE POLICY "RLS_UserPermissions_Select" ON public.user_permissions FOR SELECT USING (user_id = auth.uid() OR (school_id = public.get_auth_school_id() AND public.get_auth_user_role() IN ('admin', 'gestor')));
DROP POLICY IF EXISTS "RLS_UserPermissions_Write" ON public.user_permissions;
CREATE POLICY "RLS_UserPermissions_Write" ON public.user_permissions FOR ALL USING (school_id = public.get_auth_school_id() AND public.get_auth_user_role() IN ('admin', 'gestor'));

-- Permission History
DROP POLICY IF EXISTS "RLS_PermissionHistory_Select" ON public.permission_history;
CREATE POLICY "RLS_PermissionHistory_Select" ON public.permission_history FOR SELECT USING (school_id = public.get_auth_school_id() AND public.get_auth_user_role() IN ('admin', 'gestor'));
DROP POLICY IF EXISTS "RLS_PermissionHistory_Write" ON public.permission_history;
CREATE POLICY "RLS_PermissionHistory_Write" ON public.permission_history FOR ALL USING (public.is_engine_master());

-- 17) REALTIME
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE 
    public.system_profiles, 
    public.departments, 
    public.job_positions, 
    public.user_multiple_profiles, 
    public.system_menus, 
    public.system_submenus, 
    public.permission_matrix, 
    public.user_permissions;
EXCEPTION WHEN OTHERS THEN
  -- Ignore duplicate table errors in publication
END $$;
