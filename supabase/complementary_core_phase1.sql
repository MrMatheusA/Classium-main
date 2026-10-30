-- ====================================================================
-- EDUCA+ ERP EDUCACIONAL — COMPLEMENTARY CORE SQL (FASE 01)
-- ESTE SCRIPT COMPLEMENTA A ESTRUTURA EXISTENTE SEM APAGAR DADOS.
-- PRONTO PARA SER EXECUTADO DIRETAMENTE NO SQL EDITOR DO SUPABASE.
-- ====================================================================

-- 1) SYSTEM SETTINGS (Configurações Globais)
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform_name VARCHAR(100) DEFAULT 'Educa+',
    version VARCHAR(20) DEFAULT '5.0.0',
    theme VARCHAR(50) DEFAULT 'light',
    logo_url TEXT,
    primary_color VARCHAR(20) DEFAULT '#0ea5e9',
    secondary_color VARCHAR(20) DEFAULT '#38bdf8',
    language VARCHAR(10) DEFAULT 'pt-BR',
    timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    maintenance_mode BOOLEAN DEFAULT false,
    auto_backup BOOLEAN DEFAULT true,
    ai_config JSONB DEFAULT '{}'::jsonb,
    email_config JSONB DEFAULT '{}'::jsonb,
    sms_config JSONB DEFAULT '{}'::jsonb,
    whatsapp_config JSONB DEFAULT '{}'::jsonb,
    pix_config JSONB DEFAULT '{}'::jsonb,
    mercadopago_config JSONB DEFAULT '{}'::jsonb,
    stripe_config JSONB DEFAULT '{}'::jsonb,
    asaas_config JSONB DEFAULT '{}'::jsonb,
    storage_config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID
);
COMMENT ON TABLE public.system_settings IS 'Configurações globais da plataforma Educa+';

-- 2) SCHOOL SETTINGS (Configurações da Escola)
CREATE TABLE IF NOT EXISTS public.school_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    academic_year INT DEFAULT 2026,
    school_days INT DEFAULT 200,
    default_schedule JSONB DEFAULT '{}'::jsonb,
    class_duration_minutes INT DEFAULT 50,
    classes_per_day INT DEFAULT 5,
    report_card_template VARCHAR(100) DEFAULT 'standard',
    certificate_template VARCHAR(100) DEFAULT 'standard',
    logo_url TEXT,
    banner_url TEXT,
    phone VARCHAR(30),
    email VARCHAR(255),
    website VARCHAR(255),
    social_networks JSONB DEFAULT '{}'::jsonb,
    qrcode_config JSONB DEFAULT '{}'::jsonb,
    notification_config JSONB DEFAULT '{}'::jsonb,
    family_config JSONB DEFAULT '{}'::jsonb,
    teacher_config JSONB DEFAULT '{}'::jsonb,
    manager_config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID,
    UNIQUE(school_id)
);
COMMENT ON TABLE public.school_settings IS 'Configurações específicas de cada instituição (Tenant)';

-- 3) LOGIN HISTORY (Histórico de Login)
CREATE TABLE IF NOT EXISTS public.login_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    login_time TIMESTAMPTZ DEFAULT NOW(),
    ip_address VARCHAR(45),
    city VARCHAR(100),
    state VARCHAR(50),
    country VARCHAR(50),
    device_type VARCHAR(50),
    os VARCHAR(50),
    browser VARCHAR(50),
    result VARCHAR(20) DEFAULT 'success',
    session_duration_minutes INT,
    logout_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.login_history IS 'Registro de acessos e logins de usuários';

-- 4) ACTIVE SESSIONS (Sessões Ativas)
CREATE TABLE IF NOT EXISTS public.active_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    refresh_token TEXT,
    login_time TIMESTAMPTZ DEFAULT NOW(),
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    ip_address VARCHAR(45),
    device_info TEXT,
    browser_info TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.active_sessions IS 'Sessões ativas dos usuários';

-- 5) USER DEVICES (Dispositivos)
CREATE TABLE IF NOT EXISTS public.user_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_type VARCHAR(50),
    brand VARCHAR(50),
    model VARCHAR(100),
    os VARCHAR(50),
    os_version VARCHAR(20),
    push_token TEXT,
    last_access TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.user_devices IS 'Dispositivos registrados pelos usuários para push notifications e auditoria';

-- 6) NOTIFICATIONS (Notificações)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'system',
    priority VARCHAR(20) DEFAULT 'normal',
    origin VARCHAR(100),
    module VARCHAR(100),
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
COMMENT ON TABLE public.notifications IS 'Fila e histórico de notificações de usuários';

-- 7) USER PREFERENCES (Preferências do Usuário)
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'pt-BR',
    favorite_menu JSONB DEFAULT '[]'::jsonb,
    home_page VARCHAR(100) DEFAULT '/dashboard',
    notifications_enabled BOOLEAN DEFAULT true,
    dark_mode BOOLEAN DEFAULT false,
    font_size VARCHAR(20) DEFAULT 'medium',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);
COMMENT ON TABLE public.user_preferences IS 'Configurações e preferências individuais dos usuários';

