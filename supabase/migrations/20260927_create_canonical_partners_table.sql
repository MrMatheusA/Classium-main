-- ==============================================================================
-- MIGRATION: 20260927_create_canonical_partners_table.sql
-- PROJETO: Classium Gestão Educacional — Núcleo Enterprise de Parceiros
-- FASE: Etapa 1 — Passo 1.1-A
-- OBJETIVO: Criação da entidade canônica public.partners no Supabase
-- REGRAS:
--  - Multi-tenant via organization_id
--  - UUID automático gen_random_uuid()
--  - Timestamps automáticos (created_at, updated_at)
--  - Constraints de domínio para status, approval_status e document_type
--  - RLS ativado por padrão (sem políticas permissivas neste passo)
--  - NENHUM dado fake, mock ou seed
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    partner_name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    document_type VARCHAR(10) CHECK (document_type IS NULL OR document_type IN ('CPF', 'CNPJ')),
    document_number VARCHAR(30),
    email VARCHAR(255),
    phone VARCHAR(50),
    website VARCHAR(255),
    description TEXT,
    category VARCHAR(100),
    plan_id VARCHAR(100),
    status VARCHAR(50) DEFAULT 'draft' NOT NULL CHECK (status IN ('draft', 'pending', 'active', 'suspended', 'cancelled', 'inactive')),
    approval_status VARCHAR(50) DEFAULT 'pending' NOT NULL CHECK (approval_status IN ('pending', 'approved', 'rejected', 'in_review')),
    is_active BOOLEAN DEFAULT true NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Habilitar Row Level Security (RLS) imediatamente
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- Forçar recarregamento do schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
