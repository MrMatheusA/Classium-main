-- ==============================================================================
-- MIGRATION: 20260927_partners_indexes_and_integrity.sql
-- PROJETO: Classium Gestão Educacional — Núcleo Enterprise de Parceiros
-- FASE: Etapa 1 — Passo 1.1-B
-- OBJETIVO: Índices de performance e integridade cadastral para public.partners
-- REGRAS:
--  - Idempotência rigorosa (CREATE INDEX IF NOT EXISTS)
--  - NÃO criar UNIQUE em email (pesquisável apenas)
--  - NÃO criar UNIQUE em document_type/document_number (apenas índice de busca, preservando flexibilidade multi-tenant)
--  - NÃO criar triggers, RPCs, policies ou dados
--  - RLS mantido ativo e inalterado
-- ==============================================================================

-- 1. Índice para isolamento multi-tenant por organização (FK já existente)
CREATE INDEX IF NOT EXISTS idx_partners_organization_id 
    ON public.partners (organization_id);

-- 2. Índice para filtragem rápida por status operacional
CREATE INDEX IF NOT EXISTS idx_partners_status 
    ON public.partners (status);

-- 3. Índice para pipeline de curadoria / moderação por status de aprovação
CREATE INDEX IF NOT EXISTS idx_partners_approval_status 
    ON public.partners (approval_status);

-- 4. Índice para filtragem rápida de parceiros ativos
CREATE INDEX IF NOT EXISTS idx_partners_is_active 
    ON public.partners (is_active);

-- 5. Índice para ordenação temporal de auditoria e listagens cronológicas (mais recentes primeiro)
CREATE INDEX IF NOT EXISTS idx_partners_created_at 
    ON public.partners (created_at DESC);

-- 6. Índice para busca e ordenação por nome do parceiro (insensível a maiúsculas/minúsculas)
CREATE INDEX IF NOT EXISTS idx_partners_partner_name_lower 
    ON public.partners (lower(partner_name));

-- 7. Índice de pesquisa cadastral por documento (CPF / CNPJ) — NÃO UNIQUE neste passo
CREATE INDEX IF NOT EXISTS idx_partners_document 
    ON public.partners (document_type, document_number) 
    WHERE document_number IS NOT NULL;

-- 8. Índice de pesquisa e busca por e-mail de contato — NÃO UNIQUE neste passo
CREATE INDEX IF NOT EXISTS idx_partners_email_lower 
    ON public.partners (lower(email)) 
    WHERE email IS NOT NULL;

-- 9. Forçar recarregamento do catálogo PostgREST
NOTIFY pgrst, 'reload schema';
