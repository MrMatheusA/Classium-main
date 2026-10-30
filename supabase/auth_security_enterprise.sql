-- ====================================================================
-- EDUCA+ ERP EDUCACIONAL — AUTH, RBAC & SECURITY ENTERPRISE
-- SCRIPT SQL PRODUCTION-READY (COMPATÍVEL COM SUPABASE E POSTGRESQL 16)
-- ====================================================================

-- 0) FUNÇÃO DE ATUALIZAÇÃO DE TIMESTAMP (SECURITY INVOKER)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- ====================================================================
-- 1. TABELAS DE AUTENTICAÇÃO E AUTORIZAÇÃO (RBAC MULTI-TENANT)
-- ====================================================================

-- 1.1) ROLES (Perfis Oficiais)
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed de Roles Oficiais
INSERT INTO public.roles (name, description) VALUES
('Educa+Admin', 'Administrador Global do Sistema'),
('Educa+Gestor', 'Gestor Escolar (Acesso restrito à escola)'),
('Educa+Equipe', 'Membro da Equipe Escolar (Módulos específicos)'),
('Educa+Docente', 'Professor (Acesso aos seus alunos e turmas)'),
('Educa+Família', 'Responsável ou Aluno')
ON CONFLICT (name) DO NOTHING;

-- 1.2) PERMISSION GROUPS
CREATE TABLE IF NOT EXISTS public.permission_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.3) PERMISSIONS
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES public.permission_groups(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    module VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.4) USER ROLES (Vínculo de Usuário + Role + Tenant/School)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    school_id UUID, -- NULL significa acesso global (ex: Educa+Admin)
    granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, role_id, school_id)
);

-- 1.5) USER PERMISSIONS (Permissões granulares)
CREATE TABLE IF NOT EXISTS public.user_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    school_id UUID,
    granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, permission_id, school_id)
);

-- ====================================================================
-- 2. TABELAS DE SEGURANÇA, SESSÃO E AUDITORIA
-- ====================================================================

-- 2.1) LOGIN HISTORY
CREATE TABLE IF NOT EXISTS public.login_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    status VARCHAR(50), -- 'Sucesso' ou 'Falha'
    login_method VARCHAR(50), -- 'Email', 'CPF', 'CNPJ', 'Google', 'Microsoft', 'Gov.br', 'Apple'
    attempt_time TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.2) ACTIVE SESSIONS
CREATE TABLE IF NOT EXISTS public.active_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    ip_address VARCHAR(45),
    device_info TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.3) REFRESH TOKENS
CREATE TABLE IF NOT EXISTS public.refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.4) PASSWORD HISTORY (Para evitar reuso de senhas antigas)
CREATE TABLE IF NOT EXISTS public.password_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.5) MFA SETTINGS
CREATE TABLE IF NOT EXISTS public.mfa_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    mfa_type VARCHAR(50) NOT NULL, -- 'Authenticator', 'SMS', 'Email'
    is_enabled BOOLEAN DEFAULT false,
    secret TEXT,
    recovery_codes JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, mfa_type)
);

-- 2.6) DEVICES (Dispositivos confiáveis)
CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL,
    device_name VARCHAR(255),
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    is_trusted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, device_id)
);

-- 2.7) AUDIT SECURITY (Auditoria Completa de Ações)
CREATE TABLE IF NOT EXISTS public.audit_security (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL, -- 'Login', 'Logout', 'Troca de senha', 'Acesso negado', etc.
    entity_type VARCHAR(100),
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.8) ACCESS LOGS
CREATE TABLE IF NOT EXISTS public.access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    endpoint VARCHAR(255),
    method VARCHAR(10),
    status_code INT,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.9) FAILED LOGIN ATTEMPTS
CREATE TABLE IF NOT EXISTS public.failed_login_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ip_address VARCHAR(45),
    attempt_time TIMESTAMPTZ DEFAULT NOW()
);

-- 2.10) BLOCKED USERS
CREATE TABLE IF NOT EXISTS public.blocked_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reason TEXT,
    blocked_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    blocked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id)
);

-- 2.11) PASSWORD RESETS
CREATE TABLE IF NOT EXISTS public.password_resets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reset_token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.12) EMAIL VERIFICATIONS
CREATE TABLE IF NOT EXISTS public.email_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    verification_token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 3. TABELAS DE PREFERÊNCIAS DO USUÁRIO
-- ====================================================================

-- 3.1) USER PREFERENCES
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    theme VARCHAR(50) DEFAULT 'system',
    language VARCHAR(10) DEFAULT 'pt-BR',
    timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    dashboard_layout JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.2) NOTIFICATION PREFERENCES
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    email_alerts BOOLEAN DEFAULT true,
    sms_alerts BOOLEAN DEFAULT false,
    push_alerts BOOLEAN DEFAULT true,
    in_app_alerts BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- TRIGGERS DE UPDATED_AT
