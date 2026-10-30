-- ====================================================================
-- EDUCA+ ERP EDUCACIONAL — MARKETPLACE EDUCACIONAL (ENTERPRISE)
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
-- CRIAÇÃO DAS TABELAS
-- ====================================================================

-- 1) advertiser_categories
CREATE TABLE IF NOT EXISTS public.advertiser_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) subscription_plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES public.advertiser_categories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    promotional_price DECIMAL(10,2),
    description TEXT,
    card_color VARCHAR(50),
    highlight_color VARCHAR(50),
    position INT DEFAULT 0,
    photo_limit INT DEFAULT 1,
    banner_limit INT DEFAULT 0,
    video_limit INT DEFAULT 0,
    highlight_limit INT DEFAULT 0,
    allow_whatsapp BOOLEAN DEFAULT false,
    allow_website BOOLEAN DEFAULT false,
    allow_statistics BOOLEAN DEFAULT false,
    allow_leads BOOLEAN DEFAULT false,
    allow_ai BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'Ativo',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3) advertisers
CREATE TABLE IF NOT EXISTS public.advertisers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    advertiser_type VARCHAR(50) NOT NULL,
    cpf VARCHAR(20),
    cnpj VARCHAR(20),
    name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    company_name VARCHAR(255),
    phone VARCHAR(20),
    whatsapp VARCHAR(20),
    email VARCHAR(255),
    password_hash VARCHAR(255),
    photo_url TEXT,
    banner_url TEXT,
    logo_url TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    address TEXT,
    website TEXT,
    instagram TEXT,
    facebook TEXT,
    linkedin TEXT,
    category_id UUID REFERENCES public.advertiser_categories(id) ON DELETE SET NULL,
    plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'Pendente',
    approval_date TIMESTAMPTZ,
    admin_responsible_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 4) advertiser_cards
CREATE TABLE IF NOT EXISTS public.advertiser_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    advertiser_id UUID NOT NULL REFERENCES public.advertisers(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    description TEXT,
    summary TEXT,
    specialties TEXT,
    duration VARCHAR(100),
    investment DECIMAL(10,2),
    monthly_fee DECIMAL(10,2),
    discount VARCHAR(100),
    whatsapp VARCHAR(20),
    website TEXT,
    main_image_url TEXT,
    banner_url TEXT,
    gallery_urls JSONB DEFAULT '[]'::jsonb,
    video_url TEXT,
    card_color VARCHAR(50),
    highlight_type VARCHAR(100),
    display_order INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Rascunho',
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5) subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    advertiser_id UUID NOT NULL REFERENCES public.advertisers(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50),
    pix_key TEXT,
    card_info TEXT,
    status VARCHAR(50) DEFAULT 'Ativa',
    renewal_date DATE,
    next_due_date DATE,
    grace_period_days INT DEFAULT 0,
    is_cancelled BOOLEAN DEFAULT false,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6) invoices
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    advertiser_id UUID NOT NULL REFERENCES public.advertisers(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) UNIQUE,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pendente',
    pix_code TEXT,
    card_transaction_id TEXT,
    payment_link TEXT,
    receipt_url TEXT,
    due_date DATE,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7) advertiser_leads
CREATE TABLE IF NOT EXISTS public.advertiser_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    advertiser_id UUID NOT NULL REFERENCES public.advertisers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    origin VARCHAR(100),
    message TEXT,
    status VARCHAR(50) DEFAULT 'Novo',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8) advertiser_messages
CREATE TABLE IF NOT EXISTS public.advertiser_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    advertiser_id UUID NOT NULL REFERENCES public.advertisers(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    sender_name VARCHAR(255),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9) advertiser_statistics
CREATE TABLE IF NOT EXISTS public.advertiser_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    advertiser_id UUID NOT NULL REFERENCES public.advertisers(id) ON DELETE CASCADE,
    views INT DEFAULT 0,
    clicks INT DEFAULT 0,
    conversions INT DEFAULT 0,
    contacts INT DEFAULT 0,
    favorites INT DEFAULT 0,
    shares INT DEFAULT 0,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (advertiser_id, date)
);

