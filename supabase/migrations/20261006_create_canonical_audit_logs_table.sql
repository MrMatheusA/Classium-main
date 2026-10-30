-- ==============================================================================
-- MIGRATION: 20261006_create_canonical_audit_logs_table.sql
-- PROJETO: Classium Gestão Educacional — Núcleo Enterprise
-- OBJETIVO: Criação da entidade canônica public.audit_logs
-- REGRAS:
--  - Idempotência rigorosa (CREATE TABLE IF NOT EXISTS)
--  - Multi-tenant via organization_id com ON DELETE SET NULL
--  - Estrutura estrita exigida por triggers e RPCs corporativas
--  - RLS ativado por padrão
--  - ZERO policies, ZERO índices adicionais, ZERO triggers, ZERO funções
--  - ZERO seeds, mocks ou inserção de dados
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(80),
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ativar Row Level Security (RLS) imediatamente
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Forçar recarregamento do schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