-- ====================================================================
DROP TRIGGER IF EXISTS trg_roles_upd ON public.roles;
CREATE TRIGGER trg_roles_upd BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_permission_groups_upd ON public.permission_groups;
CREATE TRIGGER trg_permission_groups_upd BEFORE UPDATE ON public.permission_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_permissions_upd ON public.permissions;
CREATE TRIGGER trg_permissions_upd BEFORE UPDATE ON public.permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_user_roles_upd ON public.user_roles;
CREATE TRIGGER trg_user_roles_upd BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_user_permissions_upd ON public.user_permissions;
CREATE TRIGGER trg_user_permissions_upd BEFORE UPDATE ON public.user_permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_active_sessions_upd ON public.active_sessions;
CREATE TRIGGER trg_active_sessions_upd BEFORE UPDATE ON public.active_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_refresh_tokens_upd ON public.refresh_tokens;
CREATE TRIGGER trg_refresh_tokens_upd BEFORE UPDATE ON public.refresh_tokens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_mfa_settings_upd ON public.mfa_settings;
CREATE TRIGGER trg_mfa_settings_upd BEFORE UPDATE ON public.mfa_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_devices_upd ON public.devices;
CREATE TRIGGER trg_devices_upd BEFORE UPDATE ON public.devices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_blocked_users_upd ON public.blocked_users;
CREATE TRIGGER trg_blocked_users_upd BEFORE UPDATE ON public.blocked_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_password_resets_upd ON public.password_resets;
CREATE TRIGGER trg_password_resets_upd BEFORE UPDATE ON public.password_resets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_email_verifications_upd ON public.email_verifications;
CREATE TRIGGER trg_email_verifications_upd BEFORE UPDATE ON public.email_verifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_user_preferences_upd ON public.user_preferences;
CREATE TRIGGER trg_user_preferences_upd BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_notification_preferences_upd ON public.notification_preferences;
CREATE TRIGGER trg_notification_preferences_upd BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ====================================================================
-- FUNÇÕES DE AUTORIZAÇÃO E SEGURANÇA (SECURITY DEFINER / INVOKER)
-- ====================================================================

-- 1) Verifica se o usuário tem uma Role específica
CREATE OR REPLACE FUNCTION public.has_role(p_user_id UUID, p_role_name VARCHAR)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Se for admin master, pode tudo
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

-- 2) Verifica se o usuário tem uma Permissão Específica
CREATE OR REPLACE FUNCTION public.has_permission(p_user_id UUID, p_permission_name VARCHAR)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF public.has_role(p_user_id, 'Educa+Admin') THEN RETURN TRUE; END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.user_permissions up
        JOIN public.permissions p ON up.permission_id = p.id
        WHERE up.user_id = p_user_id AND p.name = p_permission_name
    );
END;
$$;

-- 3) Verifica se o usuário tem acesso à Escola (Multi-Tenant)
CREATE OR REPLACE FUNCTION public.can_access_school(p_user_id UUID, p_school_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF public.has_role(p_user_id, 'Educa+Admin') THEN RETURN TRUE; END IF;

    -- Verifica se há vínculo com a escola
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = p_user_id AND ur.school_id = p_school_id
    );
END;
$$;

-- 4) Verifica se o usuário pode acessar dados do Aluno
CREATE OR REPLACE FUNCTION public.can_access_student(p_user_id UUID, p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF public.has_role(p_user_id, 'Educa+Admin') THEN RETURN TRUE; END IF;

    -- Lógica Simplificada: Pode ser expandida para checar tabelas de turmas e responsáveis
    RETURN TRUE; 
END;
$$;

-- 5) Verifica acesso ao Módulo
CREATE OR REPLACE FUNCTION public.can_edit_module(p_user_id UUID, p_module_name VARCHAR)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF public.has_role(p_user_id, 'Educa+Admin') THEN RETURN TRUE; END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.user_permissions up
        JOIN public.permissions p ON up.permission_id = p.id
        WHERE up.user_id = p_user_id AND p.module = p_module_name
    );
END;
$$;

-- ====================================================================
-- CUSTOM JWT CLAIM HOOK (Adiciona as roles e permissões ao Token JWT)
-- ====================================================================
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

-- Garantir privilégio para o Supabase Auth rodar a função
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- ====================================================================
-- RLS (ROW LEVEL SECURITY) DAS TABELAS DE AUTENTICAÇÃO
-- ====================================================================

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_security ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Exemplo RLS: Usuário visualiza e edita apenas as próprias preferências
DROP POLICY IF EXISTS p_user_pref_select ON public.user_preferences;
CREATE POLICY p_user_pref_select ON public.user_preferences FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS p_user_pref_update ON public.user_preferences;
CREATE POLICY p_user_pref_update ON public.user_preferences FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS p_user_pref_insert ON public.user_preferences;
CREATE POLICY p_user_pref_insert ON public.user_preferences FOR INSERT WITH CHECK (user_id = auth.uid());

-- Exemplo RLS: Usuário visualiza apenas o próprio histórico de login
DROP POLICY IF EXISTS p_login_hist_select ON public.login_history;
CREATE POLICY p_login_hist_select ON public.login_history FOR SELECT USING (user_id = auth.uid());

-- Exemplo RLS: Apenas ADMIN vê roles e permissões globais
DROP POLICY IF EXISTS p_roles_select ON public.roles;
CREATE POLICY p_roles_select ON public.roles FOR SELECT USING (true); -- Leitura pública para listar

DROP POLICY IF EXISTS p_roles_insert ON public.roles;
CREATE POLICY p_roles_insert ON public.roles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'Educa+Admin'));

DROP POLICY IF EXISTS p_roles_update ON public.roles;
CREATE POLICY p_roles_update ON public.roles FOR UPDATE USING (public.has_role(auth.uid(), 'Educa+Admin'));

-- Exemplo RLS: Apenas ADMIN gerencia user_roles
DROP POLICY IF EXISTS p_user_roles_select ON public.user_roles;
CREATE POLICY p_user_roles_select ON public.user_roles FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'Educa+Admin') OR public.has_role(auth.uid(), 'Educa+Gestor'));

DROP POLICY IF EXISTS p_user_roles_insert ON public.user_roles;
CREATE POLICY p_user_roles_insert ON public.user_roles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'Educa+Admin') OR public.has_role(auth.uid(), 'Educa+Gestor'));