-- 8) STORAGE FOLDERS (Pastas de Arquivos)
CREATE TABLE IF NOT EXISTS public.storage_folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    bucket_name VARCHAR(100) NOT NULL,
    description TEXT,
    folder_type VARCHAR(50) DEFAULT 'general',
    is_private BOOLEAN DEFAULT false,
    parent_folder_id UUID REFERENCES public.storage_folders(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID
);
COMMENT ON TABLE public.storage_folders IS 'Organização hierárquica e lógica do Storage Supabase';

-- 9) UPLOADED FILES (Arquivos)
CREATE TABLE IF NOT EXISTS public.uploaded_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    folder_id UUID REFERENCES public.storage_folders(id) ON DELETE SET NULL,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    bucket_name VARCHAR(100) NOT NULL,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    extension VARCHAR(20),
    size_bytes BIGINT,
    file_hash VARCHAR(255),
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    module_source VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID
);
COMMENT ON TABLE public.uploaded_files IS 'Metadados e referências dos arquivos armazenados no Supabase Storage';

-- 10) API INTEGRATIONS (API Keys)
CREATE TABLE IF NOT EXISTS public.api_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    endpoint TEXT,
    public_key TEXT,
    encrypted_secret_key TEXT,
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID
);
COMMENT ON TABLE public.api_integrations IS 'Integrações e credenciais seguras de serviços terceiros (Stripe, Mercado Pago, etc)';

-- 11) ADVANCED AUDIT AUTOMATION & 12) TRIGGERS

-- Trigger function for updated_at (reusing existing public.set_updated_at_timestamp if available)
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

CREATE TRIGGER trg_system_settings_updated_at BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();
CREATE TRIGGER trg_school_settings_updated_at BEFORE UPDATE ON public.school_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();
CREATE TRIGGER trg_user_devices_updated_at BEFORE UPDATE ON public.user_devices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();
CREATE TRIGGER trg_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();
CREATE TRIGGER trg_storage_folders_updated_at BEFORE UPDATE ON public.storage_folders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();
CREATE TRIGGER trg_uploaded_files_updated_at BEFORE UPDATE ON public.uploaded_files FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();
CREATE TRIGGER trg_api_integrations_updated_at BEFORE UPDATE ON public.api_integrations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- Universal Audit Trigger Function
CREATE OR REPLACE FUNCTION public.universal_audit_logger()
RETURNS TRIGGER AS $$
DECLARE
  v_action VARCHAR;
  v_user_id UUID;
  v_school_id UUID;
  v_role VARCHAR;
BEGIN
  v_action := TG_OP;
  v_user_id := auth.uid();
  v_role := public.get_auth_user_role();
  
  BEGIN
    v_school_id := NEW.school_id;
  EXCEPTION WHEN OTHERS THEN
    v_school_id := NULL;
  END;

  IF v_school_id IS NULL THEN
    v_school_id := public.get_auth_school_id();
  END IF;

  INSERT INTO public.audit_logs (
    school_id,
    user_id,
    user_role,
    action,
    entity,
    details,
    ip_address
  ) VALUES (
    v_school_id,
    v_user_id,
    v_role,
    v_action,
    TG_TABLE_NAME,
    jsonb_build_object('record_id', COALESCE(NEW.id, OLD.id))::text,
    current_setting('request.headers', true)::json->>'x-forwarded-for'
  );
  
  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach Audit Triggers to Critical Configuration Tables
CREATE TRIGGER trg_audit_school_settings AFTER INSERT OR UPDATE OR DELETE ON public.school_settings FOR EACH ROW EXECUTE FUNCTION public.universal_audit_logger();
CREATE TRIGGER trg_audit_api_integrations AFTER INSERT OR UPDATE OR DELETE ON public.api_integrations FOR EACH ROW EXECUTE FUNCTION public.universal_audit_logger();

