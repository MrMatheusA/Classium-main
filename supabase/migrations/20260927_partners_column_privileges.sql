-- ==============================================================================
-- MIGRATION: 20260927_partners_column_privileges.sql
-- PROJETO: Classium Gestão Educacional — Núcleo Enterprise de Parceiros
-- FASE: Etapa 1 — Passo 1.3-L
-- OBJETIVO: Restringir privilégios de UPDATE da role authenticated exclusivamente às 11 colunas cadastrais
-- REGRAS:
--  - Revoga UPDATE amplo em public.partners para authenticated
--  - Concede UPDATE estrito apenas às colunas da whitelist cadastral
--  - Mantém id, organization_id, status, approval_status, is_active, created_at, updated_at protegidos
--  - Zero dados fake, mock ou seed
-- ==============================================================================

-- 1. Revogar privilégio geral de UPDATE da tabela
REVOKE UPDATE ON TABLE public.partners FROM authenticated;

-- 2. Conceder privilégio de UPDATE estritamente às 11 colunas cadastrais
GRANT UPDATE (
    partner_name,
    legal_name,
    document_type,
    document_number,
    email,
    phone,
    website,
    description,
    category,
    plan_id,
    metadata
) ON TABLE public.partners TO authenticated;

-- 3. Notificar PostgREST para recarregar o schema cache
NOTIFY pgrst, 'reload schema';