-- 10) promotions
CREATE TABLE IF NOT EXISTS public.promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    advertiser_card_id UUID NOT NULL REFERENCES public.advertiser_cards(id) ON DELETE CASCADE,
    promotional_price DECIMAL(10,2) NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    show_timer BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11) card_click_logs
CREATE TABLE IF NOT EXISTS public.card_click_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    advertiser_card_id UUID NOT NULL REFERENCES public.advertiser_cards(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    click_source VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12) plan_change_history
CREATE TABLE IF NOT EXISTS public.plan_change_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    advertiser_id UUID NOT NULL REFERENCES public.advertisers(id) ON DELETE CASCADE,
    old_plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
    new_plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13) advertiser_documents
CREATE TABLE IF NOT EXISTS public.advertiser_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    advertiser_id UUID NOT NULL REFERENCES public.advertisers(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    file_url TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Pendente',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14) advertiser_reviews
CREATE TABLE IF NOT EXISTS public.advertiser_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    advertiser_id UUID NOT NULL REFERENCES public.advertisers(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewer_type VARCHAR(50) CHECK (reviewer_type IN ('Família', 'Professor', 'Gestor', 'Outro')),
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    status VARCHAR(50) DEFAULT 'Pendente',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15) advertiser_favorites
CREATE TABLE IF NOT EXISTS public.advertiser_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    advertiser_card_id UUID NOT NULL REFERENCES public.advertiser_cards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (advertiser_card_id, user_id)
);