-- 13) INDEXES
CREATE INDEX IF NOT EXISTS idx_school_settings_school ON public.school_settings(school_id);
CREATE INDEX IF NOT EXISTS idx_login_history_user ON public.login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_school ON public.login_history(school_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_user ON public.active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_token ON public.active_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_devices_user ON public.user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_school ON public.notifications(user_id, school_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_storage_folders_school ON public.storage_folders(school_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_folder ON public.uploaded_files(folder_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_school ON public.uploaded_files(school_id);
CREATE INDEX IF NOT EXISTS idx_api_integrations_school ON public.api_integrations(school_id);

-- 15) ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_integrations ENABLE ROW LEVEL SECURITY;

-- System Settings
DROP POLICY IF EXISTS "RLS_SystemSettings_Select" ON public.system_settings;
CREATE POLICY "RLS_SystemSettings_Select" ON public.system_settings FOR SELECT USING (true);

-- School Settings
DROP POLICY IF EXISTS "RLS_SchoolSettings_Select" ON public.school_settings;
CREATE POLICY "RLS_SchoolSettings_Select" ON public.school_settings FOR SELECT USING (school_id = public.get_auth_school_id());
DROP POLICY IF EXISTS "RLS_SchoolSettings_Write" ON public.school_settings;
CREATE POLICY "RLS_SchoolSettings_Write" ON public.school_settings FOR ALL USING (school_id = public.get_auth_school_id() AND public.get_auth_user_role() IN ('admin', 'gestor'));

-- Login History
DROP POLICY IF EXISTS "RLS_LoginHistory_Select" ON public.login_history;
CREATE POLICY "RLS_LoginHistory_Select" ON public.login_history FOR SELECT USING (user_id = auth.uid() OR (school_id = public.get_auth_school_id() AND public.get_auth_user_role() IN ('admin', 'gestor')));

-- Active Sessions
DROP POLICY IF EXISTS "RLS_ActiveSessions_Select" ON public.active_sessions;
CREATE POLICY "RLS_ActiveSessions_Select" ON public.active_sessions FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "RLS_ActiveSessions_Write" ON public.active_sessions;
CREATE POLICY "RLS_ActiveSessions_Write" ON public.active_sessions FOR ALL USING (user_id = auth.uid());

-- User Devices
DROP POLICY IF EXISTS "RLS_UserDevices_Select" ON public.user_devices;
CREATE POLICY "RLS_UserDevices_Select" ON public.user_devices FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "RLS_UserDevices_Write" ON public.user_devices;
CREATE POLICY "RLS_UserDevices_Write" ON public.user_devices FOR ALL USING (user_id = auth.uid());

-- Notifications
DROP POLICY IF EXISTS "RLS_Notifications_Select" ON public.notifications;
CREATE POLICY "RLS_Notifications_Select" ON public.notifications FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "RLS_Notifications_Write" ON public.notifications;
CREATE POLICY "RLS_Notifications_Write" ON public.notifications FOR ALL USING (user_id = auth.uid() OR (school_id = public.get_auth_school_id() AND public.get_auth_user_role() IN ('admin', 'gestor')));

-- User Preferences
DROP POLICY IF EXISTS "RLS_UserPreferences_Select" ON public.user_preferences;
CREATE POLICY "RLS_UserPreferences_Select" ON public.user_preferences FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "RLS_UserPreferences_Write" ON public.user_preferences;
CREATE POLICY "RLS_UserPreferences_Write" ON public.user_preferences FOR ALL USING (user_id = auth.uid());

-- Storage Folders
DROP POLICY IF EXISTS "RLS_StorageFolders_Select" ON public.storage_folders;
CREATE POLICY "RLS_StorageFolders_Select" ON public.storage_folders FOR SELECT USING (school_id = public.get_auth_school_id() AND (is_private = false OR created_by = auth.uid() OR public.get_auth_user_role() IN ('admin', 'gestor')));
DROP POLICY IF EXISTS "RLS_StorageFolders_Write" ON public.storage_folders;
CREATE POLICY "RLS_StorageFolders_Write" ON public.storage_folders FOR ALL USING (school_id = public.get_auth_school_id() AND public.get_auth_user_role() IN ('admin', 'gestor', 'professor'));

-- Uploaded Files
DROP POLICY IF EXISTS "RLS_UploadedFiles_Select" ON public.uploaded_files;
CREATE POLICY "RLS_UploadedFiles_Select" ON public.uploaded_files FOR SELECT USING (school_id = public.get_auth_school_id());
DROP POLICY IF EXISTS "RLS_UploadedFiles_Write" ON public.uploaded_files;
CREATE POLICY "RLS_UploadedFiles_Write" ON public.uploaded_files FOR ALL USING (school_id = public.get_auth_school_id() AND public.get_auth_user_role() IN ('admin', 'gestor', 'professor'));

-- API Integrations
DROP POLICY IF EXISTS "RLS_ApiIntegrations_Select" ON public.api_integrations;
CREATE POLICY "RLS_ApiIntegrations_Select" ON public.api_integrations FOR SELECT USING (school_id = public.get_auth_school_id() AND public.get_auth_user_role() IN ('admin', 'gestor'));
DROP POLICY IF EXISTS "RLS_ApiIntegrations_Write" ON public.api_integrations;
CREATE POLICY "RLS_ApiIntegrations_Write" ON public.api_integrations FOR ALL USING (school_id = public.get_auth_school_id() AND public.get_auth_user_role() = 'admin');

-- 16) STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('educa_backups', 'educa_backups', false),
  ('educa_notificacoes', 'educa_notificacoes', true),
  ('educa_uploads', 'educa_uploads', true),
  ('educa_documentos_privados', 'educa_documentos_privados', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Read Access for Educa New Buckets" ON storage.objects;
CREATE POLICY "Public Read Access for Educa New Buckets" ON storage.objects FOR SELECT USING (bucket_id IN ('educa_notificacoes', 'educa_uploads'));

DROP POLICY IF EXISTS "Authenticated Upload Access for Educa New Buckets" ON storage.objects;
CREATE POLICY "Authenticated Upload Access for Educa New Buckets" ON storage.objects FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 17) REALTIME CONFIGURATION
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.system_settings, public.school_settings, public.notifications, public.user_preferences, public.storage_folders, public.uploaded_files;
EXCEPTION WHEN OTHERS THEN
  -- Ignore duplicate table errors in publication
END $$;
