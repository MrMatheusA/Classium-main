-- ==============================================================================
-- MIGRATION: 20260927_create_partner_members_table.sql
-- PROJETO: Classium Gestão Educacional — Núcleo Enterprise de Parceiros
-- ETAPA: Etapa 2.10-A
-- OBJETIVO: Criação da tabela associativa canônica public.partner_members
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.partner_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'owner',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uk_partner_members_partner_user UNIQUE (partner_id, user_id)
);

ALTER TABLE public.partner_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_partner_members_partner_id ON public.partner_members(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_members_user_id ON public.partner_members(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_members_organization_id ON public.partner_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_partner_members_user_active ON public.partner_members(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_partner_members_partner_active ON public.partner_members(partner_id, is_active);
-- Função canônica e idempotente de atualização de timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_partner_members_updated_at ON public.partner_members;

CREATE TRIGGER trg_partner_members_updated_at
    BEFORE UPDATE ON public.partner_members
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at_timestamp();

NOTIFY pgrst, 'reload schema';