-- 16) advertiser_notifications
CREATE TABLE IF NOT EXISTS public.advertiser_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    advertiser_id UUID NOT NULL REFERENCES public.advertisers(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17) marketplace_settings
CREATE TABLE IF NOT EXISTS public.marketplace_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- ÍNDICES (INDEXES)
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_advertisers_category ON public.advertisers(category_id);
CREATE INDEX IF NOT EXISTS idx_advertisers_plan ON public.advertisers(plan_id);
CREATE INDEX IF NOT EXISTS idx_advertisers_status ON public.advertisers(status);
CREATE INDEX IF NOT EXISTS idx_advertisers_city_state ON public.advertisers(city, state);
CREATE INDEX IF NOT EXISTS idx_advertiser_cards_adv ON public.advertiser_cards(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_advertiser_cards_pub ON public.advertiser_cards(is_published);
CREATE INDEX IF NOT EXISTS idx_subscriptions_adv ON public.subscriptions(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_invoices_sub ON public.invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_leads_adv ON public.advertiser_leads(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_reviews_adv ON public.advertiser_reviews(advertiser_id);

-- ====================================================================
-- TRIGGERS PARA UPDATED_AT
-- ====================================================================
DROP TRIGGER IF EXISTS trg_advertiser_categories_upd ON public.advertiser_categories;
CREATE TRIGGER trg_advertiser_categories_upd BEFORE UPDATE ON public.advertiser_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_subscription_plans_upd ON public.subscription_plans;
CREATE TRIGGER trg_subscription_plans_upd BEFORE UPDATE ON public.subscription_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_advertisers_upd ON public.advertisers;
CREATE TRIGGER trg_advertisers_upd BEFORE UPDATE ON public.advertisers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_advertiser_cards_upd ON public.advertiser_cards;
CREATE TRIGGER trg_advertiser_cards_upd BEFORE UPDATE ON public.advertiser_cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_subscriptions_upd ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_upd BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_invoices_upd ON public.invoices;
CREATE TRIGGER trg_invoices_upd BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_advertiser_leads_upd ON public.advertiser_leads;
CREATE TRIGGER trg_advertiser_leads_upd BEFORE UPDATE ON public.advertiser_leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_advertiser_messages_upd ON public.advertiser_messages;
CREATE TRIGGER trg_advertiser_messages_upd BEFORE UPDATE ON public.advertiser_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_advertiser_statistics_upd ON public.advertiser_statistics;
CREATE TRIGGER trg_advertiser_statistics_upd BEFORE UPDATE ON public.advertiser_statistics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_promotions_upd ON public.promotions;
CREATE TRIGGER trg_promotions_upd BEFORE UPDATE ON public.promotions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_card_click_logs_upd ON public.card_click_logs;
CREATE TRIGGER trg_card_click_logs_upd BEFORE UPDATE ON public.card_click_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_plan_change_history_upd ON public.plan_change_history;
CREATE TRIGGER trg_plan_change_history_upd BEFORE UPDATE ON public.plan_change_history FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_advertiser_documents_upd ON public.advertiser_documents;
CREATE TRIGGER trg_advertiser_documents_upd BEFORE UPDATE ON public.advertiser_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_advertiser_reviews_upd ON public.advertiser_reviews;
CREATE TRIGGER trg_advertiser_reviews_upd BEFORE UPDATE ON public.advertiser_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_advertiser_favorites_upd ON public.advertiser_favorites;
CREATE TRIGGER trg_advertiser_favorites_upd BEFORE UPDATE ON public.advertiser_favorites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_advertiser_notifications_upd ON public.advertiser_notifications;
CREATE TRIGGER trg_advertiser_notifications_upd BEFORE UPDATE ON public.advertiser_notifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_marketplace_settings_upd ON public.marketplace_settings;
CREATE TRIGGER trg_marketplace_settings_upd BEFORE UPDATE ON public.marketplace_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ====================================================================
-- RLS (ROW LEVEL SECURITY) POLICIES
-- ====================================================================

ALTER TABLE public.advertiser_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertiser_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertiser_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertiser_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertiser_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_click_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_change_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertiser_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertiser_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertiser_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertiser_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_settings ENABLE ROW LEVEL SECURITY;

-- 1) advertiser_categories
DROP POLICY IF EXISTS p_adv_categories_select ON public.advertiser_categories;
CREATE POLICY p_adv_categories_select ON public.advertiser_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS p_adv_categories_insert ON public.advertiser_categories;
CREATE POLICY p_adv_categories_insert ON public.advertiser_categories FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS p_adv_categories_update ON public.advertiser_categories;
CREATE POLICY p_adv_categories_update ON public.advertiser_categories FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS p_adv_categories_delete ON public.advertiser_categories;
CREATE POLICY p_adv_categories_delete ON public.advertiser_categories FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 2) subscription_plans
DROP POLICY IF EXISTS p_sub_plans_select ON public.subscription_plans;
CREATE POLICY p_sub_plans_select ON public.subscription_plans FOR SELECT USING (true);

DROP POLICY IF EXISTS p_sub_plans_insert ON public.subscription_plans;
CREATE POLICY p_sub_plans_insert ON public.subscription_plans FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS p_sub_plans_update ON public.subscription_plans;
CREATE POLICY p_sub_plans_update ON public.subscription_plans FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS p_sub_plans_delete ON public.subscription_plans;
CREATE POLICY p_sub_plans_delete ON public.subscription_plans FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 3) advertisers
DROP POLICY IF EXISTS p_advertisers_select ON public.advertisers;
CREATE POLICY p_advertisers_select ON public.advertisers FOR SELECT USING (true);

DROP POLICY IF EXISTS p_advertisers_insert ON public.advertisers;
CREATE POLICY p_advertisers_insert ON public.advertisers FOR INSERT WITH CHECK (auth_user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS p_advertisers_update ON public.advertisers;
CREATE POLICY p_advertisers_update ON public.advertisers FOR UPDATE USING (auth_user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS p_advertisers_delete ON public.advertisers;
CREATE POLICY p_advertisers_delete ON public.advertisers FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 4) advertiser_cards
DROP POLICY IF EXISTS p_advertiser_cards_select ON public.advertiser_cards;
CREATE POLICY p_advertiser_cards_select ON public.advertiser_cards FOR SELECT USING (true);

DROP POLICY IF EXISTS p_advertiser_cards_insert ON public.advertiser_cards;
CREATE POLICY p_advertiser_cards_insert ON public.advertiser_cards FOR INSERT WITH CHECK (advertiser_id IN (SELECT id FROM public.advertisers WHERE auth_user_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS p_advertiser_cards_update ON public.advertiser_cards;
CREATE POLICY p_advertiser_cards_update ON public.advertiser_cards FOR UPDATE USING (advertiser_id IN (SELECT id FROM public.advertisers WHERE auth_user_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS p_advertiser_cards_delete ON public.advertiser_cards;
CREATE POLICY p_advertiser_cards_delete ON public.advertiser_cards FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 5) subscriptions
DROP POLICY IF EXISTS p_subscriptions_select ON public.subscriptions;
CREATE POLICY p_subscriptions_select ON public.subscriptions FOR SELECT USING (advertiser_id IN (SELECT id FROM public.advertisers WHERE auth_user_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS p_subscriptions_insert ON public.subscriptions;
CREATE POLICY p_subscriptions_insert ON public.subscriptions FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS p_subscriptions_update ON public.subscriptions;
CREATE POLICY p_subscriptions_update ON public.subscriptions FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS p_subscriptions_delete ON public.subscriptions;
CREATE POLICY p_subscriptions_delete ON public.subscriptions FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- As mesmas regras aplicam-se a faturas, leads, notificações etc (Leitura para dono, escrita/update para dono ou admin)
-- Exemplo leads:
DROP POLICY IF EXISTS p_advertiser_leads_select ON public.advertiser_leads;
CREATE POLICY p_advertiser_leads_select ON public.advertiser_leads FOR SELECT USING (advertiser_id IN (SELECT id FROM public.advertisers WHERE auth_user_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS p_advertiser_leads_insert ON public.advertiser_leads;
CREATE POLICY p_advertiser_leads_insert ON public.advertiser_leads FOR INSERT WITH CHECK (true); -- Publico pode criar lead

DROP POLICY IF EXISTS p_advertiser_leads_update ON public.advertiser_leads;
CREATE POLICY p_advertiser_leads_update ON public.advertiser_leads FOR UPDATE USING (advertiser_id IN (SELECT id FROM public.advertisers WHERE auth_user_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ====================================================================
-- BUCKETS STORAGE
-- ====================================================================
INSERT INTO storage.buckets (id, name, public) VALUES 
('marketplace-images', 'marketplace-images', true),
('marketplace-banners', 'marketplace-banners', true),
('marketplace-documents', 'marketplace-documents', false),
('marketplace-videos', 'marketplace-videos', true),
('marketplace-certificates', 'marketplace-certificates', true),
('marketplace-logos', 'marketplace-logos', true),
('marketplace-gallery', 'marketplace-gallery', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies basic
DROP POLICY IF EXISTS p_market_storage_read ON storage.objects;
CREATE POLICY p_market_storage_read ON storage.objects FOR SELECT USING (bucket_id LIKE 'marketplace-%');

DROP POLICY IF EXISTS p_market_storage_insert ON storage.objects;
CREATE POLICY p_market_storage_insert ON storage.objects FOR INSERT WITH CHECK (bucket_id LIKE 'marketplace-%' AND auth.role() = 'authenticated');

-- ====================================================================
-- SEED DE DADOS
-- ====================================================================
INSERT INTO public.advertiser_categories (name) VALUES 
('Profissional Autônomo'),
('Empresas & Instituições'),
('Apoio & Infraestrutura')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.subscription_plans (category_id, name, price, description) 
SELECT id, 'Prata', 49.90, 'Plano Básico' FROM public.advertiser_categories WHERE name = 'Profissional Autônomo' LIMIT 1
ON CONFLICT DO NOTHING;
INSERT INTO public.subscription_plans (category_id, name, price, description) 
SELECT id, 'Ouro', 99.90, 'Plano Intermediário' FROM public.advertiser_categories WHERE name = 'Empresas & Instituições' LIMIT 1
ON CONFLICT DO NOTHING;
INSERT INTO public.subscription_plans (category_id, name, price, description) 
SELECT id, 'Diamante', 199.90, 'Plano Premium' FROM public.advertiser_categories WHERE name = 'Apoio & Infraestrutura' LIMIT 1
ON CONFLICT DO NOTHING;

